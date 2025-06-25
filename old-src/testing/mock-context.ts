import type { 
  GitHubContext, 
  GitHubEvent, 
  EventPayload,
  PushEventPayload,
  PullRequestEventPayload,
  WorkflowDispatchEventPayload
} from './types';

export class MockContext {
  private event: GitHubEvent = 'push';
  private eventPayload: EventPayload = {};
  private secrets: Record<string, string> = {};
  private env: Record<string, string> = {};
  private inputs: Record<string, any> = {};
  private repository = 'owner/repo';
  private ref = 'refs/heads/main';
  private sha = 'abc123def456';
  private actor = 'test-user';
  private runId = '123456789';
  private runNumber = '42';

  constructor() {
    this.setDefaultEnv();
  }

  async initialize(): Promise<void> {
    // Initialize with default push event
    this.setEvent('push');
  }

  setEvent(event: GitHubEvent, payload?: EventPayload): void {
    this.event = event;
    
    if (payload) {
      this.eventPayload = payload;
    } else {
      // Set default payload based on event type
      switch (event) {
        case 'push':
          this.eventPayload = this.createPushPayload();
          break;
        case 'pull_request':
          this.eventPayload = this.createPullRequestPayload();
          break;
        case 'workflow_dispatch':
          this.eventPayload = this.createWorkflowDispatchPayload();
          break;
        default:
          this.eventPayload = this.createGenericPayload();
      }
    }
  }

  setInputs(inputs: Record<string, any>): void {
    this.inputs = inputs;
  }

  setSecrets(secrets: Record<string, string>): void {
    this.secrets = secrets;
  }

  setEnv(env: Record<string, string>): void {
    this.env = { ...this.env, ...env };
  }

  setRepository(repository: string): void {
    this.repository = repository;
  }

  setRef(ref: string): void {
    this.ref = ref;
  }

  setSha(sha: string): void {
    this.sha = sha;
  }

  setActor(actor: string): void {
    this.actor = actor;
  }

  getEvent(): GitHubEvent {
    return this.event;
  }

  getEventPayload(): EventPayload {
    return this.eventPayload;
  }

  getSecrets(): Record<string, string> {
    return this.secrets;
  }

  getEnv(): Record<string, string> {
    return this.env;
  }

  getInputs(): Record<string, any> {
    return this.inputs;
  }

  createContext(overrides: Partial<GitHubContext> = {}): GitHubContext {
    const [owner, repo] = this.repository.split('/');
    
    const baseContext: GitHubContext = {
      github: {
        token: this.secrets.GITHUB_TOKEN || 'mock-token',
        job: 'test-job',
        ref: this.ref,
        sha: this.sha,
        repository: this.repository,
        repository_owner: owner,
        repositoryUrl: `https://github.com/${this.repository}`,
        run_id: this.runId,
        run_number: this.runNumber,
        retention_days: '90',
        run_attempt: '1',
        actor: this.actor,
        workflow: 'Test Workflow',
        head_ref: '',
        base_ref: '',
        event_name: this.event,
        server_url: 'https://github.com',
        api_url: 'https://api.github.com',
        graphql_url: 'https://api.github.com/graphql',
        ref_name: this.ref.replace('refs/heads/', ''),
        ref_protected: false,
        ref_type: 'branch',
        secret_source: 'Actions',
        workspace: '/home/runner/work/' + repo + '/' + repo,
        action: '__run',
        event_path: '/home/runner/work/_temp/_github_workflow/event.json',
        path: '/home/runner/work/_temp/_runner_file_commands/add_path',
        env: '/home/runner/work/_temp/_runner_file_commands/set_env'
      },
      env: this.env,
      job: {
        status: 'success'
      },
      steps: {},
      runner: {
        os: 'Linux',
        arch: 'X64',
        name: 'GitHub Actions',
        tool_cache: '/opt/hostedtoolcache',
        temp: '/home/runner/work/_temp',
        workspace: '/home/runner/work'
      },
      secrets: this.secrets,
      strategy: {
        fail_fast: false,
        job_index: 0,
        job_total: 1,
        max_parallel: 1
      },
      matrix: {},
      needs: {},
      inputs: this.inputs
    };

    return this.deepMerge(baseContext, overrides) as GitHubContext;
  }

  private createPushPayload(): PushEventPayload {
    const [owner, repo] = this.repository.split('/');
    
    return {
      ref: this.ref,
      before: '0000000000000000000000000000000000000000',
      after: this.sha,
      repository: {
        id: 123456789,
        name: repo,
        full_name: this.repository,
        owner: {
          name: owner,
          email: `${owner}@example.com`
        }
      },
      pusher: {
        name: this.actor,
        email: `${this.actor}@example.com`
      },
      commits: [
        {
          id: this.sha,
          message: 'Test commit',
          timestamp: new Date().toISOString(),
          url: `https://github.com/${this.repository}/commit/${this.sha}`,
          author: {
            name: this.actor,
            email: `${this.actor}@example.com`
          }
        }
      ]
    };
  }

  private createPullRequestPayload(): PullRequestEventPayload {
    const [owner, repo] = this.repository.split('/');
    
    return {
      action: 'opened',
      number: 123,
      pull_request: {
        id: 123456789,
        number: 123,
        state: 'open',
        locked: false,
        title: 'Test PR',
        body: 'Test PR description',
        user: {
          login: this.actor,
          id: 12345
        },
        head: {
          ref: 'feature/test',
          sha: this.sha
        },
        base: {
          ref: 'main',
          sha: '0000000000000000000000000000000000000000'
        }
      },
      repository: {
        id: 123456789,
        name: repo,
        full_name: this.repository,
        owner: {
          login: owner,
          id: 12345
        }
      }
    };
  }

  private createWorkflowDispatchPayload(): WorkflowDispatchEventPayload {
    const [owner, repo] = this.repository.split('/');
    
    return {
      inputs: this.inputs,
      ref: this.ref,
      repository: {
        id: 123456789,
        name: repo,
        full_name: this.repository,
        owner: {
          login: owner,
          id: 12345
        }
      },
      workflow: '.github/workflows/test.yml'
    };
  }

  private createGenericPayload(): EventPayload {
    const [owner, repo] = this.repository.split('/');
    
    return {
      repository: {
        id: 123456789,
        name: repo,
        full_name: this.repository,
        owner: {
          login: owner,
          id: 12345
        }
      }
    };
  }

  private setDefaultEnv(): void {
    this.env = {
      CI: 'true',
      GITHUB_ACTIONS: 'true',
      GITHUB_ACTOR: this.actor,
      GITHUB_REPOSITORY: this.repository,
      GITHUB_EVENT_NAME: this.event,
      GITHUB_SHA: this.sha,
      GITHUB_REF: this.ref,
      GITHUB_WORKFLOW: 'Test Workflow',
      GITHUB_RUN_ID: this.runId,
      GITHUB_RUN_NUMBER: this.runNumber,
      RUNNER_OS: 'Linux',
      RUNNER_ARCH: 'X64'
    };
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  cleanup(): void {
    // Reset to defaults
    this.event = 'push';
    this.eventPayload = {};
    this.secrets = {};
    this.inputs = {};
    this.setDefaultEnv();
  }

  // Mock API responses
  mockGitHubApiResponse(endpoint: string, response: any): void {
    // This would be used with a mocking library like nock or msw
    // For now, just store the mock
    (this as any)[`mock_${endpoint}`] = response;
  }

  getMockedApiResponse(endpoint: string): any {
    return (this as any)[`mock_${endpoint}`];
  }
}

// Export factory functions for common scenarios
export function createPushContext(options: {
  repository?: string;
  ref?: string;
  sha?: string;
  actor?: string;
  message?: string;
} = {}): GitHubContext {
  const mock = new MockContext();
  
  if (options.repository) mock.setRepository(options.repository);
  if (options.ref) mock.setRef(options.ref);
  if (options.sha) mock.setSha(options.sha);
  if (options.actor) mock.setActor(options.actor);
  
  mock.setEvent('push');
  return mock.createContext();
}

export function createPullRequestContext(options: {
  repository?: string;
  number?: number;
  action?: PullRequestEventPayload['action'];
  title?: string;
  headRef?: string;
  baseRef?: string;
} = {}): GitHubContext {
  const mock = new MockContext();
  
  if (options.repository) mock.setRepository(options.repository);
  
  const payload: Partial<PullRequestEventPayload> = {
    action: options.action || 'opened',
    number: options.number || 123
  };
  
  if (options.title || options.headRef || options.baseRef) {
    payload.pull_request = {
      ...payload.pull_request!,
      title: options.title || 'Test PR',
      head: {
        ref: options.headRef || 'feature/test',
        sha: 'abc123'
      },
      base: {
        ref: options.baseRef || 'main', 
        sha: 'def456'
      }
    } as any;
  }
  
  mock.setEvent('pull_request', payload as PullRequestEventPayload);
  return mock.createContext();
}

export function createWorkflowDispatchContext(options: {
  repository?: string;
  inputs?: Record<string, any>;
  ref?: string;
} = {}): GitHubContext {
  const mock = new MockContext();
  
  if (options.repository) mock.setRepository(options.repository);
  if (options.ref) mock.setRef(options.ref);
  if (options.inputs) mock.setInputs(options.inputs);
  
  mock.setEvent('workflow_dispatch');
  return mock.createContext();
}
