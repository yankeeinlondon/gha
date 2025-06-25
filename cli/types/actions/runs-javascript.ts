/* Auto-generated from runs-javascript JSON Schema */

/**
 * Allows you to define conditions for the `pre:` action execution. The `pre:` action will only run if the conditions in `pre-if` are met. If not set, then `pre-if` defaults to `always()`. Note that the `step` context is unavailable, as no steps have run yet.
 */
export type PreIf = string;
/**
 * Allows you to define conditions for the `post:` action execution. The `post:` action will only run if the conditions in `post-if` are met. If not set, then `post-if` defaults to `always()`.
 */
export type PostIf = string;

/**
 * Configures the path to the action's code and the application used to execute the code.
 */
export interface RunsJavascript {
  /**
   * The application used to execute the code specified in `main`.
   */
  using: "node12" | "node16" | "node20";
  /**
   * The file that contains your action code. The application specified in `using` executes this file.
   */
  main: string;
  /**
   * Allows you to run a script at the start of a job, before the `main:` action begins. For example, you can use `pre:` to run a prerequisite setup script. The application specified with the `using` syntax will execute this file. The `pre:` action always runs by default but you can override this using `pre-if`.
   */
  pre?: string;
  "pre-if"?: PreIf;
  /**
   * Allows you to run a script at the end of a job, once the `main:` action has completed. For example, you can use `post:` to terminate certain processes or remove unneeded files. The application specified with the `using` syntax will execute this file. The `post:` action always runs by default but you can override this using `post-if`.
   */
  post?: string;
  "post-if"?: PostIf;
}
