import { test as vitestTest, expect as vitestExpect, describe, beforeEach, afterEach } from 'vitest';
import type { TestAPI } from 'vitest';
import { ActRunner } from './act-wrapper';
import { MockContext } from './mock-context';
import { WorkflowAssertions } from './assertions';
import { loadWorkflow } from './test-helpers';
import type { GitHubContext, WorkflowTestOptions } from './types';

export interface WorkflowTestContext {
  mockContext: MockContext;
  actRunner: ActRunner;
  assertions: WorkflowAssertions;
}

export const workflowTest = vitestTest.extend<{
  workflowContext: WorkflowTestContext;
}>({
  workflowContext: async ({}, use) => {
    const mockContext = new MockContext();
    const actRunner = new ActRunner();
    const assertions = new WorkflowAssertions();

    // Setup
    await mockContext.initialize();
    
    // Use in test
    await use({
      mockContext,
      actRunner,
      assertions
    });

    // Cleanup
    await actRunner.cleanup();
    mockContext.cleanup();
  }
});

export class WorkflowTestRunner {
  private mockContext: MockContext;
  private actRunner: ActRunner;
  private assertions: WorkflowAssertions;

  constructor() {
    this.mockContext = new MockContext();
    this.actRunner = new ActRunner();
    this.assertions = new WorkflowAssertions();
  }

  /**
   * Run a workflow test with mocked GitHub context
   */
  async runWorkflow(
    workflowPath: string,
    options: WorkflowTestOptions = {}
  ): Promise<WorkflowTestResult> {
    const { event = 'push', inputs = {}, secrets = {}, env = {} } = options;

    // Load workflow
    const workflow = await loadWorkflow(workflowPath);

    // Validate workflow syntax
    const syntaxErrors = await this.assertions.validateSyntax(workflow);
    if (syntaxErrors.length > 0) {
      return {
        success: false,
        errors: syntaxErrors,
        workflow
      };
    }

    // Set up mock context
    this.mockContext.setEvent(event);
    this.mockContext.setInputs(inputs);
    this.mockContext.setSecrets(secrets);
    this.mockContext.setEnv(env);

    // Run with act if requested
    if (options.runWithAct) {
      const actResult = await this.actRunner.run(workflowPath, {
        event,
        eventPayload: this.mockContext.getEventPayload(),
        secrets: this.mockContext.getSecrets(),
        env: this.mockContext.getEnv(),
        inputs: this.mockContext.getInputs(),
        actOptions: options.actOptions // Forward actOptions (e.g., dryRun)
      });

      return {
        success: actResult.success,
        errors: actResult.errors || [],
        outputs: actResult.outputs,
        logs: actResult.logs,
        workflow,
        actResult
      };
    }

    // Static validation only
    return {
      success: true,
      errors: [],
      workflow
    };
  }

  /**
   * Assert workflow properties
   */
  async assertWorkflow(
    workflowPath: string,
    assertions: (assert: WorkflowAssertions, workflow: any) => void | Promise<void>
  ): Promise<void> {
    const workflow = await loadWorkflow(workflowPath);
    await assertions(this.assertions, workflow);
  }

  /**
   * Create a mock GitHub context for testing
   */
  createMockContext(overrides: Partial<GitHubContext> = {}): GitHubContext {
    return this.mockContext.createContext(overrides);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.actRunner.cleanup();
    this.mockContext.cleanup();
  }
}

export interface WorkflowTestResult {
  success: boolean;
  errors: string[];
  outputs?: Record<string, any>;
  logs?: string[];
  workflow: any;
  actResult?: any;
}

// Export test utilities
export { workflowTest as test };
export { vitestExpect as expect };
export { describe, beforeEach, afterEach };

// Custom matchers for workflow testing
vitestExpect.extend({
  toHaveJob(workflow: any, jobName: string) {
    const hasJob = workflow.jobs && jobName in workflow.jobs;
    return {
      pass: hasJob,
      message: () =>
        hasJob
          ? `Expected workflow not to have job "${jobName}"`
          : `Expected workflow to have job "${jobName}"`
    };
  },

  toHaveStep(job: any, stepName: string) {
    const steps = job.steps || [];
    const hasStep = steps.some((step: any) => 
      step.name === stepName || step.id === stepName || step.uses?.includes(stepName)
    );
    return {
      pass: hasStep,
      message: () =>
        hasStep
          ? `Expected job not to have step "${stepName}"`
          : `Expected job to have step "${stepName}"`
    };
  },

  toUseAction(step: any, actionName: string) {
    const usesAction = step.uses?.includes(actionName) || false;
    return {
      pass: usesAction,
      message: () =>
        usesAction
          ? `Expected step not to use action "${actionName}"`
          : `Expected step to use action "${actionName}"`
    };
  }
});

// TypeScript augmentation for custom matchers
declare module 'vitest' {
  interface Assertion {
    toHaveJob(jobName: string): void;
    toHaveStep(stepName: string): void;
    toUseAction(actionName: string): void;
  }
}
