import { describe, it, expect } from 'vitest';
import {
  classifyItem,
  badgeFor,
  SOURCES,
  ClassifiableItem,
} from './healthClassification';

// Helper to build a menu item with sensible defaults so each test
// only specifies the fields it cares about.
const item = (overrides: Partial<ClassifiableItem> = {}): ClassifiableItem => ({
  name: 'Plain Rice',
  category: 'Main Course',
  calories: 300,
  isHealthy: false,
  ...overrides,
});

describe('classifyItem — unhealthy rules', () => {
  it('flags deep-fried items as unhealthy and cites WHO + USDA', () => {
    const r = classifyItem(item({ name: 'French Fries', category: 'Snacks', calories: 380 }));
    expect(r.status).toBe('unhealthy');
    const reason = r.reasons.find(x => x.id === 'fried');
    expect(reason).toBeDefined();
    expect(reason!.sources).toContain(SOURCES.who);
    expect(reason!.sources).toContain(SOURCES.usda);
  });

  it('flags sugar-sweetened drinks via WHO + FSA + USDA', () => {
    const r = classifyItem(item({ name: 'Cola', category: 'Drinks', calories: 140 }));
    expect(r.status).toBe('unhealthy');
    const reason = r.reasons.find(x => x.id === 'sugary-drink');
    expect(reason).toBeDefined();
    expect(reason!.sources.map(s => s.short)).toEqual(
      expect.arrayContaining([
        SOURCES.who.short, SOURCES.fsa.short, SOURCES.usda.short,
      ]),
    );
  });

  it('flags desserts as unhealthy with NOVA + Nutri-Score citations', () => {
    const r = classifyItem(item({ name: 'Chocolate Cake', category: 'Desserts', calories: 420 }));
    expect(r.status).toBe('unhealthy');
    expect(r.reasons.map(x => x.id)).toEqual(
      expect.arrayContaining(['sweet-dessert', 'ultra-processed']),
    );
    const novaReason = r.reasons.find(x => x.id === 'ultra-processed')!;
    expect(novaReason.sources).toContain(SOURCES.nova);
    expect(novaReason.sources).toContain(SOURCES.nutriScore);
  });

  it('treats the "Snacks" category as ultra-processed (NOVA Group 4)', () => {
    const r = classifyItem(item({ name: 'Potato Chips', category: 'Snacks', calories: 250 }));
    expect(r.status).toBe('unhealthy');
    expect(r.reasons.some(x => x.id === 'ultra-processed')).toBe(true);
  });

  it('detects fried indicators in the name regardless of category', () => {
    const r = classifyItem(item({ name: 'Tempura Shrimp', category: 'Main Course' }));
    expect(r.status).toBe('unhealthy');
    expect(r.reasons.some(x => x.id === 'fried')).toBe(true);
  });

  it('catches milk tea as a sugary drink (unhealthy)', () => {
    const r = classifyItem(item({ name: 'Iced Milk Tea', category: 'Drinks', calories: 180 }));
    expect(r.status).toBe('unhealthy');
    expect(r.reasons.some(x => x.id === 'sugary-drink')).toBe(true);
  });
});

describe('classifyItem — drinks coverage', () => {
  it('cautions a generic non-healthy drink not caught by keywords', () => {
    const r = classifyItem(item({ name: 'House Special Cooler', category: 'Drinks', calories: 120 }));
    expect(r.status).toBe('caution');
    expect(r.reasons.some(x => x.id === 'sweetened-drink')).toBe(true);
  });

  it('does NOT flag an explicitly unsweetened drink', () => {
    const r = classifyItem(item({ name: 'Sparkling Water', category: 'Drinks', calories: 0 }));
    expect(r.status).toBe('neutral');
  });

  it('does NOT double-flag: keyword drink stays unhealthy, not caution', () => {
    const r = classifyItem(item({ name: 'Bubble Tea', category: 'Drinks', calories: 250 }));
    expect(r.status).toBe('unhealthy');
    expect(r.reasons.some(x => x.id === 'sweetened-drink')).toBe(false);
  });
});

describe('classifyItem — healthy rules', () => {
  it('marks salads as healthy with WHO + Harvard citations', () => {
    const r = classifyItem(item({ name: 'Buddha Bowl', category: 'Salads', calories: 480 }));
    expect(r.status).toBe('healthy');
    const reason = r.reasons.find(x => x.id === 'salad');
    expect(reason).toBeDefined();
    expect(reason!.sources).toContain(SOURCES.who);
    expect(reason!.sources).toContain(SOURCES.harvard);
  });

  it('honours the seller-set isHealthy flag', () => {
    const r = classifyItem(item({ name: 'Grilled Chicken Bowl', isHealthy: true, calories: 540 }));
    expect(r.status).toBe('healthy');
    expect(r.reasons.some(x => x.id === 'seller-healthy')).toBe(true);
  });
});

describe('classifyItem — caution rule (high calorie)', () => {
  it('caution-flags a heavy meal that is otherwise neutral', () => {
    const r = classifyItem(item({ name: 'Beef Lok Lak', calories: 850, category: 'Main Course' }));
    expect(r.status).toBe('caution');
    expect(r.reasons.some(x => x.id === 'high-calorie')).toBe(true);
  });

  it('does not raise caution under 700 kcal', () => {
    const r = classifyItem(item({ name: 'Rice porridge', calories: 280, category: 'Main Course' }));
    expect(r.reasons.some(x => x.id === 'high-calorie')).toBe(false);
  });
});

describe('classifyItem — precedence', () => {
  it('unhealthy outranks caution: fried high-calorie dish is still unhealthy', () => {
    const r = classifyItem(item({ name: 'Deep Fried Chicken', calories: 920 }));
    expect(r.status).toBe('unhealthy');
    expect(r.reasons.every(x => x.status === 'unhealthy')).toBe(true);
  });

  it('caution still surfaces the upside reasons for a healthy heavy meal', () => {
    const r = classifyItem(item({
      name: 'Hearty Buddha Bowl',
      category: 'Salads',
      calories: 780,
      isHealthy: true,
    }));
    expect(r.status).toBe('caution');
    // Both the high-calorie reason and the healthy reasons should be returned
    expect(r.reasons.some(x => x.id === 'high-calorie')).toBe(true);
    expect(r.reasons.some(x => x.status === 'healthy')).toBe(true);
  });

  it('returns neutral when nothing triggers', () => {
    const r = classifyItem(item({
      name: 'Plain Rice',
      category: 'Main Course',
      calories: 300,
      isHealthy: false,
    }));
    expect(r.status).toBe('neutral');
    expect(r.reasons).toHaveLength(0);
  });
});

describe('badgeFor', () => {
  it('returns an orange badge for unhealthy', () => {
    expect(badgeFor('unhealthy')).toEqual({ label: 'Unhealthy', tone: 'orange' });
  });

  it('returns "Heavy meal" for caution', () => {
    expect(badgeFor('caution')).toEqual({ label: 'Heavy meal', tone: 'orange' });
  });

  it('returns a green Healthy badge', () => {
    expect(badgeFor('healthy')).toEqual({ label: 'Healthy', tone: 'green' });
  });

  it('returns null for neutral so no badge is rendered', () => {
    expect(badgeFor('neutral')).toBeNull();
  });
});

describe('sources', () => {
  it('every source has a non-empty URL and short citation', () => {
    for (const key of Object.keys(SOURCES) as Array<keyof typeof SOURCES>) {
      const s = SOURCES[key];
      expect(s.short.length).toBeGreaterThan(0);
      expect(s.full.length).toBeGreaterThan(0);
      expect(s.url).toMatch(/^https?:\/\//);
    }
  });
});
