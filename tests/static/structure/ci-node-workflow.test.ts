import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowTestRunner } from '~/testing/test-runner';
import { createPushContext, createPullRequestContext } from '~/testing/mock-context';
import { resolve } from 'path';

describe('CI Node Workflow Validation (Tier 1 Static)', () => {
  let runner: WorkflowTestRunner;
  const workflowPath = resolve(__dirname, '../../../src/templates/workflows/ci-node.yml');

  beforeEach(() => {
    runner = new WorkflowTestRunner();
  });

  afterEach(async () => {
    await runner.cleanup();
  });

  it('should have valid syntax', async () => {
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

  it('should have correct triggers', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      assert.assertTriggers(workflow, ['push', 'pull_request']);
    });
  });

  it('should validate trigger event structure', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
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

  it('should use required actions', async () => {
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

  it('should handle push event context correctly', async () => {
    const context = createPushContext({
      repository: 'test-owner/test-repo',
      ref: 'refs/heads/main',
      sha: 'abc123',
      actor: 'test-user'
    });

    // Static validation - just ensure the workflow can be loaded and context is valid
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      eventPayload: context.github,
      env: context.env
    });

    expect(result.success).toBe(true);
    expect(context.github.repository).toBe('test-owner/test-repo');
    expect(context.github.ref).toBe('refs/heads/main');
  });

  it('should handle pull request event context correctly', async () => {
    const context = createPullRequestContext({
      repository: 'test-owner/test-repo',
      number: 123,
      action: 'opened',
      title: 'Test PR',
      headRef: 'feature/test',
      baseRef: 'main'
    });

    // Static validation - just ensure the workflow can be loaded and context is valid
    const result = await runner.runWorkflow(workflowPath, {
      event: 'pull_request',
      eventPayload: context.github,
      env: context.env
    });

    expect(result.success).toBe(true);
    expect(context.github.event_name).toBe('pull_request');
  });

  it('should validate workflow structure completeness', async () => {
    await runner.assertWorkflow(workflowPath, (_assert, workflow) => {
      // Essential workflow components
      expect(workflow.name).toBeDefined();
      expect(typeof workflow.name).toBe('string');
      expect(workflow.name.length).toBeGreaterThan(0);
      
      expect(workflow.on).toBeDefined();
      expect(typeof workflow.on).toBe('object');
      
      expect(workflow.jobs).toBeDefined();
      expect(typeof workflow.jobs).toBe('object');
      expect(Object.keys(workflow.jobs).length).toBeGreaterThan(0);
      
      // Each job should have required fields
      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        expect(job['runs-on'], `Job ${jobName} must have runs-on`).toBeDefined();
        expect(job.steps, `Job ${jobName} must have steps`).toBeDefined();
        expect(Array.isArray(job.steps), `Job ${jobName} steps must be array`).toBe(true);
      }
    });
  });
});