/* Auto-generated from reusableWorkflowCallJob JSON Schema */

/**
 * Identifies any jobs that must complete successfully before this job will run. It can be a string or array of strings. If a job fails, all jobs that need it are skipped unless the jobs use a conditional statement that causes the job to continue.
 */
export type JobNeeds = [Name, ...Name[]] | Name;
export type Name = string;
/**
 * You can modify the default permissions granted to the GITHUB_TOKEN, adding or removing access as required, so that you only allow the minimum required access.
 */
export type Permissions = ("read-all" | "write-all") | PermissionsEvent;
export type PermissionsLevel = "read" | "write" | "none";
export type StringContainingExpressionSyntax = string;
/**
 * To set custom environment variables, you need to specify the variables in the workflow file. You can define environment variables for a step, job, or entire workflow using the jobs.<job_id>.steps[*].env, jobs.<job_id>.env, and env keywords. For more information, see https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions#jobsjob_idstepsenv
 */
export type Env =
  | {
      [k: string]: string | number | boolean;
    }
  | StringContainingExpressionSyntax;
/**
 * A build matrix is a set of different configurations of the virtual environment. For example you might run a job against more than one supported version of a language, operating system, or tool. Each configuration is a copy of the job that runs and reports a status.
 * You can specify a matrix by supplying an array for the configuration options. For example, if the GitHub virtual environment supports Node.js versions 6, 8, and 10 you could specify an array of those versions in the matrix.
 * When you define a matrix of operating systems, you must set the required runs-on keyword to the operating system of the current job, rather than hard-coding the operating system name. To access the operating system name, you can use the matrix.os context parameter to set runs-on. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
 */
export type Matrix =
  | {
      [k: string]: [Configuration, ...Configuration[]] | ExpressionSyntax;
    }
  | ExpressionSyntax;
export type ExpressionSyntax = string;
export type Configuration =
  | string
  | number
  | boolean
  | {
      [k: string]: Configuration;
    }
  | Configuration[];

/**
 * Each job must have an id to associate with the job. The key job_id is a string and its value is a map of the job's configuration data. You must replace <job_id> with a string that is unique to the jobs object. The <job_id> must start with a letter or _ and contain only alphanumeric characters, -, or _.
 */
export interface ReusableWorkflowCallJob {
  /**
   * The name of the job displayed on GitHub.
   */
  name?: string;
  needs?: JobNeeds;
  permissions?: Permissions;
  /**
   * You can use the if conditional to prevent a job from running unless a condition is met. You can use any supported context and expression to create a conditional.
   * Expressions in an if conditional do not require the ${{ }} syntax. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
   */
  if?: boolean | number | string;
  /**
   * The location and version of a reusable workflow file to run as a job, of the form './{path/to}/{localfile}.yml' or '{owner}/{repo}/{path}/{filename}@{ref}'. {ref} can be a SHA, a release tag, or a branch name. Using the commit SHA is the safest for stability and security.
   */
  uses: string;
  /**
   * A map of inputs that are passed to the called workflow. Any inputs that you pass must match the input specifications defined in the called workflow. Unlike 'jobs.<job_id>.steps[*].with', the inputs you pass with 'jobs.<job_id>.with' are not be available as environment variables in the called workflow. Instead, you can reference the inputs by using the inputs context.
   */
  with?:
    | {
        [k: string]: string | number | boolean;
      }
    | StringContainingExpressionSyntax;
  /**
   * When a job is used to call a reusable workflow, you can use 'secrets' to provide a map of secrets that are passed to the called workflow. Any secrets that you pass must match the names defined in the called workflow.
   */
  secrets?: Env | "inherit";
  /**
   * A strategy creates a build matrix for your jobs. You can define different variations of an environment to run each job in.
   */
  strategy?: {
    matrix: Matrix;
    /**
     * When set to true, GitHub cancels all in-progress jobs if any matrix job fails. Default: true
     */
    "fail-fast"?: boolean | string;
    /**
     * The maximum number of jobs that can run simultaneously when using a matrix job strategy. By default, GitHub will maximize the number of jobs run in parallel depending on the available runners on GitHub-hosted virtual machines.
     */
    "max-parallel"?: number | string;
  };
  /**
   * Concurrency ensures that only a single job or workflow using the same concurrency group will run at a time. A concurrency group can be any string or expression. The expression can use any context except for the secrets context.
   * You can also specify concurrency at the workflow level.
   * When a concurrent job or workflow is queued, if another job or workflow using the same concurrency group in the repository is in progress, the queued job or workflow will be pending. Any previously pending job or workflow in the concurrency group will be canceled. To also cancel any currently running job or workflow in the same concurrency group, specify cancel-in-progress: true.
   */
  concurrency?: string | Concurrency;
}
export interface PermissionsEvent {
  actions?: PermissionsLevel;
  attestations?: PermissionsLevel;
  checks?: PermissionsLevel;
  contents?: PermissionsLevel;
  deployments?: PermissionsLevel;
  discussions?: PermissionsLevel;
  "id-token"?: PermissionsLevel;
  issues?: PermissionsLevel;
  models?: "read" | "none";
  packages?: PermissionsLevel;
  pages?: PermissionsLevel;
  "pull-requests"?: PermissionsLevel;
  "repository-projects"?: PermissionsLevel;
  "security-events"?: PermissionsLevel;
  statuses?: PermissionsLevel;
}
export interface Concurrency {
  /**
   * When a concurrent job or workflow is queued, if another job or workflow using the same concurrency group in the repository is in progress, the queued job or workflow will be pending. Any previously pending job or workflow in the concurrency group will be canceled.
   */
  group: string;
  /**
   * To cancel any currently running job or workflow in the same concurrency group, specify cancel-in-progress: true.
   */
  "cancel-in-progress"?: boolean | ExpressionSyntax;
}
