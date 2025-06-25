/* Auto-generated from permissions-event JSON Schema */

export type PermissionsLevel = "read" | "write" | "none";

export interface PermissionsEvent {
  actions?: PermissionsLevel;
  attestations?: PermissionsLevel;
  checks?: PermissionsLevel;
  contents?: PermissionsLevel;
  deployments?: PermissionsLevel;
  discussions?: PermissionsLevel;
  "id-token"?: PermissionsLevel;
  issues?: PermissionsLevel;
  models?: "read" | "none";
  packages?: PermissionsLevel;
  pages?: PermissionsLevel;
  "pull-requests"?: PermissionsLevel;
  "repository-projects"?: PermissionsLevel;
  "security-events"?: PermissionsLevel;
  statuses?: PermissionsLevel;
}
