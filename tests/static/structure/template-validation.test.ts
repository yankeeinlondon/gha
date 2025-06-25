import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowTestRunner } from '~/testing/test-runner';
import { resolve } from 'path';

describe('Template Structure Validation (Tier 1 Static)', () => {
  let runner: WorkflowTestRunner;

  beforeEach(() => {
    runner = new WorkflowTestRunner();
  });

  afterEach(async () => {
    await runner.cleanup();
  });

  describe('Minimal Workflow Template', () => {
    const minimalWorkflowPath = resolve(__dirname, '../../../src/templates/workflows/minimal.yml');

    it('should have valid syntax', async () => {
      const result = await runner.runWorkflow(minimalWorkflowPath);
      if (!result.success) {
        console.log('[DEBUG] Validation errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have basic structure', async () => {
      await runner.assertWorkflow(minimalWorkflowPath, (_assert, workflow) => {
        expect(workflow.name).toBeDefined();
        expect(workflow.on).toBeDefined();
        expect(workflow.jobs).toBeDefined();
        expect(Object.keys(workflow.jobs).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-Job Workflow Template', () => {
    const multiJobWorkflowPath = resolve(__dirname, '../../../src/templates/workflows/multi-job.yml');

    it('should have valid syntax', async () => {
      const result = await runner.runWorkflow(multiJobWorkflowPath);
      if (!result.success) {
        console.log('[DEBUG] Validation errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have multiple jobs', async () => {
      await runner.assertWorkflow(multiJobWorkflowPath, (_assert, workflow) => {
        expect(workflow.jobs).toBeDefined();
        expect(Object.keys(workflow.jobs).length).toBeGreaterThan(1);
        
        // Each job should have required fields
        for (const [jobName, job] of Object.entries(workflow.jobs)) {
          expect(job['runs-on'], `Job ${jobName} must have runs-on`).toBeDefined();
          expect(job.steps, `Job ${jobName} must have steps`).toBeDefined();
          expect(Array.isArray(job.steps), `Job ${jobName} steps must be array`).toBe(true);
        }
      });
    });
  });

  describe('Echo Workflow Template', () => {
    const echoWorkflowPath = resolve(__dirname, '../../../src/templates/workflows/echo.yml');

    it('should have valid syntax', async () => {
      const result = await runner.runWorkflow(echoWorkflowPath);
      if (!result.success) {
        console.log('[DEBUG] Validation errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have echo step', async () => {
      await runner.assertWorkflow(echoWorkflowPath, (_assert, workflow) => {
        const job = Object.values(workflow.jobs)[0] as any;
        expect(job.steps).toBeDefined();
        expect(job.steps.length).toBeGreaterThan(0);
        
        const echoStep = job.steps.find((step: any) => step.run?.includes('echo'));
        expect(echoStep).toBeDefined();
      });
    });
  });

  describe('Empty Workflow Template', () => {
    const emptyWorkflowPath = resolve(__dirname, '../../../src/templates/workflows/empty.yml');

    it('should have valid syntax', async () => {
      const result = await runner.runWorkflow(emptyWorkflowPath);
      if (!result.success) {
        console.log('[DEBUG] Validation errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty steps gracefully', async () => {
      await runner.assertWorkflow(emptyWorkflowPath, (_assert, workflow) => {
        const job = Object.values(workflow.jobs)[0] as any;
        expect(job.steps).toBeDefined();
        expect(Array.isArray(job.steps)).toBe(true);
        // Empty steps array should be valid
      });
    });
  });

  describe('Cross-Template Validation', () => {
    const templatePaths = [
      resolve(__dirname, '../../../src/templates/workflows/ci-node.yml'),
      resolve(__dirname, '../../../src/templates/workflows/minimal.yml'),
      resolve(__dirname, '../../../src/templates/workflows/multi-job.yml'),
      resolve(__dirname, '../../../src/templates/workflows/echo.yml'),
      resolve(__dirname, '../../../src/templates/workflows/empty.yml')
    ];

    it('should all have valid syntax', async () => {
      for (const templatePath of templatePaths) {
        const result = await runner.runWorkflow(templatePath);
        if (!result.success) {
          console.log(`[DEBUG] Template ${templatePath} validation errors:`, result.errors);
        }
        expect(result.success, `Template ${templatePath} should have valid syntax`).toBe(true);
      }
    });

    it('should all have required workflow fields', async () => {
      for (const templatePath of templatePaths) {
        await runner.assertWorkflow(templatePath, (_assert, workflow) => {
          expect(workflow.name, `Template ${templatePath} must have name`).toBeDefined();
          expect(workflow.on, `Template ${templatePath} must have triggers`).toBeDefined();
          expect(workflow.jobs, `Template ${templatePath} must have jobs`).toBeDefined();
          expect(Object.keys(workflow.jobs).length, `Template ${templatePath} must have at least one job`).toBeGreaterThan(0);
        });
      }
    });
  });
});