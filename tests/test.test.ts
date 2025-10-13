import { describe, expect, it } from "vitest";

import fs from 'fs'
import yaml from 'js-yaml'

describe("test.yml is valid", () => {

    
    it("YAML is valid", () => {
    
        try {
            const src = fs.readFileSync('.github/workflows/test.yml', 'utf8')
            const data = yaml.load(src) as {
                name: string;
                if: string;
                jobs: Record<string, unknown>;
            }     // throws if invalid YAML
            console.log(`workflow: ${data.name}`);
            console.log(`jobs: \n\t- ${Object.keys(data.jobs).join("\n\t- ")}`)
        } catch (e) {
            throw new Error(`YAML error: ${e instanceof Error ? e.message : String(e)}`)
        }

        expect(true).toBe(true);
    

    });
    

})



