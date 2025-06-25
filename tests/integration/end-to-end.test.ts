import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import { WorkflowTestRunner } from '~/testing/test-runner';
import { shouldRunTier3, skipIfDependenciesMissing, getTestConfig, initializeTestConfig } from '../utils/test-config';
import { resolve } from 'path';

describe('End-to-End Integration Tests (Tier 3)', () => {
  beforeAll(async () => {
    await initializeTestConfig();
    if (!shouldRunTier3()) {
      console.log('Skipping Tier 3 tests - dependencies not available');
      return;
    }
  });
  let runner: WorkflowTestRunner;
  const workflowPath = resolve(__dirname, '../../src/templates/workflows/ci-node.yml');
  const minimalWorkflowPath = resolve(__dirname, '../../src/templates/workflows/minimal.yml');

  beforeAll(() => {
    const config = getTestConfig();
    if (!config.actAvailable || !config.dockerAvailable) {
      skipIfDependenciesMissing(['act', 'docker'], 'End-to-End Integration Tests');
    }
  });

  beforeEach(() => {
    runner = new WorkflowTestRunner();
  });

  afterEach(async () => {
    await runner.cleanup();
  });

  it('should execute ci-node workflow successfully with real containers', async () => {
    if (!shouldRunTier3()) {
      console.log('Skipping test - full container dependencies not available');
      return;
    }
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      eventPayload: {
        ref: 'refs/heads/main',
        repository: {
          name: 'test-repo',
          full_name: 'owner/test-repo'
        }
      },
      runWithAct: true,
      actOptions: {
        // No dryRun: run with real containers
        platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
      }
    });

    if (!result.success) {
      // Log detailed error information for debugging
      console.error('❌ Workflow execution failed');
      console.error('Errors:', result.errors?.join('\n') ?? '(no errors)');
      console.error('Logs:', result.logs?.join('\n') ?? '(no logs)');
      
      if (result.actResult) {
        console.error('Act Result Errors:', result.actResult.errors?.join('\n') ?? '(no act errors)');
        console.error('Act Result Logs:', result.actResult.logs?.join('\n') ?? '(no act logs)');
      }
    }

    expect(result.success).toBe(true);
    expect(result.actResult).toBeDefined();
  });

  it('should execute minimal workflow with real containers', async () => {
    if (!shouldRunTier3()) {
      console.log('Skipping test - full container dependencies not available');
      return;
    }
    const result = await runner.runWorkflow(minimalWorkflowPath, {
      event: 'workflow_dispatch',
      runWithAct: true,
      actOptions: {
        platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
      }
    });

    expect(result.success).toBe(true);
    expect(result.actResult).toBeDefined();
  });

  it('should handle real GitHub actions execution', async () => {
    if (!shouldRunTier3()) {
      console.log('Skipping test - full container dependencies not available');
      return;
    }
    // Create a simple workflow that uses real GitHub actions
    const simpleWorkflowContent = `
name: Simple Actions Test
on: workflow_dispatch
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Print Node version
        run: node --version
      - name: Print npm version
        run: npm --version
`;

    const tempWorkflowPath = resolve(__dirname, '../fixtures/simple-actions.yml');
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(tempWorkflowPath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    fs.writeFileSync(tempWorkflowPath, simpleWorkflowContent);

    try {
      const result = await runner.runWorkflow(tempWorkflowPath, {
        event: 'workflow_dispatch',
        runWithAct: true,
        actOptions: {
          platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
        }
      });

      if (!result.success && result.errors) {
        console.error('Simple actions test failed:', result.errors);
      }

      expect(result.success).toBe(true);
      expect(result.actResult).toBeDefined();
      
      // Check that Node.js was actually set up
      if (result.logs) {
        const logs = result.logs.join('\n');
        expect(logs).toMatch(/v\d+\.\d+\.\d+/); // Should contain Node version output
      }
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempWorkflowPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('should execute workflow with environment variables', async () => {
    const envWorkflowContent = `
name: Environment Test
on: workflow_dispatch
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      TEST_VAR: "test-value"
      NODE_ENV: "test"
    steps:
      - name: Print environment variables
        run: |
          echo "TEST_VAR=$TEST_VAR"
          echo "NODE_ENV=$NODE_ENV"
          echo "CI=$CI"
      - name: Verify variables
        run: |
          test "$TEST_VAR" = "test-value"
          test "$NODE_ENV" = "test"
`;

    const tempWorkflowPath = resolve(__dirname, '../fixtures/env-test.yml');
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(tempWorkflowPath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    fs.writeFileSync(tempWorkflowPath, envWorkflowContent);

    try {
      const result = await runner.runWorkflow(tempWorkflowPath, {
        event: 'workflow_dispatch',
        env: {
          CI: 'true',
          CUSTOM_VAR: 'custom-value'
        },
        runWithAct: true,
        actOptions: {
          platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
        }
      });

      expect(result.success).toBe(true);
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempWorkflowPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle multi-job workflow with dependencies', async () => {
    const multiJobContent = `
name: Multi-Job Test
on: workflow_dispatch
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      test-result: \${{ steps.test.outputs.result }}
    steps:
      - name: Setup step
        run: echo "Setting up..."
      - name: Test step
        id: test
        run: echo "result=success" >> $GITHUB_OUTPUT
        
  build:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Build step
        run: |
          echo "Building..."
          echo "Previous job result: \${{ needs.setup.outputs.test-result }}"
          
  deploy:
    needs: [setup, build]
    runs-on: ubuntu-latest
    if: \${{ needs.setup.outputs.test-result == 'success' }}
    steps:
      - name: Deploy step
        run: echo "Deploying..."
`;

    const tempWorkflowPath = resolve(__dirname, '../fixtures/multi-job.yml');
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(tempWorkflowPath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    fs.writeFileSync(tempWorkflowPath, multiJobContent);

    try {
      const result = await runner.runWorkflow(tempWorkflowPath, {
        event: 'workflow_dispatch',
        runWithAct: true,
        actOptions: {
          platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
        }
      });

      if (!result.success && result.errors) {
        console.error('Multi-job test failed:', result.errors);
      }

      expect(result.success).toBe(true);
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempWorkflowPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle workflow timeouts gracefully', async () => {
    // Create a workflow that might take a while but should complete within reasonable time
    const timeoutWorkflowContent = `
name: Timeout Test
on: workflow_dispatch
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 1
    steps:
      - name: Quick task
        run: |
          echo "Starting task..."
          sleep 5
          echo "Task completed"
`;

    const tempWorkflowPath = resolve(__dirname, '../fixtures/timeout-test.yml');
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(tempWorkflowPath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    fs.writeFileSync(tempWorkflowPath, timeoutWorkflowContent);

    try {
      const result = await runner.runWorkflow(tempWorkflowPath, {
        event: 'workflow_dispatch',
        runWithAct: true,
        actOptions: {
          platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
        }
      });

      // Should complete successfully within the timeout
      expect(result.success).toBe(true);
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempWorkflowPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
});
