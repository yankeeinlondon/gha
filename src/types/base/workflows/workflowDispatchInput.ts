/* Auto-generated from workflowDispatchInput JSON Schema */

/**
 * A string identifier to associate with the input. The value of <input_id> is a map of the input's metadata. The <input_id> must be a unique identifier within the inputs object. The <input_id> must start with a letter or _ and contain only alphanumeric characters, -, or _.
 */
export type WorkflowDispatchInput = {
  [k: string]: unknown;
} & {
  /**
   * A string description of the input parameter.
   */
  description: string;
  /**
   * A string shown to users using the deprecated input.
   */
  deprecationMessage?: string;
  /**
   * A boolean to indicate whether the action requires the input parameter. Set to true when the parameter is required.
   */
  required?: boolean;
  /**
   * A string representing the default value. The default value is used when an input parameter isn't specified in a workflow file.
   */
  default?: {
    [k: string]: unknown;
  };
  /**
   * A string representing the type of the input.
   */
  type?: "string" | "choice" | "boolean" | "number" | "environment";
  /**
   * The options of the dropdown list, if the type is a choice.
   *
   * @minItems 1
   */
  options?: [string, ...string[]];
};
