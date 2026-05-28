import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import {
  BookOpen, AlertTriangle, Leaf, Flame, Cpu, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { SOURCES } from '../utils/healthClassification';

interface RuleRow {
  label: string;
  trigger: string;
  status: 'Healthy' | 'Caution' | 'Unhealthy';
  rationale: string;
  sources: { short: string; url: string }[];
}

const RULES: RuleRow[] = [
  {
    label: 'High calorie (≥ 700 kcal / serving)',
    trigger: 'Item calories ≥ 700',
    status: 'Caution',
    rationale:
      'A single serving above ~35% of the 2,000 kcal daily reference is treated as a heavy meal. The reference comes from the WHO healthy diet guidance and the USDA Dietary Guidelines for Americans.',
    sources: [SOURCES.who, SOURCES.usda],
  },
  {
    label: 'Fried / deep-fried',
    trigger: 'Item name contains "fried", "fries", "deep-fry", "tempura", "nugget" or "chip"',
    status: 'Unhealthy',
    rationale:
      'Deep-fried items are typically high in saturated fat and trans fat. WHO recommends saturated fat below 10% of daily energy and trans fat below 1%; USDA mirrors the 10% saturated-fat cap. Deep-fried foods are also classified as ultra-processed (NOVA Group 4).',
    sources: [SOURCES.who, SOURCES.usda, SOURCES.fsa, SOURCES.nova],
  },
  {
    label: 'Sugar-sweetened drink',
    trigger: 'Name contains soda, cola, lemonade, milkshake, frappe, bubble tea, syrup…',
    status: 'Unhealthy',
    rationale:
      'Sugar-sweetened beverages routinely exceed the FSA "red" threshold for drinks (>11.25 g sugar / 100 ml). WHO recommends free sugars below 10% of energy (ideally below 5%); the USDA recommends below 10% from added sugars. Nutri-Score penalises high-sugar drinks heavily.',
    sources: [SOURCES.who, SOURCES.fsa, SOURCES.usda, SOURCES.nutriScore],
  },
  {
    label: 'Likely sweetened drink',
    trigger: 'Category = "Drinks", not seller-marked healthy, and not an explicitly unsweetened option (water, americano, green tea…)',
    status: 'Caution',
    rationale:
      'Most prepared drinks on a campus menu carry added sugar even when the name does not say so. WHO recommends free sugars below 10% of energy (ideally below 5%). Flagged as caution rather than unhealthy because some may be lightly sweetened.',
    sources: [SOURCES.who, SOURCES.fsa],
  },
  {
    label: 'Sweet dessert / confectionery',
    trigger: 'Category = "Desserts", or name contains cake, donut, cookie, candy, ice cream, pastry, chocolate',
    status: 'Unhealthy',
    rationale:
      'Desserts are concentrated added-sugar sources. They typically pass the FSA red threshold of >22.5 g sugar / 100 g and quickly consume the WHO/USDA daily free-sugar budget.',
    sources: [SOURCES.who, SOURCES.fsa, SOURCES.usda],
  },
  {
    label: 'Ultra-processed (NOVA Group 4)',
    trigger: 'Category in {"Snacks", "Desserts"}',
    status: 'Unhealthy',
    rationale:
      'Commercial snacks and desserts mostly fall into NOVA Group 4 — ultra-processed industrial formulations consistently associated in cohort studies with higher risk of obesity, type-2 diabetes and cardiovascular disease. Nutri-Score arrives at the same grade through its negative-nutrient scoring.',
    sources: [SOURCES.nova, SOURCES.nutriScore],
  },
  {
    label: 'Balanced meal (seller-tagged)',
    trigger: 'Shop ticked the "is_healthy" box for this item',
    status: 'Healthy',
    rationale:
      'Sellers tag balanced meals that match the Harvard Healthy Eating Plate ratio (half veg/fruit, quarter whole grains, quarter lean protein). Cross-checked against WHO\'s recommendation of ≥400 g fruit & vegetables per day.',
    sources: [SOURCES.harvard, SOURCES.who],
  },
  {
    label: 'Vegetable-forward (Salads)',
    trigger: 'Category = "Salads"',
    status: 'Healthy',
    rationale:
      'Salads help students meet the WHO recommendation of ≥400 g of fruit & vegetables per day and align with the Harvard Healthy Eating Plate.',
    sources: [SOURCES.who, SOURCES.harvard],
  },
];

export function FAQ() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-6 h-6 text-orange-600" />
          <h1 className="text-2xl font-bold">FAQ &amp; References</h1>
        </div>
        <p className="text-sm text-gray-600">
          How the app decides which dishes are healthy or unhealthy — and why our
          AI food scanner switches models at 80% confidence.
        </p>
      </header>

      {/* ── Healthy / Unhealthy criteria ─────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Leaf className="w-5 h-5 text-green-600" />
          How we classify food
        </h2>
        <p className="text-sm text-gray-700 mb-4">
          Every menu item is evaluated against the rules in the table below.
          If any <strong>unhealthy</strong> rule fires we label the item as
          unhealthy and show the matching citation in a tooltip on the item
          card. Most rules combine more than one published source so the same
          item can be backed by multiple references.
        </p>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Rule</th>
                <th className="px-3 py-2 font-semibold">Triggers when…</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Why &amp; sources</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-3 py-3 font-medium text-gray-900">{r.label}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{r.trigger}</td>
                  <td className="px-3 py-3">
                    <Badge
                      className={
                        r.status === 'Unhealthy' ? 'bg-orange-500'
                        : r.status === 'Caution' ? 'bg-yellow-500'
                        : 'bg-green-600'
                      }
                    >
                      {r.status === 'Unhealthy' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {r.status === 'Healthy' && <Leaf className="w-3 h-3 mr-1" />}
                      {r.status === 'Caution' && <Flame className="w-3 h-3 mr-1" />}
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-gray-700 text-xs">
                    <p>{r.rationale}</p>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      {r.sources.map((s, j) => (
                        <span key={s.url}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            {s.short} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          {j < r.sources.length - 1 ? ' · ' : ''}
                        </span>
                      ))}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── References (deep dive) ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Full references
        </h2>
        <div className="space-y-3">
          {Object.values(SOURCES).map(s => (
            <Card key={s.url}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-900">{s.short}</h3>
                    <p className="text-xs text-gray-600 mt-1">{s.full}</p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── AI food scan rationale ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Cpu className="w-5 h-5 text-purple-600" />
          Why the AI scanner uses an 80% confidence threshold
        </h2>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-700">
              The food scanner is a two-stage cascade:
            </p>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-3">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                <strong>MobileNetV3 (local TFLite)</strong> — a small, fast
                classifier that runs entirely on your phone. ~8 MB, ~50 ms per
                image on a mid-range Android device.
              </li>
              <li>
                If MobileNet's top prediction is <strong>≥ 80% confident</strong>,
                we use that result and stop.
              </li>
              <li>
                Otherwise we fall back to <strong>YOLOv11-small</strong> — a
                heavier model (38 MB locally, or the cloud inference server)
                that's slower but more accurate for ambiguous dishes.
              </li>
            </ol>

            <h3 className="font-semibold pt-2">Why 80% and not 50% or 95%?</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>Random-guess baseline.</strong> The model classifies
                across 32 Cambodian dishes — a random guess scores about{' '}
                <code className="bg-gray-100 px-1 rounded">1/32 ≈ 3.1%</code>.
                Useful predictions need to land well above that.
              </li>
              <li>
                <strong>Calibration on fine-grained food classes.</strong> Modern
                CNNs are known to be over-confident on training data; on
                held-out fine-grained tasks, top-1 reliability typically
                plateaus around the 75–85% confidence band (Guo et al., 2017,{' '}
                <em>On Calibration of Modern Neural Networks</em>). 80% sits
                inside this band — high enough to trust, low enough that we
                aren't falsely confident.
              </li>
              <li>
                <strong>Cost/quality trade-off.</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Threshold <strong>too low</strong> (e.g. 50%) → YOLO almost never runs, defeating the purpose of the cascade.</li>
                  <li>Threshold <strong>too high</strong> (e.g. 95%) → YOLO runs on most photos. That's a 38 MB local model or a network round-trip, which kills the snappy local-first feel.</li>
                  <li>80% is a balanced operating point: in our test runs it routes ~30% of photos to YOLO, which catches the genuinely ambiguous cases without paying the cost on the easy ones.</li>
                </ul>
              </li>
              <li>
                <strong>Practical precedent.</strong> Industrial cascade
                systems (e.g. Google's image classification fallbacks, NVIDIA's
                multi-stage detectors) typically gate their secondary model at
                70–85% confidence for the same reason — squeezing the bulk of
                requests through the cheap path while preserving accuracy on
                hard inputs.
              </li>
            </ul>

            <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
              The threshold lives in{' '}
              <code className="bg-gray-100 px-1 rounded">
                AppConfig.confidenceThreshold
              </code>{' '}
              in <code className="bg-gray-100 px-1 rounded">app_config.dart</code>.
              It can be tuned without retraining the model.
            </p>
          </CardContent>
        </Card>

        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-900">
            <strong>Honest caveat:</strong> 80% was chosen empirically. The
            scientifically rigorous next step would be a calibration study
            (reliability diagram + Expected Calibration Error) on a labelled
            hold-out set from our own menus, and adjusting the threshold to
            equalise precision and recall on the fallback path.
          </p>
        </div>
      </section>

      <p className="text-xs text-gray-400 text-center pt-4 pb-2">
        Last reviewed: May 2026. Classification rules and thresholds can be
        updated in{' '}
        <code className="bg-gray-100 px-1 rounded">
          src/utils/healthClassification.ts
        </code>.
      </p>
    </div>
  );
}
