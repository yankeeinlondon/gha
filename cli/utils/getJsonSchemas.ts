import { gotcha, isOk } from "@yankeeinlondon/gotcha";
import type { JSONSchema4 } from "json-schema";
import { ACTION_SCHEMA_URL, WORKFLOW_SCHEMA_URL } from "../constants";
import { SchemaDownload } from "../errors";

/**
 * Fetches the canonical GitHub Actions workflow schema from SchemaStore
 * and returns the full schema plus every sub-schema under `definitions`.
 */
export async function getJsonSchemas(): Promise<[JSONSchema4, JSONSchema4] | Error> {

    const w = gotcha(WORKFLOW_SCHEMA_URL, { maxRedirections: 6 });
    const a = gotcha(ACTION_SCHEMA_URL, { maxRedirections: 6 });

    const [ resWorkflow, resActions] = await Promise.all([w,a]);

    if (isOk(resWorkflow) && isOk(resActions)) {
        const workflows = await resWorkflow.body.json() as JSONSchema4;
        const actions = await resActions.body.json() as JSONSchema4;
        
        return [workflows, actions];
    } 

    if(isOk(resWorkflow)) {
        return SchemaDownload(`The workflows schema was download but the actions schema failed!`)
    } else if (isOk(resActions)) {
        return SchemaDownload(`The actions schema was download but the workflows schema failed!`)
    } 

    return SchemaDownload(`Downloading of both the actions and workflows JSON schema's failed!`);
}

