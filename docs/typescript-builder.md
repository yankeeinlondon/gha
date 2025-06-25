# Imagined Typescript Builder

This does not represent anything that exists in source code yet but seems like an approach that could make sense:

## Configuring your Github Actions

Github actions would be configured by a user anywhere in a repo (but with a "default location" of `/actions`). They would use the symbols illustrated below and they would install this repo as a dev dependency and gain access to it's CLI as well as the symbols below used for configuration.


```ts
import { step, steps, job, workflow, action, deploy }  from "gha";

/** a reusable "step" */
const nodeSetup: Step = step({
    name: "Setup Node",
    /** 
     * uses `Suggest<a|b|c|>` type util to provide the most common
     * to suggest options but ultimately allow them any text value
     */
    uses: "@actions/setup-node@4",
    /**  */
    with({
        node_version: 20,
        registry_url: https://registry.npmjs.org/
    })
});

/**
 * A reusable "MultiStep" which consumes a single step as part of it's
 * configuration.
 */
const multiStep: MultiStep = steps([
    nodeSetup, // uses a previous defined step
    { name: "Install pnpm", run: "npm i -g pnpm @antfu/ni" },
    { name: "Builder", run: "nr build" }
])


const ready: Job = job({
    name: "Ensure Readiness",
    runs_on: "ubuntu-latest",
    /** 
     * because setting ENV variables almost always 
     * requires being able to tap into context variables
     * which the runner will provide, we need to offer a
     * callback which supports types for the variables which are 
     * provided
     */
    env: {
        HAS_TOKEN: v => `${v.inputs.input.npm_token} != '' ||  ${v.secrets.npm_token} != ''`,
        TOKEN_FROM_INPUT: v => `${v.inputs.input.npm_token} != ''`
    },
    /** 
     * the same callback requirement exists for if conditions 
     * but rather than being a key/value it's just an array of
     * items which must be logically AND'd together
     */
    if: [

    ],
    ...steps(
        // can consume single steps previously defined
        nodeSetup,
        // can also take in a list of steps previously defined
        multiStep,
        // or just define it's own steps inline
        { 
            name: "Do Something", run: "echo 'hi'"
        }
    )
});

const flow = workflow({
    name: Test then Publish,
    on: {
        push: {
            branches: [ "main", "master" ]
        }
    },

})



/** specify the configured workflow and/or actions which have been defined */
export default deploy(
    flow,
    // could deploy as many as you like
);
```

With these definitions being defined in one or more files you get the composability aspects and each helper function (e.g., `step()`, `job()`, `workflow()`, and `action()` ensuring that strong typing is keeping the users on a safe path).

The CLI will simply look for a default export in `actions/index.ts` or whatever path it is pointed to. 

### Testing

```sh
gha test 
```


1. Structural Tests
   - Presuming the user has exported a `Deployment` type as the default export, the CLI will run all structural tests within the Typescript domain; and if they pass
   - combine and convert them into YAML files in a test directory `tests/dry-run` where the YAML that was produced will be checked for structural integrity against the normal schema types.
  
2. `act` Dry-Run Tests

    - if `act` is _not_ installed on the host system then these tests will be set to "skip" mode
      - In addition we should send a message to the console describing that "act" tests can not be run until act is installed.
    - if `act` is installed then all tests which are to be run in a dry-run mode will be run and reported to the user using Vitest (our test runner)

3. `act` Live Tests

    - if no actively running Docker daemon is found running on the host system then the tests which require a live test with `act` should be set to `skip` mode
      - We should also send a nice message to user to tell them why they are set to `skip` mode
    - if both `act` is installed and `Docker` is running we'll run the live tests and report back results using Vitest (our test runner)

### Building

The **gha** `build` command is just like `test` except that if the test has been successful then the workflows and actions will be moved to the `.github/actions` and `.github/workflows` directories respectively.



