import { Suggest } from "inferred-types";

export type GhaNodeVersion = Suggest<
    | "20.x"
    | "22.x"
>;

export type CommonActions = Suggest<
    | "actions/setup-node@v4"
    | "actions/checkout@v4"
    | "oven-sh/setup-bun@v2"
    | "pnpm/action-setup@v2"
    | "andymckay/cancel-action@0.2"
>;

export type RegistryUrlSuggest = Suggest<
    | "https://registry.npmjs.org/"
    | "https://npm.pkg.github.com/"
>;

export type OsSuggest = Suggest<
    | "ubuntu-18.04"
    | "ubuntu-20.04"
    | "ubuntu-22.04"
    | "ubuntu-latest"
    | "windows-latest"
    | "macos-latest"
>;

export type GhaInput = {
    type?: "boolean" | "string" | "number";
    default?: string | boolean | string[];
    required?: boolean;
    description?: string;
}


export type GhaGlobals = {
    env(str: string): string;
    github: {
        event: {
            compare(): string;
        }
        secrets(str: string): string;   
    }
    matrix: {
        os(os: OsSuggest | OsSuggest[]): string;
        "node-version"(version: GhaNodeVersion): string;
    }
    inputs: {
        input: {

        }
    }
    steps: {
        [key: string]: {
            outputs: {
                access_level(): string;
            };
        }
    }
}
