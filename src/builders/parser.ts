/**
 * YAML parser with custom tag support for GitHub Actions templates
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import type {
  TemplateReference,
  TemplateInclusion,
  ResolutionContext,
  CustomYamlTag,
} from './types';

/**
 * Custom YAML type for !ref tag
 * Example: !ref ./steps/checkout.yml
 */
const RefType = new yaml.Type('!ref', {
  kind: 'scalar',
  construct(data: string) {
    return {
      type: 'reference',
      path: data,
    } as TemplateReference;
  },
});

/**
 * Custom YAML type for !include tag
 * Example: !include ./common/env-vars.yml
 */
const IncludeType = new yaml.Type('!include', {
  kind: 'scalar',
  construct(data: string) {
    return {
      type: 'inclusion',
      path: data,
      merge: false,
    } as TemplateInclusion;
  },
});

/**
 * Custom YAML type for !template tag with parameters
 * Example: !template { path: ./jobs/test.yml, params: { node-version: '20' } }
 */
const TemplateType = new yaml.Type('!template', {
  kind: 'mapping',
  construct(data: any) {
    return {
      type: 'reference',
      path: data.path,
      params: data.params || {},
    } as TemplateReference;
  },
});

/**
 * Create a custom YAML schema with our tags
 */
const CUSTOM_SCHEMA = yaml.DEFAULT_SCHEMA.extend([
  RefType,
  IncludeType,
  TemplateType,
]);

/**
 * Parse options for YAML files
 */
export interface ParseOptions {
  /**
   * Base directory for resolving relative paths
   */
  baseDir?: string;

  /**
   * Custom YAML tags to register
   */
  customTags?: CustomYamlTag[];

  /**
   * Whether to validate against schemas
   */
  validate?: boolean;

  /**
   * Schema directory for validation
   */
  schemaDir?: string;
}

/**
 * Parse result
 */
export interface ParseResult<T = any> {
  /**
   * Parsed content
   */
  content: T;

  /**
   * Source file path
   */
  sourcePath: string;

  /**
   * Dependencies found in the file
   */
  dependencies: string[];

  /**
   * Warnings during parsing
   */
  warnings: string[];
}

/**
 * Parser error class
 */
export class ParserError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(`${file}: ${message}`);
    this.name = 'ParserError';
  }
}

/**
 * Template parser class
 */
export class TemplateParser {
  private schema: yaml.Schema;
  private baseDir: string;

  constructor(private options: ParseOptions = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.schema = this.createSchema();
  }

  /**
   * Create custom YAML schema with all tags
   */
  private createSchema(): yaml.Schema {
    const types: yaml.Type[] = [RefType, IncludeType, TemplateType];

    // Add any custom tags
    if (this.options.customTags) {
      for (const customTag of this.options.customTags) {
        const type = new yaml.Type(customTag.tag, {
          kind: customTag.type as any,
          construct: (data: any) => customTag.resolve(data),
        });
        types.push(type);
      }
    }

    return yaml.DEFAULT_SCHEMA.extend(types);
  }

  /**
   * Parse a YAML file
   */
  public async parseFile<T = any>(filePath: string): Promise<ParseResult<T>> {
    const absolutePath = path.resolve(this.baseDir, filePath);
    
    try {
      const content = await fs.promises.readFile(absolutePath, 'utf8');
      return this.parseContent<T>(content, filePath);
    } catch (error: any) {
      throw new ParserError(
        `Failed to read file: ${error.message}`,
        filePath,
      );
    }
  }

  /**
   * Parse YAML content
   */
  public parseContent<T = any>(
    content: string,
    sourcePath: string,
  ): ParseResult<T> {
    const dependencies: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse YAML with custom schema
      const parsed = yaml.load(content, {
        schema: this.schema,
        filename: sourcePath,
      }) as T;

      // Extract dependencies
      this.extractDependencies(parsed, dependencies);

      // Validate if requested
      if (this.options.validate) {
        const validationWarnings = this.validateContent(parsed, sourcePath);
        warnings.push(...validationWarnings);
      }

      return {
        content: parsed,
        sourcePath,
        dependencies: [...new Set(dependencies)], // Remove duplicates
        warnings,
      };
    } catch (error: any) {
      if (error instanceof yaml.YAMLException) {
        throw new ParserError(
          error.message,
          sourcePath,
          error.mark?.line,
          error.mark?.column,
        );
      }
      throw new ParserError(
        `Failed to parse YAML: ${error.message}`,
        sourcePath,
      );
    }
  }

  /**
   * Extract dependencies from parsed content
   */
  private extractDependencies(obj: any, dependencies: string[]): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Check if this is a reference or inclusion
    if (obj.type === 'reference' || obj.type === 'inclusion') {
      dependencies.push(obj.path);
      return;
    }

    // Recursively check all properties
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractDependencies(item, dependencies);
      }
    } else {
      for (const key of Object.keys(obj)) {
        this.extractDependencies(obj[key], dependencies);
      }
    }
  }

  /**
   * Validate content against schemas
   */
  private validateContent(content: any, sourcePath: string): string[] {
    const warnings: string[] = [];

    // TODO: Implement schema validation using ajv
    // This would validate against the JSON schemas in src/schemas/

    return warnings;
  }

  /**
   * Parse multiple files
   */
  public async parseFiles(
    filePaths: string[],
  ): Promise<Map<string, ParseResult>> {
    const results = new Map<string, ParseResult>();

    for (const filePath of filePaths) {
      try {
        const result = await this.parseFile(filePath);
        results.set(filePath, result);
      } catch (error) {
        // Store error as a parse result with warnings
        results.set(filePath, {
          content: null,
          sourcePath: filePath,
          dependencies: [],
          warnings: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    return results;
  }

  /**
   * Check if a value contains template references
   */
  public static hasReferences(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    if (obj.type === 'reference' || obj.type === 'inclusion') {
      return true;
    }

    if (Array.isArray(obj)) {
      return obj.some(item => TemplateParser.hasReferences(item));
    }

    return Object.values(obj).some(value =>
      TemplateParser.hasReferences(value),
    );
  }

  /**
   * Get all reference paths from an object
   */
  public static getReferencePaths(obj: any): string[] {
    const paths: string[] = [];

    const extract = (value: any) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      if (value.type === 'reference' || value.type === 'inclusion') {
        paths.push(value.path);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(extract);
      } else {
        Object.values(value).forEach(extract);
      }
    };

    extract(obj);
    return [...new Set(paths)];
  }
}

/**
 * Convenience function to create a parser
 */
export function createParser(options?: ParseOptions): TemplateParser {
  return new TemplateParser(options);
}

/**
 * Parse a single file
 */
export async function parseFile<T = any>(
  filePath: string,
  options?: ParseOptions,
): Promise<ParseResult<T>> {
  const parser = createParser(options);
  return parser.parseFile<T>(filePath);
}

/**
 * Parse YAML content
 */
export function parseContent<T = any>(
  content: string,
  sourcePath: string,
  options?: ParseOptions,
): ParseResult<T> {
  const parser = createParser(options);
  return parser.parseContent<T>(content, sourcePath);
}
