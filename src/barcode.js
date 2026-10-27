// Barcode reading (ZXing, loaded on demand so it isn't in the main bundle)
// and food lookup from Open Food Facts, a free public food database.

const FOODS_KEY = 'pp.foods'; // barcode -> parsed food, so repeat scans work offline

let readerPromise;
function getReader() {
  readerPromise ??= Promise.all([import('@zxing/browser'), import('@zxing/library')]).then(([browser, lib]) => {
    const { BarcodeFormat: F, DecodeHintType: H } = lib;
    const hints = new Map([
      [H.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128]],
      [H.TRY_HARDER, true],
    ]);
    return new browser.BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
  });
  return readerPromise;
}

export const cameraSupported = () => !!navigator.mediaDevices?.getUserMedia;

// Start the rear camera in `video` and call onCode once with the first barcode.
// Returns a stop() function.
export async function startCamera(video, onCode) {
  const reader = await getReader();
  let done = false;
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    video,
    (result, _err, ctrl) => {
      if (result && !done) {
        done = true;
        ctrl.stop();
        onCode(result.getText());
      }
    },
  );
  return () => controls.stop();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file isn’t an image this browser can open.'));
    };
    img.src = url;
  });
}

// Read a barcode from a photo. Phone photos are large, so try a few sizes
// (smaller is faster and often reads better), then the photo rotated 90°.
export async function decodeImageFile(file) {
  const reader = await getReader();
  const { img, url } = await loadImage(file);
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const sizes = [1600, 1000, 2400].filter((s, i) => i === 0 || s < longest * 1.2);
    for (const rotate of [false, true]) {
      for (const size of sizes) {
        const scale = Math.min(1, size / longest);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        canvas.width = rotate ? h : w;
        canvas.height = rotate ? w : h;
        ctx.save();
        if (rotate) {
          ctx.translate(h, 0);
          ctx.rotate(Math.PI / 2);
        }
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
        try {
          return reader.decodeFromCanvas(canvas).getText();
        } catch {
          // not found at this size; try the next
        }
      }
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(FOODS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeCache(code, food) {
  try {
    const cache = readCache();
    cache[code] = { ...food, savedAt: Date.now() };
    // Keep the 100 most recent
    const keep = Object.entries(cache).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 100);
    localStorage.setItem(FOODS_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    // ignore
  }
}

export function recentFoods(limit = 5) {
  return Object.values(readCache())
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, limit);
}

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

// Open Food Facts nutriments -> per-serving and per-100g values in this app's units
export function parseProduct(code, p) {
  const n = p.nutriments ?? {};
  const kcal100 = num(n['energy-kcal_100g']) ?? (num(n.energy_100g) != null ? n.energy_100g / 4.184 : null);
  const per100 = {
    calories: kcal100,
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    fiber: num(n.fiber_100g),
    sugar: num(n.sugars_100g),
    sodium: num(n.sodium_100g) != null ? n.sodium_100g * 1000 : null, // g -> mg
  };

  const qty = num(p.serving_quantity); // grams (or ml) in one serving
  let perServing = null;
  if (num(n['energy-kcal_serving']) != null) {
    perServing = {
      calories: num(n['energy-kcal_serving']),
      protein: num(n.proteins_serving),
      carbs: num(n.carbohydrates_serving),
      fat: num(n.fat_serving),
      fiber: num(n.fiber_serving),
      sugar: num(n.sugars_serving),
      sodium: num(n.sodium_serving) != null ? n.sodium_serving * 1000 : null,
    };
  } else if (qty && kcal100 != null) {
    perServing = Object.fromEntries(Object.entries(per100).map(([k, v]) => [k, v == null ? null : (v * qty) / 100]));
  }

  const brand = (p.brands ?? '').split(',')[0].trim();
  return {
    code,
    name: (p.product_name_en || p.product_name || p.generic_name || '').trim() || `Barcode ${code}`,
    brand: brand || null,
    image: p.image_front_small_url || p.image_small_url || null,
    servingLabel: p.serving_size || (qty ? `${qty} g` : null),
    perServing,
    per100: kcal100 != null ? per100 : null,
  };
}

// Returns a parsed food, or null if the database doesn't have it.
export async function lookupBarcode(code) {
  const cached = readCache()[code];
  if (cached) return cached;

  const fields = 'product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url,image_small_url';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Food lookup failed (HTTP ${res.status}).`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const food = parseProduct(code, data.product);
  if (!food.perServing && !food.per100) return { ...food, noNutrition: true };
  writeCache(code, food);
  return food;
}

// EAN-8, UPC-E, UPC-A, EAN-13 or GTIN-14
export const isBarcode = (s) => /^\d{8}$|^\d{12,14}$/.test(s);
