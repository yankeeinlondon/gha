import { parse } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export class WorkflowAssertions {
  private ajv: Ajv;
  private workflowSchema: any;
  
  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.loadSchemas();
  }

  private loadSchemas(): void {
try {
  // Load workflow schema
  const workflowSchemaPath = resolve(__dirname, '../schemas/workflow.schema.json');
  console.log('Loading workflow schema from:', workflowSchemaPath);
  this.workflowSchema = JSON.parse(readFileSync(workflowSchemaPath, 'utf-8'));
  this.ajv.addSchema(this.workflowSchema, 'workflow');

      // Load related schemas
      const jobSchemaPath = resolve(__dirname, '../schemas/job.schema.json');
      console.log('Loading job schema from:', jobSchemaPath);
      const jobSchema = JSON.parse(readFileSync(jobSchemaPath, 'utf-8'));
      const stepSchemaPath = resolve(__dirname, '../schemas/step.schema.json');
      console.log('Loading step schema from:', stepSchemaPath);
      const stepSchema = JSON.parse(readFileSync(stepSchemaPath, 'utf-8'));
      
      this.ajv.addSchema(jobSchema, 'job');
      this.ajv.addSchema(stepSchema, 'step');
    } catch (error) {
      console.warn('Warning: Could not load schemas for validation:', error);
    }
  }

  /**
   * Validate workflow syntax against schema
   */
  async validateSyntax(workflow: any): Promise<string[]> {
    const errors: string[] = [];

    // Check if workflow is valid YAML object
    if (!workflow || typeof workflow !== 'object') {
      errors.push('Workflow must be a valid object');
      return errors;
    }

    // Validate against schema if available
    if (this.workflowSchema) {
      const valid = this.ajv.validate('workflow', workflow);
      if (!valid && this.ajv.errors) {
        this.ajv.errors.forEach(error => {
          errors.push(`${error.instancePath} ${error.message}`);
        });
      }
    }

    // Additional custom validations
    if (!workflow.name) {
      errors.push('Workflow must have a name');
    }

    if (!workflow.on) {
      errors.push('Workflow must have triggers defined in "on" field');
    }

    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      errors.push('Workflow must have at least one job');
    }

    // Validate job references
    if (workflow.jobs) {
      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        const jobErrors = await this.validateJob(jobName, job as any);
        errors.push(...jobErrors);
      }
    }

    return errors;
  }

  /**
   * Validate a job configuration
   */
  async validateJob(jobName: string, job: any): Promise<string[]> {
    const errors: string[] = [];

    if (!job) {
      errors.push(`Job "${jobName}" is not defined`);
      return errors;
    }

    // Check job dependencies
    if (job.needs) {
      const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
      for (const need of needs) {
        if (!this.jobExists(need)) {
          errors.push(`Job "${jobName}" depends on non-existent job "${need}"`);
        }
      }
    }

    // Validate steps and runner - different rules for reusable workflows vs regular jobs
    if (job.uses) {
      // Reusable workflow job - doesn't need steps or runs-on
      if (job.steps) {
        errors.push(`Job "${jobName}" uses a reusable workflow and cannot have steps`);
      }
      if (job['runs-on']) {
        errors.push(`Job "${jobName}" uses a reusable workflow and cannot have runs-on`);
      }
    } else {
      // Regular job - needs steps and runs-on
      if (!job.steps || !Array.isArray(job.steps) || job.steps.length === 0) {
        errors.push(`Job "${jobName}" must have at least one step`);
      } else {
        for (let i = 0; i < job.steps.length; i++) {
          const stepErrors = await this.validateStep(jobName, i, job.steps[i]);
          errors.push(...stepErrors);
        }
      }

      // Validate runner
      if (job['runs-on']) {
        const validRunners = [
          'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
          'windows-latest', 'windows-2022', 'windows-2019',
          'macos-latest', 'macos-13', 'macos-12', 'macos-11'
        ];
        
        if (
          !validRunners.includes(job['runs-on']) &&
          !job['runs-on'].startsWith('self-hosted') &&
          !(typeof job['runs-on'] === 'string' && job['runs-on'].includes('${{') && job['runs-on'].includes('}}'))
        ) {
          errors.push(`Job "${jobName}" has invalid runner "${job['runs-on']}"`);
        }
      } else {
        errors.push(`Job "${jobName}" must specify "runs-on"`);
      }
    }

    return errors;
  }

  /**
   * Validate a step configuration
   */
  async validateStep(jobName: string, stepIndex: number, step: any): Promise<string[]> {
    const errors: string[] = [];
    const stepName = step.name || `Step ${stepIndex + 1}`;

    if (!step) {
      errors.push(`${jobName}.steps[${stepIndex}] is not defined`);
      return errors;
    }

    // Step must have either 'uses' or 'run'
    if (!step.uses && !step.run) {
      errors.push(`${jobName}.${stepName} must have either "uses" or "run"`);
    }

    if (step.uses && step.run) {
      errors.push(`${jobName}.${stepName} cannot have both "uses" and "run"`);
    }

    // Validate action reference
    if (step.uses) {
      const actionErrors = this.validateActionReference(step.uses);
      if (actionErrors.length > 0) {
        errors.push(`${jobName}.${stepName}: ${actionErrors.join(', ')}`);
      }
    }

    // Validate step conditions
    if (step.if) {
      const conditionErrors = this.validateExpression(step.if);
      if (conditionErrors.length > 0) {
        errors.push(`${jobName}.${stepName}.if: ${conditionErrors.join(', ')}`);
      }
    }

    return errors;
  }

  /**
   * Validate action reference format
   */
  validateActionReference(uses: string): string[] {
    const errors: string[] = [];

    // Check for valid formats:
    // - owner/repo@ref
    // - owner/repo/path@ref
    // - ./path
    // - docker://image:tag
    
    if (uses.startsWith('./')) {
      // Local action
      return errors;
    }

    if (uses.startsWith('docker://')) {
      // Docker action
      return errors;
    }

    // GitHub action
    const parts = uses.split('@');
    if (parts.length !== 2) {
      errors.push('Action reference must include version (e.g., actions/checkout@v4)');
    } else {
      const [path, version] = parts;
      const pathParts = path.split('/');
      
      // Check for invalid path format: must have owner/repo and no empty segments
      if (pathParts.length < 2 || pathParts.some(part => part === '')) {
        errors.push('Invalid action path format');
      }

      if (!version) {
        errors.push('Action version/ref is required');
      }
    }

    return errors;
  }

  /**
   * Validate GitHub Actions expression syntax
   */
  validateExpression(expression: string): string[] {
    const errors: string[] = [];

    // Basic expression validation
    const openBraces = (expression.match(/\$\{\{/g) || []).length;
    const closeBraces = (expression.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Mismatched expression braces');
    }

    // Check for common expression errors
    if (expression.includes('${{') && !expression.includes('}}')) {
      errors.push('Unclosed expression');
    }

    return errors;
  }

  /**
   * Assert that a job exists in the workflow
   */
  assertJobExists(workflow: any, jobName: string): void {
    if (!workflow.jobs || !workflow.jobs[jobName]) {
      throw new Error(`Expected workflow to have job "${jobName}"`);
    }
  }

  /**
   * Assert job properties
   */
  assertJobProperties(workflow: any, jobName: string, properties: Partial<any>): void {
    this.assertJobExists(workflow, jobName);
    
    const job = workflow.jobs[jobName];
    
    for (const [key, value] of Object.entries(properties)) {
      if (JSON.stringify(job[key]) !== JSON.stringify(value)) {
        // DEBUG: Log actual and expected values for job property assertion
        console.log(`[DEBUG] assertJobProperties: job="${jobName}", key="${key}", expected=`, value, ', actual=', job[key]);
        throw new Error(
          `Expected job "${jobName}" to have ${key}="${JSON.stringify(value)}", ` +
          `but got "${JSON.stringify(job[key])}"`
        );
      }
    }
  }

  /**
   * Assert that a step exists in a job
   */
  assertStepExists(workflow: any, jobName: string, stepIdentifier: string | number): void {
    this.assertJobExists(workflow, jobName);
    
    const job = workflow.jobs[jobName];
    if (!job.steps || !Array.isArray(job.steps)) {
      throw new Error(`Job "${jobName}" has no steps`);
    }

    const step = this.findStep(job.steps, stepIdentifier);
    if (!step) {
      throw new Error(`Expected job "${jobName}" to have step "${stepIdentifier}"`);
    }
  }

  /**
   * Assert step properties
   */
  assertStepProperties(
    workflow: any, 
    jobName: string, 
    stepIdentifier: string | number,
    properties: Partial<any>
  ): void {
    this.assertStepExists(workflow, jobName, stepIdentifier);
    
    const job = workflow.jobs[jobName];
    const step = this.findStep(job.steps, stepIdentifier);
    
    for (const [key, value] of Object.entries(properties)) {
      if (JSON.stringify(step[key]) !== JSON.stringify(value)) {
        throw new Error(
          `Expected step "${stepIdentifier}" in job "${jobName}" to have ${key}="${JSON.stringify(value)}", ` +
          `but got "${JSON.stringify(step[key])}"`
        );
      }
    }
  }

  /**
   * Assert workflow outputs
   */
  assertWorkflowOutputs(workflow: any, expectedOutputs: Record<string, any>): void {
    for (const [jobName, outputs] of Object.entries(expectedOutputs)) {
      this.assertJobExists(workflow, jobName);
      
      const job = workflow.jobs[jobName];
      if (!job.outputs) {
        throw new Error(`Job "${jobName}" has no outputs defined`);
      }

      for (const [outputName, outputValue] of Object.entries(outputs as Record<string, any>)) {
        if (!job.outputs[outputName]) {
          throw new Error(`Job "${jobName}" missing output "${outputName}"`);
        }
      }
    }
  }

  /**
   * Assert workflow uses a specific action
   */
  assertUsesAction(workflow: any, actionName: string): void {
    let found = false;

    for (const job of Object.values(workflow.jobs || {})) {
      const jobObj = job as any;
      if (jobObj.steps) {
        for (const step of jobObj.steps) {
          if (step.uses && step.uses.includes(actionName)) {
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new Error(`Expected workflow to use action "${actionName}"`);
    }
  }

  /**
   * Assert workflow triggers
   */
  assertTriggers(workflow: any, expectedTriggers: string[]): void {
    if (!workflow.on) {
      throw new Error('Workflow has no triggers defined');
    }

    const triggers = Array.isArray(workflow.on) 
      ? workflow.on 
      : typeof workflow.on === 'string'
        ? [workflow.on]
        : Object.keys(workflow.on);

    for (const trigger of expectedTriggers) {
      if (!triggers.includes(trigger)) {
        throw new Error(`Expected workflow to have trigger "${trigger}"`);
      }
    }
  }

  /**
   * Helper to find a step by name, id, or index
   */
  private findStep(steps: any[], identifier: string | number): any {
    if (typeof identifier === 'number') {
      return steps[identifier];
    }

    return steps.find(step => 
      step.name === identifier || 
      step.id === identifier ||
      (step.uses && step.uses.includes(identifier))
    );
  }

  /**
   * Helper to check if a job exists
   */
  private jobExists(_jobName: string): boolean {
    // This is a placeholder - in real implementation would check against workflow
    return true;
  }
}
