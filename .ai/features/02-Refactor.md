# Feature Spec: TypeScript-First GitHub Actions Builder

## Problem Statement

The current YAML template-based approach has fundamental design flaws that prevent it from meeting its core objectives:

### Current Issues

1. **Broken Composition**: Magic YAML comments (`# @extends`, `# @with`) don't provide real composition - they're custom syntax that GitHub Actions doesn't understand
2. **No Design-time Type Safety**: Errors are discovered at runtime, not during development
3. **Schema Violations**: Templates like `src/templates/steps/checkout.yml` violate GitHub Actions schema by using list syntax where single objects are expected
4. **Unclear Purpose**: The system tries to be a CLI, test suite, and template engine simultaneously without excelling at any
5. **No Context Variable Safety**: Template variables like `${{ inputs.nodeVersion }}` have no type checking

## Proposed Solution: TypeScript-First Builder

Replace the YAML template system with a TypeScript-first approach that provides:

- **Real composition** through TypeScript imports/exports
- **Design-time type safety** with IntelliSense and compile-time validation
- **Context variable safety** through typed callback functions
- **Clear purpose** as a CLI tool for generating GitHub Actions workflows

## Design Goals

1. **Composition at Design Time**: Enable referencing and pulling in components that are resolved at build time, not runtime
2. **Strong Type Support**: Maintain TypeScript's type safety throughout the configuration process
3. **Single Responsibility**: Be a CLI tool that generates GitHub Actions workflows, with testing as a supporting feature
4. **Schema Compliance**: Generate valid GitHub Actions YAML that passes schema validation
5. **Developer Experience**: Provide immediate feedback through TypeScript's type system

## Technical Architecture

### Core API Design

```typescript
import { step, steps, job, workflow, deploy } from "gha";

// Reusable step with type safety
const nodeSetup: Step = step({
  name: "Setup Node",
  uses: "actions/setup-node@v4", // Suggest type for common actions
  with: {
    node_version: 20,
    registry_url: "https://registry.npmjs.org/"
  }
});

// Multi-step composition
const buildSteps: MultiStep = steps([
  nodeSetup,
  { name: "Install pnpm", run: "npm i -g pnpm @antfu/ni" },
  { name: "Build", run: "nr build" }
]);

// Job with typed context variables
const testJob: Job = job({
  name: "Test",
  runs_on: "ubuntu-latest",
  env: (ctx: GitHubContext) => ({
    HAS_TOKEN: `${ctx.inputs.npm_token} != '' || ${ctx.secrets.npm_token} != ''`,
    NODE_VERSION: ctx.matrix.node_version
  }),
  if: (ctx: GitHubContext) => `${ctx.github.event_name} == 'push'`,
  steps: [
    nodeSetup,
    buildSteps,
    { name: "Run Tests", run: "npm test" }
  ]
});

// Workflow composition
const ciWorkflow = workflow({
  name: "CI Pipeline",
  on: {
    push: { branches: ["main"] },
    pull_request: { branches: ["main"] }
  },
  jobs: {
    test: testJob,
    build: job({
      name: "Build",
      runs_on: "ubuntu-latest",
      needs: ["test"],
      steps: buildSteps
    })
  }
});

// Export for CLI consumption
export default deploy(ciWorkflow);
```

### Type System Architecture

```typescript
// Core GitHub Actions context with full type safety
type GitHubContext = {
  inputs: Record<string, string>;
  secrets: Record<string, string>;
  env: Record<string, string>;
  matrix: Record<string, any>;
  github: {
    repository: string;
    ref: string;
    event_name: string;
    actor: string;
    // ... complete GitHub context
  };
};

// Builder functions with strong typing
type Step = {
  name?: string;
  uses?: Suggest<CommonActions>;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string> | ((ctx: GitHubContext) => Record<string, string>);
  if?: string | ((ctx: GitHubContext) => string);
};

type Job = {
  name?: string;
  runs_on: Suggest<RunnerTypes>;
  needs?: string | string[];
  steps: (Step | MultiStep)[];
  env?: Record<string, string> | ((ctx: GitHubContext) => Record<string, string>);
  if?: string | ((ctx: GitHubContext) => string);
  strategy?: JobStrategy;
  timeout_minutes?: number;
};
```

## CLI Interface

### Commands

```bash
# Primary workflow
gha build [config-path]     # Generate workflows from TypeScript config
gha test [config-path]      # Run three-tier testing strategy
gha validate <yaml-path>   # Validate generated YAML
gha                        # help on CLI
gha --help                 # help on CLI

# Development aids
gha init                    # Create starter configuration
```

### Configuration Discovery

```bash
# Default locations (in order of precedence)
./actions/index.ts
./gha/index.ts
./github-actions/index.ts
```

### Build Process

1. **TypeScript Compilation**: Validate configuration files
2. **Component Resolution**: Resolve all imports and compositions
3. **YAML Generation**: Convert TypeScript objects to valid GitHub Actions YAML
4. **Schema Validation**: Ensure generated YAML meets GitHub Actions schema
5. **File Output**: Write to `.github/workflows/` and `.github/actions/`

## Testing Strategy

### Three-Tier Testing (Retained from Current System)

1. **Tier 1 - Static Validation**

   ```typescript
   // Automatic: TypeScript compilation provides type checking
   // Additional: Schema validation of generated YAML
   ```

2. **Tier 2 - Dry-run Testing** (requires `act`)

   ```bash
   gha test --dry-run
   # Tests execution planning, action resolution, dependency validation
   ```

3. **Tier 3 - Container Testing** (requires `act` + Docker)

   ```bash
   gha test --full
   # Tests complete workflow execution in containers
   ```

### Test Configuration

```typescript
// In configuration file
export const testConfig = {
  events: ["push", "pull_request", "workflow_dispatch"],
  matrix: {
    node_version: ["18", "20", "22"],
    os: ["ubuntu-latest", "windows-latest"]
  },
  secrets: {
    npm_token: "test-token"
  }
};
```

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1-2)


- [ ] Implement core TypeScript builders (`step`, `steps`, `job`, `workflow`, `action`)
- [ ] Create type definitions for GitHub Actions primitives
- [ ] Build YAML generation engine
- [ ] Add schema validation

### Phase 2: Testing Integration (Week 3)


- [ ] Port existing test infrastructure (act wrapper, assertions)
- [ ] Implement three-tier testing strategy
- [ ] Add CLI test commands

### Phase 3: CLI Development (Week 4)


- [ ] Build CLI command structure
- [ ] Add configuration discovery
- [ ] Implement build and validation commands
- [ ] Add error handling and user feedback

### Phase 4: Common Libraries (Week 5)


- [ ] Create common workflow patterns library
- [ ] Add pre-built job templates (Node.js CI, Docker build, etc.)
- [ ] Implement plugin system for extensibility

### Phase 5: Documentation & Examples (Week 6)

- [ ] Write comprehensive documentation
- [ ] Create example projects
- [ ] Migration guide from current system

## Code Reuse Assessment

### High Reuse (70-80% salvageable)

- ✅ **Testing Infrastructure**: act wrapper, assertions, test runner architecture
- ✅ **Schema Validation**: existing validation logic and schema files
- ✅ **CLI Framework**: argument parsing and command structure
- ✅ **Type Definitions**: base GitHub Actions type definitions

### Adaptable (30-40% needs modification)

- 🔄 **Build System**: convert from template resolution to TypeScript compilation
- 🔄 **Testing Strategy**: three-tier approach maps well to new architecture
- 🔄 **Configuration System**: adapt to TypeScript-based configuration

### Discard (20-30% not reusable)

- ❌ **YAML Template System**: magic comment parsing and template resolution
- ❌ **Current Composition Logic**: replace with TypeScript imports/exports
- ❌ **Template Syntax Parser**: no longer needed with TypeScript

## Benefits

### Developer Experience

- **Immediate Feedback**: TypeScript provides errors as you type
- **IntelliSense**: Auto-completion for GitHub Actions syntax
- **Refactoring Support**: Safe renaming and restructuring
- **Import/Export**: True composition through standard TypeScript mechanisms

### Maintainability

- **Single Source of Truth**: Types define both validation and generation
- **Standard Tooling**: Leverage existing TypeScript ecosystem
- **Clear Separation**: CLI tool with testing, not a hybrid system
- **Schema Compliance**: Generated YAML always passes GitHub validation

### Extensibility

- **Plugin Architecture**: Easy to add new builders and patterns
- **Library Ecosystem**: Share common patterns as npm packages
- **Type Safety**: Extensions inherit full type safety
- **Testing Integration**: Built-in support for comprehensive testing

## Risk Mitigation

### Learning Curve

- **Mitigation**: Provide comprehensive examples and migration guides
- **Timeline**: Include training period in rollout plan

### TypeScript Dependency

- **Mitigation**: Most CI/CD users already familiar with TypeScript
- **Alternative**: Could provide JavaScript support with JSDoc types

### Debugging Complexity

- **Mitigation**: Source maps from TypeScript to generated YAML
- **Tooling**: CLI commands to inspect generated output

## Success Metrics

- [ ] Type safety prevents common configuration errors
- [ ] Composition works through standard TypeScript imports
- [ ] Generated YAML passes GitHub Actions schema validation
- [ ] Testing strategy catches issues before deployment
- [ ] Developer feedback shows improved experience vs. current system
- [ ] Migration from current system is straightforward

## Conclusion

This TypeScript-first approach addresses all fundamental issues with the current system while leveraging the existing testing infrastructure and CLI framework. It provides a clear, type-safe path for GitHub Actions configuration that scales with team complexity and provides immediate developer feedback.

The proposed architecture transforms the project from a confusing hybrid system into a focused, powerful CLI tool that excels at its core mission: generating type-safe, composable GitHub Actions workflows.
