/* Auto-generated from runs-composite JSON Schema */

/**
 * Configures the path to the composite action, and the application used to execute the code.
 */
export interface RunsComposite {
  /**
   * To use a composite run steps action, set this to 'composite'.
   */
  using: "composite";
  /**
   * The run steps that you plan to run in this action.
   */
  steps: {
    [k: string]: unknown;
  }[];
}
