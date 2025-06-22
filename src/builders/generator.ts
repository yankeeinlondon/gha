/**
 * Workflow generator for GitHub Actions templates
 * Generates final workflow YAML from resolved templates
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import type {
  WorkflowTemplate,
  BuildConfig,
  BuildResult,
  TemplateMetadata,
} from './types';
import { TemplateResolver } from './resolver';

/**
 * Generator options
 */
export interface GeneratorOptions {
  /**
   * Whether to add metadata comments
   */
  addMetadata?: boolean;

  /**
   * Whether to format the output
   */
  format?: boolean;

  /**
   * Line width for formatting
   */
  lineWidth?: number;

  /**
   * Indentation size
   */
  indent?: number;

  /**
   * Whether to sort keys
   */
  sortKeys?: boolean;

  /**
   * Custom YAML dump options
   */
  yamlOptions?: yaml.DumpOptions;
}

/**
 * Generation error class
 */
export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly target?: string,
  ) {
    super(`${source}: ${message}`);
    this.name = 'GenerationError';
  }
}

/**
 * Workflow generator class
 */
export class WorkflowGenerator {
  private resolver: TemplateResolver;
  private defaultOptions: GeneratorOptions = {
    addMetadata: true,
    format: true,
    lineWidth: 80,
    indent: 2,
    sortKeys: false,
  };

  constructor(
    private config: BuildConfig,
    private options: GeneratorOptions = {},
  ) {
    this.options = { ...this.defaultOptions, ...options };
    this.resolver = new TemplateResolver({
      baseDir: config.sourceDir,
      variables: config.variables,
    });
  }

  /**
   * Generate workflows from templates
   */
  public async generate(): Promise<BuildResult> {
    const startTime = Date.now();
    const result: BuildResult = {
      success: [],
      errors: [],
      warnings: [],
      stats: {
        totalFiles: 0,
        successCount: 0,
        errorCount: 0,
        warningCount: 0,
        duration: 0,
      },
    };

    try {
      // Find all workflow files
      const workflowFiles = await this.findWorkflowFiles();
      result.stats.totalFiles = workflowFiles.length;

      // Process each workflow
      for (const sourceFile of workflowFiles) {
        try {
          const outputFile = await this.processWorkflow(sourceFile);
          result.success.push({
            source: sourceFile,
            output: outputFile,
            metadata: await this.getMetadata(sourceFile),
          });
          result.stats.successCount++;
        } catch (error) {
          result.errors.push({
            source: sourceFile,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          result.stats.errorCount++;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new GenerationError(
          `Failed to generate workflows: ${error.message}`,
          this.config.sourceDir,
        );
      }
      throw error;
    }

    result.stats.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Process a single workflow file
   */
  private async processWorkflow(sourceFile: string): Promise<string> {
    // Resolve the workflow template
    const resolved = await this.resolver.resolveWorkflow(
      sourceFile,
      this.config.variables,
    );

    // Validate the resolved workflow
    this.validateWorkflow(resolved, sourceFile);

    // Generate output path
    const outputFile = this.getOutputPath(sourceFile);

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Generate YAML content
    const yamlContent = this.generateYaml(resolved, sourceFile);

    // Write to file
    await fs.promises.writeFile(outputFile, yamlContent, 'utf8');

    return outputFile;
  }

  /**
   * Find all workflow files in the source directory
   */
  private async findWorkflowFiles(): Promise<string[]> {
    const workflowsDir = path.join(this.config.sourceDir, 'workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      return [];
    }

    const files = await fs.promises.readdir(workflowsDir);
    return files
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map(file => path.join('workflows', file));
  }

  /**
   * Get output path for a source file
   */
  private getOutputPath(sourceFile: string): string {
    // Remove 'templates/' prefix if present
    const relativePath = sourceFile.replace(/^templates\//, '');
    
    // Change extension if needed
    const outputPath = relativePath.replace(/\.(yml|yaml)$/, '.yml');
    
    return path.join(this.config.outputDir, outputPath);
  }

  /**
   * Validate a resolved workflow
   */
  private validateWorkflow(
    workflow: WorkflowTemplate,
    sourceFile: string,
  ): void {
    // Check required fields
    if (!workflow.name) {
      throw new GenerationError('Workflow must have a name', sourceFile);
    }

    if (!workflow.on) {
      throw new GenerationError('Workflow must have triggers (on)', sourceFile);
    }

    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      throw new GenerationError('Workflow must have at least one job', sourceFile);
    }

    // Validate job references
    const jobNames = Object.keys(workflow.jobs);
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      if (job && typeof job === 'object' && 'needs' in job) {
        const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
        for (const need of needs) {
          if (need && !jobNames.includes(need)) {
            throw new GenerationError(
              `Job '${jobName}' references unknown job '${need}'`,
              sourceFile,
            );
          }
        }
      }
    }
  }

  /**
   * Generate YAML content
   */
  private generateYaml(
    workflow: WorkflowTemplate,
    sourceFile: string,
  ): string {
    const lines: string[] = [];

    // Add metadata header if enabled
    if (this.options.addMetadata) {
      lines.push(...this.generateMetadataHeader(sourceFile));
    }

    // Generate YAML
    const yamlOptions: yaml.DumpOptions = {
      indent: this.options.indent,
      lineWidth: this.options.lineWidth,
      noRefs: true,
      sortKeys: this.options.sortKeys,
      ...this.options.yamlOptions,
    };

    const yamlContent = yaml.dump(workflow, yamlOptions);
    lines.push(yamlContent);

    return lines.join('\n');
  }

  /**
   * Generate metadata header comments
   */
  private generateMetadataHeader(sourceFile: string): string[] {
    const lines: string[] = [
      '# This workflow was automatically generated from templates',
      `# Source: ${sourceFile}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Generator: GitHub Actions Template Builder`,
      '',
      '# DO NOT EDIT THIS FILE DIRECTLY',
      '# Instead, edit the source templates and regenerate',
      '',
    ];

    return lines;
  }

  /**
   * Get metadata for a template file
   */
  private async getMetadata(sourceFile: string): Promise<TemplateMetadata> {
    const stats = await fs.promises.stat(
      path.join(this.config.sourceDir, sourceFile),
    );

    return {
      path: sourceFile,
      type: this.getTemplateType(sourceFile),
      lastModified: stats.mtime,
    };
  }

  /**
   * Determine template type from path
   */
  private getTemplateType(
    filePath: string,
  ): 'workflow' | 'job' | 'step' {
    if (filePath.includes('workflows/')) return 'workflow';
    if (filePath.includes('jobs/')) return 'job';
    if (filePath.includes('steps/')) return 'step';
    return 'workflow'; // Default
  }

  /**
   * Generate a single workflow
   */
  public async generateWorkflow(
    sourceFile: string,
    outputFile?: string,
  ): Promise<void> {
    const output = outputFile || this.getOutputPath(sourceFile);
    
    try {
      await this.processWorkflow(sourceFile);
    } catch (error) {
      if (error instanceof Error) {
        throw new GenerationError(
          `Failed to generate workflow: ${error.message}`,
          sourceFile,
          output,
        );
      }
      throw error;
    }
  }

  /**
   * Clean the output directory
   */
  public async clean(): Promise<void> {
    if (fs.existsSync(this.config.outputDir)) {
      await fs.promises.rm(this.config.outputDir, { recursive: true });
    }
  }
}

/**
 * Create a workflow generator
 */
export function createGenerator(
  config: BuildConfig,
  options?: GeneratorOptions,
): WorkflowGenerator {
  return new WorkflowGenerator(config, options);
}

/**
 * Generate workflows from configuration
 */
export async function generateWorkflows(
  config: BuildConfig,
  options?: GeneratorOptions,
): Promise<BuildResult> {
  const generator = createGenerator(config, options);
  return generator.generate();
}
