# Template Composition Guide

This guide explains how to create and compose templates in the GitHub Actions Modular Workflow System.

## Table of Contents

- [Template Basics](#template-basics)
- [Template Types](#template-types)
- [Composition Syntax](#composition-syntax)
- [Input Parameters](#input-parameters)
- [Advanced Composition](#advanced-composition)
- [Best Practices](#best-practices)

## Template Basics

Templates are reusable YAML configurations that can be composed together to create complex workflows. Each template is annotated with special comments that the build system processes.

### Template Structure

```yaml
# @template: <type>
# @description: <description>
# @inputs:
#   <input-name>:
#     description: <description>
#     required: <true|false>
#     default: <default-value>
# @outputs:
#   <output-name>:
#     description: <description>
#     value: <expression>

# Template content here
```

## Template Types

### 1. Workflow Templates

Located in `src/templates/workflows/`, these define complete workflows:

```yaml
# @template: workflow
# @description: CI/CD pipeline for Node.js projects
# @inputs:
#   node-versions:
#     description: Node.js versions to test
#     required: false
#     default: "['18.x', '20.x']"
#   deploy:
#     description: Whether to deploy after tests
#     required: false
#     default: false

name: Node.js CI/CD
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    # @extends: jobs/test-node.yml
    # @with:
    #   node-version: ${{ inputs.node-versions }}
  
  deploy:
    if: ${{ inputs.deploy && github.ref == 'refs/heads/main' }}
    needs: test
    # @extends: jobs/deploy-node.yml
```

### 2. Job Templates

Located in `src/templates/jobs/`, these define reusable jobs:

```yaml
# @template: job
# @description: Build and test Node.js project
# @inputs:
#   node-version:
#     description: Node.js version(s)
#     required: false
#     default: "['20.x']"
#   os:
#     description: Operating systems to test on
#     required: false
#     default: "['ubuntu-latest']"
# @outputs:
#   coverage:
#     description: Test coverage percentage
#     value: ${{ steps.test.outputs.coverage }}

name: Test
runs-on: ${{ matrix.os }}
strategy:
  matrix:
    os: ${{ inputs.os }}
    node-version: ${{ inputs.node-version }}
steps:
  # @extends: steps/checkout.yml
  # @extends: steps/setup-node.yml
  # @with:
  #   node-version: ${{ matrix.node-version }}
  
  - name: Install dependencies
    run: npm ci
  
  - name: Run tests
    id: test
    run: |
      npm test -- --coverage
      echo "coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')" >> $GITHUB_OUTPUT
```

### 3. Step Templates

Located in `src/templates/steps/`, these define reusable steps:

```yaml
# @template: step
# @description: Setup Node.js with caching
# @inputs:
#   node-version:
#     description: Node.js version
#     required: true
#   cache:
#     description: Package manager to cache
#     required: false
#     default: 'npm'
#   registry-url:
#     description: NPM registry URL
#     required: false

name: Setup Node.js ${{ inputs.node-version }}
uses: actions/setup-node@v4
with:
  node-version: ${{ inputs.node-version }}
  cache: ${{ inputs.cache }}
  registry-url: ${{ inputs.registry-url }}
```

## Composition Syntax

### Basic Extension

Use `@extends` to include a template:

```yaml
steps:
  # @extends: steps/checkout.yml
  # @extends: steps/setup-node.yml
```

### With Parameters

Pass inputs to templates using `@with`:

```yaml
jobs:
  test:
    # @extends: jobs/test-node.yml
    # @with:
    #   node-version: "['18.x', '20.x', '22.x']"
    #   coverage: true
    #   os: "['ubuntu-latest', 'windows-latest', 'macos-latest']"
```

### Conditional Extension

Templates can be conditionally included:

```yaml
jobs:
  test:
    # @extends: jobs/test-node.yml
    # @if: ${{ github.event_name == 'pull_request' }}
    
  quick-test:
    # @extends: jobs/quick-test.yml
    # @if: ${{ github.event_name == 'push' }}
```

### Multiple Extensions

Compose multiple templates in sequence:

```yaml
steps:
  # Setup steps
  # @extends: steps/checkout.yml
  # @extends: steps/setup-node.yml
  # @extends: steps/restore-cache.yml
  
  # Build steps
  - run: npm ci
  - run: npm run build
  
  # Test steps
  # @extends: steps/test-unit.yml
  # @extends: steps/test-integration.yml
  # @extends: steps/upload-coverage.yml
```

## Input Parameters

### Defining Inputs

Templates can define inputs with validation:

```yaml
# @inputs:
#   environment:
#     description: Deployment environment
#     required: true
#     type: string
#     enum: ['development', 'staging', 'production']
#   
#   replicas:
#     description: Number of replicas
#     required: false
#     type: number
#     default: 3
#     minimum: 1
#     maximum: 10
```

### Using Inputs

Reference inputs in templates:

```yaml
env:
  NODE_ENV: ${{ inputs.environment }}
  REPLICAS: ${{ inputs.replicas }}

steps:
  - name: Deploy to ${{ inputs.environment }}
    run: |
      echo "Deploying with ${{ inputs.replicas }} replicas"
```

### Input Inheritance

Child templates inherit parent inputs:

```yaml
# Parent workflow
# @inputs:
#   debug:
#     description: Enable debug mode
#     default: false

jobs:
  build:
    # @extends: jobs/build.yml
    # Child job automatically has access to ${{ inputs.debug }}
```

## Advanced Composition

### Template Overrides

Override specific parts of extended templates:

```yaml
jobs:
  test:
    # @extends: jobs/test-node.yml
    # @override:
    #   timeout-minutes: 30
    #   continue-on-error: true
    
    # Additional steps are appended
    steps:
      # @append
      - name: Additional validation
        run: npm run validate
```

### Merge Strategies

Control how templates are merged:

```yaml
# @extends: jobs/base-job.yml
# @merge-strategy:
#   env: merge        # Merge environment variables
#   steps: append     # Append steps
#   outputs: replace  # Replace outputs
```

### Dynamic Composition

Compose templates based on conditions:

```yaml
jobs:
  dynamic:
    # @for: environment in ['dev', 'staging', 'prod']
    # @extends: jobs/deploy.yml
    # @with:
    #   environment: ${{ environment }}
    #   name: deploy-${{ environment }}
```

### Template Fragments

Create partial templates for composition:

```yaml
# @template: fragment
# @description: Common setup steps
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  - run: npm ci
```

Use fragments in other templates:

```yaml
steps:
  # @include: fragments/common-setup.yml
  - run: npm test
```

## Best Practices

### 1. Single Responsibility

Keep templates focused on a single task:

```yaml
# Good: Specific purpose
# @template: step
# @description: Upload test coverage to Codecov

# Bad: Too many responsibilities
# @template: step
# @description: Test, build, and deploy application
```

### 2. Parameterize for Flexibility

Make templates reusable with inputs:

```yaml
# Good: Flexible with parameters
# @inputs:
#   version:
#     description: Version to deploy
#     required: true
#   environment:
#     description: Target environment
#     required: true

# Bad: Hardcoded values
env:
  VERSION: "1.0.0"
  ENVIRONMENT: "production"
```

### 3. Document Templates

Provide clear descriptions and examples:

```yaml
# @template: job
# @description: |
#   Run security scans on the codebase.
#   
#   This job runs multiple security tools including:
#   - Static analysis with Semgrep
#   - Dependency scanning with Snyk
#   - Secret detection with Gitleaks
#   
# @example: |
#   jobs:
#     security:
#       # @extends: jobs/security-scan.yml
#       # @with:
#       #   severity: "high"
#       #   fail-on-issues: true
```

### 4. Version Templates

Track template versions for stability:

```yaml
# @template: workflow
# @version: 1.2.0
# @description: Stable CI workflow
# @changelog:
#   - 1.2.0: Added matrix testing
#   - 1.1.0: Added caching support
#   - 1.0.0: Initial version
```

### 5. Test Compositions

Create tests for your composed workflows:

```typescript
describe('Composed Workflow', () => {
  it('should properly extend job template', async () => {
    const workflow = await buildWorkflow('src/templates/workflows/ci.yml');
    const testJob = workflow.jobs.test;
    
    // Verify job was properly extended
    expect(testJob.strategy.matrix['node-version']).toEqual(['18.x', '20.x']);
    expect(testJob.steps).toHaveLength(5);
  });
});
```

### 6. Use Composition Hierarchies

Organize templates in logical hierarchies:

```
templates/
├── workflows/
│   ├── ci.yml                 # Extends multiple jobs
│   └── cd.yml                 # Extends ci.yml + deploy
├── jobs/
│   ├── base-job.yml          # Common job configuration
│   ├── test-node.yml         # Extends base-job
│   └── deploy-node.yml       # Extends base-job
└── steps/
    ├── setup/
    │   ├── checkout.yml
    │   └── node.yml
    └── deploy/
        ├── aws.yml
        └── azure.yml
```

### 7. Handle Errors Gracefully

Add error handling in templates:

```yaml
steps:
  - name: Deploy
    id: deploy
    run: ./deploy.sh
    continue-on-error: true
  
  - name: Notify on failure
    if: ${{ steps.deploy.outcome == 'failure' }}
    # @extends: steps/notify-failure.yml
    # @with:
    #   step: "deploy"
```

## Examples

### Example 1: Multi-Platform CI

```yaml
# @template: workflow
# @description: Test on multiple platforms
name: Multi-Platform CI

on: [push, pull_request]

jobs:
  # @for: os in ['ubuntu-latest', 'windows-latest', 'macos-latest']
  test-${{ os }}:
    # @extends: jobs/test-node.yml
    # @with:
    #   os: ${{ os }}
    #   node-version: "['18.x', '20.x']"
```

### Example 2: Conditional Deployment

```yaml
# @template: workflow
# @description: Deploy based on branch
name: Conditional Deploy

on:
  push:
    branches: [main, staging, develop]

jobs:
  test:
    # @extends: jobs/test-node.yml
  
  deploy-prod:
    if: github.ref == 'refs/heads/main'
    needs: test
    # @extends: jobs/deploy.yml
    # @with:
    #   environment: production
  
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    # @extends: jobs/deploy.yml
    # @with:
    #   environment: staging
```

### Example 3: Reusable Security Workflow

```yaml
# @template: workflow
# @description: Comprehensive security scanning
# @inputs:
#   scanners:
#     description: Security scanners to run
#     required: false
#     default: "['codeql', 'snyk', 'trivy']"

name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 1'
  workflow_dispatch:

jobs:
  # @for: scanner in inputs.scanners
  scan-${{ scanner }}:
    # @extends: jobs/security/${{ scanner }}.yml
    # @with:
    #   severity: high
    #   upload-results: true
```

## Troubleshooting

### Common Issues

1. **Circular Dependencies**
   - Ensure templates don't reference each other in cycles
   - Use the build tool's `--check-cycles` flag

2. **Input Type Mismatches**
   - Verify input types match expected values
   - Use schema validation during build

3. **Template Not Found**
   - Check template paths are relative to template directory
   - Ensure template files have correct extensions

### Debug Mode

Enable debug mode for detailed composition info:

```bash
pnpm gha build --debug workflow.yml
```

This will show:
- Template resolution steps
- Input parameter evaluation
- Merge operations
- Final composed output

## Next Steps

- Read the [Testing Guide](./TESTING.md) to learn about testing composed workflows
- Check the [examples](../examples/) directory for real-world compositions
- Contribute your own templates to the community
