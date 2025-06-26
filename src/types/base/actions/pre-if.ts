/* Auto-generated from pre-if JSON Schema */

/**
 * Allows you to define conditions for the `pre:` action execution. The `pre:` action will only run if the conditions in `pre-if` are met. If not set, then `pre-if` defaults to `always()`. Note that the `step` context is unavailable, as no steps have run yet.
 */
export type PreIf = string;
