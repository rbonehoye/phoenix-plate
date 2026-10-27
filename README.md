# Phoenix Plate

A calorie tracker for Elon University's dining halls (Lakeside, McEwen, Clohan).
It's a web app (PWA): open it in Safari or Chrome and add it to your home screen.
No App Store, no Apple Developer account.

- **Today:** calorie ring, protein/carbs/fat progress and meals (breakfast,
  lunch, dinner, snacks). A week strip lets you view and edit past days.
- **Menu:** today's menu for each hall by meal period, with calories and macros
  on every item, one-tap add, search and dietary filters.
- **Retail:** Qdoba, Einstein Bros, Biscuitville and Freshii use their official
  nutrition guides. Flat Out crusts use Flatout's package labels; its toppings
  are estimates. Global Rolls, Village Juice and Acorn use the calories on
  Elon's menus with estimated macros. Billy D's and Boar's Head are estimates.
  Every non-official item is labeled. Data lives in `src/retail.js`; update it
  when menus change.
- **Barcode scanning:** live camera scan, or read a barcode from a photo, or
  type the number. Food data comes from Open Food Facts (free, crowd-sourced).
- **Goals:** cut, maintain or bulk. Weight, goal weight, height, age, sex and
  activity give a daily calorie target (Mifflin-St Jeor) and a recommended
  macro split you can change.
- **Progress:** weigh-ins chart with a projection to your goal weight, a
  milestone timeline, weekly calories, streak and averages.
- **Themes:** grey with Elon maroon and gold; follows the phone's light/dark
  mode, or pick one in Settings.
- **Private:** your log, weigh-ins and goals are stored only on your phone
  (localStorage).

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
