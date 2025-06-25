import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ActOptions, ActResult, GitHubEvent } from './types';

export class ActRunner {
  private processes: Set<ChildProcess> = new Set();
  private tempDirs: Set<string> = new Set();

  /**
   * Run a workflow using act
   */
  async run(
    workflowPath: string,
    options: {
      event?: GitHubEvent;
      eventPayload?: any;
      secrets?: Record<string, string>;
      env?: Record<string, string>;
      inputs?: Record<string, any>;
      actOptions?: ActOptions;
    } = {}
  ): Promise<ActResult> {
    const {
      event = 'push',
      eventPayload = {},
      secrets = {},
      env = {},
      inputs = {},
      actOptions = {}
    } = options;

    // Debug: Log run options
    // eslint-disable-next-line no-console
    console.log(`[ActRunner] Starting run: workflowPath=${workflowPath}, event=${event}, dryRun=${actOptions?.dryRun}`);

    // Create temp directory for this run
    const tempDir = this.createTempDir();
    
    try {
      // Write event payload to temp file
      const eventFile = join(tempDir, 'event.json');
      writeFileSync(eventFile, JSON.stringify(eventPayload, null, 2));

      // Write secrets to temp file
      const secretsFile = join(tempDir, '.secrets');
      const secretsContent = Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      writeFileSync(secretsFile, secretsContent);

      // Write env vars to temp file
      const envFile = join(tempDir, '.env');
      const envContent = Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      writeFileSync(envFile, envContent);

      // Build act command
      const args = this.buildActArgs(workflowPath, event, {
        eventFile,
        secretsFile,
        envFile,
        inputs,
        ...actOptions
      });

      // Debug: Log act args
      // eslint-disable-next-line no-console
      console.log(`[ActRunner] act args: ${args.join(' ')}`);

      // Run act
      const result = await this.executeAct(args);
      
      // Debug: Log act result
      // eslint-disable-next-line no-console
      console.log(`[ActRunner] act result: success=${result.success}, exitCode=${result.exitCode}`);

      return result;
    } finally {
      // Cleanup temp directory
      this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Build act command arguments
   */
  private buildActArgs(
    workflowPath: string,
    event: GitHubEvent,
    options: {
      eventFile: string;
      secretsFile: string;
      envFile: string;
      inputs?: Record<string, any>;
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
  ): string[] {
    const args: string[] = [];

    // Event type
    args.push('-e', event);

    // Workflow file
    args.push('-W', workflowPath);

    // Event payload
    args.push('--eventpath', options.eventFile);

    // Secrets
    args.push('--secret-file', options.secretsFile);

    // Environment variables
    args.push('--env-file', options.envFile);

    // Inputs
    if (options.inputs) {
      for (const [key, value] of Object.entries(options.inputs)) {
        args.push('--input', `${key}=${value}`);
      }
    }

    // Container options
    if (options.containerArchitecture) {
      args.push('--container-architecture', options.containerArchitecture);
    }

    if (options.bindWorkdir !== false) {
      args.push('--bind');
    }

    if (options.platform) {
      args.push('--platform', options.platform);
    }

    if (options.containerDaemonSocket) {
      args.push('--container-daemon-socket', options.containerDaemonSocket);
    }

    // Artifact server
    if (options.artifactServerPath) {
      args.push('--artifact-server-path', options.artifactServerPath);
    }

    if (options.artifactServerPort) {
      args.push('--artifact-server-port', options.artifactServerPort);
    }

    // Other options
    if (options.noSkipCheckout) {
      args.push('--no-skip-checkout');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.quiet) {
      args.push('--quiet');
    }

    if (options.dryRun) {
      args.push('--dryrun');
    }

    // Always use JSON output for parsing
    args.push('--json');

    // Remove --default-image for compatibility with older act versions
    return args;
  }

  /**
   * Execute act command
   */
  private async executeAct(args: string[]): Promise<ActResult> {
    return new Promise((resolve) => {
      const logs: string[] = [];
      const errors: string[] = [];
      let jsonOutput = '';
      let finished = false;

      // Debug: Log process spawn
      // eslint-disable-next-line no-console
      console.log(`[ActRunner] Spawning act process...`);

      const proc = spawn('act', args, {
        cwd: process.cwd(),
        // Set ACT_DEFAULT_IMAGE=node:16-bullseye to avoid interactive prompt in all act versions
        env: { ...process.env, ACT_DEFAULT_IMAGE: 'node:16-bullseye' }
      });

      this.processes.add(proc);

      // Set up a timeout to kill the process if it takes too long
      const timeoutMs = 20000; // 20 seconds
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          // eslint-disable-next-line no-console
          console.error(`[ActRunner] act process timed out after ${timeoutMs}ms, killing process and children...`);
          try {
            // Try to kill the process tree (if tree-kill is available)
            try {
              // Dynamically require tree-kill if installed
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const treeKill = require('tree-kill');
              treeKill(proc.pid, 'SIGKILL');
              console.error(`[ActRunner] Used tree-kill to kill process tree for PID ${proc.pid}`);
            } catch (e) {
              // Fallback to killing just the main process
              proc.kill('SIGKILL');
              console.error(`[ActRunner] Used proc.kill to kill PID ${proc.pid}`);
            }
          } catch (killErr) {
            console.error(`[ActRunner] Error killing process: ${killErr}`);
          }
          this.processes.delete(proc);
          resolve({
            success: false,
            exitCode: 124,
            logs,
            errors: [
              ...errors,
              `act process timed out after ${timeoutMs}ms`
            ]
          });
        }
      }, timeoutMs);

      proc.stdout.on('data', (data) => {
        const output = data.toString();
        logs.push(output);

        // Debug: Log stdout
        // eslint-disable-next-line no-console
        console.log(`[ActRunner] stdout: ${output}`);

        // Try to capture JSON output
        if (output.includes('{') && output.includes('}')) {
          jsonOutput += output;
        }
      });

      proc.stderr.on('data', (data) => {
        const error = data.toString();
        errors.push(error);

        // Debug: Log stderr
        // eslint-disable-next-line no-console
        console.error(`[ActRunner] stderr: ${error}`);
      });

      proc.on('close', (code) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        this.processes.delete(proc);

        // Debug: Log process close
        // eslint-disable-next-line no-console
        console.log(`[ActRunner] act process closed with code ${code}`);

        const result: ActResult = {
          success: code === 0,
          exitCode: code || 0,
          logs,
          errors: errors.length > 0 ? errors : undefined
        };

        // Try to parse JSON output
        try {
          if (jsonOutput) {
            const parsed = this.parseActJsonOutput(jsonOutput);
            result.outputs = parsed.outputs;
            result.jobResults = parsed.jobResults;
          }
        } catch (error) {
          // JSON parsing failed, continue with basic result
        }

        resolve(result);
      });

      proc.on('error', (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        this.processes.delete(proc);
        
        // Debug: Log process error
        // eslint-disable-next-line no-console
        console.error(`[ActRunner] act process error: ${error.message}`);

        resolve({
          success: false,
          exitCode: 1,
          errors: [`Failed to execute act: ${error.message}`]
        });
      });
    });
  }

  /**
   * Parse act JSON output
   */
  private parseActJsonOutput(output: string): {
    outputs?: Record<string, any>;
    jobResults?: Array<{
      name: string;
      status: 'success' | 'failure' | 'cancelled' | 'skipped';
      steps: Array<{
        name: string;
        status: 'success' | 'failure' | 'cancelled' | 'skipped';
        outputs?: Record<string, any>;
      }>;
    }>;
  } {
    const lines = output.split('\n');
    const jobResults: any[] = [];
    const outputs: Record<string, any> = {};

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        
        if (json.type === 'job' && json.result) {
          jobResults.push({
            name: json.job,
            status: json.result,
            steps: json.steps || []
          });
        }

        if (json.type === 'output') {
          outputs[json.name] = json.value;
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return { outputs, jobResults };
  }

  /**
   * Create a temporary directory
   */
  private createTempDir(): string {
    const tempDir = join(tmpdir(), `act-test-${randomBytes(8).toString('hex')}`);
    mkdirSync(tempDir, { recursive: true });
    this.tempDirs.add(tempDir);
    return tempDir;
  }

  /**
   * Clean up a temporary directory
   */
  private cleanupTempDir(tempDir: string): void {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    this.tempDirs.delete(tempDir);
  }

  /**
   * Check if act is installed
   */
  async checkInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('act', ['--version'], {
        stdio: 'ignore'
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    // Kill any running processes
    for (const proc of this.processes) {
      proc.kill('SIGTERM');
    }
    this.processes.clear();

    // Clean up temp directories
    for (const tempDir of this.tempDirs) {
      this.cleanupTempDir(tempDir);
    }
    this.tempDirs.clear();
  }

  /**
   * Run workflow and stream output
   */
  async runWithStream(
    workflowPath: string,
    options: {
      event?: GitHubEvent;
      eventPayload?: any;
      secrets?: Record<string, string>;
      env?: Record<string, string>;
      inputs?: Record<string, any>;
      actOptions?: ActOptions;
      onOutput?: (data: string) => void;
      onError?: (data: string) => void;
    } = {}
  ): Promise<ActResult> {
    const {
      onOutput,
      onError,
      ...runOptions
    } = options;

    // Create temp directory for this run
    const tempDir = this.createTempDir();
    
    try {
      // Write event payload to temp file
      const eventFile = join(tempDir, 'event.json');
      writeFileSync(eventFile, JSON.stringify(runOptions.eventPayload || {}, null, 2));

      // Write secrets to temp file
      const secretsFile = join(tempDir, '.secrets');
      const secretsContent = Object.entries(runOptions.secrets || {})
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      writeFileSync(secretsFile, secretsContent);

      // Write env vars to temp file
      const envFile = join(tempDir, '.env');
      const envContent = Object.entries(runOptions.env || {})
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      writeFileSync(envFile, envContent);

      // Build act command
      const args = this.buildActArgs(workflowPath, runOptions.event || 'push', {
        eventFile,
        secretsFile,
        envFile,
        inputs: runOptions.inputs,
        ...runOptions.actOptions
      });

      // Run act with streaming
      return await this.executeActWithStream(args, { onOutput, onError });
    } finally {
      // Cleanup temp directory
      this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Execute act command with streaming output
   */
  private async executeActWithStream(
    args: string[],
    options: {
      onOutput?: (data: string) => void;
      onError?: (data: string) => void;
    } = {}
  ): Promise<ActResult> {
    return new Promise((resolve) => {
      const logs: string[] = [];
      const errors: string[] = [];

      const proc = spawn('act', args, {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      this.processes.add(proc);

      proc.stdout.on('data', (data) => {
        const output = data.toString();
        logs.push(output);
        if (options.onOutput) {
          options.onOutput(output);
        }
      });

      proc.stderr.on('data', (data) => {
        const error = data.toString();
        errors.push(error);
        if (options.onError) {
          options.onError(error);
        }
      });

      proc.on('close', (code) => {
        this.processes.delete(proc);

        resolve({
          success: code === 0,
          exitCode: code || 0,
          logs,
          errors: errors.length > 0 ? errors : undefined
        });
      });

      proc.on('error', (error) => {
        this.processes.delete(proc);
        
        const errorMessage = `Failed to execute act: ${error.message}`;
        if (options.onError) {
          options.onError(errorMessage);
        }
        
        resolve({
          success: false,
          exitCode: 1,
          errors: [errorMessage]
        });
      });
    });
  }
}
