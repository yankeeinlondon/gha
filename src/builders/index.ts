/**
 * Main entry point for the GitHub Actions template builder
 * Exports all public APIs for programmatic usage
 */

// Export types
export * from './types';

// Export parser
export {
  TemplateParser,
  ParserError,
  ParseOptions,
  ParseResult,
  createParser,
  parseFile,
  parseContent,
} from './parser';

// Export resolver
export {
  TemplateResolver,
  ResolutionError,
  CircularDependencyError,
  ResolverOptions,
  createResolver,
  resolveTemplate,
} from './resolver';

// Export generator
export {
  WorkflowGenerator,
  GenerationError,
  GeneratorOptions,
  createGenerator,
  generateWorkflows,
} from './generator';

// Export CLI
export { main as runCLI } from './cli';

// Re-export commonly used functions for convenience
import { BuildConfig, BuildResult } from './types';
import { createGenerator, WorkflowGenerator } from './generator';
import { createResolver, TemplateResolver } from './resolver';
import { createParser, TemplateParser, ParseResult } from './parser';

/**
 * High-level API to build workflows from templates
 */
export async function buildWorkflows(
  config: BuildConfig,
): Promise<BuildResult> {
  const generator = createGenerator(config);
  return generator.generate();
}

/**
 * High-level API to build a single workflow
 */
export async function buildWorkflow(
  sourceFile: string,
  config: BuildConfig,
  outputFile?: string,
): Promise<void> {
  const generator = createGenerator(config);
  await generator.generateWorkflow(sourceFile, outputFile);
}

/**
 * High-level API to validate templates
 */
export async function validateTemplates(
  sourceDir: string,
  schemaDir?: string,
): Promise<{ valid: boolean; errors: Array<{ file: string; error: string }> }> {
  const parser = createParser({
    baseDir: sourceDir,
    validate: true,
    schemaDir,
  });

  const errors: Array<{ file: string; error: string }> = [];
  
  // Find all template files
  const fs = await import('fs');
  const path = await import('path');
  const templateDirs = ['workflows', 'jobs', 'steps'];
  const files: string[] = [];

  for (const dir of templateDirs) {
    const dirPath = path.join(sourceDir, dir);
    if (fs.existsSync(dirPath)) {
      const dirFiles = await fs.promises.readdir(dirPath);
      files.push(
        ...dirFiles
          .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
          .map(f => path.join(dir, f)),
      );
    }
  }

  // Parse and validate each file
  const results = await parser.parseFiles(files);
  
  for (const [file, result] of results.entries()) {
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        errors.push({ file, error: warning });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new builder instance with configuration
 */
export class GHABuilder {
  private generator: WorkflowGenerator;
  private resolver: TemplateResolver;
  private parser: TemplateParser;

  constructor(private config: BuildConfig) {
    this.generator = createGenerator(config);
    this.resolver = createResolver({
      baseDir: config.sourceDir,
      variables: config.variables,
    });
    this.parser = createParser({
      baseDir: config.sourceDir,
      validate: config.validate,
      schemaDir: config.schemaDir,
    });
  }

  /**
   * Build all workflows
   */
  async build(): Promise<BuildResult> {
    return this.generator.generate();
  }

  /**
   * Build a single workflow
   */
  async buildWorkflow(sourceFile: string, outputFile?: string): Promise<void> {
    await this.generator.generateWorkflow(sourceFile, outputFile);
  }

  /**
   * Resolve a template
   */
  async resolveTemplate<T = any>(filePath: string): Promise<T> {
    return this.resolver.resolveFile<T>(filePath);
  }

  /**
   * Parse a template file
   */
  async parseTemplate<T = any>(filePath: string): Promise<ParseResult<T>> {
    return this.parser.parseFile<T>(filePath);
  }

  /**
   * Clean output directory
   */
  async clean(): Promise<void> {
    await this.generator.clean();
  }
}

/**
 * Create a new builder instance
 */
export function createBuilder(config: BuildConfig): GHABuilder {
  return new GHABuilder(config);
}
