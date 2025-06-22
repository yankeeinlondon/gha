# Testing GitHub Actions Workflows

This guide covers how to test your GitHub Actions workflows locally before pushing to GitHub.

## Table of Contents

- [Overview](#overview)
- [Testing Approaches](#testing-approaches)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Mocking and Fixtures](#mocking-and-fixtures)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Testing GitHub Actions workflows locally helps you:
- Catch errors before pushing to GitHub
- Verify workflow logic and conditions
- Test different event types and payloads
- Ensure outputs and artifacts are correct
- Save time and GitHub Actions minutes

## Testing Approaches

### 1. Static Validation

Validate workflow syntax and schema:

```bash
# Validate a single workflow
pnpm gha validate .github/workflows/ci.yml

# Validate all workflows
pnpm gha validate .github/workflows/*.yml

# Validate with strict mode
pnpm gha validate --strict workflow.yml
```

### 2. Unit Testing

Test individual jobs and steps:

```typescript
import { describe, it, expect } from 'vitest';
import { testJob, mockStep } from '@gha/testing';

describe('Test Job', () => {
  it('should run tests on multiple Node versions', async () => {
    const result = await testJob('test', {
      workflow: '.github/workflows/ci.yml',
      inputs: {
        'node-version': ['18.x', '20.x', '22.x']
      }
    });
    
    expect(result.strategy.matrix['node-version']).toHaveLength(3);
    expect(result.status).toBe('success');
  });
  
  it('should skip tests on documentation changes', async () => {
    const result = await testJob('test', {
      workflow: '.github/workflows/ci.yml',
      context: {
        event_name: 'push',
        event: {
          head_commit: {
            message: 'docs: update README'
          }
        }
      }
    });
    
    expect(result.skipped).toBe(true);
  });
});
```

### 3. Integration Testing

Test complete workflows with act:

```typescript
import { describe, it, expect } from 'vitest';
import { runWithAct } from '@gha/testing/act';

describe('CI Workflow Integration', () => {
  it('should complete full CI pipeline', async () => {
    const result = await runWithAct({
      workflow: '.github/workflows/ci.yml',
      event: 'push',
      platform: 'ubuntu-latest'
    });
    
    expect(result.exitCode).toBe(0);
    expect(result.jobs).toHaveProperty('test');
    expect(result.jobs).toHaveProperty('build');
  });
});
```

## Unit Testing

### Testing Workflows

```typescript
import { testWorkflow } from '@gha/testing';

describe('Workflow Tests', () => {
  it('should trigger on push to main', async () => {
    const result = await testWorkflow('.github/workflows/deploy.yml', {
      event: 'push',
      payload: {
        ref: 'refs/heads/main'
      }
    });
    
    expect(result.triggered).toBe(true);
    expect(result.jobs.deploy).toBeDefined();
  });
  
  it('should not trigger on push to feature branch', async () => {
    const result = await testWorkflow('.github/workflows/deploy.yml', {
      event: 'push',
      payload: {
        ref: 'refs/heads/feature/new-feature'
      }
    });
    
    expect(result.triggered).toBe(false);
  });
});
```

### Testing Jobs

```typescript
import { testJob } from '@gha/testing';

describe('Job Tests', () => {
  it('should use correct runner', async () => {
    const result = await testJob('build', {
      workflow: '.github/workflows/ci.yml'
    });
    
    expect(result.runsOn).toBe('ubuntu-latest');
  });
  
  it('should have required permissions', async () => {
    const result = await testJob('deploy', {
      workflow: '.github/workflows/cd.yml'
    });
    
    expect(result.permissions).toEqual({
      contents: 'read',
      deployments: 'write'
    });
  });
  
  it('should run steps in correct order', async () => {
    const result = await testJob('test', {
      workflow: '.github/workflows/ci.yml'
    });
    
    const stepNames = result.steps.map(s => s.name);
    expect(stepNames).toEqual([
      'Checkout',
      'Setup Node.js',
      'Install dependencies',
      'Run tests',
      'Upload coverage'
    ]);
  });
});
```

### Testing Steps

```typescript
import { testStep } from '@gha/testing';

describe('Step Tests', () => {
  it('should checkout with correct depth', async () => {
    const result = await testStep('Checkout', {
      workflow: '.github/workflows/ci.yml',
      job: 'test'
    });
    
    expect(result.uses).toBe('actions/checkout@v4');
    expect(result.with['fetch-depth']).toBe(0);
  });
  
  it('should run conditional step', async () => {
    const result = await testStep('Deploy', {
      workflow: '.github/workflows/cd.yml',
      job: 'deploy',
      context: {
        github: { ref: 'refs/heads/main' }
      }
    });
    
    expect(result.shouldRun).toBe(true);
  });
});
```

### Testing Expressions

```typescript
import { evaluateExpression } from '@gha/testing';

describe('Expression Tests', () => {
  it('should evaluate complex conditions', () => {
    const context = {
      github: {
        event_name: 'push',
        ref: 'refs/heads/main'
      },
      inputs: {
        deploy: true
      }
    };
    
    const result = evaluateExpression(
      "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && inputs.deploy }}",
      context
    );
    
    expect(result).toBe(true);
  });
});
```

## Integration Testing

### Using Act

Act runs workflows locally in Docker containers:

```typescript
import { ActRunner } from '@gha/testing/act';

describe('Act Integration Tests', () => {
  const runner = new ActRunner();
  
  it('should build project', async () => {
    const result = await runner.run({
      workflow: '.github/workflows/ci.yml',
      job: 'build',
      event: 'push'
    });
    
    expect(result.exitCode).toBe(0);
    expect(result.artifacts).toContain('build-output');
  });
  
  it('should handle secrets', async () => {
    const result = await runner.run({
      workflow: '.github/workflows/deploy.yml',
      secrets: {
        DEPLOY_KEY: 'test-key',
        API_TOKEN: 'test-token'
      }
    });
    
    expect(result.exitCode).toBe(0);
  });
});
```

### Testing with Docker

Test containerized workflows:

```typescript
describe('Container Tests', () => {
  it('should run in custom container', async () => {
    const result = await testJob('lint', {
      workflow: '.github/workflows/ci.yml',
      container: {
        image: 'node:20-alpine',
        options: '--cpus 2'
      }
    });
    
    expect(result.container.image).toBe('node:20-alpine');
  });
});
```

### Testing Services

Test workflows that use service containers:

```typescript
describe('Service Tests', () => {
  it('should connect to database service', async () => {
    const result = await testJob('integration', {
      workflow: '.github/workflows/test.yml',
      services: {
        postgres: {
          image: 'postgres:15',
          env: {
            POSTGRES_PASSWORD: 'test'
          }
        }
      }
    });
    
    expect(result.services.postgres.status).toBe('running');
  });
});
```

## Mocking and Fixtures

### Mock GitHub Context

```typescript
import { mockGitHubContext } from '@gha/testing';

const context = mockGitHubContext({
  event_name: 'pull_request',
  event: {
    action: 'opened',
    number: 42,
    pull_request: {
      title: 'Add new feature',
      head: { ref: 'feature/awesome' },
      base: { ref: 'main' }
    }
  },
  actor: 'octocat',
  repository: 'octocat/hello-world'
});
```

### Mock Outputs

```typescript
import { mockStepOutput } from '@gha/testing';

describe('Output Tests', () => {
  it('should use step outputs', async () => {
    mockStepOutput('build', 'version', '1.2.3');
    
    const result = await testStep('Deploy', {
      workflow: '.github/workflows/cd.yml',
      job: 'deploy'
    });
    
    expect(result.env.VERSION).toBe('1.2.3');
  });
});
```

### Event Fixtures

Create reusable event fixtures:

```json
// tests/fixtures/events/release.json
{
  "action": "published",
  "release": {
    "tag_name": "v1.0.0",
    "name": "Version 1.0.0",
    "draft": false,
    "prerelease": false,
    "target_commitish": "main"
  }
}
```

Use fixtures in tests:

```typescript
import { loadEventFixture } from '@gha/testing';

it('should deploy on release', async () => {
  const event = await loadEventFixture('release.json');
  
  const result = await testWorkflow('.github/workflows/release.yml', {
    event: 'release',
    payload: event
  });
  
  expect(result.jobs.deploy.status).toBe('success');
});
```

### Mock External Actions

```typescript
import { mockAction } from '@gha/testing';

// Mock external action behavior
mockAction('actions/upload-artifact@v4', {
  outputs: {
    'artifact-id': '12345',
    'artifact-url': 'https://example.com/artifact'
  }
});

// Mock action failure
mockAction('actions/deploy@v1', {
  exitCode: 1,
  error: 'Deployment failed'
});
```

## Best Practices

### 1. Test Event Triggers

Always test different event types:

```typescript
describe('Event Triggers', () => {
  const events = ['push', 'pull_request', 'release', 'workflow_dispatch'];
  
  events.forEach(event => {
    it(`should handle ${event} event`, async () => {
      const result = await testWorkflow('.github/workflows/ci.yml', {
        event,
        payload: loadEventFixture(`${event}.json`)
      });
      
      expect(result.triggered).toBeDefined();
    });
  });
});
```

### 2. Test Matrix Strategies

Verify matrix combinations:

```typescript
it('should test all matrix combinations', async () => {
  const result = await testJob('test', {
    workflow: '.github/workflows/ci.yml'
  });
  
  const expectedCombinations = [
    { os: 'ubuntu-latest', node: '18.x' },
    { os: 'ubuntu-latest', node: '20.x' },
    { os: 'windows-latest', node: '18.x' },
    { os: 'windows-latest', node: '20.x' }
  ];
  
  expect(result.matrix.combinations).toEqual(expectedCombinations);
});
```

### 3. Test Error Handling

Verify workflows handle failures:

```typescript
it('should continue on test failure', async () => {
  mockStepFailure('Run tests');
  
  const result = await testJob('test', {
    workflow: '.github/workflows/ci.yml'
  });
  
  expect(result.steps.find(s => s.name === 'Run tests').outcome).toBe('failure');
  expect(result.steps.find(s => s.name === 'Upload logs').outcome).toBe('success');
});
```

### 4. Test Timeouts

Ensure appropriate timeouts:

```typescript
it('should timeout long-running jobs', async () => {
  const result = await testJob('integration', {
    workflow: '.github/workflows/test.yml'
  });
  
  expect(result.timeoutMinutes).toBe(30);
});
```

### 5. Test Concurrency

Verify concurrency settings:

```typescript
it('should handle concurrency groups', async () => {
  const result = await testWorkflow('.github/workflows/deploy.yml', {
    event: 'push',
    payload: { ref: 'refs/heads/main' }
  });
  
  expect(result.concurrency.group).toBe('deploy-main');
  expect(result.concurrency['cancel-in-progress']).toBe(true);
});
```

## Advanced Testing

### Performance Testing

```typescript
import { measureWorkflowPerformance } from '@gha/testing/performance';

it('should complete within time limit', async () => {
  const metrics = await measureWorkflowPerformance('.github/workflows/ci.yml');
  
  expect(metrics.totalDuration).toBeLessThan(600000); // 10 minutes
  expect(metrics.jobs.test.duration).toBeLessThan(300000); // 5 minutes
});
```

### Security Testing

```typescript
import { scanWorkflowSecurity } from '@gha/testing/security';

it('should not expose secrets', async () => {
  const issues = await scanWorkflowSecurity('.github/workflows/deploy.yml');
  
  expect(issues.filter(i => i.severity === 'high')).toHaveLength(0);
});
```

### Accessibility Testing

```typescript
it('should generate accessible logs', async () => {
  const result = await testWorkflow('.github/workflows/ci.yml');
  
  result.logs.forEach(log => {
    expect(log).not.toContain('ANSI escape codes');
    expect(log).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
  });
});
```

## Troubleshooting

### Common Issues

1. **Act Not Found**
   ```bash
   # Install act
   brew install act  # macOS
   # or
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

2. **Docker Not Running**
   ```bash
   # Start Docker
   docker info  # Check if Docker is running
   ```

3. **Missing Secrets**
   ```typescript
   // Provide test secrets
   const result = await runner.run({
     secrets: {
       GITHUB_TOKEN: 'test-token'
     }
   });
   ```

4. **Path Issues**
   ```typescript
   // Use absolute paths for workflows
   import { resolve } from 'path';
   
   const workflowPath = resolve('.github/workflows/ci.yml');
   ```

### Debug Mode

Enable debug output:

```typescript
import { setTestDebug } from '@gha/testing';

setTestDebug(true);

// Or via environment variable
process.env.GHA_TEST_DEBUG = 'true';
```

### Test Reports

Generate detailed test reports:

```bash
# Run tests with coverage
pnpm test --coverage

# Generate HTML report
pnpm test --reporter=html

# Generate JSON report for CI
pnpm test --reporter=json --outputFile=test-results.json
```

## Examples

### Complete Test Suite

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  testWorkflow, 
  mockGitHubContext,
  ActRunner,
  loadEventFixture 
} from '@gha/testing';

describe('CI/CD Pipeline', () => {
  let runner: ActRunner;
  
  beforeAll(() => {
    runner = new ActRunner();
  });
  
  afterAll(() => {
    runner.cleanup();
  });
  
  describe('CI Workflow', () => {
    it('should run on pull request', async () => {
      const event = await loadEventFixture('pull_request.json');
      const result = await testWorkflow('.github/workflows/ci.yml', {
        event: 'pull_request',
        payload: event
      });
      
      expect(result.triggered).toBe(true);
      expect(result.jobs.test.status).toBe('success');
      expect(result.jobs.build.status).toBe('success');
    });
    
    it('should skip draft PRs', async () => {
      const event = await loadEventFixture('pull_request.json');
      event.pull_request.draft = true;
      
      const result = await testWorkflow('.github/workflows/ci.yml', {
        event: 'pull_request',
        payload: event
      });
      
      expect(result.jobs.test.skipped).toBe(true);
    });
  });
  
  describe('CD Workflow', () => {
    it('should deploy on push to main', async () => {
      const result = await testWorkflow('.github/workflows/cd.yml', {
        event: 'push',
        payload: {
          ref: 'refs/heads/main',
          commits: [{ message: 'feat: new feature' }]
        }
      });
      
      expect(result.jobs.deploy.status).toBe('success');
    });
    
    it('should run integration test with act', async () => {
      const result = await runner.run({
        workflow: '.github/workflows/cd.yml',
        job: 'deploy',
        event: 'push',
        platform: 'ubuntu-latest'
      });
      
      expect(result.exitCode).toBe(0);
    });
  });
});
```

## Next Steps

- Read the [Composition Guide](./COMPOSITION.md) to learn about creating templates
- Check the [examples](../examples/) directory for test examples
- Set up CI/CD to run tests automatically
