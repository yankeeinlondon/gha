import { execSync } from 'child_process';

export interface TestConfig {
  actAvailable: boolean;
  dockerAvailable: boolean;
  tier1Only: boolean;
}

let testConfig: TestConfig | null = null;

/**
 * Check if act CLI tool is available
 */
export async function isActAvailable(): Promise<boolean> {
  try {
    execSync('act --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker daemon is available and running
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize test configuration
 */
export async function initializeTestConfig(): Promise<TestConfig> {
  if (testConfig) {
    return testConfig;
  }

  const actAvailable = await isActAvailable();
  const dockerAvailable = await isDockerAvailable();
  const tier1Only = process.env.TEST_TIER_1_ONLY === 'true' || 
                   (process.env.CI === 'true' && !actAvailable);

  testConfig = {
    actAvailable,
    dockerAvailable,
    tier1Only
  };

  // Log configuration for debugging
  console.log('Test Configuration:', {
    actAvailable,
    dockerAvailable,
    tier1Only,
    ci: process.env.CI === 'true'
  });

  return testConfig;
}

/**
 * Get current test configuration
 */
export function getTestConfig(): TestConfig {
  if (!testConfig) {
    throw new Error('Test configuration not initialized. Call initializeTestConfig() first.');
  }
  return testConfig;
}

/**
 * Check if Tier 2 tests (act dry-run) should run
 */
export function shouldRunTier2(): boolean {
  const config = getTestConfig();
  return config.actAvailable && !config.tier1Only;
}

/**
 * Check if Tier 3 tests (full containers) should run  
 */
export function shouldRunTier3(): boolean {
  const config = getTestConfig();
  return config.actAvailable && config.dockerAvailable && !config.tier1Only;
}

/**
 * Skip test with informative message if dependencies not available
 */
export function skipIfDependenciesMissing(
  dependencies: Array<'act' | 'docker'>,
  testName: string
): void {
  const config = getTestConfig();
  const missing: string[] = [];

  if (dependencies.includes('act') && !config.actAvailable) {
    missing.push('act CLI tool');
  }
  
  if (dependencies.includes('docker') && !config.dockerAvailable) {
    missing.push('Docker daemon');
  }

  if (missing.length > 0) {
    console.log(`Skipping ${testName} - missing dependencies: ${missing.join(', ')}`);
    console.log('To install act: https://github.com/nektos/act#installation');
    if (missing.includes('Docker daemon')) {
      console.log('To start Docker: docker daemon or Docker Desktop');
    }
  }
}