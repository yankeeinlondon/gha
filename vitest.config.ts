import { defineConfig } from "vitest/config";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Resolve the directory name for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"), // Map "~/" to "./src"
    },
  },
  test: {
    // Additional Vitest configurations
    globals: true,
    environment: "node",
    include: [
      "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/cypress/**", "**/.{idea,git,cache,output,temp}/**"],
    
    // Global setup for dependency detection
    globalSetup: ['./tests/utils/global-setup.ts'],
    
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "coverage/**",
        "dist/**",
        "**/[.]**",
        "packages/*/test?(s)/**",
        "**/*.d.ts",
        "**/virtual:*",
        "**/__x00__*",
        "**/\x00*",
        "cypress/**",
        "test?(s)/**",
        "test?(-*).?(c|m)[jt]s?(x)",
        "**/*{.,-}{test,spec}.?(c|m)[jt]s?(x)",
        "**/__tests__/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "**/vitest.{workspace,projects}.[jt]s?(on)",
        "**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}",
      ],
    },
    
    // Workflow testing specific configuration
    testTimeout: 60000, // 60 seconds for Tier 3 container tests
    hookTimeout: 15000, // 15 seconds for setup/teardown
    pool: "forks", // Use forks for better isolation when testing workflows
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    
    // Environment variables for workflow testing
    env: {
      NODE_ENV: "test",
      GITHUB_ACTIONS: "false", // Disable GitHub Actions specific behavior in tests
      TEST_TIER_1_ONLY: process.env.CI === 'true' && !process.env.ACT_AVAILABLE ? 'true' : 'false'
    },
    
    // Separate configurations for different test tiers
    // This can be overridden via CLI: vitest run tests/static
    setupFiles: ['./tests/utils/test-setup.ts']
  },
});
