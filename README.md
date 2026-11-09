# LendLoop

LendLoop is a neighborhood marketplace for borrowing and sharing tools and everyday gear. It starts with the people and places closest to home.

Good things go around.

## Phase 2 marketplace

Signed-in users who have selected an active society can create, edit, unlist, relist and archive listings. A listing has a required name and description, one of eight categories, a condition, and either a free label or an INR daily price stored in paise. Up to five JPEG, PNG or WebP photos can be uploaded through Convex File Storage. The browser resizes to at most 1600 px, re-encodes to JPEG, and strips embedded metadata. Original files over 5 MB and HEIC/HEIF are rejected. The camera preview requests video permission only after **Take Photo**; HTTPS or localhost is required. A device capture file input is offered when camera preview is unavailable. Camera hardware behavior should also be checked manually on an Android or iOS device.

Explore defaults to the selected society and can expand to approximately 500 m or 1 km using society center coordinates. Search, category, price and sort controls operate on bounded results. Distance is approximate. Active listings are discoverable, but date availability is not checked. The public catalog continues returning only name and category. Photo URLs are available only through authenticated listing queries, though anyone who receives a Convex file URL may share it.

No new environment variables are required. Run `npx convex dev --once` against a **development** deployment after pulling these changes so the schema and functions are pushed, then `npx convex codegen`. Keep production credentials out of tests. `npm test` covers the backend with `convex-test`; `npm run test:e2e` runs public browser tests and runs authenticated marketplace tests only when the isolated test Clerk/Convex environment variables in [development setup](docs/DEVELOPMENT.md) are set.

The Rizvi Oak CHSL development society has [synthetic demo neighbors and eight photographed listings](docs/DEVELOPMENT.md#rizvi-oak-chsl-demo-data).

## Vercel demo deployment

This deployment is for testing. The Vercel project uses a Clerk **development** instance and a Convex **development** deployment, with synthetic data only. Do not connect it to live production credentials or user data. The Vercel Production target provides a stable `*.vercel.app` URL for the demo; it does not make Clerk or Convex a production environment. Clerk development authentication on a provider domain is intended for demos and testing, not a real production launch.

1. Import `Chirag4904/lendloop` into a separate Vercel project, with `main` as the production branch, the repository root as Root Directory, and the Next.js framework preset. Keep Git integration enabled so pushes to `main` deploy automatically. Configure the Build Command as `npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`. This [official Convex/Vercel workflow](https://docs.convex.dev/production/hosting/vercel) builds the frontend against the selected deployment and then pushes the matching Convex functions. No `vercel.json` or GitHub Actions deploy job is needed.
2. In Convex, create a deploy key scoped to the **demo development deployment** with `deployment:deploy` permission. Store it only as a sensitive Vercel environment variable named `CONVEX_DEPLOY_KEY`, targeted to this demo project's Production environment. Do not set `CONVEX_DEPLOYMENT` on Vercel: without a key, `convex deploy` may target the project's default production deployment. The key and all local `.env` files must stay out of Git.
3. Set the following variables in the Vercel Production environment. Use the keys from the same Clerk development instance that matches the Convex issuer. Do not use `pk_live_` or `sk_live_` keys on the `*.vercel.app` demo URL.

   | Variable                            | Value / purpose                                                                                          |
   | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
   | `CONVEX_DEPLOY_KEY`                 | Sensitive, deployment-scoped demo Convex key; used only during builds.                                   |
   | `NEXT_PUBLIC_CONVEX_URL`            | Public URL of that same demo Convex deployment; `convex deploy` also injects it into the frontend build. |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk development `pk_test_…` key.                                                                       |
   | `CLERK_SECRET_KEY`                  | Sensitive Clerk development `sk_test_…` key.                                                             |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | `/sign-in`                                                                                               |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | `/sign-up`                                                                                               |

4. On the demo Convex deployment, set `CLERK_JWT_ISSUER_DOMAIN` to the **Frontend API URL** of that Clerk development instance, including `https://`, and enable Clerk's Convex integration. The checked-in [auth configuration](convex/auth.config.ts) uses this value to validate session tokens. The sign-in and sign-up components use relative paths and redirect back to the current origin, so the stable `*.vercel.app` demo URL needs no hard-coded redirect URL. If a social login provider is enabled, register the Clerk development instance's callback URL with that provider.
5. Deploy from Git, then verify sign-in on two devices, society selection, Explore, listing creation/editing, and image upload. Test **Take Photo** on a real phone: Vercel serves HTTPS, which is required for camera permission. The device capture fallback remains available if a browser denies camera preview.

The existing GitHub Actions workflow still runs formatting, lint, typecheck, unit tests, build, and public browser checks without service credentials. Authenticated E2E tests require the isolated variables described in [development setup](docs/DEVELOPMENT.md); they are skipped in CI by default.

### Troubleshooting

| Symptom                                                | Check                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build deploys Convex to the wrong backend              | Confirm `CONVEX_DEPLOY_KEY` identifies the demo development deployment and `CONVEX_DEPLOYMENT` is absent on Vercel. Redeploy after correcting it.                                                                  |
| App says Convex is not configured, or queries fail     | Confirm `NEXT_PUBLIC_CONVEX_URL` matches the demo deployment and that the build log shows a successful Convex push.                                                                                                |
| Clerk sign-in works but Convex remains unauthenticated | Confirm the `pk_test_` and `sk_test_` keys belong to one Clerk instance, its Convex integration is enabled, and `CLERK_JWT_ISSUER_DOMAIN` matches its Frontend API URL. Redeploy Convex after changing the issuer. |
| Sign-in redirects to another site or fails on a device | Check that Clerk path variables are `/sign-in` and `/sign-up`, redirects are relative, and the browser is on the same stable HTTPS demo URL.                                                                       |
| Image upload fails                                     | Confirm the user selected an active society, the Convex `photos` functions deployed, and the file is JPEG, PNG, or WebP under 5 MB.                                                                                |
| Camera preview is unavailable                          | Use the HTTPS demo URL, allow camera access in the browser/OS, and try the device capture fallback. Test physical mobile hardware separately.                                                                      |

For a real launch, create a separate production Clerk instance on a domain you own and a separate production Convex deployment or project, then provision new keys and verify migration deliberately. Do not promote this demo configuration into a real production environment.
