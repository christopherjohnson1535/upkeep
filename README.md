# upkeep

Puts the house and car jobs that come around every few months into your calendar: filters, gutters, oil changes, smoke detectors.

Tasks live in groups, one per house or car. Each group publishes its own calendar feed, and every task is a repeating all-day event in it with an alert. Subscribe once from Apple Calendar or Google Calendar and the events repeat there on their own. When you move or change cars, copy the group, adjust it, and archive the old one, which empties its calendar.

Runs as a single Cloudflare Worker with a D1 database. React and Tailwind for the UI, Hono for the API.

## Local

```sh
npm install
npm run db:migrate
npm run db:seed   # optional sample data
npm run dev
```

`npm test` runs the schedule and calendar feed tests.

## Deploying

Pushes to `main` deploy through GitHub Actions. One-time setup:

1. Create a Cloudflare API token with the "Edit Cloudflare Workers" template plus D1 edit.
2. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets.
3. Push. The workflow applies migrations and deploys.

Until the token is set, the deploy job skips itself.

## Access

The app has no login of its own. Put it behind Cloudflare Access, but leave the calendar feeds open, because calendar apps can't sign in. Each feed URL has a long random token, and "New calendar link" replaces it if one ever leaks.

1. In Zero Trust, add a self-hosted application for the worker's hostname with a policy that allows only your email.
2. Add a second self-hosted application for the same hostname with the path `feed`, and give it a Bypass policy for Everyone.
3. Copy the first application's AUD tag and your team domain (`<team>.cloudflareaccess.com`) into `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` in `wrangler.jsonc`.

With those set, the API rejects any request that didn't come through Access.
