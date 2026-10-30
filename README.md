# upkeep

Puts the house and car jobs that come around every few months into your calendar: filters, gutters, oil changes, smoke detectors.

Tasks live in groups, one per house or car. Each group publishes its own calendar feed, and every task is a repeating all-day event in it with an alert. Subscribe once from Apple Calendar or Google Calendar and the events repeat there on their own. When you move or change cars, copy the group, adjust it, and archive the old one, which empties its calendar.

Anyone can make an account. Accounts are passkeys, so there's no email or password, and a one-time recovery code covers a lost passkey.

Runs as a single Cloudflare Worker with a D1 database, all on the free plan. React and Tailwind for the UI, Hono for the API.

## Local

```sh
npm install
npm run db:migrate
npm run db:seed   # optional sample data
npm run dev
```

Open `http://localhost:5173`. Passkeys don't work on `127.0.0.1`. `npm test` runs the tests.

## Deploying

Pushes to `main` deploy through GitHub Actions. One-time setup:

1. Create a Cloudflare API token with the "Edit Cloudflare Workers" template plus D1 edit.
2. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets.
3. Push. The workflow applies migrations and deploys.

Optional: add a free Turnstile widget in the Cloudflare dashboard, put its site key in `TURNSTILE_SITE_KEY` in `wrangler.jsonc`, and set the secret with `npx wrangler secret put TURNSTILE_SECRET`. Sign-up then checks for bots.

## Limits

To stay inside the free plan for everyone, an account can have 10 groups of up to 100 tasks, and sign-ups stop for the day after 500. All three numbers are at the top of `src/worker/index.ts` and `src/worker/auth.ts`.

## Backups

- D1 Time Travel can restore the database to any minute in the last 7 days: `npx wrangler d1 time-travel restore upkeep --timestamp=<ISO time>`.
- Every night a cron job copies the users, passkeys, groups and tasks tables into the `upkeep-backups` KV namespace, where each copy is kept for 30 days. `npx wrangler kv key list --namespace-id=<id> --remote` lists them.
- People can download their own data from the Account page and import it again later.
