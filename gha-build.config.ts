/**
 * Configuration for the GitHub Actions Modular Workflow System
 * This file defines settings for template resolution, validation, and generation
 */

export interface GHABuildConfig {
  /** Root directory for templates */
  templatesDir: string;
  
  /** Output directory for generated workflows */
  outputDir: string;
  
  /** Directory for schema files */
  schemasDir: string;
  
  /** Enable strict validation mode */
  strictMode: boolean;
  
  /** Template resolution options */
  resolution: {
    /** Enable caching of resolved templates */
    enableCache: boolean;
    
    /** Maximum depth for template resolution */
    maxDepth: number;
    
    /** Allowed template sources */
    sources: Array<'local' | 'github' | 'npm'>;
  };
  
  /** Validation options */
  validation: {
    /** Validate against GitHub Actions schema */
    validateSchema: boolean;
    
    /** Check for deprecated syntax */
    checkDeprecated: boolean;
    
    /** Validate expressions and contexts */
    validateExpressions: boolean;
  };
  
  /** Generation options */
  generation: {
    /** Add comments to generated files */
    includeComments: boolean;
    
    /** Format generated YAML */
    formatOutput: boolean;
    
    /** Generate source maps */
    generateSourceMaps: boolean;
  };
  
  /** Testing options */
  testing: {
    /** Default event data directory */
    eventsDir: string;
    
    /** Enable act integration */
    enableAct: boolean;
    
    /** Default timeout for tests */
    timeout: number;
  };
}

const defaultConfig: GHABuildConfig = {
  templatesDir: './src/templates',
  outputDir: './.github/workflows',
  schemasDir: './src/schemas',
  strictMode: true,
  
  resolution: {
    enableCache: true,
    maxDepth: 10,
    sources: ['local', 'github'],
  },
  
  validation: {
    validateSchema: true,
    checkDeprecated: true,
    validateExpressions: true,
  },
  
  generation: {
    includeComments: true,
    formatOutput: true,
    generateSourceMaps: false,
  },
  
  testing: {
    eventsDir: './tests/fixtures/events',
    enableAct: false,
    timeout: 30000,
  },
};

// Load user configuration
export function loadConfig(configPath?: string): GHABuildConfig {
  const config = { ...defaultConfig };
  
  // TODO: Load from configPath or look for config files
  // Priority: configPath > gha-build.config.ts > gha-build.config.js > package.json
  
  return config;
}

// Export default configuration
export default defaultConfig;
