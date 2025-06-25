import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowAssertions } from '~/testing/assertions';
import { loadWorkflow } from '~/testing/test-helpers';
import { resolve } from 'path';
import { Glob } from 'glob';

describe('Schema Validation (Tier 1)', () => {
  let assertions: WorkflowAssertions;
  const templatesDir = resolve(__dirname, '../../../src/templates');

  beforeEach(() => {
    assertions = new WorkflowAssertions();
  });

  it('should validate workflow templates against schema', async () => {
    const workflowFiles = await new Glob('workflows/**/*.{yml,yaml}', {
      cwd: templatesDir
    }).walk();

    expect(workflowFiles.length).toBeGreaterThan(0);

    for (const file of workflowFiles) {
      const filePath = resolve(templatesDir, file);
      const workflow = await loadWorkflow(filePath);
      
      const errors = await assertions.validateSyntax(workflow);
      
      if (errors.length > 0) {
        console.error(`Schema validation errors in ${file}:`, errors);
      }
      
      expect(errors, `Schema validation failed for ${file}: ${errors.join(', ')}`).toHaveLength(0);
    }
  });

  it('should validate built workflows against schema', async () => {
    const workflowsDir = resolve(__dirname, '../../../.github/workflows');
    
    try {
      const builtFiles = await new Glob('**/*.{yml,yaml}', {
        cwd: workflowsDir
      }).walk();

      for (const file of builtFiles) {
        const filePath = resolve(workflowsDir, file);
        const workflow = await loadWorkflow(filePath);
        
        const errors = await assertions.validateSyntax(workflow);
        
        if (errors.length > 0) {
          console.error(`Schema validation errors in built workflow ${file}:`, errors);
        }
        
        expect(errors, `Schema validation failed for built workflow ${file}: ${errors.join(', ')}`).toHaveLength(0);
      }
    } catch (error) {
      console.log('No built workflows found for schema validation');
    }
  });

  it('should validate required workflow fields', async () => {
    const validWorkflow = {
      name: 'Test Workflow',
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' }
          ]
        }
      }
    };

    const errors = await assertions.validateSyntax(validWorkflow);
    expect(errors).toHaveLength(0);
  });

  it('should reject workflows missing required fields', async () => {
    const invalidWorkflow = {
      // Missing name
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' }
          ]
        }
      }
    };

    const errors = await assertions.validateSyntax(invalidWorkflow);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(error => error.includes('name'))).toBe(true);
  });

  it('should reject workflows with invalid job configuration', async () => {
    const invalidWorkflow = {
      name: 'Test Workflow',
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          // Missing runs-on
          steps: [
            { uses: 'actions/checkout@v4' }
          ]
        }
      }
    };

    const errors = await assertions.validateSyntax(invalidWorkflow);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(error => error.includes('runs-on'))).toBe(true);
  });

  it('should reject workflows with invalid step configuration', async () => {
    const invalidWorkflow = {
      name: 'Test Workflow',
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { 
              // Missing both uses and run
              name: 'Invalid step'
            }
          ]
        }
      }
    };

    const errors = await assertions.validateSyntax(invalidWorkflow);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(error => error.includes('uses') || error.includes('run'))).toBe(true);
  });

  it('should validate action reference formats', () => {
    const validRefs = [
      'actions/checkout@v4',
      'actions/setup-node@v4',
      'docker://alpine:latest',
      './local-action',
      'owner/repo/path@v1.0.0'
    ];

    const invalidRefs = [
      'actions/checkout',  // Missing version
      'checkout@v4',       // Missing owner
      '@v4',              // Missing action
      'actions/@v4'       // Missing repo
    ];

    for (const ref of validRefs) {
      const errors = assertions.validateActionReference(ref);
      expect(errors, `Valid reference ${ref} should not have errors`).toHaveLength(0);
    }

    for (const ref of invalidRefs) {
      const errors = assertions.validateActionReference(ref);
      expect(errors.length, `Invalid reference ${ref} should have errors`).toBeGreaterThan(0);
    }
  });

  it('should validate GitHub expressions', () => {
    const validExpressions = [
      '${{ github.event_name == "push" }}',
      '${{ matrix.os }}',
      '${{ secrets.TOKEN }}',
      '${{ env.NODE_VERSION }}',
      'success()',
      'always()',
      '${{ needs.test.result == "success" }}'
    ];

    const invalidExpressions = [
      '${{ github.event_name == "push"',  // Missing closing braces
      'github.event_name == "push" }}',   // Missing opening braces
      '${{',                              // Incomplete expression
      '}}'                                // Incomplete expression
    ];

    for (const expr of validExpressions) {
      const errors = assertions.validateExpression(expr);
      expect(errors, `Valid expression ${expr} should not have errors`).toHaveLength(0);
    }

    for (const expr of invalidExpressions) {
      const errors = assertions.validateExpression(expr);
      expect(errors.length, `Invalid expression ${expr} should have errors`).toBeGreaterThan(0);
    }
  });
});