# GitHub Actions Workflow Testing Framework

This testing framework allows you to test GitHub Actions workflows locally before pushing to GitHub, catching errors early and ensuring workflows behave as expected.

## Features

- **Syntax Validation**: Validate workflow YAML syntax against schemas
- **Mock GitHub Context**: Mock GitHub events, secrets, and environment variables
- **Custom Assertions**: Purpose-built assertions for workflow testing
- **Act Integration**: Run workflows locally using `act` (optional)
- **Test Fixtures**: Pre-built event payloads for common scenarios

## Installation

```bash
# Install dependencies
pnpm install

# Optional: Install act for local workflow execution
# macOS
brew install act

# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows
choco install act-cli
```

## Usage

### Basic Workflow Test

```typescript
import { describe, it, expect } from 'vitest';
import { WorkflowTestRunner } from '@/testing';

describe('My Workflow', () => {
  let runner: WorkflowTestRunner;

  beforeAll(() => {
    runner = new WorkflowTestRunner();
  });

  afterAll(async () => {
    await runner.cleanup();
  });

  it('should have valid syntax', async () => {
    const result = await runner.runWorkflow('.github/workflows/my-workflow.yml');
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Testing with Mock Context

```typescript
import { createPushContext, createPullRequestContext } from '@/testing';

it('should handle push events', async () => {
  const context = createPushContext({
    repository: 'owner/repo',
    ref: 'refs/heads/main',
    sha: 'abc123',
    actor: 'test-user'
  });

  const result = await runner.runWorkflow('.github/workflows/ci.yml', {
    event: 'push',
    eventPayload: context.github,
    env: context.env,
    secrets: {
      GITHUB_TOKEN: 'mock-token'
    }
  });

  expect(result.success).toBe(true);
});
```

### Custom Assertions

```typescript
await runner.assertWorkflow('.github/workflows/ci.yml', (assert, workflow) => {
  // Assert job existence
  assert.assertJobExists(workflow, 'build');
  
  // Assert job properties
  assert.assertJobProperties(workflow, 'build', {
    'runs-on': 'ubuntu-latest'
  });
  
  // Assert step configuration
  assert.assertStepExists(workflow, 'build', 'checkout');
  assert.assertStepProperties(workflow, 'build', 'checkout', {
    uses: 'actions/checkout@v4'
  });
  
  // Assert workflow triggers
  assert.assertTriggers(workflow, ['push', 'pull_request']);
  
  // Assert action usage
  assert.assertUsesAction(workflow, 'actions/setup-node');
});
```

### Using Vitest Custom Matchers

```typescript
it('should have required jobs and steps', async () => {
  const workflow = await loadWorkflow('.github/workflows/ci.yml');
  
  // Custom matchers
  expect(workflow).toHaveJob('test');
  expect(workflow.jobs.test).toHaveStep('checkout');
  expect(workflow.jobs.test.steps[0]).toUseAction('actions/checkout');
});
```

### Running with Act

To run workflows locally with `act`:

```typescript
it('should run successfully with act', async () => {
  const result = await runner.runWorkflow('.github/workflows/ci.yml', {
    event: 'push',
    runWithAct: true,
    actOptions: {
      dryRun: true, // Run without actually executing
      verbose: true,
      platform: 'ubuntu-latest=node:16'
    }
  });

  expect(result.success).toBe(true);
  expect(result.actResult).toBeDefined();
});
```

### Test Fixtures

Pre-built event payloads are available:

```typescript
import { TestFixtures } from '@/testing';

const fixtures = new TestFixtures();

// Load pre-built event payload
const pushEvent = fixtures.loadFixture('events/push.json');
const prEvent = fixtures.loadFixture('events/pull_request.json');

// Create custom fixtures
fixtures.saveFixture('events/custom.json', {
  // Your custom event payload
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run only workflow tests
pnpm test:workflows

# Run tests in watch mode
pnpm test:workflows -- --watch

# Run with coverage
pnpm test:workflows -- --coverage
```

## API Reference

### WorkflowTestRunner

Main class for running workflow tests.

#### Methods

- `runWorkflow(path, options)`: Run a workflow with optional mocking
- `assertWorkflow(path, assertions)`: Run assertions against a workflow
- `createMockContext(overrides)`: Create a mock GitHub context
- `cleanup()`: Clean up resources

### MockContext

Mock GitHub context and environment.

#### Methods

- `setEvent(event, payload)`: Set the GitHub event type and payload
- `setInputs(inputs)`: Set workflow inputs
- `setSecrets(secrets)`: Set secret values
- `setEnv(env)`: Set environment variables
- `createContext(overrides)`: Create a full GitHub context object

### WorkflowAssertions

Assertion helpers for workflows.

#### Methods

- `validateSyntax(workflow)`: Validate workflow syntax
- `assertJobExists(workflow, jobName)`: Assert a job exists
- `assertJobProperties(workflow, jobName, properties)`: Assert job properties
- `assertStepExists(workflow, jobName, stepId)`: Assert a step exists
- `assertStepProperties(workflow, jobName, stepId, properties)`: Assert step properties
- `assertTriggers(workflow, triggers)`: Assert workflow triggers
- `assertUsesAction(workflow, actionName)`: Assert an action is used

### ActRunner

Wrapper around the `act` CLI tool.

#### Methods

- `run(workflowPath, options)`: Run a workflow with act
- `checkInstallation()`: Check if act is installed
- `runWithStream(workflowPath, options)`: Run with streaming output

## Best Practices

1. **Test Syntax First**: Always validate syntax before testing execution
2. **Mock External Dependencies**: Use mock contexts to avoid external API calls
3. **Test Event Handling**: Test how workflows handle different GitHub events
4. **Validate Action Versions**: Ensure actions use specific versions
5. **Test Error Cases**: Include tests for failure scenarios

## Troubleshooting

### Act Not Found

If act is not installed, tests will skip execution tests. Install act:

```bash
# macOS
brew install act

# Or use npm/yarn
npm install -g @oclif/plugin-not-found act
```

### Missing Dependencies

Run `pnpm install` to install all required dependencies.

### Schema Validation Errors

Ensure workflow schemas are present in `src/schemas/`. The framework will warn but continue if schemas are missing.
