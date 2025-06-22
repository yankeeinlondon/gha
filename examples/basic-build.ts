/**
 * Example: Basic usage of the GitHub Actions template builder
 * 
 * This example demonstrates how to use the builder API to:
 * 1. Build all workflows from templates
 * 2. Build a single workflow
 * 3. Resolve templates with parameters
 * 4. Validate templates
 */

import {
  createBuilder,
  buildWorkflows,
  buildWorkflow,
  validateTemplates,
  BuildConfig,
  GHABuilder,
} from '../src/builders';

// Example 1: Build all workflows with default configuration
async function buildAllWorkflows() {
  console.log('Building all workflows...\n');

  const config: BuildConfig = {
    sourceDir: 'src/templates',
    outputDir: '.github/workflows',
    addMetadata: true,
    variables: {
      // Global variables available to all templates
      organization: 'my-org',
      defaultNodeVersion: '20',
    },
  };

  try {
    const result = await buildWorkflows(config);
    
    console.log('Build complete!');
    console.log(`✅ Success: ${result.stats.successCount}`);
    console.log(`❌ Errors: ${result.stats.errorCount}`);
    console.log(`⏱️  Duration: ${result.stats.duration}ms\n`);

    // Show generated files
    if (result.success.length > 0) {
      console.log('Generated files:');
      result.success.forEach(item => {
        console.log(`  ${item.source} → ${item.output}`);
      });
    }
  } catch (error) {
    console.error('Build failed:', error);
  }
}

// Example 2: Build a single workflow with custom output
async function buildSingleWorkflow() {
  console.log('\nBuilding single workflow...\n');

  const config: BuildConfig = {
    sourceDir: 'src/templates',
    outputDir: 'dist/workflows',
    addMetadata: false,
  };

  try {
    await buildWorkflow(
      'workflows/ci-node.yml',
      config,
      'dist/workflows/custom-ci.yml',
    );
    console.log('✅ Workflow built successfully!');
  } catch (error) {
    console.error('Build failed:', error);
  }
}

// Example 3: Use the builder class for more control
async function advancedUsage() {
  console.log('\nAdvanced usage with builder class...\n');

  const config: BuildConfig = {
    sourceDir: 'src/templates',
    outputDir: '.github/workflows',
    variables: {
      nodeVersion: '18',
      enableCoverage: true,
    },
  };

  const builder = createBuilder(config);

  try {
    // Resolve a job template with parameters
    const testJob = await builder.resolveTemplate('jobs/test-node.yml');
    console.log('Resolved test job:', JSON.stringify(testJob, null, 2));

    // Parse a template to check dependencies
    const parseResult = await builder.parseTemplate('workflows/ci-node.yml');
    console.log('\nTemplate dependencies:');
    parseResult.dependencies.forEach(dep => {
      console.log(`  - ${dep}`);
    });

    // Build all workflows
    const result = await builder.build();
    console.log(`\n✅ Built ${result.stats.successCount} workflows`);

    // Clean output directory
    // await builder.clean();
    // console.log('🧹 Output directory cleaned');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 4: Validate templates
async function validateExample() {
  console.log('\nValidating templates...\n');

  try {
    const validation = await validateTemplates('src/templates', 'src/schemas');
    
    if (validation.valid) {
      console.log('✅ All templates are valid!');
    } else {
      console.log('❌ Validation errors found:');
      validation.errors.forEach(({ file, error }) => {
        console.log(`  ${file}: ${error}`);
      });
    }
  } catch (error) {
    console.error('Validation failed:', error);
  }
}

// Example 5: Programmatic usage with custom template processing
async function customProcessing() {
  console.log('\nCustom template processing...\n');

  const builder = new GHABuilder({
    sourceDir: 'src/templates',
    outputDir: 'dist/workflows',
    addMetadata: true,
    variables: {
      environment: 'production',
      secrets: {
        npmToken: '${{ secrets.NPM_TOKEN }}',
        githubToken: '${{ secrets.GITHUB_TOKEN }}',
      },
    },
  });

  try {
    // Process templates individually
    const workflows = ['ci-node.yml', 'release.yml', 'security.yml'];
    
    for (const workflow of workflows) {
      const sourcePath = `workflows/${workflow}`;
      
      // Check if template exists
      const parseResult = await builder.parseTemplate(sourcePath).catch(() => null);
      
      if (parseResult) {
        console.log(`Processing ${workflow}...`);
        await builder.buildWorkflow(sourcePath);
        console.log(`  ✅ Generated ${workflow}`);
      } else {
        console.log(`  ⚠️  Skipping ${workflow} (not found)`);
      }
    }
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

// Main function to run examples
async function main() {
  console.log('🚀 GitHub Actions Template Builder Examples\n');
  console.log('=' .repeat(50));

  // Run examples
  await buildAllWorkflows();
  console.log('\n' + '=' .repeat(50));
  
  await buildSingleWorkflow();
  console.log('\n' + '=' .repeat(50));
  
  await advancedUsage();
  console.log('\n' + '=' .repeat(50));
  
  await validateExample();
  console.log('\n' + '=' .repeat(50));
  
  await customProcessing();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export examples for use in other scripts
export {
  buildAllWorkflows,
  buildSingleWorkflow,
  advancedUsage,
  validateExample,
  customProcessing,
};
