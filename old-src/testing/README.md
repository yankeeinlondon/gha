# GitHub Actions Workflow Testing Framework

This testing framework allows you to test GitHub Actions workflows locally before pushing to GitHub, catching errors early and ensuring workflows behave as expected.

## Features

- **Syntax Validation**: Validate workflow YAML syntax against schemas
- **Mock GitHub Context**: Mock GitHub events, secrets, and environment variables
- **Custom Assertions**: Purpose-built assertions for workflow testing
- **Act Integration**: Run workflows locally using `act` (optional)
- **Test Fixtures**: Pre-built event payloads for common scenarios

## Goals

If you're like me you:

1. Appreciate the value that Github Actions provides to modern development
2. Do not want to be an expert at it nor have to _push_ changes a bunch of times to find out of your recent "improvement" to CI/CD has worked or not. 

Let's be honest the whole round-trip of Github Actions testing can be infuriating.

### Composition

Another thing my ADHD rattled brain appreciates is the ability to have smaller and focused files rather than some giant monstrosity smashed into one file. The problem for me has been that I depend on the _types_ which many editors bring in from schema.org to keep my YAML for Github Workflows on guard rails and trying to break up configuration 


## Installation

```sh
# checkout repo
git clone @yankeeinlondon/gha
# Install dependencies for this repo's CLI builder
pnpm install
```

While it optional, it is recommended that you install `act` locally on your computer:

- [**act**](https://github.com/nektos/act) provides a mock environment for you to run actions in ([user guide](https://nektosact.com/)).
- [**act**](https://github.com/nektos/act) can be run in one of two modes:
  - `dry-run`
    - The dry run mode can be useful as a testing tool by itself and in this mode it doesn't require that [Docker](https://www.docker.com/) be installed and running.
    - in this mode static types can be checked along with general structure to be sure that theoretically your script will do what you want 
  - `live`
    - To actually test conditionals like `if` statements or get feedback jobs being run on the various OS environments, etc. you will need a VM that can simulate those environments.

```sh
# macOS
brew install act
```

<details>
<summary>Click here for other platforms</summary>

```sh
# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

```sh
# Windows
choco install act-cli
```

</details>

> **Note:** the `act` environment is not assumed to be in your CI/CD environment but all tests are should gracefully degrade to be run in various environments including CD/CD should you want to utilize it there:
> 
> 1. basic structural testing requires `nodejs` is available (this is lightweight to provision and is a requirement to run this CLI as well as do these types of tests)
> 2. act _dry runs_ require that the OS has the `act` program installed in it (these tests will run if it is found in the executable path of the runner, otherwise will gracefully set these tests to `skip` for the given run)
> 3. act _live runs_ require that act can find a running Docker container on the runner (tests that require a Docker instance will be set to `skip` in environments where this requirement is not found)
>
> In general we suggest you run all three tests locally before you push changes but in your CI/CD environments you can either skip altogether (as Github _is_ going to run CI/CD anyway) but for some more advanced use cases you can have it run the structural tests as a way to "fail fast" in situations where you think this could be helpful. Either way, the test suite the CLI will use will be based on the environment it runs in.


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
```

### Missing Dependencies

Run `pnpm install` to install all required dependencies.

### Schema Validation Errors

Ensure workflow schemas are present in `src/schemas/`. The framework will warn but continue if schemas are missing.
