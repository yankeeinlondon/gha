import chalk from "chalk";
import { isError } from "@yankeeinlondon/kind-error";
import { compile } from 'json-schema-to-typescript';
import { getJsonSchemas } from "./utils/getJsonSchemas";
import {  exit } from "process";
import { JSONSchema4 } from "json-schema";
import { join } from "path";
import { writeFileSync } from "fs";
import { keysOf } from "inferred-types";
import { mkdir, writeFile } from "fs/promises";

const schema = await getJsonSchemas();

if (isError(schema)) {
    console.log(schema);
    console.log("");
    exit(1);
}

console.log(`- successfully downloaded both ${chalk.bold.italic.yellow("actions")} and ${chalk.bold.italic.yellow("workflows")} JSON schemas.`)

const [workflows, actions] = schema;

const workflowDefinitions: Record<string, JSONSchema4> = {};
const actionDefinitions: Record<string, JSONSchema4> = {};

if (workflows.definitions) {
    console.log(`- Processing sub-schema's for ${chalk.bold.italic.yellow("workflows")} [${chalk.dim(workflows.$schema)}]`)
    for (const [key, sub] of Object.entries(workflows.definitions)) {
        console.log(chalk.dim(`    - ${key}`));
        workflowDefinitions[key] = sub as JSONSchema4;
    }
}

if (actions.definitions) {
    console.log(`- Processing sub-schema's for ${chalk.bold.italic.yellow("actions")}`)
    for (const [key, sub] of Object.entries(actions.definitions)) {
        console.log(chalk.dim(`    - ${key}`));
        actionDefinitions[key] = sub as JSONSchema4;
    }
}

console.log(`- Saving JSON Schemas as files:`);

const schemaBase = "./cli/schemas/";

for (const key of keysOf(workflowDefinitions)) {
    const workBase = join(schemaBase, "workflows/");
    const file = `${key}.json`;
    writeFileSync(join(workBase, file), JSON.stringify(workflowDefinitions[key]), "utf-8");
    console.log(`   - wrote ` + chalk.dim(workBase) + file);
}

for (const key of keysOf(actionDefinitions)) {
    const workBase = join(schemaBase, "actions/");
    const file = `${key}.json`;
    writeFileSync(join(workBase, file), JSON.stringify(actionDefinitions[key]), "utf-8");
    console.log(`   - wrote ` + chalk.dim(workBase) + file);
}

console.log(`- Converting JSON Schemas to Types (and saving):`);

const typesBase = "./cli/types";


for (const key of keysOf(workflowDefinitions)) {
    const dir = join(typesBase, "workflows/");
    const file = `${key}.ts`;
    const schema = workflowDefinitions[key];
    const typeName = key[0].toUpperCase() + key.slice(1);
    const wrapped: JSONSchema4 = {
        title: typeName,
        // preserve the original draft-07 markers if you want
        $schema: workflows.$schema,
        $id: `${workflows.$id}#/definitions/${key}`,

        // THIS is the important bit:
        definitions: workflows.definitions,
        ...schema,
    };

    const ts = await compile(wrapped, typeName, {
        bannerComment: `/* Auto-generated from ${key} JSON Schema */`
    })
    // Ensure the directory exists before writing the file
    await mkdir(dir, { recursive: true });
    await writeFile(
        join(dir, file),
        ts,
        'utf-8'
    )
    console.log(`  - wrote ${chalk.dim(dir)}${file}`);
}

for (const key of keysOf(actionDefinitions)) {
    const dir = join(typesBase, "actions/");
    const file = `${key}.ts`;
    const typeName = key[0].toUpperCase() + key.slice(1);
    const schema = actionDefinitions[key];
    const wrapped: JSONSchema4 = {
        title: typeName,
        $schema: workflows.$schema,
        $id: `${actions.$id}#/definitions/${key}`,

        // THIS is the important bit:
        definitions: actions.definitions,
        ...schema,
    };
    const ts = await compile(wrapped, typeName, {
        bannerComment: `/* Auto-generated from ${key} JSON Schema */`
    })
    // Ensure the directory exists before writing the file
    await mkdir(dir, { recursive: true });
    await writeFile(
        join(dir, file),
        ts,
        'utf-8'
    );
    console.log(`  - wrote ${chalk.dim(dir)}${file} [ ${chalk.dim(schema.$schema)}, ${chalk.dim(schema.$ref)} ]`);
}
