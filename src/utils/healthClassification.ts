// Health classification for menu items.
//
// Each rule references a published nutrition source so the classification
// (and the FAQ page) can cite the evidence behind every "unhealthy" /
// "healthy" call. We deliberately combine *several* frameworks rather than
// committing to one, because the DB only stores calories + category +
// seller-flag — we don't have full per-item macros. The frameworks below
// each contribute one signal:
//
//   - WHO Healthy Diet (energy + sugar + fat ceilings)
//   - UK FSA Traffic Light (per-100g thresholds → category proxy)
//   - Nutri-Score (combined nutrient profile)
//   - NOVA classification (ultra-processed foods)
//   - USDA Dietary Guidelines for Americans 2020–2025
//   - Harvard Healthy Eating Plate (food-group balance)

export interface HealthSource {
  /** Short citation shown in the UI. */
  short: string;
  /** Full citation for the FAQ. */
  full: string;
  url: string;
}

export interface HealthRule {
  id: string;
  /** Human label shown on the item card. */
  label: string;
  /** One-sentence explanation of why this rule flags the item. */
  reason: string;
  /** Final status this rule produces. */
  status: 'unhealthy' | 'caution' | 'healthy';
  sources: HealthSource[];
}

export interface ClassifiableItem {
  name: string;
  category?: string | null;
  calories?: number | null;
  isHealthy?: boolean | null;
}

export interface ClassificationResult {
  status: 'unhealthy' | 'caution' | 'healthy' | 'neutral';
  reasons: HealthRule[];
}

// ─── Source catalogue (used by rules + FAQ page) ───────────────────────────
export const SOURCES = {
  who: {
    short: 'WHO Healthy Diet (2020)',
    full: 'World Health Organization — Healthy diet fact sheet. Limits: free sugars <10% of energy, saturated fat <10%, sodium <2 g/day, total fat <30%.',
    url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
  },
  fsa: {
    short: 'UK FSA Traffic Light Labelling',
    full: 'UK Food Standards Agency front-of-pack thresholds (per 100 g of food): fat >17.5 g, sat fat >5 g, sugar >22.5 g, or salt >1.5 g triggers a red label. Drinks: thresholds roughly halved.',
    url: 'https://nutrasafe.co.uk/uk-food-label-traffic-light-system-explained',
  },
  nutriScore: {
    short: 'Nutri-Score (EU, 2024 update)',
    full: 'European front-of-pack five-grade label (A–E) combining negative nutrients (energy, sat fat, sugars, salt) against positive ones (fibre, protein, fruit/veg/legumes). Algorithm updated January 2024 with stricter sugar and salt thresholds.',
    url: 'https://en.wikipedia.org/wiki/Nutri-Score',
  },
  nova: {
    short: 'NOVA Classification (Monteiro et al., 2016)',
    full: 'Classifies foods by extent and purpose of processing into 4 groups; Group 4 (ultra-processed: sodas, packaged snacks, deep-fried fast food, sweets) is consistently linked with increased risk of obesity, type-2 diabetes, and cardiovascular disease.',
    url: 'https://archive.wphna.org/wp-content/uploads/2016/01/WN-2016-7-1-3-28-38-Monteiro-Cannon-Levy-et-al-NOVA.pdf',
  },
  usda: {
    short: 'USDA Dietary Guidelines for Americans 2020–2025',
    full: 'US federal guidelines: <10% calories from added sugars, <10% from saturated fat, <2,300 mg sodium/day. Limit foods high in added fats, sugars, and sodium (e.g. fried items, sugar-sweetened drinks).',
    url: 'https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf',
  },
  harvard: {
    short: 'Harvard Healthy Eating Plate',
    full: 'Recommends a plate roughly half fruits & vegetables, a quarter whole grains, a quarter healthy protein, with healthy plant oils and water — operationalises the "balanced meal" concept.',
    url: 'https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/',
  },
} satisfies Record<string, HealthSource>;

// ─── Helpers ───────────────────────────────────────────────────────────────
const FRIED_KEYWORDS = ['fried', 'fries', 'deep-fry', 'deep fry', 'tempura', 'nugget', 'chip'];
const SUGARY_DRINK_KEYWORDS = ['soda', 'cola', 'pepsi', 'coke', 'sprite', 'fanta', 'lemonade', 'milkshake', 'frappe', 'bubble tea', 'boba', 'syrup'];
const SWEET_KEYWORDS = ['cake', 'donut', 'doughnut', 'cookie', 'candy', 'ice cream', 'icecream', 'pastry', 'chocolate'];
const ULTRA_PROCESSED_CATEGORIES = ['Snacks', 'Desserts'];

function nameContains(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// ─── Rule definitions ──────────────────────────────────────────────────────
// Each rule is a pure function: (item) → HealthRule | null.
type RuleFn = (item: ClassifiableItem) => HealthRule | null;

const ruleHighCalorie: RuleFn = (item) => {
  const kcal = item.calories ?? 0;
  if (kcal < 700) return null;
  return {
    id: 'high-calorie',
    label: 'High calorie',
    reason: `This meal has ${kcal} kcal — more than 35% of a 2,000 kcal daily reference for a single serving.`,
    status: 'caution',
    sources: [SOURCES.who, SOURCES.usda],
  };
};

const ruleFried: RuleFn = (item) => {
  if (!nameContains(item.name, FRIED_KEYWORDS)) return null;
  return {
    id: 'fried',
    label: 'Fried / deep-fried',
    reason: 'Deep-fried items are typically high in saturated fat and trans fats, which WHO and USDA both recommend keeping below 10% and 1% of daily energy intake respectively.',
    status: 'unhealthy',
    sources: [SOURCES.who, SOURCES.usda, SOURCES.fsa],
  };
};

const ruleSugaryDrink: RuleFn = (item) => {
  const isDrink = (item.category ?? '').toLowerCase() === 'drinks';
  const sugaryName = nameContains(item.name, SUGARY_DRINK_KEYWORDS);
  if (!isDrink && !sugaryName) return null;
  if (!sugaryName) return null;
  return {
    id: 'sugary-drink',
    label: 'Sugar-sweetened drink',
    reason: 'Sugar-sweetened beverages typically exceed the FSA red threshold for drinks (>11.25 g sugar / 100 ml) and contribute to free-sugar intake which WHO recommends keeping below 10% of total energy (ideally below 5%).',
    status: 'unhealthy',
    sources: [SOURCES.who, SOURCES.fsa, SOURCES.usda],
  };
};

const ruleSweetDessert: RuleFn = (item) => {
  const isDessert = (item.category ?? '').toLowerCase() === 'desserts';
  const sweetName = nameContains(item.name, SWEET_KEYWORDS);
  if (!isDessert && !sweetName) return null;
  return {
    id: 'sweet-dessert',
    label: 'High in added sugar',
    reason: 'Desserts and confectionery are concentrated sources of added sugar — typically far above the FSA red threshold (>22.5 g sugar / 100 g) and quickly use up the WHO free-sugar allowance.',
    status: 'unhealthy',
    sources: [SOURCES.who, SOURCES.fsa, SOURCES.usda],
  };
};

const ruleUltraProcessedCategory: RuleFn = (item) => {
  const cat = item.category ?? '';
  if (!ULTRA_PROCESSED_CATEGORIES.includes(cat)) return null;
  return {
    id: 'ultra-processed',
    label: 'Ultra-processed (NOVA Group 4)',
    reason: 'Snacks and desserts in their commercial form usually fall into NOVA Group 4 — industrially formulated foods linked in cohort studies with increased risk of obesity, type-2 diabetes and cardiovascular disease.',
    status: 'unhealthy',
    sources: [SOURCES.nova, SOURCES.nutriScore],
  };
};

const ruleSellerHealthy: RuleFn = (item) => {
  if (!item.isHealthy) return null;
  return {
    id: 'seller-healthy',
    label: 'Balanced meal',
    reason: 'Marked as a balanced meal by the shop: rich in vegetables, whole grains and lean protein in line with the Harvard Healthy Eating Plate.',
    status: 'healthy',
    sources: [SOURCES.harvard, SOURCES.who],
  };
};

const ruleBalancedSalad: RuleFn = (item) => {
  const isSalad = (item.category ?? '').toLowerCase() === 'salads';
  if (!isSalad) return null;
  return {
    id: 'salad',
    label: 'Vegetable-forward',
    reason: 'Vegetable-forward dishes help meet the WHO recommendation of ≥400 g fruit & vegetables per day.',
    status: 'healthy',
    sources: [SOURCES.who, SOURCES.harvard],
  };
};

const ALL_RULES: RuleFn[] = [
  ruleHighCalorie,
  ruleFried,
  ruleSugaryDrink,
  ruleSweetDessert,
  ruleUltraProcessedCategory,
  ruleSellerHealthy,
  ruleBalancedSalad,
];

// ─── Public API ────────────────────────────────────────────────────────────
export function classifyItem(item: ClassifiableItem): ClassificationResult {
  const fired = ALL_RULES.map(r => r(item)).filter((r): r is HealthRule => r !== null);
  if (fired.length === 0) return { status: 'neutral', reasons: [] };

  const unhealthy = fired.filter(r => r.status === 'unhealthy');
  if (unhealthy.length > 0) return { status: 'unhealthy', reasons: unhealthy };

  const caution = fired.filter(r => r.status === 'caution');
  // Caution + healthy → final is caution but show both reasons so the user
  // sees the upside as well as the warning.
  if (caution.length > 0) {
    const healthy = fired.filter(r => r.status === 'healthy');
    return { status: 'caution', reasons: [...caution, ...healthy] };
  }

  const healthy = fired.filter(r => r.status === 'healthy');
  if (healthy.length > 0) return { status: 'healthy', reasons: healthy };

  return { status: 'neutral', reasons: [] };
}

// Convenience for callers that just want the badge string + colour token.
export function badgeFor(status: ClassificationResult['status']): {
  label: string;
  tone: 'red' | 'orange' | 'green' | 'gray';
} | null {
  switch (status) {
    case 'unhealthy': return { label: 'Unhealthy', tone: 'orange' };
    case 'caution':   return { label: 'Heavy meal', tone: 'orange' };
    case 'healthy':   return { label: 'Healthy',    tone: 'green' };
    case 'neutral':   return null;
  }
}
