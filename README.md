# `gha`

Provides a `test` and `publish` configuration for Github Actions.

## Usage

The most common usage is to add the following to your `.github/workflows/main.yml` file:

```yml
name: On Push

on:
  push:
    branches:
      - main
jobs:
  test:
    name: testing
    uses: yankeeinlondon/gha/.github/workflows/test.yml@main

  publish:
    name: publish
    if: contains(github.event.head_commit.message, 'release v')
    needs: test  # This ensures tests pass before publishing
    uses: yankeeinlondon/gha/.github/workflows/publish.yml@main
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Test Workflow

A rather simple flow that tests:

1. Unit Tests

    If there is a `package.json` file and a "test" script then that will be used to kick off a matrix test across Windows, Linux, and macOS.

2. Linting

    If there is a `package.json` file and a "lint" script then that will be used to kick off linting on Linux.

3. Coverage Tests

    If there is a `package.json` file and a "coverage" script then that will be run to kick off a coverage test.

If _none_ of the above tests are available then this workflow will CANCEL the workflow and provide context on why it was cancelled.

## Publish Workflow

The possible targets for publishing are:

- `npm`
- `jsr`
- **Github Packages**

### Flow

- publishing is only run when a release's commit message starts with `release v`
- [ job: `detect_platforms` ] 
  - once it has been determined that the current commit should be published we enter an **evaluation** stage:
  - the goal of this phase is to be sure that we have _the ability_ to publish to platforms before we try
  - there is a concept of "skip files":
    - if the file `.npm-skip` is found at the root of the repo then we know that there is no intention of publishing to `npm`
    - similarly we look for a `.jsr-skip` file for intention to publish to `jsr` and a `.

