# upkeep

Keeps track of the house and car jobs that come around every few months: oil changes, filters, gutters, smoke detectors. Each item knows when it was last done and when it's due next. Mileage items track the odometer too.

Runs as a single Cloudflare Worker with a D1 database. React and Tailwind for the UI, Hono for the API.

## Local

```sh
npm install
npm run db:migrate
npm run db:seed   # optional sample data
npm run dev
```

`npm test` runs the due date tests.

## Deploying

Pushes to `main` deploy through GitHub Actions. One-time setup:

1. `npx wrangler d1 create upkeep` and paste the `database_id` into `wrangler.jsonc`.
2. Create a Cloudflare API token with the "Edit Cloudflare Workers" template plus D1 edit.
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets.
4. Push. The workflow applies migrations and deploys.

Until the token is set, the deploy job skips itself.

## Access

The app has no login of its own. Put it behind Cloudflare Access:

1. In Zero Trust, add a self-hosted application for the worker's hostname (and the `workers.dev` one) with a policy that allows only your email.
2. Copy the application's AUD tag and your team domain (`<team>.cloudflareaccess.com`) into `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` in `wrangler.jsonc`.

With those set, the API rejects any request that didn't come through Access.
