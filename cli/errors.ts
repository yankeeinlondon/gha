import { createKindError } from "@yankeeinlondon/kind-error";

export const SchemaDownload = createKindError(
    "SchemaDownload",
    { library: "gha" }
)

