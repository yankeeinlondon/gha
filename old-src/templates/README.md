# GitHub Actions Workflow Templates

This directory contains the modular template system for composing GitHub Actions workflows with type safety and reusability.

## Directory Structure

### `/workflows`
Complete workflow templates that can be used as starting points or referenced by other workflows. These templates:
- Define complete GitHub Actions workflow files
- Can reference jobs from `/jobs` and steps from `/steps`
- Support parameterization through template variables
- Are validated against schemas in `/src/schemas/inputs/workflow.schema.json`

**Example:** `ci-workflow.yml`, `release-workflow.yml`, `deploy-workflow.yml`

### `/jobs`
Reusable job definitions that can be composed into workflows. Each job template:
- Defines a single job with its configuration
- Can reference step sequences from `/steps`
- Supports input parameters and outputs
- Is validated against schemas in `/src/schemas/inputs/job.schema.json`

**Example:** `build-job.yml`, `test-job.yml`, `lint-job.yml`

### `/steps`
Reusable step sequences that can be included in jobs. Each step template:
- Defines a sequence of one or more steps
- Can be parameterized with inputs
- Supports conditional execution
- Is validated against schemas in `/src/schemas/inputs/step.schema.json`

**Example:** `checkout-steps.yml`, `setup-node-steps.yml`, `cache-steps.yml`

## Template Syntax

Templates support special tags for composition and parameterization:

### Reference Tag
```yaml
# Reference another template
- !ref jobs/build-job.yml
```

### Include Tag
```yaml
# Include content from another template
steps: !include steps/setup-steps.yml
```

### Template Variables
```yaml
# Define variables that can be replaced during build
name: ${{ template.workflow_name }}
runs-on: ${{ template.runner_os | default('ubuntu-latest') }}
```

## Type Safety

All templates are validated against JSON Schemas to ensure:
- Required fields are present
- Field types are correct
- References to other templates are valid
- Template variables are properly defined

## Building Workflows

Templates are processed by the TypeScript build system in `/src/builders` which:
1. Validates all templates against their schemas
2. Resolves references and includes
3. Substitutes template variables
4. Generates final workflow files in `/dist`

## Best Practices

1. **Single Responsibility**: Each template should have a single, well-defined purpose
2. **Parameterization**: Use template variables for values that might change between uses
3. **Documentation**: Include comments explaining the purpose and requirements of each template
4. **Validation**: Always validate templates against their schemas before committing
5. **Versioning**: Consider versioning strategies for templates that are widely used

## Examples

### Basic Workflow Template
```yaml
# workflows/basic-ci.yml
name: ${{ template.workflow_name | default('CI') }}

on:
  push:
    branches: [${{ template.default_branch | default('main') }}]
  pull_request:

jobs:
  test: !ref jobs/test-job.yml
  build: !ref jobs/build-job.yml
```

### Reusable Job Template
```yaml
# jobs/test-job.yml
name: Run Tests
runs-on: ${{ template.runner_os | default('ubuntu-latest') }}
steps: !include steps/test-steps.yml
```

### Step Sequence Template
```yaml
# steps/test-steps.yml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: ${{ template.node_version | default('20') }}
- run: npm ci
- run: npm test
