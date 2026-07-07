/**
 * Validates the reusable GitHub Actions workflow files.
 *
 * For every `.github/workflows/*.yml` file this checks that:
 *   1. the file parses as valid YAML, and
 *   2. it declares at least one job under a top-level `jobs:` key.
 *
 * Exits non-zero (failing CI) if any workflow is invalid. This replaces the
 * former vitest suite with a dependency-light check runnable via `tsx`.
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { globSync } from 'glob'
import yaml from 'js-yaml'

interface Workflow {
  name?: string
  jobs?: Record<string, unknown>
}

const workflowFiles = globSync('.github/workflows/*.yml').sort()

if (workflowFiles.length === 0) {
  console.error('❌ No workflow files found under .github/workflows/*.yml')
  process.exit(1)
}

const failures: string[] = []

for (const workflowPath of workflowFiles) {
  try {
    const source = readFileSync(workflowPath, 'utf8')
    const workflow = yaml.load(source) as Workflow // throws on invalid YAML

    const jobNames = workflow?.jobs ? Object.keys(workflow.jobs) : []
    if (jobNames.length === 0) {
      failures.push(`${workflowPath}: no jobs defined`)
      continue
    }

    console.log(`✅ ${workflowPath} (${workflow.name ?? 'unnamed'})`)
    console.log(`   jobs: ${jobNames.join(', ')}`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${workflowPath}: ${message}`)
  }
}

if (failures.length > 0) {
  console.error('\n❌ Workflow validation failed:')
  for (const failure of failures)
    console.error(`   - ${failure}`)
  process.exit(1)
}

console.log(`\n✅ All ${workflowFiles.length} workflow files are valid.`)
