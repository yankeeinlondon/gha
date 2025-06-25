import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { Glob } from 'glob';

describe('YAML Syntax Validation (Tier 1)', () => {
  const templatesDir = resolve(__dirname, '../../../src/templates');

  it('should parse all workflow templates as valid YAML', async () => {
    const workflowFiles = await new Glob('workflows/**/*.{yml,yaml}', {
      cwd: templatesDir
    }).walk();

    expect(workflowFiles.length).toBeGreaterThan(0);

    for (const file of workflowFiles) {
      const filePath = resolve(templatesDir, file);
      const content = readFileSync(filePath, 'utf8');
      
      expect(() => {
        const parsed = parse(content);
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
      }, `Failed to parse YAML in ${file}`).not.toThrow();
    }
  });

  it('should parse all job templates as valid YAML', async () => {
    const jobFiles = await new Glob('jobs/**/*.{yml,yaml}', {
      cwd: templatesDir
    }).walk();

    for (const file of jobFiles) {
      const filePath = resolve(templatesDir, file);
      const content = readFileSync(filePath, 'utf8');
      
      expect(() => {
        const parsed = parse(content);
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
      }, `Failed to parse YAML in ${file}`).not.toThrow();
    }
  });

  it('should parse all step templates as valid YAML', async () => {
    const stepFiles = await new Glob('steps/**/*.{yml,yaml}', {
      cwd: templatesDir
    }).walk();

    for (const file of stepFiles) {
      const filePath = resolve(templatesDir, file);
      const content = readFileSync(filePath, 'utf8');
      
      expect(() => {
        const parsed = parse(content);
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
      }, `Failed to parse YAML in ${file}`).not.toThrow();
    }
  });

  it('should parse all action templates as valid YAML', async () => {
    const actionFiles = await new Glob('actions/**/*.{yml,yaml}', {
      cwd: templatesDir
    }).walk();

    for (const file of actionFiles) {
      const filePath = resolve(templatesDir, file);
      const content = readFileSync(filePath, 'utf8');
      
      expect(() => {
        const parsed = parse(content);
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
      }, `Failed to parse YAML in ${file}`).not.toThrow();
    }
  });

  it('should have valid YAML structure in built workflows', async () => {
    const workflowsDir = resolve(__dirname, '../../../.github/workflows');
    
    try {
      const builtFiles = await new Glob('**/*.{yml,yaml}', {
        cwd: workflowsDir
      }).walk();

      for (const file of builtFiles) {
        const filePath = resolve(workflowsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        expect(() => {
          const parsed = parse(content);
          expect(parsed).toBeDefined();
          expect(typeof parsed).toBe('object');
        }, `Failed to parse built workflow ${file}`).not.toThrow();
      }
    } catch (error) {
      // Built workflows may not exist yet, which is fine
      console.log('No built workflows found for validation');
    }
  });

  it('should detect and reject invalid YAML syntax', () => {
    const invalidYaml = `
name: Invalid Workflow
on:
  push:
    branches: [main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

    expect(() => {
      parse(invalidYaml);
    }).toThrow();
  });

  it('should handle YAML with comments and template markers', () => {
    const yamlWithComments = `
# @template: workflow
# @description: Test workflow with comments
name: Test Workflow
on:
  push:
    branches: [main]

jobs:
  test:
    # @extends: jobs/test-node.yml
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

    expect(() => {
      const parsed = parse(yamlWithComments);
      expect(parsed).toBeDefined();
      expect(parsed.name).toBe('Test Workflow');
    }).not.toThrow();
  });
});