import { MenuItem } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { Plus, Clock, Flame, Leaf } from 'lucide-react';
import { useState } from 'react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    onAddToCart(item);
    setTimeout(() => setIsAdding(false), 300);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <ImageWithFallback
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          {item.isSpecial && (
            <Badge className="absolute top-1 left-1 text-xs px-1.5 py-0 bg-orange-500">
              -30%
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm line-clamp-1">{item.name}</h3>
              <p className="text-xs text-gray-600 line-clamp-1">{item.description}</p>
              <Badge variant="outline" className="text-xs mt-1 px-1.5 py-0">
                {item.shop}
              </Badge>
            </div>
            {item.isHealthy && (
              <Leaf className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>{item.calories}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{item.preparationTime}m</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-baseline gap-1.5">
              {item.isSpecial && (
                <span className="text-gray-400 line-through text-xs">
                  ${(item.price / 0.7).toFixed(2)}
                </span>
              )}
              <span className="text-orange-600">${item.price.toFixed(2)}</span>
            </div>
            <Button
              onClick={handleAddToCart}
              size="sm"
              className="h-8 px-3"
              disabled={isAdding}
            >
              {isAdding ? (
                <Plus className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Add
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}