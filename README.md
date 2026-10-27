# Phoenix Plate

A calorie tracker for Elon University's dining halls (Lakeside, McEwen, Clohan).
It's a web app (PWA): open it in Safari or Chrome and add it to your home screen.
No App Store, no Apple Developer account.

- **Menu:** today's menu for each hall by meal period, with calories, protein,
  carbs, fat, allergens and dietary tags. Search and filter (vegetarian, vegan,
  made without gluten).
- **Log:** tap an item, pick servings, add it. Daily totals against your goals.
- **Quick add:** for food from anywhere else.
- **Private:** your log is stored only on your phone (localStorage).

## How the menu data works

`scripts/fetch-menus.mjs` downloads each hall's page from elondining.com
**once a day** and writes `public/menus.json`. The app only ever reads that file,
so users never hit Elon's site.

The script requests only the plain location pages (today's menu).
elondining.com's `robots.txt` disallows the dated `?date=` URLs, so the script
doesn't request past or future menus. If you want more than today's menu, ask
Elon Dining for permission or a data feed first.

The `public/menus.json` committed here is a real snapshot from Oct 26, 2026, so
the app works locally without running the fetcher.

## Run it locally

Needs [Node.js](https://nodejs.org) 20 or later.

```bash
npm install
npm run dev
```

`npm run dev` prints a local URL and a network URL. Open the network URL on your
phone (same Wi-Fi) to try it on the real device.

To refresh the menu data yourself: `npm run fetch-menus`.

## Deploy (free, updates every morning)

1. Create a GitHub repo and push this folder to its `main` branch.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` runs on every push and every
   morning at about 6am Eastern. It fetches the menus, builds the app and
   publishes it to `https://<you>.github.io/<repo>/`.
4. You can also run it by hand: **Actions → Fetch menus and deploy → Run workflow**.

If the fetch fails (site down or page layout changed), the run fails and the
previous day's site stays live. GitHub emails you about failed runs.

## Project layout

```
scripts/fetch-menus.mjs   daily scraper -> public/menus.json
public/                   manifest, service worker, icons, menus.json
src/App.jsx               state: log, settings, tabs
src/components/           Menu, Today, Settings, item sheet, header summary
src/storage.js            localStorage helpers
```

## Ideas for later

- Accounts and sync across devices (Supabase or Firebase)
- Favorites and "eat this again"
- Retail spots (Qdoba, Biscuitville and others publish their own nutrition)
- Weekly charts
