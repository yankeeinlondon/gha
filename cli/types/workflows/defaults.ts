/* Auto-generated from defaults JSON Schema */

/**
 * You can override the default shell settings in the runner's operating system using the shell keyword. You can use built-in shell keywords, or you can define a custom set of shell options.
 */
export type Shell = string | ("bash" | "pwsh" | "python" | "sh" | "cmd" | "powershell");
/**
 * Using the working-directory keyword, you can specify the working directory of where to run the command.
 */
export type WorkingDirectory = string;

export interface Defaults {
  run?: {
    shell?: Shell;
    "working-directory"?: WorkingDirectory;
  };
}
