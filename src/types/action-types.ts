import { Suggest } from "inferred-types";

/** an input variable for an Action */
export type ActionInputType = {
    type: string;
    default: string[];
    required: boolean;
}


export type ActionSecret = {
    /** 
     * be default this secret's name will **not** be required but 
     * you can express that it IS required.
     */
    required?: boolean;
} | undefined;


/**
 * Allows for _any_ string but suggest certain ones to get user
 * thinking about what this is.
 */
export type CommonSecretNames = Suggest<
    | "api_token"
    | "google_api_key"
    | "openai_api_key"
    | "deepseek_api_key"
    | "openrouter_api_key"
>;


export type ActionSecretExpectations = Record<CommonSecretNames, ActionSecret>;

/**
 * The type definition for a Github **Action**
 */
export type Action = {

}
