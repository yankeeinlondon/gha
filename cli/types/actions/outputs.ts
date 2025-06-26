/* Auto-generated from outputs JSON Schema */

/**
 * Output parameters allow you to declare data that an action sets. Actions that run later in a workflow can use the output data set in previously run actions. For example, if you had an action that performed the addition of two inputs (x + y = z), the action could output the sum (z) for other actions to use as an input.
 * If you don't declare an output in your action metadata file, you can still set outputs and use them in a workflow.
 */
export interface Outputs {
  /**
   * A string identifier to associate with the output. The value of `<output_id>` is a map of the output's metadata. The `<output_id>` must be a unique identifier within the outputs object. The `<output_id>` must start with a letter or `_` and contain only alphanumeric characters, `-`, or `_`.
   *
   * This interface was referenced by `Outputs`'s JSON-Schema definition
   * via the `patternProperty` "^[_a-zA-Z][a-zA-Z0-9_-]*$".
   */
  [k: string]: {
    /**
     * A string description of the output parameter.
     */
    description: string;
  };
}
