import { beforeAll } from 'vitest';
import { initializeTestConfig } from './test-config';

// Initialize test configuration before running any tests
beforeAll(async () => {
  await initializeTestConfig();
});