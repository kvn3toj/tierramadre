/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_columnMaps from "../_lib/columnMaps.js";
import type * as _lib_fotosintesisVocab from "../_lib/fotosintesisVocab.js";
import type * as _lib_sheetSync from "../_lib/sheetSync.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as fotosintesisAi from "../fotosintesisAi.js";
import type * as invitations from "../invitations.js";
import type * as lotItems from "../lotItems.js";
import type * as lots from "../lots.js";
import type * as productViews from "../productViews.js";
import type * as products from "../products.js";
import type * as providers from "../providers.js";
import type * as sales from "../sales.js";
import type * as sequences from "../sequences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/columnMaps": typeof _lib_columnMaps;
  "_lib/fotosintesisVocab": typeof _lib_fotosintesisVocab;
  "_lib/sheetSync": typeof _lib_sheetSync;
  clients: typeof clients;
  crons: typeof crons;
  fotosintesisAi: typeof fotosintesisAi;
  invitations: typeof invitations;
  lotItems: typeof lotItems;
  lots: typeof lots;
  productViews: typeof productViews;
  products: typeof products;
  providers: typeof providers;
  sales: typeof sales;
  sequences: typeof sequences;
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
