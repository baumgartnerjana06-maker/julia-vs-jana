# Julia vs Jana — Strong Girl Battle

A mobile-first workout battleboard for two people.

## What it does
- Logs exercise + weight + sets + reps.
- Defaults to 3 sets × 8 reps.
- Only entries with at least 3 sets and at least 8 reps count toward the Battleboard.
- Shows each person's best qualifying weight for every exercise.
- Keeps a recent workout history.
- The Battleboard starts completely empty.
- The first time either person logs an exercise, that exercise is automatically added to the Battleboard.
- Future logs for an existing exercise automatically update its best qualifying weight.
- Includes custom exercise support.
- Works locally even before cloud sync is configured.
- Syncs between phones through Supabase once connected.
- Designed with two cute sporty stick figures: Julia in dark green/black with bun + boxy tee + oversized shorts; Jana in red with ponytail + fitted biker shorts + oversized tee.

## Turn on syncing
1. Create a free Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase_setup.sql`.
4. In Supabase, copy the Project URL and the anon/public API key.
5. Open the app and tap ⚙︎.
6. Enter those two values.
7. Do the same on the other phone.

The app deliberately uses only the anon/public key. Never put a Supabase service-role key into the website.

## Hosting
The files are static and can be hosted on GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.


Version 13: Supabase URL and publishable browser key are built into app.js. No per-device setup is required. Cloud data is loaded on startup, and failed inserts are no longer kept as misleading local-only entries.
