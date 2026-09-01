/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as kits from "../kits.js";
import type * as lib_bolsas from "../lib/bolsas.js";
import type * as lib_campana from "../lib/campana.js";
import type * as lib_codigos from "../lib/codigos.js";
import type * as lib_guardas from "../lib/guardas.js";
import type * as muro from "../muro.js";
import type * as raices from "../raices.js";
import type * as registro from "../registro.js";
import type * as stats from "../stats.js";
import type * as tribu from "../tribu.js";
import type * as voluntarios from "../voluntarios.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  kits: typeof kits;
  "lib/bolsas": typeof lib_bolsas;
  "lib/campana": typeof lib_campana;
  "lib/codigos": typeof lib_codigos;
  "lib/guardas": typeof lib_guardas;
  muro: typeof muro;
  raices: typeof raices;
  registro: typeof registro;
  stats: typeof stats;
  tribu: typeof tribu;
  voluntarios: typeof voluntarios;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
