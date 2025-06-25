import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { parse, stringify } from 'yaml';
import { join, dirname } from 'path';
// @ts-ignore - diff package has compatibility issues with @types/diff
const diff = require('diff');

/**
 * Load and parse a workflow file
 */
export async function loadWorkflow(workflowPath: string): Promise<any> {
  try {
    const content = readFileSync(workflowPath, 'utf-8');
    return parse(content);
  } catch (error) {
    throw new Error(`Failed to load workflow from ${workflowPath}: ${error}`);
  }
}

/**
 * Save a workflow to file
 */
export async function saveWorkflow(workflowPath: string, workflow: any): Promise<void> {
  const dir = dirname(workflowPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const content = stringify(workflow, {
    lineWidth: 120,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN'
  });
  
  writeFileSync(workflowPath, content, 'utf-8');
}

/**
 * Create test fixtures
 */
export class TestFixtures {
  private fixturesDir: string;

  constructor(fixturesDir: string = 'tests/fixtures') {
    this.fixturesDir = fixturesDir;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!existsSync(this.fixturesDir)) {
      mkdirSync(this.fixturesDir, { recursive: true });
    }
  }

  /**
   * Load a fixture
   */
  loadFixture(name: string): any {
    const fixturePath = join(this.fixturesDir, name);
    
    if (!existsSync(fixturePath)) {
      throw new Error(`Fixture not found: ${name}`);
    }

    const content = readFileSync(fixturePath, 'utf-8');
    
    if (name.endsWith('.json')) {
      return JSON.parse(content);
    } else if (name.endsWith('.yml') || name.endsWith('.yaml')) {
      return parse(content);
    } else {
      return content;
    }
  }

  /**
   * Save a fixture
   */
  saveFixture(name: string, data: any): void {
    const fixturePath = join(this.fixturesDir, name);
    const dir = dirname(fixturePath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let content: string;
    
    if (name.endsWith('.json')) {
      content = JSON.stringify(data, null, 2);
    } else if (name.endsWith('.yml') || name.endsWith('.yaml')) {
      content = stringify(data);
    } else {
      content = String(data);
    }

    writeFileSync(fixturePath, content, 'utf-8');
  }

  /**
   * Create default event payloads
   */
  createDefaultEventPayloads(): void {
    // Push event
    this.saveFixture('events/push.json', {
      ref: 'refs/heads/main',
      before: '0000000000000000000000000000000000000000',
      after: 'abc123def456',
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: {
          name: 'test-owner',
          email: 'test@example.com'
        }
      },
      pusher: {
        name: 'test-user',
        email: 'test@example.com'
      },
      commits: [
        {
          id: 'abc123def456',
          message: 'Test commit',
          timestamp: new Date().toISOString(),
          url: 'https://github.com/test-owner/test-repo/commit/abc123def456',
          author: {
            name: 'test-user',
            email: 'test@example.com'
          }
        }
      ]
    });

    // Pull request event
    this.saveFixture('events/pull_request.json', {
      action: 'opened',
      number: 123,
      pull_request: {
        id: 123456789,
        number: 123,
        state: 'open',
        locked: false,
        title: 'Test PR',
        body: 'Test PR description',
        user: {
          login: 'test-user',
          id: 12345
        },
        head: {
          ref: 'feature/test',
          sha: 'abc123'
        },
        base: {
          ref: 'main',
          sha: 'def456'
        }
      },
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: {
          login: 'test-owner',
          id: 12345
        }
      }
    });

    // Workflow dispatch event
    this.saveFixture('events/workflow_dispatch.json', {
      inputs: {
        version: '1.0.0',
        environment: 'production'
      },
      ref: 'refs/heads/main',
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: {
          login: 'test-owner',
          id: 12345
        }
      },
      workflow: '.github/workflows/deploy.yml'
    });

    // Release event
    this.saveFixture('events/release.json', {
      action: 'published',
      release: {
        id: 123456789,
        tag_name: 'v1.0.0',
        name: 'Version 1.0.0',
        body: 'Release notes',
        draft: false,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString()
      },
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: {
          login: 'test-owner',
          id: 12345
        }
      }
    });
  }
}

/**
 * Compare workflow outputs
 */
export function compareWorkflows(actual: any, expected: any): WorkflowComparison {
  const actualYaml = stringify(actual);
  const expectedYaml = stringify(expected);
  
  const diffResult = diff.diffLines(expectedYaml, actualYaml);
  const hasDifferences = diffResult.some((part: any) => part.added || part.removed);

  return {
    hasDifferences,
    diff: diffResult,
    actualYaml,
    expectedYaml
  };
}

export interface WorkflowComparison {
  hasDifferences: boolean;
  diff: any[];
  actualYaml: string;
  expectedYaml: string;
}

/**
 * Generate test report
 */
export function generateTestReport(results: TestResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  let report = `# Workflow Test Report\n\n`;
  report += `Total Tests: ${total}\n`;
  report += `Passed: ${passed}\n`;
  report += `Failed: ${failed}\n\n`;

  if (failed > 0) {
    report += `## Failed Tests\n\n`;
    
    for (const result of results.filter(r => !r.passed)) {
      report += `### ${result.name}\n\n`;
      report += `File: ${result.file}\n`;
      report += `Error: ${result.error}\n\n`;
      
      if (result.details) {
        report += `Details:\n\`\`\`\n${result.details}\n\`\`\`\n\n`;
      }
    }
  }

  report += `## Test Results\n\n`;
  report += `| Test | Status | Duration |\n`;
  report += `|------|--------|----------|\n`;
  
  for (const result of results) {
    const status = result.passed ? '✅ Passed' : '❌ Failed';
    const duration = result.duration ? `${result.duration}ms` : '-';
    report += `| ${result.name} | ${status} | ${duration} |\n`;
  }

  return report;
}

export interface TestResult {
  name: string;
  file: string;
  passed: boolean;
  error?: string;
  details?: string;
  duration?: number;
}

/**
 * Create a temporary workflow for testing
 */
export function createTempWorkflow(
  name: string,
  workflow: any,
  tempDir: string = '.tmp'
): string {
  const workflowPath = join(tempDir, 'workflows', `${name}.yml`);
  const dir = dirname(workflowPath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const content = stringify(workflow);
  writeFileSync(workflowPath, content, 'utf-8');
  
  return workflowPath;
}

/**
 * Validate workflow against templates
 */
export async function validateAgainstTemplate(
  workflow: any,
  templatePath: string
): Promise<ValidationResult> {
  const template = await loadWorkflow(templatePath);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields from template
  for (const key of Object.keys(template)) {
    if (!(key in workflow)) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  // Check job structure
  if (template.jobs && workflow.jobs) {
    for (const [jobName, templateJob] of Object.entries(template.jobs)) {
      if (!(jobName in workflow.jobs)) {
        warnings.push(`Missing job from template: ${jobName}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Merge workflow configurations
 */
export function mergeWorkflows(base: any, override: any): any {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (key === 'jobs' && merged.jobs) {
      // Merge jobs
      merged.jobs = { ...merged.jobs, ...(value as any) };
    } else if (key === 'on' && merged.on && typeof merged.on === 'object' && typeof value === 'object') {
      // Merge triggers
      merged.on = { ...merged.on, ...(value as any) };
    } else {
      // Override
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Extract workflow metadata
 */
export function extractWorkflowMetadata(workflow: any): WorkflowMetadata {
  const metadata: WorkflowMetadata = {
    name: workflow.name || 'Unnamed Workflow',
    triggers: [],
    jobs: [],
    secrets: new Set(),
    env: new Set()
  };

  // Extract triggers
  if (workflow.on) {
    if (Array.isArray(workflow.on)) {
      metadata.triggers = workflow.on;
    } else if (typeof workflow.on === 'string') {
      metadata.triggers = [workflow.on];
    } else {
      metadata.triggers = Object.keys(workflow.on);
    }
  }

  // Extract jobs
  if (workflow.jobs) {
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      const jobMeta: JobMetadata = {
        name: jobName,
        runsOn: (job as any)['runs-on'] || 'unknown',
        steps: [],
        needs: []
      };

      if ((job as any).needs) {
        jobMeta.needs = Array.isArray((job as any).needs) 
          ? (job as any).needs 
          : [(job as any).needs];
      }

      if ((job as any).steps) {
        for (const step of (job as any).steps) {
          jobMeta.steps.push({
            name: step.name || 'Unnamed Step',
            uses: step.uses,
            run: step.run
          });
        }
      }

      metadata.jobs.push(jobMeta);
    }
  }

  // Extract secrets and env vars (from expressions)
  const content = stringify(workflow);
  const secretMatches = content.matchAll(/\$\{\{\s*secrets\.(\w+)\s*\}\}/g);
  const envMatches = content.matchAll(/\$\{\{\s*env\.(\w+)\s*\}\}/g);

  for (const match of secretMatches) {
    metadata.secrets.add(match[1]);
  }

  for (const match of envMatches) {
    metadata.env.add(match[1]);
  }

  return metadata;
}

export interface WorkflowMetadata {
  name: string;
  triggers: string[];
  jobs: JobMetadata[];
  secrets: Set<string>;
  env: Set<string>;
}

export interface JobMetadata {
  name: string;
  runsOn: string;
  steps: StepMetadata[];
  needs: string[];
}

export interface StepMetadata {
  name: string;
  uses?: string;
  run?: string;
}
