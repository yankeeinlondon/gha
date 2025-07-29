# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository provides reusable GitHub Actions workflows (`test` and `publish`) that can be consumed by other repositories to standardize their CI/CD processes.

## Common Development Tasks

### Running Tests

```bash
pnpm test  # Run tests (validates YAML files)
```

### Linting

```bash
pnpm lint  # Run linting (actually runs tests via vitest)
```

### Creating a Release

```bash
pnpm release  # Uses bumpp to create a new release
```

## Architecture

### Key Components

1. **Reusable Workflows** (.github/workflows/)
   - `test.yml`: Provides testing infrastructure (unit tests, linting, coverage)
   - `publish.yml`: Handles multi-platform publishing (NPM, JSR, GitHub Packages)

2. **Test Strategy**
   - Tests validate that the YAML workflow files are syntactically correct
   - Uses Vitest as the test runner with js-yaml for YAML parsing

3. **Publishing Platform Detection**
   - NPM: Requires `package.json` with `private: false`
   - JSR: Requires `jsr.json` or `deno.json`
   - GitHub Packages: Requires `.npmrc.github` file
   - Skip files: `.skip-npm`, `.skip-jsr`, `.skip-github-packages` disable respective platforms

### Workflow Features

**Test Workflow:**

- Flexible testing strategy: single job or matrix based on configuration
- Single job mode: When both OS and Node version are single values
- Matrix mode: When either OS or Node version contains multiple values
- Default matrix: Windows, Linux, macOS with Node 20.x, 22.x
- Automatic detection of test/lint/coverage scripts
- Support for passing API tokens to tests

**Publish Workflow:**

- Triggers on commits containing "release v" message
- Platform auto-detection with skip file support
- Handles authentication for each platform
- Creates changelog entries on successful publish
- Removes tags on failure to allow retry

## Important Notes

- This is a TypeScript project using pnpm as the package manager
- The main entry point (src/index.ts) is minimal - the value is in the reusable workflows
- Tests focus on YAML validation rather than runtime behavior
- The workflows are designed to be consumed by other repositories via the `uses:` directive
