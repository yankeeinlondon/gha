# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Actions modular workflow system - a TypeScript-based tool for building and testing GitHub Actions workflows using reusable templates. The system allows composing workflows from modular components (workflows, jobs, steps) with type safety and local testing capabilities.

## Essential Commands

### Development Commands
- `pnpm test` - Run all tests (Vitest)
- `pnpm test:static` - Run Tier 1 static tests (no external dependencies)
- `pnpm test:dry-run` - Run Tier 2 dry-run tests (requires act CLI)
- `pnpm test:integration` - Run Tier 3 container tests (requires act + Docker)
- `pnpm test:tier1` - Alias for static tests
- `pnpm test:tier2` - Run Tier 1 + 2 tests
- `pnpm test:tier3` - Run all test tiers
- `pnpm test:workflows` - Legacy workflow tests (deprecated)  
- `pnpm test:watch` - Run tests in watch mode
- `pnpm build` - Build all components (workflows, actions, steps, jobs)
- `pnpm build:workflows` - Build workflow templates only
- `pnpm build:actions` - Build action templates to .github/actions
- `pnpm build:steps` - Build step templates to dist/steps
- `pnpm build:jobs` - Build job templates to dist/jobs

### Template Management
- `pnpm validate:templates` - Validate all template syntax
- `pnpm init:template` - Generate new template from wizard
- `pnpm list:templates` - List available templates
- `pnpm watch` - Watch templates and rebuild on changes

### CLI Tool Usage
The project includes a CLI builder (`src/builders/cli.ts`) that can be run with:
- `tsx src/builders/cli.ts build --type workflow`
- `tsx src/builders/cli.ts validate`  
- `tsx src/builders/cli.ts watch`

## Architecture

### Core Components

**Builders** (`src/builders/`):
- `cli.ts` - Command-line interface for building and validating templates
- `generator.ts` - Core workflow generation engine  
- `parser.ts` - Template parsing and YAML processing
- `resolver.ts` - Template dependency resolution
- `types.ts` - TypeScript type definitions for the entire system

**Templates** (`src/templates/`):
- `workflows/` - Complete workflow definitions
- `jobs/` - Reusable job templates  
- `steps/` - Individual step definitions
- `actions/` - GitHub action definitions

**Testing Framework** (`src/testing/`):
- `test-runner.ts` - Main testing orchestrator with WorkflowTestRunner class
- `act-wrapper.ts` - Integration with `act` for local workflow execution
- `assertions.ts` - Custom assertion helpers for workflow validation
- `mock-context.ts` - GitHub context mocking utilities
- `test-helpers.ts` - Utility functions for loading and manipulating workflows

**Schemas** (`src/schemas/`):
- `workflow.schema.json` - JSON schema for workflow validation
- `job.schema.json` - JSON schema for job validation  
- `step.schema.json` - JSON schema for step validation

### Template System

Templates use special YAML comments for composition:
```yaml
# @template: workflow|job|step
# @description: Template description  
# @extends: path/to/base/template.yml
# @with: { key: value }
```

Templates can reference other templates using `@extends` and pass parameters via `@with`. The resolution system handles dependency graphs and circular reference detection.

### Testing Architecture

The testing system uses a three-tier strategy:
1. **Tier 1 (Static)** - Syntax validation, schema checking, structure validation (no external dependencies)
2. **Tier 2 (Dry-Run)** - Workflow execution planning using `act --dryrun` (requires act CLI)
3. **Tier 3 (Containers)** - Full end-to-end workflow execution (requires act + Docker)

Tests automatically skip tiers when dependencies are missing. Key testing classes:
- `WorkflowTestRunner` - Main test orchestrator
- `MockContext` - Simulates GitHub event context  
- `ActRunner` - Manages `act` execution and result parsing
- `WorkflowAssertions` - Provides workflow-specific assertions

Test organization:
- `tests/static/` - Tier 1 tests (syntax, structure, templates, logic)
- `tests/dry-run/` - Tier 2 tests (execution planning, action resolution)
- `tests/integration/` - Tier 3 tests (end-to-end, multi-job, real actions)
- `tests/utils/` - Shared utilities and dependency detection

## Configuration

Build configuration is managed through:
- `gha-build.config.ts` - Default configuration with validation, generation, and testing options
- `vitest.config.ts` - Test configuration with 60s timeout for container tests and dependency detection

## Development Workflow

1. Templates are created in `src/templates/` 
2. Build system processes templates through the generator
3. Output workflows go to `.github/workflows/` (configurable)
4. Tests validate both template syntax and workflow behavior
5. Watch mode enables live rebuilding during development

## Important Notes

- Tests have extended timeouts (30s) due to potential `act` integration
- The system supports both dry-run and actual workflow execution for testing
- Template resolution includes caching and circular dependency detection
- All generated workflows include metadata comments by default (configurable)