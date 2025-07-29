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
    # with:
    #   jsr_scope: '@org'              # Optional: scope for JSR if package.json has root-level name
    #   github_packages_scope: '@org'   # Optional: scope for GitHub Packages if package.json has root-level name
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Customizing Test Configuration

The test workflow supports both single and matrix configurations for OS and Node versions.

#### Single OS and Node Version (Fast CI)

For faster CI runs, you can test on a single OS with a single Node version:

```yml
jobs:
  test:
    name: testing
    uses: yankeeinlondon/gha/.github/workflows/test.yml@main
    with:
      os: 'ubuntu-latest'
      nodeVersion: '20.x'
```

#### Custom Matrix Configuration

You can customize which operating systems and Node versions to test:

```yml
jobs:
  test:
    name: testing
    uses: yankeeinlondon/gha/.github/workflows/test.yml@main
    with:
      os: '["ubuntu-latest", "windows-latest"]'  # Skip macOS
      nodeVersion: '["18.x", "20.x", "22.x"]'     # Test more Node versions
```

#### Linux-Only Testing

A common configuration is to test only on Linux with multiple Node versions:

```yml
jobs:
  test:
    name: testing
    uses: yankeeinlondon/gha/.github/workflows/test.yml@main
    with:
      os: '["ubuntu-latest"]'
      nodeVersion: '["20.x", "22.x"]'
```

**Note:** The workflow automatically detects whether to use a single job or matrix strategy based on your inputs. When both `os` and `nodeVersion` are single values (not arrays), it runs a single test job for better performance.


## Platforms

The possible targets for publishing are:

- `npm`
- `jsr`
- **Github Packages**

### Workspaced versus Root Packages

- it's worth noting that both **JSR** and **Github Packages** require all packages to be published under a namespace 
- in contrast, NPM has both "root level" packages and namespaced ones

### Publishing Root-Level NPM Packages with Scoped JSR/GitHub Packages

If your package.json has a root-level name (e.g., `my-package`) but you want to publish to JSR and GitHub Packages with a scope, you can use the `jsr_scope` and `github_packages_scope` inputs:

```yml
jobs:
  publish:
    name: publish
    if: contains(github.event.head_commit.message, 'release v')
    uses: yankeeinlondon/gha/.github/workflows/publish.yml@main
    with:
      jsr_scope: '@org'              # Will publish as @org/my-package to JSR
      github_packages_scope: '@org'   # Will publish as @org/my-package to GitHub Packages
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

This allows you to:

- Publish to NPM as a root-level package: `my-package`
- Publish to JSR with a scope: `@org/my-package`
- Publish to GitHub Packages with a scope: `@org/my-package`

**How it works:**

- For **NPM**: Always uses the name from package.json as-is
- For **JSR**: If package.json has a root-level name and `jsr_scope` is provided, updates jsr.json with the scoped name
- For **GitHub Packages**: If package.json has a root-level name and `github_packages_scope` is provided, temporarily modifies package.json during publishing (then restores it)

### Requirements by Platform

#### First Time Publication

Both NPM and JSR expect you to manually publish once before you're ready to publish via CI/CD:

- on NPM you'll run `npm publish --access=public|private`
  - a browser window will pop up and ask you to login, 
  - assuming the user you've logged in as has the right permissions for the repo in question then you're first version will be published and you can shutdown the web page.
- on JSR you'll run `npx jsr publish`
  - a browser will will open and you'll need to login and press the authorize button

#### CI/CD Publication

- to publish to **NPM** you must:
  - have an NPM token which has workflow permissions to publish

- to publish to **JSR** you must:
  - have already have an account 
  - you must have added the workspaced package name
  - you must have _linked_ to package to a Github repo
  - you must have a `deno.jsonc` file or `jsr.json` file in the root of the repo


## Workflows


### Test Workflow

A rather simple flow that tests:

1. Unit Tests

    If there is a `package.json` file and a "test" script then that will be used to kick off a matrix test across Windows, Linux, and macOS.

2. Linting

    If there is a `package.json` file and a "lint" script then that will be used to kick off linting on Linux.

3. Coverage Tests

    If there is a `package.json` file and a "coverage" script then that will be run to kick off a coverage test.

If _none_ of the above tests are available then this workflow will CANCEL the workflow and provide context on why it was cancelled.

### Publish Workflow


- publishing is only run when a release's commit message starts with `release v`
- **job:** `detect_platforms` 
  - once it has been determined that the current commit should be published we enter an **evaluation** stage:
  - the goal of this phase is to be sure that we have _the ability_ to publish to platforms before we try
  - there is a concept of "skip files":
    - if the file `.npm-skip` is found at the root of the repo then we know that there is no intention of publishing to `npm`
    - similarly we look for a `.jsr-skip` file for the intention to publish to `jsr`.
    - with Github Packages we first check that there is a `.npmrc.github` file; this is necessary for a publishing to Github Packages and will looks something like:

        ```txt
        PACKAGE_NAME:registry=https://npm.pkg.github.com/
        //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
        ```

      - With that package found in the root of the repo this flow will try to publish to **Github Packages** _unless_ it also files the `.skip-github-packages` file 
    - each _enabled_ platform is calculated and the user is presented with a notice about which platforms we expect to publish to.

