/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_aiCaps from "../_lib/aiCaps.js";
import type * as _lib_applyPayment from "../_lib/applyPayment.js";
import type * as _lib_asesorSync from "../_lib/asesorSync.js";
import type * as _lib_authz from "../_lib/authz.js";
import type * as _lib_botAuth from "../_lib/botAuth.js";
import type * as _lib_casillasV4 from "../_lib/casillasV4.js";
import type * as _lib_cidSigning from "../_lib/cidSigning.js";
import type * as _lib_columnMaps from "../_lib/columnMaps.js";
import type * as _lib_commission from "../_lib/commission.js";
import type * as _lib_espejoFilas from "../_lib/espejoFilas.js";
import type * as _lib_fotosintesisVocab from "../_lib/fotosintesisVocab.js";
import type * as _lib_ghlConversations from "../_lib/ghlConversations.js";
import type * as _lib_lotMath from "../_lib/lotMath.js";
import type * as _lib_loteV4 from "../_lib/loteV4.js";
import type * as _lib_motorPrecios from "../_lib/motorPrecios.js";
import type * as _lib_precioEspecial from "../_lib/precioEspecial.js";
import type * as _lib_previewLote from "../_lib/previewLote.js";
import type * as _lib_pricing from "../_lib/pricing.js";
import type * as _lib_productSearch from "../_lib/productSearch.js";
import type * as _lib_publishState from "../_lib/publishState.js";
import type * as _lib_publishedGroups from "../_lib/publishedGroups.js";
import type * as _lib_recalculo from "../_lib/recalculo.js";
import type * as _lib_saleSafe from "../_lib/saleSafe.js";
import type * as _lib_sessionToken from "../_lib/sessionToken.js";
import type * as _lib_sheetPullMaps from "../_lib/sheetPullMaps.js";
import type * as _lib_sheetSync from "../_lib/sheetSync.js";
import type * as adminOps from "../adminOps.js";
import type * as ambassadors from "../ambassadors.js";
import type * as asesorMovements from "../asesorMovements.js";
import type * as clients from "../clients.js";
import type * as commissions from "../commissions.js";
import type * as crons from "../crons.js";
import type * as fotoSync from "../fotoSync.js";
import type * as fotosintesisAi from "../fotosintesisAi.js";
import type * as ghl from "../ghl.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lotItems from "../lotItems.js";
import type * as lots from "../lots.js";
import type * as lotsV4 from "../lotsV4.js";
import type * as migrations from "../migrations.js";
import type * as precios from "../precios.js";
import type * as productViews from "../productViews.js";
import type * as products from "../products.js";
import type * as providers from "../providers.js";
import type * as sales from "../sales.js";
import type * as sequences from "../sequences.js";
import type * as subLotes from "../subLotes.js";
import type * as vitrinas from "../vitrinas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/aiCaps": typeof _lib_aiCaps;
  "_lib/applyPayment": typeof _lib_applyPayment;
  "_lib/asesorSync": typeof _lib_asesorSync;
  "_lib/authz": typeof _lib_authz;
  "_lib/botAuth": typeof _lib_botAuth;
  "_lib/casillasV4": typeof _lib_casillasV4;
  "_lib/cidSigning": typeof _lib_cidSigning;
  "_lib/columnMaps": typeof _lib_columnMaps;
  "_lib/commission": typeof _lib_commission;
  "_lib/espejoFilas": typeof _lib_espejoFilas;
  "_lib/fotosintesisVocab": typeof _lib_fotosintesisVocab;
  "_lib/ghlConversations": typeof _lib_ghlConversations;
  "_lib/lotMath": typeof _lib_lotMath;
  "_lib/loteV4": typeof _lib_loteV4;
  "_lib/motorPrecios": typeof _lib_motorPrecios;
  "_lib/precioEspecial": typeof _lib_precioEspecial;
  "_lib/previewLote": typeof _lib_previewLote;
  "_lib/pricing": typeof _lib_pricing;
  "_lib/productSearch": typeof _lib_productSearch;
  "_lib/publishState": typeof _lib_publishState;
  "_lib/publishedGroups": typeof _lib_publishedGroups;
  "_lib/recalculo": typeof _lib_recalculo;
  "_lib/saleSafe": typeof _lib_saleSafe;
  "_lib/sessionToken": typeof _lib_sessionToken;
  "_lib/sheetPullMaps": typeof _lib_sheetPullMaps;
  "_lib/sheetSync": typeof _lib_sheetSync;
  adminOps: typeof adminOps;
  ambassadors: typeof ambassadors;
  asesorMovements: typeof asesorMovements;
  clients: typeof clients;
  commissions: typeof commissions;
  crons: typeof crons;
  fotoSync: typeof fotoSync;
  fotosintesisAi: typeof fotosintesisAi;
  ghl: typeof ghl;
  http: typeof http;
  invitations: typeof invitations;
  lotItems: typeof lotItems;
  lots: typeof lots;
  lotsV4: typeof lotsV4;
  migrations: typeof migrations;
  precios: typeof precios;
  productViews: typeof productViews;
  products: typeof products;
  providers: typeof providers;
  sales: typeof sales;
  sequences: typeof sequences;
  subLotes: typeof subLotes;
  vitrinas: typeof vitrinas;
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
