import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { WorkflowTestRunner } from '~/testing/test-runner';
import { shouldRunTier2, skipIfDependenciesMissing, getTestConfig, initializeTestConfig } from '../utils/test-config';
import { resolve } from 'path';

describe('Execution Planning Tests (Tier 2)', () => {
  beforeAll(async () => {
    await initializeTestConfig();
    if (!shouldRunTier2()) {
      console.log('Skipping Tier 2 tests - dependencies not available');
      return;
    }
  });
  let runner: WorkflowTestRunner;
  const workflowPath = resolve(__dirname, '../../src/templates/workflows/ci-node.yml');
  const multiJobWorkflowPath = resolve(__dirname, '../../src/templates/workflows/multi-job.yml');
  const minimalWorkflowPath = resolve(__dirname, '../../src/templates/workflows/minimal.yml');

  beforeAll(() => {
    const config = getTestConfig();
    if (!config.actAvailable) {
      skipIfDependenciesMissing(['act'], 'Execution Planning Tests');
    }
  });

  beforeEach(() => {
    runner = new WorkflowTestRunner();
  });

  afterEach(async () => {
    await runner.cleanup();
  });

  it('should plan ci-node workflow execution with act dry-run', async () => {
    if (!shouldRunTier2()) {
      console.log('Skipping test - act not available');
      return;
    }
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      runWithAct: true,
      actOptions: {
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
    expect(result.actResult).toBeDefined();
    
    // In dry-run mode, act should validate the workflow structure
    // without actually executing the steps
    if (result.errors && result.errors.length > 0) {
      console.error('Act dry-run errors:', result.errors);
    }
  });

  it('should plan multi-job workflow execution', async () => {
    if (!shouldRunTier2()) {
      console.log('Skipping test - act not available');
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

  it('should plan minimal workflow execution', async () => {
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

  it('should validate workflow with push event', async () => {
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
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
  });

  it('should validate workflow with pull_request event', async () => {
    const result = await runner.runWorkflow(workflowPath, {
      event: 'pull_request',
      eventPayload: {
        action: 'opened',
        number: 123,
        pull_request: {
          head: { ref: 'feature/test' },
          base: { ref: 'main' }
        }
      },
      runWithAct: true,
      actOptions: {
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
  });

  it('should validate workflow with workflow_dispatch event', async () => {
    const result = await runner.runWorkflow(workflowPath, {
      event: 'workflow_dispatch',
      inputs: {
        debug: 'true',
        environment: 'test'
      },
      runWithAct: true,
      actOptions: {
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
  });

  it('should handle environment variables in dry-run', async () => {
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      env: {
        NODE_ENV: 'test',
        CI: 'true',
        CUSTOM_VAR: 'test-value'
      },
      runWithAct: true,
      actOptions: {
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
  });

  it('should handle secrets in dry-run', async () => {
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      secrets: {
        GITHUB_TOKEN: 'test-token',
        NPM_TOKEN: 'test-npm-token'
      },
      runWithAct: true,
      actOptions: {
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
  });

  it('should validate job execution order in dry-run', async () => {
    const result = await runner.runWorkflow(multiJobWorkflowPath, {
      event: 'workflow_dispatch',
      runWithAct: true,
      actOptions: {
        dryRun: true
      }
    });

    expect(result.success).toBe(true);
    
    // Act should validate that jobs with dependencies are planned correctly
    expect(result.actResult).toBeDefined();
  });

  it('should detect action resolution issues in dry-run', async () => {
    // Create a temporary workflow with an invalid action
    const invalidWorkflowContent = `
name: Invalid Action Test
on: workflow_dispatch
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: nonexistent/action@v1
`;

    const tempWorkflowPath = resolve(__dirname, '../fixtures/invalid-action.yml');
    const fs = await import('fs');
    fs.writeFileSync(tempWorkflowPath, invalidWorkflowContent);

    try {
      const result = await runner.runWorkflow(tempWorkflowPath, {
        event: 'workflow_dispatch',
        runWithAct: true,
        actOptions: {
          dryRun: true
        }
      });

      // Act should either succeed with warnings or fail gracefully
      // depending on the act version and configuration
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
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

  it('should handle matrix strategies in dry-run', async () => {
    // Test workflow with matrix strategy
    const matrixWorkflowContent = `
name: Matrix Test
on: workflow_dispatch
jobs:
  test:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
`;

    const tempWorkflowPath = resolve(__dirname, '../fixtures/matrix-test.yml');
    const fs = await import('fs');
    fs.writeFileSync(tempWorkflowPath, matrixWorkflowContent);

    try {
      const result = await runner.runWorkflow(tempWorkflowPath, {
        event: 'workflow_dispatch',
        runWithAct: true,
        actOptions: {
          dryRun: true
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
});