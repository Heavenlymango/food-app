import { MenuItem } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Plus, Clock, Flame, Leaf, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [added, setAdded] = useState(false);
  const hasDiscount = item.discountPercent > 0;

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
              <Badge variant="outline" className="text-xs mt-1 px-1.5 py-0">{item.shop}</Badge>
            </div>
            {item.isHealthy && <Leaf className="w-4 h-4 text-green-500 flex-shrink-0" />}
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
              <span className="text-orange-600 font-bold">${item.discountedPrice.toFixed(2)}</span>
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
