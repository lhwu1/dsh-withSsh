import { Context } from "@deepseek-ai/cordis";
//#region src/host/web.d.ts
declare const name = "dsh-withssh-web";
declare const inject: string[];
/** Expose session-scoped SSH operations over same-origin, non-cacheable routes. */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };
//# sourceMappingURL=web.d.mts.map