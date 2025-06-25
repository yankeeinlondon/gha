# Three-Tier Testing Strategy for GitHub Actions Modular Workflow System

## Overview

This document specifies a comprehensive three-tier testing strategy for the GitHub Actions modular workflow system. The strategy is designed to maximize test coverage while gracefully degrading when external dependencies (act tool, Docker) are unavailable.

## Current State Analysis

### Existing Test Structure
- **Location**: `tests/workflows/ci-node.test.ts`
- **Testing Framework**: Vitest with custom workflow testing utilities
- **Current Issues**:
  - Single monolithic test file mixing all three testing tiers
  - Inconsistent handling of missing dependencies (act/Docker)
  - Manual checks scattered throughout tests instead of systematic skipping
  - No clear separation between static validation, dry-run, and full execution tests

### Existing Testing Infrastructure
- **WorkflowTestRunner**: Main orchestrator for workflow testing
- **ActRunner**: Wrapper for `act` CLI tool with dry-run and full execution support
- **MockContext**: GitHub context simulation for static testing
- **WorkflowAssertions**: Custom assertions for workflow validation
- **Schema Validation**: JSON schema validation for workflows, jobs, and steps

## Three-Tier Testing Strategy

### Tier 1: Static Validation Tests (No External Dependencies)
**Goal**: Maximum coverage with zero external dependencies

**Capabilities**:
- YAML syntax validation
- JSON schema validation against GitHub Actions schemas
- Workflow structure validation (jobs, steps, triggers)
- Template resolution and composition validation
- Mock context simulation
- Expression syntax validation
- Action reference format validation
- Job dependency validation

**Test Categories**:
1. **Syntax Tests**: YAML parsing, schema compliance
2. **Structure Tests**: Required fields, job relationships, step configuration
3. **Template Tests**: Template resolution, circular dependency detection
4. **Logic Tests**: Conditional expressions, trigger configurations
5. **Security Tests**: Secret handling, permission validation

**Implementation**: `tests/static/` directory

### Tier 2: Act Dry-Run Tests (Requires act CLI)
**Goal**: Validate workflow execution logic without Docker containers

**Prerequisites**: 
- `act` CLI tool must be installed
- Tests automatically skip if `act` is not available

**Capabilities**:
- Workflow execution planning
- Action resolution validation
- Environment variable handling
- Input/output flow validation
- Job orchestration logic
- Matrix strategy validation

**Test Categories**:
1. **Execution Planning**: Verify act can plan workflow execution
2. **Action Resolution**: Ensure actions can be resolved
3. **Context Handling**: Validate GitHub context processing
4. **Matrix Expansion**: Test matrix strategy expansion
5. **Conditional Logic**: Verify if/when conditions

**Implementation**: `tests/dry-run/` directory

### Tier 3: Full Container Tests (Requires act CLI + Docker)
**Goal**: End-to-end workflow execution validation

**Prerequisites**:
- `act` CLI tool must be installed
- Docker daemon must be running
- Tests automatically skip if either dependency is missing

**Capabilities**:
- Complete workflow execution
- Real action execution
- Container environment validation
- Build artifact generation
- Integration testing
- Performance validation

**Test Categories**:
1. **End-to-End**: Complete workflow execution from trigger to completion
2. **Integration**: Multi-job workflows with dependencies
3. **Performance**: Execution time and resource usage
4. **Real Actions**: Testing with actual GitHub actions
5. **Environment**: Container configuration and setup

**Implementation**: `tests/integration/` directory

## Dependency Detection and Graceful Degradation

### Act Installation Detection
```typescript
async function isActAvailable(): Promise<boolean> {
  try {
    const result = await execSync('act --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
```

### Docker Availability Detection
```typescript
async function isDockerAvailable(): Promise<boolean> {
  try {
    await execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
```

### Test Suite Configuration
```typescript
// Global test setup
const TEST_CONFIG = {
  actAvailable: false,
  dockerAvailable: false
};

beforeAll(async () => {
  TEST_CONFIG.actAvailable = await isActAvailable();
  TEST_CONFIG.dockerAvailable = await isDockerAvailable();
});
```

### Conditional Test Execution
```typescript
// Tier 2 tests
describe.skipIf(!TEST_CONFIG.actAvailable)('Act Dry-Run Tests', () => {
  // Tests that require act CLI
});

// Tier 3 tests  
describe.skipIf(!TEST_CONFIG.actAvailable || !TEST_CONFIG.dockerAvailable)('Full Container Tests', () => {
  // Tests that require act + Docker
});
```

## Test File Organization

```
tests/
├── static/                          # Tier 1: Static validation tests
│   ├── syntax/
│   │   ├── yaml-validation.test.ts
│   │   ├── schema-validation.test.ts
│   │   └── template-parsing.test.ts
│   ├── structure/
│   │   ├── workflow-structure.test.ts
│   │   ├── job-validation.test.ts
│   │   └── step-validation.test.ts
│   ├── templates/
│   │   ├── template-resolution.test.ts
│   │   ├── template-composition.test.ts
│   │   └── circular-dependency.test.ts
│   └── logic/
│       ├── trigger-validation.test.ts
│       ├── expression-validation.test.ts
│       └── conditional-logic.test.ts
├── dry-run/                         # Tier 2: Act dry-run tests
│   ├── execution-planning.test.ts
│   ├── action-resolution.test.ts
│   ├── context-handling.test.ts
│   ├── matrix-expansion.test.ts
│   └── conditional-execution.test.ts
├── integration/                     # Tier 3: Full container tests
│   ├── end-to-end.test.ts
│   ├── multi-job.test.ts
│   ├── real-actions.test.ts
│   └── performance.test.ts
├── fixtures/                        # Test data and utilities
│   ├── events/
│   ├── workflows/
│   └── templates/
└── utils/                          # Shared test utilities
    ├── test-config.ts
    ├── dependency-detection.ts
    └── assertion-helpers.ts
```

## Test Configuration Updates

### Vitest Configuration Enhancement
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Existing configuration...
    
    // Setup for dependency detection
    globalSetup: ['./tests/utils/global-setup.ts'],
    
    // Environment configuration for different test tiers
    env: {
      NODE_ENV: 'test',
      GITHUB_ACTIONS: 'false',
      TEST_TIER_1_ONLY: process.env.CI === 'true' && !process.env.ACT_AVAILABLE ? 'true' : 'false'
    },
    
    // Separate timeouts for different tiers
    testTimeout: 30000,  // 30s for Tier 2/3
    hookTimeout: 10000,  // 10s for setup/teardown
  }
});
```

### Package.json Script Updates
```json
{
  "scripts": {
    "test": "vitest run --passWithNoTests",
    "test:static": "vitest run tests/static",
    "test:dry-run": "vitest run tests/dry-run", 
    "test:integration": "vitest run tests/integration",
    "test:tier1": "vitest run tests/static",
    "test:tier2": "vitest run tests/static tests/dry-run",
    "test:tier3": "vitest run",
    "test:watch": "vitest",
    "test:ci": "vitest run --reporter=junit --outputFile=test-results.xml"
  }
}
```

## Implementation Plan

### Phase 1: Test Infrastructure (Priority: High)
1. Create directory structure for three-tier testing
2. Implement dependency detection utilities
3. Create shared test configuration
4. Update Vitest configuration for conditional execution

### Phase 2: Tier 1 Implementation (Priority: High)
1. Extract existing static validation tests
2. Implement comprehensive syntax validation tests
3. Create structure validation test suite
4. Add template resolution and composition tests
5. Implement logic validation tests

### Phase 3: Tier 2 Implementation (Priority: Medium)
1. Extract existing dry-run tests
2. Implement execution planning tests
3. Create action resolution validation
4. Add context handling tests
5. Implement matrix expansion tests

### Phase 4: Tier 3 Implementation (Priority: Medium)
1. Extract existing full container tests
2. Implement end-to-end test suite
3. Create multi-job workflow tests
4. Add real action integration tests
5. Implement performance validation

### Phase 5: CI/CD Integration (Priority: Low)
1. Configure CI to run appropriate test tiers
2. Add test result reporting
3. Implement test coverage tracking
4. Create test result visualization

## Expected Benefits

1. **Reliability**: Tests run consistently regardless of environment
2. **Speed**: Fast feedback from Tier 1 tests
3. **Coverage**: Comprehensive validation across all tiers
4. **Maintainability**: Clear separation of concerns
5. **Developer Experience**: Clear understanding of test requirements
6. **CI/CD Friendly**: Graceful degradation in constrained environments

## Migration Strategy

1. **Preserve Existing**: Current tests remain functional during migration
2. **Incremental**: Migrate tests tier by tier
3. **Validation**: Each tier validated independently
4. **Documentation**: Update CLAUDE.md with new testing patterns
5. **Training**: Provide examples for each testing tier

This specification provides a robust foundation for reliable, maintainable, and comprehensive testing of the GitHub Actions modular workflow system.