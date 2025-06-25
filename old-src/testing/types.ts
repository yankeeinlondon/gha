export interface GitHubContext {
  github: {
    token: string;
    job: string;
    ref: string;
    sha: string;
    repository: string;
    repository_owner: string;
    repositoryUrl: string;
    run_id: string;
    run_number: string;
    retention_days: string;
    run_attempt: string;
    actor: string;
    workflow: string;
    head_ref: string;
    base_ref: string;
    event_name: string;
    server_url: string;
    api_url: string;
    graphql_url: string;
    ref_name: string;
    ref_protected: boolean;
    ref_type: string;
    secret_source: string;
    workspace: string;
    action: string;
    event_path: string;
    path: string;
    env: string;
  };
  env: Record<string, string>;
  job: {
    status: string;
  };
  steps: {
    [key: string]: {
      outputs: Record<string, string>;
      conclusion: string;
      outcome: string;
    };
  };
  runner: {
    os: string;
    arch: string;
    name: string;
    tool_cache: string;
    temp: string;
    workspace: string;
  };
  secrets: Record<string, string>;
  strategy: {
    fail_fast: boolean;
    job_index: number;
    job_total: number;
    max_parallel: number;
  };
  matrix: Record<string, any>;
  needs: Record<string, any>;
  inputs: Record<string, any>;
}

export interface WorkflowTestOptions {
  event?: GitHubEvent;
  eventPayload?: any;
  inputs?: Record<string, any>;
  secrets?: Record<string, string>;
  env?: Record<string, string>;
  runWithAct?: boolean;
  actOptions?: ActOptions;
}

export interface ActOptions {
  containerArchitecture?: string;
  bindWorkdir?: boolean;
  artifactServerPath?: string;
  artifactServerPort?: string;
  noSkipCheckout?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
  platform?: string;
  containerDaemonSocket?: string;
}

export type GitHubEvent = 
  | 'branch_protection_rule'
  | 'check_run'
  | 'check_suite'
  | 'create'
  | 'delete'
  | 'deployment'
  | 'deployment_status'
  | 'discussion'
  | 'discussion_comment'
  | 'fork'
  | 'gollum'
  | 'issue_comment'
  | 'issues'
  | 'label'
  | 'merge_group'
  | 'milestone'
  | 'page_build'
  | 'project'
  | 'project_card'
  | 'project_column'
  | 'public'
  | 'pull_request'
  | 'pull_request_comment'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'pull_request_target'
  | 'push'
  | 'registry_package'
  | 'release'
  | 'repository_dispatch'
  | 'schedule'
  | 'status'
  | 'watch'
  | 'workflow_call'
  | 'workflow_dispatch'
  | 'workflow_run';

export interface EventPayload {
  [key: string]: any;
}

export interface PushEventPayload extends EventPayload {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      name: string;
      email?: string;
    };
  };
  pusher: {
    name: string;
    email?: string;
  };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
  }>;
}

export interface PullRequestEventPayload extends EventPayload {
  action: 'opened' | 'edited' | 'closed' | 'assigned' | 'unassigned' | 'review_requested' | 'review_request_removed' | 'ready_for_review' | 'converted_to_draft' | 'locked' | 'unlocked' | 'reopened' | 'synchronize';
  number: number;
  pull_request: {
    id: number;
    number: number;
    state: 'open' | 'closed';
    locked: boolean;
    title: string;
    body?: string;
    user: {
      login: string;
      id: number;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
}

export interface WorkflowDispatchEventPayload extends EventPayload {
  inputs: Record<string, any>;
  ref: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
  workflow: string;
}

export interface ActResult {
  success: boolean;
  exitCode: number;
  outputs?: Record<string, any>;
  logs?: string[];
  errors?: string[];
  jobResults?: Array<{
    name: string;
    status: 'success' | 'failure' | 'cancelled' | 'skipped';
    steps: Array<{
      name: string;
      status: 'success' | 'failure' | 'cancelled' | 'skipped';
      outputs?: Record<string, any>;
    }>;
  }>;
}
