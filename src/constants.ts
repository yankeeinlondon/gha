import { Suggest } from "inferred-types";
import { Event } from "./types/base/workflows/event"



export const EVENT_LOOKUP = {
    branch_protection_rule: { types: BranchProtectionRule }
} as const satisfies Record<Event,Record<string,unknown>>
