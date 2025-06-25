/**
 * Type definitions for the GitHub Actions workflow template build system
 */

/**
 * Template reference type
 * Used to reference templates from other files
 */
export interface TemplateReference {
  type: 'reference';
  path: string;
  params?: Record<string, any>;
}

/**
 * Template inclusion type
 * Used to include content from other files
 */
export interface TemplateInclusion {
  type: 'inclusion';
  path: string;
  merge?: boolean;
}

/**
 * Step template definition
 */
export interface StepTemplate {
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
  id?: string;
  'continue-on-error'?: boolean;
  'timeout-minutes'?: number;
  shell?: string;
  'working-directory'?: string;
}

/**
 * Job outputs definition
 */
export interface JobOutputs {
  [outputName: string]: {
    description?: string;
    value: string;
  };
}

/**
 * Job template definition
 */
export interface JobTemplate {
  name?: string;
  'runs-on': string | string[];
  needs?: string | string[];
  if?: string;
  permissions?: Record<string, string> | string;
  environment?: string | {
    name: string;
    url?: string;
  };
  concurrency?: string | {
    group: string;
    'cancel-in-progress'?: boolean;
  };
  outputs?: JobOutputs;
  steps: Array<StepTemplate | TemplateReference | TemplateInclusion>;
  strategy?: {
    matrix?: Record<string, any>;
    'fail-fast'?: boolean;
    'max-parallel'?: number;
  };
  'timeout-minutes'?: number;
  'continue-on-error'?: boolean;
  container?: string | Record<string, any>;
  services?: Record<string, any>;
  inputs?: Record<string, WorkflowInput>;
}

/**
 * Workflow input definition
 */
export interface WorkflowInput {
  description?: string;
  required?: boolean;
  default?: any;
  type?: 'string' | 'choice' | 'boolean' | 'environment';
  options?: string[];
}

/**
 * Workflow trigger definition
 */
export interface WorkflowTrigger {
  push?: {
    branches?: string[];
    'branches-ignore'?: string[];
    tags?: string[];
    'tags-ignore'?: string[];
    paths?: string[];
    'paths-ignore'?: string[];
  };
  pull_request?: {
    branches?: string[];
    'branches-ignore'?: string[];
    paths?: string[];
    'paths-ignore'?: string[];
    types?: string[];
  };
  workflow_dispatch?: {
    inputs?: Record<string, WorkflowInput>;
  };
  schedule?: Array<{
    cron: string;
  }>;
  workflow_call?: {
    inputs?: Record<string, WorkflowInput>;
    outputs?: Record<string, any>;
    secrets?: Record<string, any>;
  };
  [event: string]: any;
}

/**
 * Workflow template definition
 */
export interface WorkflowTemplate {
  name: string;
  on: WorkflowTrigger | string | string[];
  permissions?: Record<string, string> | string;
  env?: Record<string, string>;
  defaults?: {
    run?: {
      shell?: string;
      'working-directory'?: string;
    };
  };
  concurrency?: string | {
    group: string;
    'cancel-in-progress'?: boolean;
  };
  jobs: Record<string, JobTemplate | TemplateReference | TemplateInclusion>;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  /**
   * Source directory containing templates
   */
  sourceDir: string;
  
  /**
   * Output directory for generated workflows
   */
  outputDir: string;
  
  /**
   * Template type to build
   */
  type?: 'workflow' | 'job' | 'step' | 'action';
  
  /**
   * Schema directory containing JSON schemas
   */
  schemaDir?: string;
  
  /**
   * Whether to validate templates against schemas
   */
  validate?: boolean;
  
  /**
   * Whether to add metadata comments to generated files
   */
  addMetadata?: boolean;
  
  /**
   * Custom tag handlers
   */
  customTags?: Record<string, (value: any) => any>;
  
  /**
   * Template variables for substitution
   */
  variables?: Record<string, any>;
  
  /**
   * File patterns to include
   */
  include?: string[];
  
  /**
   * File patterns to exclude
   */
  exclude?: string[];
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  /**
   * Template file path
   */
  path: string;
  
  /**
   * Template type
   */
  type: 'workflow' | 'job' | 'step';
  
  /**
   * Template description
   */
  description?: string;
  
  /**
   * Template parameters
   */
  parameters?: Record<string, {
    description?: string;
    required?: boolean;
    default?: any;
    type?: string;
  }>;
  
  /**
   * Dependencies on other templates
   */
  dependencies?: string[];
  
  /**
   * Last modified timestamp
   */
  lastModified?: Date;
}

/**
 * Build result
 */
export interface BuildResult {
  /**
   * Successfully built files
   */
  success: Array<{
    source: string;
    output: string;
    metadata?: TemplateMetadata;
  }>;
  
  /**
   * Failed builds
   */
  errors: Array<{
    source: string;
    error: Error;
  }>;
  
  /**
   * Build warnings
   */
  warnings: Array<{
    source: string;
    message: string;
  }>;
  
  /**
   * Build statistics
   */
  stats: {
    totalFiles: number;
    successCount: number;
    errorCount: number;
    warningCount: number;
    duration: number;
  };
}

/**
 * Template resolution context
 */
export interface ResolutionContext {
  /**
   * Current file being processed
   */
  currentFile: string;
  
  /**
   * Stack of files being processed (for circular dependency detection)
   */
  fileStack: string[];
  
  /**
   * Resolved templates cache
   */
  cache: Map<string, any>;
  
  /**
   * Variables for substitution
   */
  variables: Record<string, any>;
  
  /**
   * Build configuration
   */
  config: BuildConfig;
}

/**
 * Custom YAML tag type
 */
export type CustomYamlTag = {
  tag: string;
  type: 'scalar' | 'sequence' | 'mapping';
  resolve: (value: any, context?: ResolutionContext) => any;
};
