/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as automation from "../automation.js";
import type * as automationDispatch from "../automationDispatch.js";
import type * as automationFixture from "../automationFixture.js";
import type * as borrowing from "../borrowing.js";
import type * as crons from "../crons.js";
import type * as demoRizvi from "../demoRizvi.js";
import type * as devSeed from "../devSeed.js";
import type * as http from "../http.js";
import type * as loans from "../loans.js";
import type * as photos from "../photos.js";
import type * as requests from "../requests.js";
import type * as signing from "../signing.js";
import type * as societies from "../societies.js";
import type * as suggestions from "../suggestions.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  automation: typeof automation;
  automationDispatch: typeof automationDispatch;
  automationFixture: typeof automationFixture;
  borrowing: typeof borrowing;
  crons: typeof crons;
  demoRizvi: typeof demoRizvi;
  devSeed: typeof devSeed;
  http: typeof http;
  loans: typeof loans;
  photos: typeof photos;
  requests: typeof requests;
  signing: typeof signing;
  societies: typeof societies;
  suggestions: typeof suggestions;
  tools: typeof tools;
  users: typeof users;
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
