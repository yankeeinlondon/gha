/**
 * Template resolver for GitHub Actions workflow templates
 * Handles template references, parameter substitution, and merging
 */

import * as path from 'path';
import * as fs from 'fs';
import type {
  TemplateReference,
  TemplateInclusion,
  ResolutionContext,
  BuildConfig,
  WorkflowTemplate,
  JobTemplate,
  StepTemplate,
} from './types.js';
import { TemplateParser, ParseResult } from './parser.js';

/**
 * Resolution error class
 */
export class ResolutionError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly referencePath?: string,
  ) {
    super(`${file}: ${message}`);
    this.name = 'ResolutionError';
  }
}

/**
 * Circular dependency error
 */
export class CircularDependencyError extends ResolutionError {
  constructor(public readonly cycle: string[]) {
    const cycleStr = cycle.join(' -> ');
    super(`Circular dependency detected: ${cycleStr}`, cycle[0]);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Template resolver options
 */
export interface ResolverOptions {
  /**
   * Base directory for resolving relative paths
   */
  baseDir?: string;

  /**
   * Variables for substitution
   */
  variables?: Record<string, any>;

  /**
   * Maximum recursion depth
   */
  maxDepth?: number;

  /**
   * Whether to cache resolved templates
   */
  cache?: boolean;
}

/**
 * Template resolver class
 */
export class TemplateResolver {
  private parser: TemplateParser;
  private cache: Map<string, any>;
  private baseDir: string;
  private maxDepth: number;

  constructor(private options: ResolverOptions = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.maxDepth = options.maxDepth || 10;
    this.cache = new Map();
    this.parser = new TemplateParser({ baseDir: this.baseDir });
  }

  /**
   * Resolve a template file
   */
  public async resolveFile<T = any>(
    filePath: string,
    context?: Partial<ResolutionContext>,
  ): Promise<T> {
    const absolutePath = path.resolve(this.baseDir, filePath);
    
    // Check cache
    if (this.options.cache && this.cache.has(absolutePath)) {
      return this.cache.get(absolutePath) as T;
    }

    // Create resolution context
    const ctx: ResolutionContext = {
      currentFile: filePath,
      fileStack: context?.fileStack || [],
      cache: context?.cache || this.cache,
      variables: { ...this.options.variables, ...context?.variables },
      config: context?.config || ({} as BuildConfig),
    };

    // Check for circular dependencies
    if (ctx.fileStack.includes(absolutePath)) {
      throw new CircularDependencyError([...ctx.fileStack, absolutePath]);
    }

    // Parse the file
    const parseResult = await this.parser.parseFile<T>(filePath);
    
    // Resolve the content
    const resolved = await this.resolveContent(
      parseResult.content,
      { ...ctx, fileStack: [...ctx.fileStack, absolutePath] },
    );

    // Cache the result
    if (this.options.cache) {
      this.cache.set(absolutePath, resolved);
    }

    return resolved as T;
  }

  /**
   * Resolve content with references
   */
  private async resolveContent(
    content: any,
    context: ResolutionContext,
  ): Promise<any> {
    // Check recursion depth
    if (context.fileStack.length > this.maxDepth) {
      throw new ResolutionError(
        `Maximum recursion depth (${this.maxDepth}) exceeded`,
        context.currentFile,
      );
    }

    // Handle null/undefined
    if (content == null) {
      return content;
    }

    // Handle template reference
    if (this.isTemplateReference(content)) {
      return this.resolveReference(content, context);
    }

    // Handle template inclusion
    if (this.isTemplateInclusion(content)) {
      return this.resolveInclusion(content, context);
    }

    // Handle arrays
    if (Array.isArray(content)) {
      return Promise.all(
        content.map(item => this.resolveContent(item, context)),
      );
    }

    // Handle objects
    if (typeof content === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(content)) {
        resolved[key] = await this.resolveContent(value, context);
      }
      return resolved;
    }

    // Handle string interpolation
    if (typeof content === 'string') {
      return this.interpolateString(content, context);
    }

    // Return primitive values as-is
    return content;
  }

  /**
   * Check if value is a template reference
   */
  private isTemplateReference(value: any): value is TemplateReference {
    return value && typeof value === 'object' && value.type === 'reference';
  }

  /**
   * Check if value is a template inclusion
   */
  private isTemplateInclusion(value: any): value is TemplateInclusion {
    return value && typeof value === 'object' && value.type === 'inclusion';
  }

  /**
   * Resolve a template reference
   */
  private async resolveReference(
    ref: TemplateReference,
    context: ResolutionContext,
  ): Promise<any> {
    // Resolve the referenced file
    const referencePath = this.resolvePath(ref.path, context);
    
    // Create new context with parameters
    const refContext: ResolutionContext = {
      ...context,
      currentFile: referencePath,
      variables: { ...context.variables, ...ref.params },
    };

    try {
      return await this.resolveFile(referencePath, refContext);
    } catch (error) {
      if (error instanceof Error) {
        throw new ResolutionError(
          `Failed to resolve reference '${ref.path}': ${error.message}`,
          context.currentFile,
          ref.path,
        );
      }
      throw error;
    }
  }

  /**
   * Resolve a template inclusion
   */
  private async resolveInclusion(
    inc: TemplateInclusion,
    context: ResolutionContext,
  ): Promise<any> {
    // Resolve the included file
    const includePath = this.resolvePath(inc.path, context);
    
    try {
      const content = await this.resolveFile(includePath, context);
      
      // If merge is true and content is an object, return it for merging
      // Otherwise wrap in an array or return as-is based on context
      if (inc.merge && typeof content === 'object' && !Array.isArray(content)) {
        return content;
      }
      
      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new ResolutionError(
          `Failed to include '${inc.path}': ${error.message}`,
          context.currentFile,
          inc.path,
        );
      }
      throw error;
    }
  }

  /**
   * Resolve a file path relative to current file
   */
  private resolvePath(refPath: string, context: ResolutionContext): string {
    // If path is absolute, use it as-is
    if (path.isAbsolute(refPath)) {
      return refPath;
    }

    // Resolve relative to current file's directory
    const currentDir = path.dirname(
      path.resolve(this.baseDir, context.currentFile),
    );
    return path.resolve(currentDir, refPath);
  }

  /**
   * Interpolate variables in a string
   */
  private interpolateString(
    str: string,
    context: ResolutionContext,
  ): string {
    // Replace ${variable} patterns
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = this.getVariableValue(varName, context.variables);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get variable value from nested path
   */
  private getVariableValue(
    path: string,
    variables: Record<string, any>,
  ): any {
    const parts = path.split('.');
    let value: any = variables;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Resolve workflow template
   */
  public async resolveWorkflow(
    filePath: string,
    variables?: Record<string, any>,
  ): Promise<WorkflowTemplate> {
    return this.resolveFile<WorkflowTemplate>(filePath, {
      variables,
      fileStack: [],
      cache: new Map(),
      currentFile: filePath,
      config: {} as BuildConfig,
    });
  }

  /**
   * Resolve job template
   */
  public async resolveJob(
    filePath: string,
    variables?: Record<string, any>,
  ): Promise<JobTemplate> {
    return this.resolveFile<JobTemplate>(filePath, {
      variables,
      fileStack: [],
      cache: new Map(),
      currentFile: filePath,
      config: {} as BuildConfig,
    });
  }

  /**
   * Resolve step template
   */
  public async resolveStep(
    filePath: string,
    variables?: Record<string, any>,
  ): Promise<StepTemplate | StepTemplate[]> {
    return this.resolveFile<StepTemplate | StepTemplate[]>(filePath, {
      variables,
      fileStack: [],
      cache: new Map(),
      currentFile: filePath,
      config: {} as BuildConfig,
    });
  }

  /**
   * Clear the resolution cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Merge two objects deeply
   */
  public static deepMerge(target: any, source: any): any {
    if (!source || typeof source !== 'object') {
      return source;
    }

    if (Array.isArray(source)) {
      return Array.isArray(target) 
        ? [...target, ...source]
        : [...source];
    }

    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (key in result && typeof result[key] === 'object' && typeof source[key] === 'object') {
        result[key] = TemplateResolver.deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

/**
 * Convenience function to create a resolver
 */
export function createResolver(options?: ResolverOptions): TemplateResolver {
  return new TemplateResolver(options);
}

/**
 * Resolve a template file
 */
export async function resolveTemplate<T = any>(
  filePath: string,
  options?: ResolverOptions,
): Promise<T> {
  const resolver = createResolver(options);
  return resolver.resolveFile<T>(filePath);
}
