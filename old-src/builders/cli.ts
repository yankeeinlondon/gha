#!/usr/bin/env node

/**
 * Command-line interface for the GitHub Actions template builder
 */

import { Command } from 'commander';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import type { BuildConfig, BuildResult } from './types.js';
import { WorkflowGenerator } from './generator.js';
import { TemplateParser } from './parser.js';

// Define CLI version
const VERSION = '1.0.0';

/**
 * CLI configuration
 */
interface CLIConfig {
  sourceDir: string;
  outputDir: string;
  watch: boolean;
  validate: boolean;
  clean: boolean;
  verbose: boolean;
  config?: string;
}

/**
 * Print build results
 */
function printResults(result: BuildResult, verbose: boolean): void {
  console.log('\n📊 Build Results:');
  console.log(`   Total files: ${result.stats.totalFiles}`);
  console.log(`   ✅ Success: ${result.stats.successCount}`);
  console.log(`   ❌ Errors: ${result.stats.errorCount}`);
  console.log(`   ⚠️  Warnings: ${result.stats.warningCount}`);
  console.log(`   ⏱️  Duration: ${result.stats.duration}ms\n`);

  // Print errors
  if (result.errors.length > 0) {
    console.error('❌ Errors:');
    for (const error of result.errors) {
      console.error(`   ${error.source}: ${error.error.message}`);
    }
    console.log();
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.warn(`   ${warning.source}: ${warning.message}`);
    }
    console.log();
  }

  // Print success details if verbose
  if (verbose && result.success.length > 0) {
    console.log('✅ Generated files:');
    for (const success of result.success) {
      console.log(`   ${success.source} → ${success.output}`);
    }
    console.log();
  }
}

/**
 * Load configuration from file
 */
async function loadConfig(configPath?: string): Promise<Partial<BuildConfig>> {
  if (!configPath) {
    // Look for default config files
    const defaultPaths = [
      'gha-builder.config.json',
      'gha-builder.config.js',
      '.gha-builder.json',
    ];

    for (const defaultPath of defaultPaths) {
      if (fs.existsSync(defaultPath)) {
        configPath = defaultPath;
        break;
      }
    }
  }

  if (!configPath || !fs.existsSync(configPath)) {
    return {};
  }

  try {
    const ext = path.extname(configPath);
    if (ext === '.js' || ext === '.mjs') {
      // Dynamic import for JS config
      const module = await import(path.resolve(configPath));
      return module.default || module;
    } else {
      // JSON config
      const content = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    return {};
  }
}

/**
 * Build workflows
 */
async function build(config: BuildConfig, verbose: boolean): Promise<void> {
  console.log('🔨 Building GitHub Actions workflows...\n');
  console.log(`   Source: ${config.sourceDir}`);
  console.log(`   Output: ${config.outputDir}\n`);

  try {
    const generator = new WorkflowGenerator(config, {
      addMetadata: config.addMetadata,
    });

    const result = await generator.generate();
    printResults(result, verbose);

    if (result.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Validate templates
 */
async function validate(config: BuildConfig, verbose: boolean): Promise<void> {
  console.log('🔍 Validating templates...\n');

  try {
    const parser = new TemplateParser({
      baseDir: config.sourceDir,
      validate: true,
      schemaDir: config.schemaDir,
    });

    // Find all template files
    const templateDirs = ['workflows', 'jobs', 'steps'];
    const files: string[] = [];

    for (const dir of templateDirs) {
      const dirPath = path.join(config.sourceDir, dir);
      if (fs.existsSync(dirPath)) {
        const dirFiles = await fs.promises.readdir(dirPath);
        files.push(
          ...dirFiles
            .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
            .map(f => path.join(dir, f)),
        );
      }
    }

    console.log(`Found ${files.length} template files\n`);

    let hasErrors = false;
    const results = await parser.parseFiles(files);

    for (const [file, result] of results.entries()) {
      if (result.warnings.length > 0) {
        console.log(`⚠️  ${file}:`);
        for (const warning of result.warnings) {
          console.log(`   ${warning}`);
          hasErrors = true;
        }
      } else if (verbose) {
        console.log(`✅ ${file}`);
      }
    }

    if (hasErrors) {
      console.log('\n❌ Validation failed');
      process.exit(1);
    } else {
      console.log('\n✅ All templates are valid');
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

/**
 * Watch for changes
 */
async function watch(config: BuildConfig, verbose: boolean): Promise<void> {
  console.log('👀 Watching for changes...\n');

  // Resolve the source directory to an absolute path to prevent recursive issues
  const watchPath = path.resolve(config.sourceDir);
  
  const watcher = chokidar.watch(
    ['**/*.yml', '**/*.yaml'],
    {
      cwd: watchPath,
      ignored: /node_modules/,
      persistent: true,
    },
  );

  let isBuilding = false;

  const rebuild = async () => {
    if (isBuilding) return;
    isBuilding = true;

    console.log('\n🔄 Rebuilding...');
    try {
      await build(config, verbose);
    } catch (error) {
      console.error('❌ Build error:', error);
    }

    isBuilding = false;
  };

  watcher
    .on('add', filePath => {
      if (verbose) console.log(`   Added: ${filePath}`);
      rebuild();
    })
    .on('change', filePath => {
      if (verbose) console.log(`   Changed: ${filePath}`);
      rebuild();
    })
    .on('unlink', filePath => {
      if (verbose) console.log(`   Removed: ${filePath}`);
      rebuild();
    })
    .on('error', error => console.error('❌ Watcher error:', error));

  // Initial build
  await rebuild();

  console.log('\nPress Ctrl+C to stop watching\n');
}

/**
 * Clean output directory
 */
async function clean(config: BuildConfig): Promise<void> {
  console.log(`🧹 Cleaning ${config.outputDir}...`);

  try {
    const generator = new WorkflowGenerator(config);
    await generator.clean();
    console.log('✅ Clean complete');
  } catch (error) {
    console.error('❌ Clean failed:', error);
    process.exit(1);
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('gha-builder')
    .description('Build GitHub Actions workflows from templates')
    .version(VERSION);

  // Build command
  program
    .command('build')
    .description('Build workflows from templates')
    .option('-s, --source <dir>', 'Source directory', 'src/templates')
    .option('-o, --output <dir>', 'Output directory', '.github/workflows')
    .option('-t, --type <type>', 'Template type to build (workflow, job, step, action)', 'workflow')
    .option('-c, --config <file>', 'Configuration file')
    .option('-w, --watch', 'Watch for changes', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('--no-metadata', 'Disable metadata comments')
    .option('--clean', 'Clean output directory before building', false)
    .action(async (options) => {
      // Load configuration
      const fileConfig = await loadConfig(options.config);
      const config: BuildConfig = {
        sourceDir: options.source,
        outputDir: options.output,
        type: options.type,
        addMetadata: options.metadata !== false,
        ...fileConfig,
      };

      // Clean if requested
      if (options.clean) {
        await clean(config);
      }

      // Build or watch
      if (options.watch) {
        await watch(config, options.verbose);
      } else {
        await build(config, options.verbose);
      }
    });

  // Validate command
  program
    .command('validate')
    .description('Validate template syntax and structure')
    .option('-s, --source <dir>', 'Source directory', 'src/templates')
    .option('-c, --config <file>', 'Configuration file')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (options) => {
      const fileConfig = await loadConfig(options.config);
      const config: BuildConfig = {
        sourceDir: options.source,
        outputDir: '.github/workflows',
        validate: true,
        ...fileConfig,
      };

      await validate(config, options.verbose);
    });

  // Clean command
  program
    .command('clean')
    .description('Clean output directory')
    .option('-o, --output <dir>', 'Output directory', '.github/workflows')
    .option('-c, --config <file>', 'Configuration file')
    .action(async (options) => {
      const fileConfig = await loadConfig(options.config);
      const config: BuildConfig = {
        sourceDir: 'src/templates',
        outputDir: options.output,
        ...fileConfig,
      };

      await clean(config);
    });

  // Watch command (shortcut for build --watch)
  program
    .command('watch')
    .description('Watch templates for changes and rebuild')
    .option('-s, --source <dir>', 'Source directory', 'src/templates')
    .option('-o, --output <dir>', 'Output directory', '.github/workflows')
    .option('-c, --config <file>', 'Configuration file')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (options) => {
      const fileConfig = await loadConfig(options.config);
      const config: BuildConfig = {
        sourceDir: options.source,
        outputDir: options.output,
        ...fileConfig,
      };

      await watch(config, options.verbose);
    });

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Run CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main };
