import { FromKeyValueTuple, KeyValue,  ToKeyValueTuple } from "inferred-types";

export type GithubActionsEnv = {
    env<T extends string>(str: T): `{{ github.env.${T} }}`
    secrets<T extends string>(str: T): `{{ github.secrets.${T} }}`
}

export type Callback<T> = T | ((cb: (api: GithubActionsEnv) => string) => void);


type Mutate<T extends readonly KeyValue[]> = {
    [K in keyof T]: T[K] extends string | undefined
        ? Callback<string>
        : T[K] extends boolean | number | string
        ? Callback<boolean | number | string>
        : T[K]
}

export type WithCallback<T extends Record<string,unknown>> = 
FromKeyValueTuple<
    Mutate<
        ToKeyValueTuple<T>
    >
>
