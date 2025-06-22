import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WorkflowTestRunner } from '../../src/testing/test-runner';
import { createPushContext, createPullRequestContext } from '../../src/testing/mock-context';
import { TestFixtures } from '../../src/testing/test-helpers';
import { resolve } from 'path';

describe('CI Node Workflow Template', () => {
  let runner: WorkflowTestRunner;
  let fixtures: TestFixtures;
  const workflowPath = resolve(__dirname, '../../src/templates/workflows/ci-node.yml');

  beforeAll(() => {
    runner = new WorkflowTestRunner();
    fixtures = new TestFixtures();
  });

  afterAll(async () => {
    await runner.cleanup();
  });

  it('should have valid syntax', async () => {
    const result = await runner.runWorkflow(workflowPath);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should have required jobs', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      expect(workflow).toHaveJob('test');
      expect(workflow).toHaveJob('build');
    });
  });

  it('should have correct triggers', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      assert.assertTriggers(workflow, ['push', 'pull_request']);
    });
  });

  it('should run on correct events', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      expect(workflow.on).toBeDefined();
      expect(workflow.on.push).toBeDefined();
      expect(workflow.on.push.branches).toContain('main');
      expect(workflow.on.pull_request).toBeDefined();
      expect(workflow.on.pull_request.branches).toContain('main');
    });
  });

  it('should have proper job configuration', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      // Test job
      assert.assertJobProperties(workflow, 'test', {
        'runs-on': 'ubuntu-latest'
      });

      // Build job
      assert.assertJobProperties(workflow, 'build', {
        'runs-on': 'ubuntu-latest',
        needs: 'test'
      });
    });
  });

  it('should use required actions', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      assert.assertUsesAction(workflow, 'actions/checkout');
      assert.assertUsesAction(workflow, 'actions/setup-node');
    });
  });

  it('should have checkout step in all jobs', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
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

  it('should set up Node.js correctly', async () => {
    await runner.assertWorkflow(workflowPath, (assert, workflow) => {
      const testJob = workflow.jobs.test;
      const setupNodeStep = testJob.steps.find((step: any) => 
        step.uses?.includes('actions/setup-node')
      );

      expect(setupNodeStep).toBeDefined();
      expect(setupNodeStep.with).toBeDefined();
      expect(setupNodeStep.with['node-version']).toBeDefined();
    });
  });

  it('should handle push events correctly', async () => {
    const context = createPushContext({
      repository: 'test-owner/test-repo',
      ref: 'refs/heads/main',
      sha: 'abc123',
      actor: 'test-user'
    });

    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      eventPayload: context.github,
      env: context.env
    });

    expect(result.success).toBe(true);
  });

  it('should handle pull request events correctly', async () => {
    const context = createPullRequestContext({
      repository: 'test-owner/test-repo',
      number: 123,
      action: 'opened',
      title: 'Test PR',
      headRef: 'feature/test',
      baseRef: 'main'
    });

    const result = await runner.runWorkflow(workflowPath, {
      event: 'pull_request',
      eventPayload: context.github,
      env: context.env
    });

    expect(result.success).toBe(true);
  });

  // Test with act if available
  it.skipIf(!process.env.CI)('should run successfully with act', async () => {
    const actRunner = runner['actRunner'];
    const isActInstalled = await actRunner.checkInstallation();

    if (!isActInstalled) {
      console.log('Skipping act test - act is not installed');
      return;
    }

    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      runWithAct: true,
      actOptions: {
        dryRun: true // Dry run for testing
      }
    });

    expect(result.success).toBe(true);
    expect(result.actResult).toBeDefined();
  });
});
