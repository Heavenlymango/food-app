import { CartItem } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Minus, Plus, Trash2, ShoppingBag, Store, Clock, Flame, Leaf } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { SHOPS } from '../data/menuData';
import { useState } from 'react';

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onPlaceOrder: (orderType: 'pickup' | 'dine-in') => Promise<void>;
}

export function Cart({ cart, onUpdateQuantity, onPlaceOrder }: CartProps) {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalSavings = cart
    .filter(item => item.isSpecial)
    .reduce((sum, item) => sum + ((item.price / 0.7) - item.price) * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  // Group items by shop
  const itemsByShop = cart.reduce((acc, item) => {
    if (!acc[item.shop]) {
      acc[item.shop] = [];
    }
    acc[item.shop].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Calculate estimated prep time
  const calculateEstimatedTime = () => {
    const BASE_PROCESSING_TIME = 3;
    const maxPrepTime = Math.max(...cart.map(item => item.preparationTime));
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    let quantityBuffer = 0;
    if (totalQuantity > 6) {
      quantityBuffer = 4;
    } else if (totalQuantity > 3) {
      quantityBuffer = 2;
    }
    
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isBreakfastRush = (hour === 8 && minute >= 30) || (hour === 9 && minute < 15);
    const isLunchRush = hour >= 11 && hour < 14;
    const isDinnerRush = hour >= 17 && hour < 19;
    const isPeakHour = isBreakfastRush || isLunchRush || isDinnerRush;
    const peakHourBuffer = isPeakHour ? 5 : 0;
    
    const categories = new Set(cart.map(item => item.category));
    const categoryBuffer = categories.size > 2 ? 3 : 0;
    
    return {
      total: BASE_PROCESSING_TIME + maxPrepTime + quantityBuffer + peakHourBuffer + categoryBuffer,
      base: BASE_PROCESSING_TIME,
      prep: maxPrepTime,
      quantity: quantityBuffer,
      peak: peakHourBuffer,
      category: categoryBuffer,
    };
  };

  const estimatedTime = calculateEstimatedTime();

  const handlePlaceOrder = async (orderType: 'pickup' | 'dine-in') => {
    if (isPlacingOrder) return; // Prevent double clicks
    
    setIsPlacingOrder(true);
    try {
      await onPlaceOrder(orderType);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mt-1">Add items from the menu!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Multi-shop Warning */}
      {Object.keys(itemsByShop).length > 1 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <p className="text-xs text-amber-800">
              ⚠️ <strong>Note:</strong> You have items from {Object.keys(itemsByShop).length} different shops. 
              Currently, you can only order from one shop at a time. Please remove items from other shops before placing your order.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cart Items Grouped by Shop */}
      <div className="space-y-4">
        {Object.entries(itemsByShop).map(([shopId, items]) => {
          const shop = SHOPS.find(s => s.id === shopId);
          if (!shop) return null;

          return (
            <div key={shopId} className="space-y-3">
              {/* Shop Header */}
              <div className="flex items-center gap-2 px-1">
                <div className="bg-orange-500 p-1.5 rounded-lg flex-shrink-0">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm">{shop.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {shop.campus === 'RUPP' ? '🎓 RUPP' : '📚 IFL'}
                </Badge>
              </div>

              {/* Shop Items */}
              {items.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm line-clamp-1">{item.name}</h3>
                            <div className="flex gap-1.5 mt-1">
                              {item.isHealthy && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  Healthy
                                </Badge>
                              )}
                              {item.isSpecial && (
                                <Badge className="bg-orange-500 text-xs px-1.5 py-0">
                                  -30%
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-sm text-orange-600">${(item.price * item.quantity).toFixed(2)}</p>
                            {item.isSpecial && (
                              <p className="text-xs text-gray-400 line-through">
                                ${((item.price / 0.7) * item.quantity).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.id, 0)}
                            className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>

      {/* Estimated Preparation Time */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm">Estimated Ready Time</h3>
            <Badge className="ml-auto bg-blue-600 text-xs">
              ~{estimatedTime.total} min
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-blue-800">
            <div className="flex justify-between">
              <span>• Order processing</span>
              <span>{estimatedTime.base} min</span>
            </div>
            <div className="flex justify-between">
              <span>• Preparation time</span>
              <span>{estimatedTime.prep} min</span>
            </div>
            {estimatedTime.quantity > 0 && (
              <div className="flex justify-between">
                <span>• Large order buffer</span>
                <span>+{estimatedTime.quantity} min</span>
              </div>
            )}
            {estimatedTime.peak > 0 && (
              <div className="flex justify-between">
                <span>• Peak hour buffer</span>
                <span>+{estimatedTime.peak} min</span>
              </div>
            )}
            {estimatedTime.category > 0 && (
              <div className="flex justify-between">
                <span>• Multiple categories</span>
                <span>+{estimatedTime.category} min</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-base">Order Summary</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {totalSavings > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Savings (30%)</span>
              <span>-${totalSavings.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 pt-0">
          <Button
            className="w-full"
            onClick={() => handlePlaceOrder('pickup')}
            disabled={isPlacingOrder || Object.keys(itemsByShop).length > 1}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Order for Pickup
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handlePlaceOrder('dine-in')}
            disabled={isPlacingOrder || Object.keys(itemsByShop).length > 1}
          >
            <Store className="w-4 h-4 mr-2" />
            Order for Dine-In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}