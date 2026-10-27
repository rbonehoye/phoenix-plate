// Fetches today's menu for Elon's three dining halls and writes public/menus.json.
//
// Only the plain location pages are requested (once per hall, once a day).
// elondining.com's robots.txt disallows the dated `?date=` URLs, so this
// script never requests past or future menus.

import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://www.elondining.com/locations/';
const USER_AGENT = 'PhoenixPlate/0.1 (student calorie tracker; one request per hall per day)';
const OUT = new URL('../public/menus.json', import.meta.url);

const HALLS = [
  { id: 'lakeside', name: 'Lakeside', slug: 'lakeside-dining-hall' },
  { id: 'mcewen', name: 'McEwen', slug: 'mcewen-dining-hall' },
  { id: 'clohan', name: 'Clohan', slug: 'clohan-hall' },
];

// Nutrition fact labels on the site -> short keys in menus.json
const FACTS = {
  'Calories': 'calories',
  'Protein': 'protein',
  'Total Carbohydrate': 'carbs',
  'Total Fat': 'fat',
  'Dietary Fiber': 'fiber',
  'Total Sugars': 'sugar',
  'Sodium': 'sodium',
};

// "Breakfast (7:30am-10:30am)" -> { name: 'Breakfast', start: 450, end: 630 }
export function parsePeriodLabel(label) {
  const m = label.match(/^(.*?)\s*\((.+?)\s*-\s*(.+?)\)\s*$/);
  if (!m) return { name: label.trim(), start: null, end: null };
  return { name: m[1].trim(), start: toMinutes(m[2]), end: toMinutes(m[3]) };
}

function toMinutes(t) {
  const m = t.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3] === 'pm') h += 12;
  return h * 60 + Number(m[2] ?? 0);
}

function parseItem(raw, id) {
  const data = JSON.parse(raw);
  const item = {
    id,
    name: data.name?.trim() ?? 'Unknown item',
    serving: data.serving_size?.trim() || null,
    allergens: (data.allergens_list ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    tags: (data.attributes ?? []).map((a) => a.name).filter(Boolean),
  };
  for (const key of Object.values(FACTS)) item[key] = null;
  for (const fact of data.facts ?? []) {
    const key = FACTS[fact.label];
    if (key && typeof fact.value === 'number') item[key] = fact.value;
  }
  return item;
}

export function parseMenu(html) {
  const $ = cheerio.load(html);
  const labels = $('#menu-tabs .c-tabs-nav__link-inner').map((_, el) => $(el).text().trim()).get();

  return $('#menu-tabs .c-tab').map((i, tab) => {
    const stations = $(tab).find('.menu-station').map((_, st) => {
      const items = $(st).find('li.menu-item-li').map((_, li) => {
        const id = $(li).find('a.show-nutrition').attr('data-recipe');
        const raw = $(li).find('[id^="recipe-nutrition-"]').text().trim();
        if (!id || !raw) return null;
        try {
          return parseItem(raw, id);
        } catch {
          return null; // one malformed item shouldn't drop the whole menu
        }
      }).get();
      return { name: $(st).find('h4').first().text().trim(), items };
    }).get().filter((s) => s.items.length > 0);

    return { label: labels[i] ?? `Menu ${i + 1}`, ...parsePeriodLabel(labels[i] ?? ''), stations };
  }).get();
}

async function fetchHall(hall) {
  const url = `${BASE}${hall.slug}/`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const periods = parseMenu(await res.text());
    return { ...hall, url, periods };
  } catch (err) {
    console.error(`${hall.name}: ${err.message}`);
    return { ...hall, url, periods: [], error: err.message };
  }
}

async function main() {
  const halls = [];
  for (const hall of HALLS) halls.push(await fetchHall(hall)); // sequential: be gentle

  const counts = halls.map((h) => h.periods.reduce((n, p) => n + p.stations.reduce((m, s) => m + s.items.length, 0), 0));
  halls.forEach((h, i) => console.log(`${h.name}: ${h.periods.length} meal periods, ${counts[i]} items`));

  // Nothing at all usually means the site layout changed. Fail so the
  // workflow stops and the last good deployment stays live.
  if (counts.every((c) => c === 0)) {
    console.error('No menu items found for any hall; not writing menus.json.');
    process.exit(1);
  }

  const menus = {
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
    fetchedAt: new Date().toISOString(),
    halls,
  };
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(menus));
  console.log(`Wrote ${OUT.pathname}`);
}

main();
