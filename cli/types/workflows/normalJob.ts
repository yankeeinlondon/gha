/* Auto-generated from normalJob JSON Schema */

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
export type ExpressionSyntax = string;
/**
 * You can override the default shell settings in the runner's operating system using the shell keyword. You can use built-in shell keywords, or you can define a custom set of shell options.
 */
export type Shell = string | ("bash" | "pwsh" | "python" | "sh" | "cmd" | "powershell");
/**
 * Using the working-directory keyword, you can specify the working directory of where to run the command.
 */
export type WorkingDirectory = string;
export type Step = {
  /**
   * A unique identifier for the step. You can use the id to reference the step in contexts. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
   */
  id?: string;
  /**
   * You can use the if conditional to prevent a step from running unless a condition is met. You can use any supported context and expression to create a conditional.
   * Expressions in an if conditional do not require the ${{ }} syntax. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
   */
  if?: boolean | number | string;
  /**
   * A name for your step to display on GitHub.
   */
  name?: string;
  /**
   * Selects an action to run as part of a step in your job. An action is a reusable unit of code. You can use an action defined in the same repository as the workflow, a public repository, or in a published Docker container image (https://hub.docker.com/).
   * We strongly recommend that you include the version of the action you are using by specifying a Git ref, SHA, or Docker tag number. If you don't specify a version, it could break your workflows or cause unexpected behavior when the action owner publishes an update.
   * - Using the commit SHA of a released action version is the safest for stability and security.
   * - Using the specific major action version allows you to receive critical fixes and security patches while still maintaining compatibility. It also assures that your workflow should still work.
   * - Using the master branch of an action may be convenient, but if someone releases a new major version with a breaking change, your workflow could break.
   * Some actions require inputs that you must set using the with keyword. Review the action's README file to determine the inputs required.
   * Actions are either JavaScript files or Docker containers. If the action you're using is a Docker container you must run the job in a Linux virtual environment. For more details, see https://help.github.com/en/articles/virtual-environments-for-github-actions.
   */
  uses?: string;
  /**
   * Runs command-line programs using the operating system's shell. If you do not provide a name, the step name will default to the text specified in the run command.
   * Commands run using non-login shells by default. You can choose a different shell and customize the shell used to run commands. For more information, see https://help.github.com/en/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#using-a-specific-shell.
   * Each run keyword represents a new process and shell in the virtual environment. When you provide multi-line commands, each line runs in the same shell.
   */
  run?: string;
  "working-directory"?: WorkingDirectory;
  shell?: Shell;
  with?: Env;
  /**
   * Sets environment variables for steps to use in the virtual environment. You can also set environment variables for the entire workflow or a job.
   */
  env?:
    | {
        [k: string]: string | number | boolean;
      }
    | StringContainingExpressionSyntax;
  /**
   * Prevents a job from failing when a step fails. Set to true to allow a job to pass when this step fails.
   */
  "continue-on-error"?: boolean | ExpressionSyntax;
  /**
   * The maximum number of minutes to run the step before killing the process.
   */
  "timeout-minutes"?: number | ExpressionSyntax;
} & Step1 & {
    /**
     * A unique identifier for the step. You can use the id to reference the step in contexts. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
     */
    id?: string;
    /**
     * You can use the if conditional to prevent a step from running unless a condition is met. You can use any supported context and expression to create a conditional.
     * Expressions in an if conditional do not require the ${{ }} syntax. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
     */
    if?: boolean | number | string;
    /**
     * A name for your step to display on GitHub.
     */
    name?: string;
    /**
     * Selects an action to run as part of a step in your job. An action is a reusable unit of code. You can use an action defined in the same repository as the workflow, a public repository, or in a published Docker container image (https://hub.docker.com/).
     * We strongly recommend that you include the version of the action you are using by specifying a Git ref, SHA, or Docker tag number. If you don't specify a version, it could break your workflows or cause unexpected behavior when the action owner publishes an update.
     * - Using the commit SHA of a released action version is the safest for stability and security.
     * - Using the specific major action version allows you to receive critical fixes and security patches while still maintaining compatibility. It also assures that your workflow should still work.
     * - Using the master branch of an action may be convenient, but if someone releases a new major version with a breaking change, your workflow could break.
     * Some actions require inputs that you must set using the with keyword. Review the action's README file to determine the inputs required.
     * Actions are either JavaScript files or Docker containers. If the action you're using is a Docker container you must run the job in a Linux virtual environment. For more details, see https://help.github.com/en/articles/virtual-environments-for-github-actions.
     */
    uses?: string;
    /**
     * Runs command-line programs using the operating system's shell. If you do not provide a name, the step name will default to the text specified in the run command.
     * Commands run using non-login shells by default. You can choose a different shell and customize the shell used to run commands. For more information, see https://help.github.com/en/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#using-a-specific-shell.
     * Each run keyword represents a new process and shell in the virtual environment. When you provide multi-line commands, each line runs in the same shell.
     */
    run?: string;
    "working-directory"?: WorkingDirectory;
    shell?: Shell;
    with?: Env;
    /**
     * Sets environment variables for steps to use in the virtual environment. You can also set environment variables for the entire workflow or a job.
     */
    env?:
      | {
          [k: string]: string | number | boolean;
        }
      | StringContainingExpressionSyntax;
    /**
     * Prevents a job from failing when a step fails. Set to true to allow a job to pass when this step fails.
     */
    "continue-on-error"?: boolean | ExpressionSyntax;
    /**
     * The maximum number of minutes to run the step before killing the process.
     */
    "timeout-minutes"?: number | ExpressionSyntax;
  } & Step1;
/**
 * A map of the input parameters defined by the action. Each input parameter is a key/value pair. Input parameters are set as environment variables. The variable is prefixed with INPUT_ and converted to upper case.
 */
export type Env = {
  args?: string;
  entrypoint?: string;
  [k: string]: unknown;
} & (
  | {
      [k: string]: string | number | boolean;
    }
  | StringContainingExpressionSyntax
);
export type Step1 =
  | {
      [k: string]: unknown;
    }
  | {
      [k: string]: unknown;
    };
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
export interface NormalJob {
  /**
   * The name of the job displayed on GitHub.
   */
  name?: string;
  needs?: JobNeeds;
  permissions?: Permissions;
  /**
   * The type of machine to run the job on. The machine can be either a GitHub-hosted runner, or a self-hosted runner.
   */
  "runs-on":
    | string
    | ([string, ...string[]] & unknown[])
    | {
        group?: string;
        labels?: string | string[];
        [k: string]: unknown;
      }
    | StringContainingExpressionSyntax
    | ExpressionSyntax;
  /**
   * The environment that the job references.
   */
  environment?: string | Environment;
  /**
   * A map of outputs for a job. Job outputs are available to all downstream jobs that depend on this job.
   */
  outputs?: {
    [k: string]: string;
  };
  /**
   * To set custom environment variables, you need to specify the variables in the workflow file. You can define environment variables for a step, job, or entire workflow using the jobs.<job_id>.steps[*].env, jobs.<job_id>.env, and env keywords. For more information, see https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions#jobsjob_idstepsenv
   */
  env?:
    | {
        [k: string]: string | number | boolean;
      }
    | StringContainingExpressionSyntax;
  defaults?: Defaults;
  /**
   * You can use the if conditional to prevent a job from running unless a condition is met. You can use any supported context and expression to create a conditional.
   * Expressions in an if conditional do not require the ${{ }} syntax. For more information, see https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions.
   */
  if?: boolean | number | string;
  /**
   * A job contains a sequence of tasks called steps. Steps can run commands, run setup tasks, or run an action in your repository, a public repository, or an action published in a Docker registry. Not all steps run actions, but all actions run as a step. Each step runs in its own process in the virtual environment and has access to the workspace and filesystem. Because steps run in their own process, changes to environment variables are not preserved between steps. GitHub provides built-in steps to set up and complete a job.
   * Must contain either `uses` or `run`
   *
   *
   * @minItems 1
   */
  steps?: [Step, ...Step[]];
  /**
   * The maximum number of minutes to let a workflow run before GitHub automatically cancels it. Default: 360
   */
  "timeout-minutes"?: number | ExpressionSyntax;
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
   * Prevents a workflow run from failing when a job fails. Set to true to allow a workflow run to pass when this job fails.
   */
  "continue-on-error"?: boolean | ExpressionSyntax;
  /**
   * A container to run any steps in a job that don't already specify a container. If you have steps that use both script and container actions, the container actions will run as sibling containers on the same network with the same volume mounts.
   * If you do not set a container, all steps will run directly on the host specified by runs-on unless a step refers to an action configured to run in a container.
   */
  container?: string | Container;
  /**
   * Additional containers to host services for a job in a workflow. These are useful for creating databases or cache services like redis. The runner on the virtual machine will automatically create a network and manage the life cycle of the service containers.
   * When you use a service container for a job or your step uses container actions, you don't need to set port information to access the service. Docker automatically exposes all ports between containers on the same network.
   * When both the job and the action run in a container, you can directly reference the container by its hostname. The hostname is automatically mapped to the service name.
   * When a step does not use a container action, you must access the service using localhost and bind the ports.
   */
  services?: {
    [k: string]: Container;
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
/**
 * The environment that the job references
 */
export interface Environment {
  /**
   * The name of the environment configured in the repo.
   */
  name: string;
  /**
   * A deployment URL
   */
  url?: string;
}
/**
 * A map of default settings that will apply to all steps in the job.
 */
export interface Defaults {
  run?: {
    shell?: Shell;
    "working-directory"?: WorkingDirectory;
  };
}
export interface Container {
  /**
   * The Docker image to use as the container to run the action. The value can be the Docker Hub image name or a registry name.
   */
  image: string;
  /**
   * If the image's container registry requires authentication to pull the image, you can use credentials to set a map of the username and password. The credentials are the same values that you would provide to the `docker login` command.
   */
  credentials?: {
    username?: string;
    password?: string;
    [k: string]: unknown;
  };
  /**
   * Sets an array of environment variables in the container.
   */
  env?:
    | {
        [k: string]: string | number | boolean;
      }
    | StringContainingExpressionSyntax;
  /**
   * Sets an array of ports to expose on the container.
   *
   * @minItems 1
   */
  ports?: [number | string, ...(number | string)[]];
  /**
   * Sets an array of volumes for the container to use. You can use volumes to share data between services or other steps in a job. You can specify named Docker volumes, anonymous Docker volumes, or bind mounts on the host.
   * To specify a volume, you specify the source and destination path: <source>:<destinationPath>
   * The <source> is a volume name or an absolute path on the host machine, and <destinationPath> is an absolute path in the container.
   *
   * @minItems 1
   */
  volumes?: [string, ...string[]];
  /**
   * Additional Docker container resource options. For a list of options, see https://docs.docker.com/engine/reference/commandline/create/#options.
   */
  options?: string;
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
