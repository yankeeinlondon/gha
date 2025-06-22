# GitHub Actions Modular Workflow System

A powerful, composable system for building and testing GitHub Actions workflows using TypeScript. Create reusable workflow templates, compose them together, and test them locally before deployment.

## Features

- 🧩 **Modular Templates** - Create reusable workflow, job, and step templates
- 🔧 **TypeScript-based** - Write workflows with full type safety and IntelliSense
- 🧪 **Local Testing** - Test workflows locally without pushing to GitHub
- 📦 **Template Composition** - Compose templates to build complex workflows
- 🔍 **Schema Validation** - Validate workflows against GitHub Actions schema
- 🚀 **CLI Tools** - Build, validate, and test workflows from the command line
- 📝 **Auto-generated Documentation** - Generate docs from your templates

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gha-modular-workflows.git
cd gha-modular-workflows

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Create Your First Workflow

1. **Using TypeScript Builder**:

```typescript
import { WorkflowBuilder } from '@gha/builders';

const workflow = new WorkflowBuilder('ci')
  .name('Continuous Integration')
  .on({
    push: { branches: ['main'] },
    pull_request: { branches: ['main'] }
  })
  .job('test', {
    'runs-on': 'ubuntu-latest',
    steps: [
      { uses: 'actions/checkout@v4' },
      { 
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: { 'node-version': '20.x' }
      },
      { run: 'npm test' }
    ]
  })
  .build();

// Generate the workflow file
workflow.toFile('.github/workflows/ci.yml');
```

2. **Using YAML Templates**:

Create a template in `src/templates/workflows/my-workflow.yml`:

```yaml
# @template: workflow
# @description: My custom workflow template
name: My Workflow
on:
  push:
    branches: [${{ inputs.branches }}]

jobs:
  build:
    # @extends: jobs/test-node.yml
    # @with:
    #   node-version: ${{ inputs.nodeVersion }}
```

Then build it:

```bash
pnpm gha build src/templates/workflows/my-workflow.yml
```

### Test Your Workflow

```typescript
import { testWorkflow } from '@gha/testing';

describe('My Workflow', () => {
  it('should run on push to main', async () => {
    const result = await testWorkflow('.github/workflows/ci.yml', {
      event: 'push',
      payload: {
        ref: 'refs/heads/main',
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      }
    });
    
    expect(result.jobs.test.status).toBe('success');
    expect(result.jobs.test.steps[2].outputs).toContain('All tests passed');
  });
});
```

## Template System

### Template Types

1. **Workflow Templates** (`src/templates/workflows/`)
   - Complete workflow definitions
   - Can include multiple jobs
   - Support input parameters

2. **Job Templates** (`src/templates/jobs/`)
   - Reusable job definitions
   - Can be referenced by workflows
   - Support matrix strategies

3. **Step Templates** (`src/templates/steps/`)
   - Individual step definitions
   - Reusable across jobs
   - Support conditional execution

### Template Syntax

Templates use special comments for the modular system:

```yaml
# @template: job
# @description: Run tests on multiple Node versions
# @inputs:
#   node-version:
#     description: Node.js versions to test
#     required: false
#     default: "['18.x', '20.x']"
#   coverage:
#     description: Enable coverage reporting
#     required: false
#     default: true

name: Test Node.js
runs-on: ubuntu-latest
strategy:
  matrix:
    node-version: ${{ inputs.node-version }}
steps:
  # @extends: steps/checkout.yml
  # @extends: steps/setup-node.yml
  # @with:
  #   node-version: ${{ matrix.node-version }}
  - run: npm test
    if: ${{ !inputs.coverage }}
  - run: npm test -- --coverage
    if: ${{ inputs.coverage }}
```

### Composing Templates

Templates can be composed together:

```yaml
jobs:
  test:
    # @extends: jobs/test-node.yml
    # @with:
    #   node-version: "['20.x', '22.x']"
    #   coverage: true
  
  build:
    needs: test
    # @extends: jobs/build-node.yml
    # @with:
    #   artifacts: true
```

## CLI Commands

```bash
# Build a workflow from templates
pnpm gha build <template-path> [--output <path>] [--validate]

# Validate a workflow
pnpm gha validate <workflow-path>

# Test a workflow locally
pnpm gha test <workflow-path> [--event <type>] [--payload <file>]

# Generate a new template
pnpm gha generate <type> <name> [--path <dir>]

# List available templates
pnpm gha list [--type <workflow|job|step>]

# Parse workflow to TypeScript
pnpm gha parse <workflow-path> [--output <path>]
```

## Configuration

Create a `gha-build.config.ts` file in your project root:

```typescript
import { GHABuildConfig } from '@gha/builders';

const config: GHABuildConfig = {
  templatesDir: './src/templates',
  outputDir: './.github/workflows',
  schemasDir: './src/schemas',
  strictMode: true,
  
  resolution: {
    enableCache: true,
    maxDepth: 10,
    sources: ['local', 'github'],
  },
  
  validation: {
    validateSchema: true,
    checkDeprecated: true,
    validateExpressions: true,
  },
  
  generation: {
    includeComments: true,
    formatOutput: true,
    generateSourceMaps: false,
  },
  
  testing: {
    eventsDir: './tests/fixtures/events',
    enableAct: false,
    timeout: 30000,
  },
};

export default config;
```

## Testing

### Unit Testing Workflows

```typescript
import { describe, it, expect } from 'vitest';
import { testWorkflow, mockGitHubContext } from '@gha/testing';

describe('CI Workflow', () => {
  it('should skip tests on docs changes', async () => {
    const context = mockGitHubContext({
      event_name: 'push',
      event: {
        head_commit: {
          message: 'docs: update README'
        }
      }
    });
    
    const result = await testWorkflow('.github/workflows/ci.yml', context);
    
    expect(result.jobs.test.skipped).toBe(true);
    expect(result.jobs.test.skipReason).toContain('docs only');
  });
});
```

### Integration Testing with Act

```typescript
import { runWithAct } from '@gha/testing/act';

describe('Integration Tests', () => {
  it('should build and test the project', async () => {
    const result = await runWithAct('.github/workflows/ci.yml', {
      event: 'push',
      job: 'test',
      platform: 'ubuntu-latest'
    });
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('All tests passed');
  });
});
```

## Examples

See the `examples/` directory for complete examples:

- `examples/workflows/publish-npm.yml` - NPM package publishing workflow
- `examples/workflows/security-scan.yml` - Comprehensive security scanning
- `examples/basic-build.ts` - TypeScript workflow builder example

## API Reference

### WorkflowBuilder

```typescript
class WorkflowBuilder {
  constructor(id: string);
  name(name: string): this;
  on(triggers: WorkflowTriggers): this;
  env(env: Record<string, string>): this;
  job(id: string, job: Job): this;
  defaults(defaults: Defaults): this;
  permissions(permissions: Permissions): this;
  build(): Workflow;
  toYAML(): string;
  toFile(path: string): void;
}
```

### Template Functions

```typescript
// Load and resolve a template
function loadTemplate(path: string, inputs?: Record<string, any>): Template;

// Compose multiple templates
function composeTemplates(templates: Template[]): Template;

// Validate a template
function validateTemplate(template: Template): ValidationResult;
```

### Testing Utilities

```typescript
// Test a workflow with mocked context
function testWorkflow(
  path: string, 
  context: GitHubContext
): Promise<WorkflowResult>;

// Create mock GitHub context
function mockGitHubContext(overrides?: Partial<GitHubContext>): GitHubContext;

// Assert workflow behavior
function assertJobSucceeded(result: WorkflowResult, jobId: string): void;
function assertStepRan(result: WorkflowResult, jobId: string, stepName: string): void;
```

## Best Practices

1. **Use Templates for Reusability**
   - Create templates for common patterns
   - Use inputs to make templates flexible
   - Document templates with descriptions

2. **Test Before Deployment**
   - Write unit tests for critical workflows
   - Use integration tests for complex scenarios
   - Test with different event types

3. **Validate Early**
   - Use schema validation during development
   - Check for deprecated syntax
   - Validate expressions and contexts

4. **Organize Templates**
   - Group related templates together
   - Use clear naming conventions
   - Keep templates focused and single-purpose

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- GitHub Actions documentation and schema
- act - Local GitHub Actions runner
- TypeScript community
