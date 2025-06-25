import { initializeTestConfig } from './test-config';

/**
 * Global setup for all tests
 * Initializes test configuration and dependency detection
 */
export async function setup() {
  console.log('🔧 Initializing test environment...');
  
  try {
    const config = await initializeTestConfig();
    
    if (config.tier1Only) {
      console.log('📝 Running Tier 1 (static) tests only');
    } else if (config.actAvailable && config.dockerAvailable) {
      console.log('🐳 Running all test tiers (static + dry-run + containers)');
    } else if (config.actAvailable) {
      console.log('🏃 Running Tier 1 & 2 tests (static + dry-run)');
    } else {
      console.log('📄 Running Tier 1 tests only (static validation)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize test configuration:', error);
    throw error;
  }
}

export async function teardown() {
  console.log('🧹 Test environment cleanup complete');
}