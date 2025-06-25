# Migration Guide: Three-Tier Testing System

This guide explains how to migrate from the existing test structure to the new three-tier testing system.

## Overview of Changes

### Old Structure
```
tests/
└── workflows/
    └── ci-node.test.ts  (Mixed static, dry-run, and container tests)
```

### New Structure
```
tests/
├── static/              # Tier 1: No external dependencies
│   ├── syntax/          # YAML parsing, schema validation
│   ├── structure/       # Workflow structure validation
│   ├── templates/       # Template resolution tests
│   └── logic/          # Trigger and expression validation
├── dry-run/            # Tier 2: Requires act CLI
│   ├── execution-planning.test.ts
│   ├── action-resolution.test.ts
│   └── context-handling.test.ts
├── integration/        # Tier 3: Requires act CLI + Docker
│   ├── end-to-end.test.ts
│   ├── multi-job.test.ts
│   └── real-actions.test.ts
├── utils/              # Shared utilities
│   ├── test-config.ts
│   ├── global-setup.ts
│   └── test-setup.ts
└── workflows/          # Legacy tests (deprecated)
```

## Test Migration Strategy

### Step 1: Identify Test Categories

Review existing tests and categorize them:

1. **Static Tests**: No external tools needed
   - YAML syntax validation
   - Schema validation
   - Workflow structure validation
   - Template resolution
   - Expression validation

2. **Dry-Run Tests**: Require `act` CLI
   - Workflow execution planning
   - Action resolution
   - Context handling
   - Matrix expansion

3. **Container Tests**: Require `act` + Docker
   - End-to-end workflow execution
   - Real action integration
   - Multi-job workflows
   - Performance testing

### Step 2: Update Test Dependencies

Tests now automatically detect dependencies and skip appropriately:

```typescript
// Old approach (manual checks)
beforeEach(() => {
  let act = actInfo(runner);
})

// New approach (automatic)
describe.skipIf(!shouldRunTier2())('Dry-Run Tests', () => {
  // Tests automatically skip if act not available
});
```

### Step 3: Update Test Imports

```typescript
// Add dependency detection
import { shouldRunTier2, shouldRunTier3, getTestConfig } from '../utils/test-config';

// For Tier 2 tests
describe.skipIf(!shouldRunTier2())('My Dry-Run Tests', () => {
  // Test implementation
});

// For Tier 3 tests  
describe.skipIf(!shouldRunTier3())('My Container Tests', () => {
  // Test implementation
});
```

### Step 4: Migrate Existing Tests

#### Example: Moving a Static Test

**Before** (in `tests/workflows/ci-node.test.ts`):
```typescript
it('should have valid syntax', async () => {
  const result = await runner.runWorkflow(workflowPath);
  expect(result.success).toBe(true);
});
```

**After** (in `tests/static/structure/workflow-structure.test.ts`):
```typescript
it('should have valid workflow syntax', async () => {
  const result = await runner.runWorkflow(workflowPath);
  expect(result.success).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

#### Example: Moving a Dry-Run Test

**Before**:
```typescript
it('should run ci-node workflow with act (dryRun)', async () => {
  const actRunner = runner['actRunner'];
  const isActInstalled = await actRunner.checkInstallation();
  if (!isActInstalled) {
    console.log('Skipping ci-node dryRun test - act is not installed');
    return;
  }
  // Test implementation
});
```

**After** (in `tests/dry-run/execution-planning.test.ts`):
```typescript
describe.skipIf(!shouldRunTier2())('Execution Planning Tests', () => {
  it('should plan ci-node workflow execution with act dry-run', async () => {
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      runWithAct: true,
      actOptions: { dryRun: true }
    });
    expect(result.success).toBe(true);
  });
});
```

#### Example: Moving a Container Test

**Before**:
```typescript
it('should run successfully with act (real containers)', async () => {
  const actRunner = runner['actRunner'];
  const isActInstalled = await actRunner.checkInstallation();
  if (!isActInstalled) return;
  
  let dockerAvailable = true;
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch (err) {
    dockerAvailable = false;
  }
  if (!dockerAvailable) return;
  
  // Test implementation
});
```

**After** (in `tests/integration/end-to-end.test.ts`):
```typescript
describe.skipIf(!shouldRunTier3())('End-to-End Tests', () => {
  it('should execute workflow with real containers', async () => {
    const result = await runner.runWorkflow(workflowPath, {
      event: 'push',
      runWithAct: true,
      actOptions: {
        platform: 'ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest'
      }
    });
    expect(result.success).toBe(true);
  });
});
```

## Running Tests

### New Test Commands

```bash
# Run only static tests (fast, no dependencies)
pnpm test:static
pnpm test:tier1

# Run static + dry-run tests (requires act)  
pnpm test:tier2

# Run all tests (requires act + Docker)
pnpm test:tier3

# Run specific tier
pnpm test:dry-run
pnpm test:integration

# Legacy command (still works)
pnpm test:workflows
```

### CI/CD Integration

```yaml
# GitHub Actions workflow
jobs:
  test-tier1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm test:tier1
        
  test-tier2:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: nektos/act-action@v0.1.0  # Install act
      - run: pnpm test:tier2
        
  test-tier3:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: nektos/act-action@v0.1.0  # Install act
      - run: pnpm test:tier3
```

## Deprecation Timeline

1. **Phase 1** (Current): Both old and new test structures work
2. **Phase 2** (Next release): New structure is default, old structure shows deprecation warnings
3. **Phase 3** (Future release): Old structure removed

## Benefits of Migration

1. **Faster Development**: Tier 1 tests run instantly without external dependencies
2. **Better CI/CD**: Tests can run in constrained environments
3. **Clear Separation**: Each tier has a specific purpose and requirements
4. **Graceful Degradation**: Tests automatically skip when dependencies are missing
5. **Better Debugging**: Clear error messages about missing dependencies

## Troubleshooting

### Common Issues

**Issue**: `describe.skipIf is not a function`
**Solution**: Update to Vitest ^3.2.4 or newer

**Issue**: Tests hang in CI
**Solution**: Ensure proper timeout configuration in `vitest.config.ts`

**Issue**: Docker tests fail locally  
**Solution**: Ensure Docker daemon is running and act is configured with proper platform

### Getting Help

- Check test configuration in `tests/utils/test-config.ts`
- Review global setup in `tests/utils/global-setup.ts`
- See working examples in each tier directory
- Refer to the main specification in `.ai/features/01-Tests.md`