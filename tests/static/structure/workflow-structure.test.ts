import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowTestRunner } from '~/testing/test-runner';
import { resolve } from 'path';

interface WorkflowJob {
  'runs-on': string;
  steps: any[];
  needs?: string | string[];
  [key: string]: any;
}

describe('Workflow Structure Tests (Tier 1)', () => {
  let runner: WorkflowTestRunner;
  const workflowPath = resolve(__dirname, '../../../src/templates/workflows/ci-node.yml');

  beforeEach(() => {
    runner = new WorkflowTestRunner();
  });

  afterEach(async () => {
    await runner.cleanup();
  });

  it('should have valid workflow syntax', async () => {
    const result = await runner.runWorkflow(workflowPath);
    
    if (!result.success) {
      console.log('[DEBUG] Validation errors:', result.errors);
    }
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should have required jobs', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      expect(workflow).toHaveJob('test');
      expect(workflow).toHaveJob('build');
    });
  });

  it('should have correct workflow triggers', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      assert.assertTriggers(workflow, ['push', 'pull_request']);
      
      expect(workflow.on).toBeDefined();
      expect(workflow.on.push).toBeDefined();
      expect(workflow.on.push.branches).toContain('main');
      expect(workflow.on.pull_request).toBeDefined();
      expect(workflow.on.pull_request.branches).toContain('main');
    });
  });

  it('should have proper job configuration', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      // Test job configuration
      const testJob = workflow.jobs['test'];
      expect(testJob).toBeDefined();
      
      // Allow either static or matrix-based runner
      expect(
        testJob['runs-on'] === 'ubuntu-latest' ||
        (typeof testJob['runs-on'] === 'string' && testJob['runs-on'].includes('${{ matrix.os }}'))
      ).toBe(true);

      // Build job configuration
      const buildJob = workflow.jobs['build'];
      expect(buildJob).toBeDefined();
      expect(buildJob['runs-on']).toBe('ubuntu-latest');
      
      // Allow either static or array-based needs for build job
      if (Array.isArray(buildJob.needs)) {
        expect(buildJob.needs).toContain('test');
      } else {
        expect(buildJob.needs).toBe('test');
      }
    });
  });

  it('should use required GitHub Actions', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      assert.assertUsesAction(workflow, 'actions/checkout');
      assert.assertUsesAction(workflow, 'actions/setup-node');
    });
  });

  it('should have checkout step in all jobs', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      const jobs = Object.keys(workflow.jobs);

      for (const jobName of jobs) {
        const job = workflow.jobs[jobName];
        expect(job.steps).toBeDefined();
        expect(job.steps.length).toBeGreaterThan(0);

        // First step should be checkout
        const firstStep = job.steps[0];
        expect(firstStep.uses).toContain('actions/checkout');
      }
    });
  });

  it('should configure Node.js setup correctly', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      const testJob = workflow.jobs.test;
      const setupNodeStep = testJob.steps.find((step: any) =>
        step.uses?.includes('actions/setup-node')
      );

      expect(setupNodeStep).toBeDefined();
      expect(setupNodeStep.with).toBeDefined();
      expect(setupNodeStep.with['node-version']).toBeDefined();
    });
  });

  it('should have valid job dependencies', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      const jobs = workflow.jobs;
      
      // Validate that all job dependencies exist
      for (const [jobName, job] of Object.entries(jobs) as [string, WorkflowJob][]) {
        if (job.needs) {
          const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
          
          for (const dependency of needs) {
            expect(jobs[dependency], `Job ${jobName} depends on non-existent job ${dependency}`).toBeDefined();
          }
        }
      }
    });
  });

  it('should have valid runner configurations', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      const validRunners = [
        'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
        'windows-latest', 'windows-2022', 'windows-2019',
        'macos-latest', 'macos-13', 'macos-12', 'macos-11'
      ];
      
      for (const [jobName, job] of Object.entries(workflow.jobs) as [string, WorkflowJob][]) {
        const runsOn = job['runs-on'];
        expect(runsOn, `Job ${jobName} must specify runs-on`).toBeDefined();
        
        // Allow matrix expressions, self-hosted, or valid GitHub runners
        const isValid = 
          validRunners.includes(runsOn) ||
          runsOn.startsWith('self-hosted') ||
          (typeof runsOn === 'string' && runsOn.includes('${{') && runsOn.includes('}}'));
          
        expect(isValid, `Job ${jobName} has invalid runner: ${runsOn}`).toBe(true);
      }
    });
  });

  it('should have proper step structure', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      for (const [jobName, job] of Object.entries(workflow.jobs) as [string, WorkflowJob][]) {
        expect(job.steps, `Job ${jobName} must have steps`).toBeDefined();
        expect(Array.isArray(job.steps), `Job ${jobName} steps must be an array`).toBe(true);
        expect(job.steps.length, `Job ${jobName} must have at least one step`).toBeGreaterThan(0);
        
        for (let i = 0; i < job.steps.length; i++) {
          const step = job.steps[i];
          
          // Each step must have either 'uses' or 'run'
          const hasUses = !!step.uses;
          const hasRun = !!step.run;
          
          expect(
            hasUses || hasRun,
            `Step ${i + 1} in job ${jobName} must have either 'uses' or 'run'`
          ).toBe(true);
          
          expect(
            !(hasUses && hasRun),
            `Step ${i + 1} in job ${jobName} cannot have both 'uses' and 'run'`
          ).toBe(true);
        }
      }
    });
  });

  it('should handle workflow permissions correctly', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      // If permissions are specified, they should be valid
      if (workflow.permissions) {
        const validPermissions = [
          'actions', 'checks', 'contents', 'deployments', 'id-token',
          'issues', 'discussions', 'packages', 'pages', 'pull-requests',
          'repository-projects', 'security-events', 'statuses'
        ];
        
        if (typeof workflow.permissions === 'object') {
          for (const [scope, permission] of Object.entries(workflow.permissions)) {
            expect(validPermissions, `Invalid permission scope: ${scope}`).toContain(scope);
            expect(['read', 'write', 'none'], `Invalid permission value: ${permission}`).toContain(permission);
          }
        }
      }
    });
  });
});
