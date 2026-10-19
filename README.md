# Pitlane

Pitlane is a private motorcycle-care workspace built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase. It tracks a bike profile, configurable maintenance intervals, service work, fuel/expenses, odometer entries, private documents, and scheduled reminders.

## Architecture

- **Web and server actions:** Next.js App Router in `src/app`; every write derives the user from the Supabase server session.
- **Authentication and persistence:** Supabase Auth, PostgreSQL, and Row Level Security. The migration lives in `supabase/migrations`.
- **Private files:** Supabase Storage bucket `private-bike-files`; files are private, owner-scoped, and downloaded through a 60-second signed URL after server authorization.
- **Notifications:** Server-only Nodemailer/Google SMTP and Telegram Bot API modules in `src/lib/notifications`.
- **Scheduled work:** Vercel Cron calls `/api/cron/maintenance-reminders`; the endpoint requires a bearer `CRON_SECRET` and uses a service-role-only atomic claim function for duplicate-safe delivery.
- **Abuse controls:** Mutating server actions and private document access use an atomic per-user fixed-window limit stored in Supabase. Signup and password-reset limits are enforced by Supabase Auth.

## Project structure

```text
src/
  app/
    actions/                 Authenticated server mutations
    api/cron/                 Protected scheduled reminder handler
    api/documents/            Authenticated private download route
    auth/                     Sign-in, sign-up, reset, callback
    documents/                Private document library
    expenses/                 Fuel, costs, charts, odometer history
    maintenance/              User-configured maintenance schedules
    notifications/            Delivery history
    profile/                  Bike profile and photo
    services/                 Service history
    settings/                 Notification preferences and sign-out
  components/                 Dashboard, forms, navigation, charts
  lib/
    notifications/            Email, Telegram, retry runner
    supabase/                 Browser, SSR, and server-only admin clients
    env.ts                    Validated environment access
    maintenance.ts            Date and status calculations
supabase/migrations/          Schema, RLS, storage, RPC functions
vercel.json                   Daily 03:30 UTC cron schedule
.env.example                 Placeholder-only configuration
```

## Local setup

Prerequisites: Node.js 20.19+ and npm.

1. Install packages and create local configuration:

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. Create a Supabase project. In **Project Settings → API**, copy the Project URL and anon/publishable key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy the `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`; that key is server-only and must never be prefixed with `NEXT_PUBLIC_`.

3. Apply `supabase/migrations/202610190001_initial_schema.sql` in the Supabase SQL Editor. It creates the tables, built-in task categories, owner-based RLS policies, private storage bucket, odometer safeguards, and transactional service/fuel functions. The migration targets a new project; do not rerun it over an existing schema.

4. In **Authentication → URL Configuration**, set the local Site URL and add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/reset-password` to the redirect allow list. Configure production URLs there after deployment. Supabase Auth email confirmation is supported; disable confirmation only if that matches your account policy.

5. Start the app:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`, create an account, then add your motorcycle and set intervals using its service manual. Maintenance defaults are not asserted to be model specifications.

## Environment variables

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase key; RLS still applies |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only cron queries and notification claims |
| `SMTP_HOST` | SMTP host; defaults to `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port; defaults to `465` |
| `SMTP_SECURE` | TLS mode; defaults to `true` |
| `SMTP_USER` | Google account used for SMTP |
| `SMTP_PASS` | Google **App Password**, not the normal Gmail password |
| `MAIL_FROM` | Verified sender shown in reminder emails |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token, server-only |
| `TELEGRAM_CHAT_ID` | Optional fallback/reference; each account stores its own destination in its private profile |
| `CRON_SECRET` | Long random bearer secret for scheduled requests |

The `.env.example` contains placeholders only. Local values in `.env.local` are separate from Vercel configuration. Add every production value under **Vercel Project → Settings → Environment Variables**, select the intended environments, and redeploy after changes. Never paste secrets into the browser or commit them.

### Configure notification providers

- **Google SMTP:** enable 2-Step Verification for the Google account, create an App Password, and put that App Password in `SMTP_PASS`. Do not use or store the account's normal password.
- **Telegram:** create a bot with BotFather, open the bot and send it a message, then obtain your numeric chat ID using your bot's `getUpdates` endpoint. Enter the chat ID in Pitlane Settings. Keep the bot token in `TELEGRAM_BOT_TOKEN`; never put it in a client variable.
- Enable channels and choose the date lead, mileage lead, and overdue repeat frequency in Settings. Per-task overrides are available from each maintenance schedule. Reminders require an email address from the authenticated account, a configured delivery channel, and saved preferences.

## Vercel deployment

1. Push the project to a Git provider and import it into Vercel. The detected framework is Next.js; build command is `npm run build`.
2. Add all required Supabase values and any SMTP/Telegram values under Vercel Environment Variables. Production does not read your local `.env.local` file.
3. Configure the Supabase production Site URL and auth callback/reset redirect URLs to your deployed domain.
4. `vercel.json` schedules `/api/cron/maintenance-reminders` at `30 3 * * *` UTC, which is 9:00 AM India Standard Time (UTC+05:30). Vercel Hobby permits daily jobs and may invoke within the scheduled hour (±59 minutes); Pro/Enterprise support per-minute scheduling precision. This app runs once daily and does not promise exact-to-the-minute delivery on Hobby.
5. Configure a long random `CRON_SECRET` in Vercel. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`. The endpoint returns 401 for a missing/incorrect bearer token and 503 if the secret is not configured.
6. Deploy, then check **Vercel → Logs** for cron and delivery errors. Test a local run with:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/maintenance-reminders
   ```

Vercel Cron invokes production deployments, not a local `next dev` scheduler. The local `curl` command is a manual authenticated test.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Unit tests cover date interval rollover, maintenance status thresholds, and India-local date conversion. Before enabling production notifications, test sign-up/sign-in and reset redirects, RLS with two separate users, file access with a non-owner, service schedule updates, odometer correction rejection/authorization, notification deduplication, and both delivery providers with test credentials.

Supabase Auth also enforces its configured authentication rate limits. Review **Authentication → Rate Limits** and enable CAPTCHA if your public deployment needs stronger signup/reset abuse controls. No password is sent to this app's SMTP service; users authenticate through Supabase Auth.

## Behavior notes

- Odometer entry is manual or comes from a saved service/fuel record. There is no GPS, vehicle sensor, or automatic mileage integration.
- Date and distance intervals are configurable per task. The 200 km dashboard “approaching” status is a generic indicator; task notification lead distance is configurable separately. Check the motorcycle's own manufacturer guidance.
- Fuel efficiency uses successive full-tank entries only; incomplete fill-ups are excluded.
- Uploaded documents and bike photos are private. Database rows and storage paths are scoped to the authenticated owner by server checks and RLS.
- Notification delivery requires provider credentials. Failed sends are logged and retried with backoff (up to five attempts); retries stop when the schedule, document expiry, recipient, or channel preference changes.
- Analytics are derived from records entered into Pitlane and are not estimates of missing costs or trips.

## Troubleshooting

- **Supabase configuration message:** verify both public Supabase values in `.env.local`; restart `npm run dev` after changing environment files.
- **Database/table errors:** confirm the migration ran successfully in the same Supabase project configured by the environment URL.
- **Private upload/download error:** verify the migration created `private-bike-files` and its storage policies; only PDF, JPEG, PNG, and WebP are accepted, up to 20 MB (photos: 10 MB).
- **Email failure:** confirm Google 2-Step Verification, App Password, SMTP user, port 465/TLS, and sender address.
- **Telegram failure:** start a chat with the bot, confirm the chat ID in Settings, and ensure Vercel has the bot token.
- **No scheduled run:** confirm the latest deployment is production, `vercel.json` is included, and the Vercel plan supports daily Cron. Check Vercel Cron logs and `CRON_SECRET`.
- **Local notifications:** copy provider settings into local `.env.local` separately; Vercel environment variables do not sync to local development.