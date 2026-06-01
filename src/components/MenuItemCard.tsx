import { MenuItem } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Plus, Clock, Flame, Leaf, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { classifyItem, badgeFor } from '../utils/healthClassification';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [added, setAdded] = useState(false);
  const displayPrice = item.discountedPrice ?? item.price;
  const hasDiscount = (item.discountPercent ?? 0) > 0;

  const classification = classifyItem({
    name: item.name,
    category: item.category,
    calories: item.calories,
    isHealthy: item.isHealthy,
  });
  const badge = badgeFor(classification.status);
  const isWarning = classification.status === 'unhealthy' || classification.status === 'caution';

  const handleAdd = () => {
    onAddToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-3 p-3">
        {/* Image + discount badge */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
          {hasDiscount && (
            <div className="absolute top-0 left-0 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-md">
              -{item.discountPercent.toFixed(0)}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold line-clamp-1">{item.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
              <div className="flex gap-1 mt-1 flex-wrap items-center">
                <Badge variant="outline" className="text-xs px-1.5 py-0">{item.shop}</Badge>
                {/* Chip is hidden when (a) the seller explicitly hides it, or
                    (b) a green leaf is currently visible (no double-badging).
                    "Visible leaf" = isHealthy AND not suppressed. */}
                {badge && isWarning && !item.hideUnhealthyBadge && !(item.isHealthy && !item.hideHealthyBadge) && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center text-orange-600 hover:text-orange-700 transition-colors"
                        aria-label={`Why this item is ${badge.label.toLowerCase()}. Tap for details.`}
                        title={badge.label}
                      >
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-xs" side="top">
                      <p className="font-semibold text-sm mb-2 text-gray-900">
                        Why this is flagged
                      </p>
                      <ul className="space-y-2">
                        {classification.reasons.map(r => (
                          <li key={r.id} className="border-l-2 border-orange-400 pl-2">
                            <p className="font-medium text-gray-800">{r.label}</p>
                            <p className="text-gray-600 mt-0.5">{r.reason}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Sources: {r.sources.map((s, i) => (
                                <span key={s.url}>
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-600 hover:underline"
                                  >{s.short}</a>
                                  {i < r.sources.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-gray-400 mt-3 border-t pt-2">
                        See the FAQ for the full rule set and references.
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            {item.isHealthy && !item.hideHealthyBadge && <Leaf className="w-4 h-4 text-green-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />{item.calories}</span>
            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{item.preparationTime}m</span>
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-baseline gap-1.5">
              {hasDiscount && (
                <span className="text-gray-400 line-through text-xs">${item.price.toFixed(2)}</span>
              )}
              <span className="text-orange-600 font-bold">${displayPrice.toFixed(2)}</span>
            </div>
            <Button onClick={handleAdd} size="sm"
              className={`h-8 px-3 transition-colors ${added ? 'bg-green-600 hover:bg-green-600' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {added ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {added ? 'Added' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
