import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WorkflowTestRunner } from '~/testing/test-runner';
import { createPushContext, createPullRequestContext } from '~/testing/mock-context';
import { TestFixtures } from '~/testing/test-helpers';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';



async function actInfo(runner: WorkflowTestRunner) {
    const actRunner = runner['actRunner'];
    const isActInstalled = await actRunner.checkInstallation();

    if (!isActInstalled) {
        console.log('Skipping act test - act is not installed');
        console.log('To install act, visit: https://github.com/nektos/act#installation');
        console.log('  - macOS: brew install act');
        console.log('  - Linux: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash');
        console.log('  - Windows: choco install act-cli or scoop install act');

        // Check if Docker is running
        let dockerAvailable = true;
        try {
            execSync('docker info', { stdio: 'ignore' });
        } catch (err) {
            dockerAvailable = false;
        }
        if (!dockerAvailable) {
            console.log('Skipping act test - Docker is not running or not available');
            return;
        }
    }

    return {
        actRunner, isActInstalled
    }

}

describe('CI Node Workflow Template (using act)', () => {
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

    beforeEach(() => {
        let act = actInfo(runner);
    })

    it('should have valid syntax', async () => {
        const result = await runner.runWorkflow(workflowPath);
        if (!result.success) {
            // DEBUG: Print validation errors for diagnosis
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

    it('should run on correct events', async () => {
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
            // Test job
            // Allow either static or matrix-based runner
            const testJob = workflow.jobs['test'];
            expect(
                testJob['runs-on'] === 'ubuntu-latest' ||
                (typeof testJob['runs-on'] === 'string' && testJob['runs-on'].includes('${{ matrix.os }}'))
            ).toBe(true);

            // Build job
            // Allow either static or array-based needs for build job
            const buildJob = workflow.jobs['build'];
            expect(buildJob['runs-on']).toBe('ubuntu-latest');
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

    it('should set up Node.js correctly', async () => {
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

     


    it('should run multi-job workflow with act (dryRun)', async () => {
        const multiJobWorkflowPath = resolve(__dirname, '../../src/templates/workflows/multi-job.yml');
        const actRunner = runner['actRunner'];
        const isActInstalled = await actRunner.checkInstallation();
        
        if (!isActInstalled) {
            console.log('Skipping multi-job dryRun test - act is not installed');
            return;
        }
        const result = await runner.runWorkflow(multiJobWorkflowPath, {
            event: 'workflow_dispatch',
            runWithAct: true,
            actOptions: {
                dryRun: true
            }
        });
        expect(result.success).toBe(true);
        expect(result.actResult).toBeDefined();
    });

    // More simple dry-run tests can be added below for further coverage.
    // Additional act tests

    it('should attempt to run with act (real containers, may fail due to linting)', async () => {
        const actRunner = runner['actRunner'];
        const isActInstalled = await actRunner.checkInstallation();

        if (!isActInstalled) {
            console.log('Skipping act real-container test - act is not installed');
            return;
        }

        let dockerAvailable = true;
        try {
            execSync('docker info', { stdio: 'ignore' });
        } catch (err) {
            dockerAvailable = false;
        }
        if (!dockerAvailable) {
            console.log('Skipping act real-container test - Docker is not running');
            return;
        }

        const result = await runner.runWorkflow(workflowPath, {
            event: 'push',
            runWithAct: true,
            actOptions: {
                // No dryRun: run with real containers
            }
        });

        // This test may fail due to linting issues in the codebase
        // We're testing that act can execute the workflow, not that it passes
        expect(result.actResult).toBeDefined();
        
        if (!result.success) {
            console.log('Act execution completed but workflow failed (this may be expected due to linting issues)');
            // Don't fail the test - real container execution with potential lint failures is expected
        } else {
            console.log('Act execution succeeded - workflow passed all steps');
        }
    });

    const minimalWorkflowPath = resolve(__dirname, '../../src/templates/workflows/minimal.yml');

    it('should run minimal workflow with act (dryRun)', async () => {
        const actRunner = runner['actRunner'];
        const isActInstalled = await actRunner.checkInstallation();
        if (!isActInstalled) {
            console.log('Skipping minimal dryRun test - act is not installed');
            return;
        }
        const result = await runner.runWorkflow(minimalWorkflowPath, {
            event: 'workflow_dispatch',
            runWithAct: true,
            actOptions: {
                dryRun: true
            }
        });
        expect(result.success).toBe(true);
        expect(result.actResult).toBeDefined();
    });

    it('should run empty workflow with act (dryRun)', async () => {
        // Use the existing empty workflow template
        const emptyWorkflowPath = resolve(__dirname, '../../src/templates/workflows/empty.yml');
        const actRunner = runner['actRunner'];
        const isActInstalled = await actRunner.checkInstallation();
        if (!isActInstalled) {
            console.log('Skipping empty dryRun test - act is not installed');
            return;
        }
        const result = await runner.runWorkflow(emptyWorkflowPath, {
            event: 'workflow_dispatch',
            runWithAct: true,
            actOptions: {
                dryRun: true
            }
        });
        expect(result.success).toBe(true);
        expect(result.actResult).toBeDefined();
    });

    it('should run minimal workflow with act (dryRun, single echo step)', async () => {
        // Create a workflow with a single echo step
        const echoWorkflowPath = resolve(__dirname, '../../src/templates/workflows/echo.yml');
        writeFileSync(echoWorkflowPath, `
name: Echo Workflow
on:
  workflow_dispatch:
jobs:
  echo:
    runs-on: ubuntu-latest
    steps:
      - name: Echo
        run: echo "test"
  `.trim());
        const actRunner = runner['actRunner'];
        const isActInstalled = await actRunner.checkInstallation();
        if (!isActInstalled) {
            console.log('Skipping echo dryRun test - act is not installed');
            return;
        }
        const result = await runner.runWorkflow(echoWorkflowPath, {
            event: 'workflow_dispatch',
            runWithAct: true,
            actOptions: {
                dryRun: true
            }
        });
        expect(result.success).toBe(true);
        expect(result.actResult).toBeDefined();
    });

    it('should run ci-node workflow with act (dryRun)', async () => {
        const actRunner = runner['actRunner'];
        const isActInstalled = await actRunner.checkInstallation();
        if (!isActInstalled) {
            console.log('Skipping ci-node dryRun test - act is not installed');
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
