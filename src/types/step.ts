import { WithCallback } from "./WithCallback";
import { Step } from "./base/workflows/step"


export type GhaStep = WithCallback<Step>;

const a = null as unknown as GhaStep;
