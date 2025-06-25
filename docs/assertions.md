Available WorkflowAssertions Methods:

  Looking at the code, here are the main assertion methods:

  1. assertTriggers(workflow, ['push', 'pull_request']) - Validates event triggers
  2. assertUsesAction(workflow, 'actions/checkout') - Finds action usage across all jobs
  3. assertJobExists(workflow, 'jobName') - Checks job existence
  4. assertJobProperties(workflow, 'jobName', properties) - Validates job configuration
  5. assertStepExists(workflow, 'jobName', stepIdentifier) - Checks step existence
  6. assertStepProperties(workflow, 'jobName', stepId, properties) - Validates step config
  7. assertWorkflowOutputs(workflow, expectedOutputs) - Validates outputs

  The _assert pattern with custom matchers like .toHaveJob() is more modern and provides
  better test output, while the assertion methods handle complex validation logic that would
  be cumbersome in simple matchers.
