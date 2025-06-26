// TODO: types related to `job()` function's utility

import { OsSuggest } from "./GhaGlobals";


export type Job<TName extends string> = {
    name: TName;
    "runs-on"(on: OsSuggest): string;
    if(cond: string): string;
    

}
