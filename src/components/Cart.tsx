import { CartItem } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Minus, Plus, Trash2, ShoppingBag, Store, Clock, Flame, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { SHOPS } from '../data/menuData';
import { useState } from 'react';
import { supabase } from '../utils/supabase/client';

const DAILY_GOAL = 2000;
const AVG_MEAL_KCAL = 600;

function CaloriePreview({ totalCalories }: { totalCalories: number }) {
  const [open, setOpen] = useState(false);
  const ratio = totalCalories / AVG_MEAL_KCAL;

  const { msg, color } = (() => {
    if (totalCalories === 0) return { msg: 'Add items to see calorie info.', color: 'gray' };
    if (totalCalories < 400) return { msg: 'Light meal — consider adding a protein-rich side.', color: 'blue' };
    if (totalCalories <= 700) return { msg: 'Great portion! Well within a healthy meal range.', color: 'green' };
    if (totalCalories <= 900) return { msg: 'Slightly above average — consider skipping a snack later.', color: 'orange' };
    return { msg: 'Heavy meal. Try to eat lighter at your next meal.', color: 'red' };
  })();

  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
      >
        <Flame className="w-3 h-3" />
        {totalCalories} kcal total
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        <span className="text-gray-400 ml-1">· Calorie Preview</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Bars */}
          {[
            { label: 'Your order', kcal: totalCalories, color: 'bg-orange-500' },
            { label: 'Avg meal', kcal: AVG_MEAL_KCAL, color: 'bg-gray-300' },
            { label: 'Daily goal', kcal: DAILY_GOAL, color: 'bg-gray-200' },
          ].map(({ label, kcal, color: barColor }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-20 text-gray-600 shrink-0">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min((kcal / DAILY_GOAL) * 100, 100)}%` }}
                />
              </div>
              <span className="w-16 text-right font-medium text-gray-700">{kcal} kcal</span>
            </div>
          ))}

          {/* Message */}
          <div className={`text-xs p-2 rounded-lg border ${colorMap[color]}`}>
            {msg}
            {totalCalories > 0 && (
              <span className="block text-gray-500 mt-0.5">
                Your order is {ratio.toFixed(1)}× the average meal
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CartProps {
  cart: CartItem[];
  campus: string;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onPlaceOrder: (orderType: 'pickup' | 'dine-in', scheduledFor?: Date) => Promise<void>;
}

export function Cart({ cart, campus, onUpdateQuantity, onPlaceOrder }: CartProps) {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [reserveMode, setReserveMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState('');
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loadingBreaks, setLoadingBreaks] = useState(false);

  const loadBreaks = async () => {
    setLoadingBreaks(true);
    try {
      const dow = new Date().getDay();
      const { data } = await supabase
        .from('class_breaks')
        .select('*')
        .eq('campus', campus)
        .eq('day_of_week', dow)
        .eq('is_active', true)
        .order('break_start');
      setBreaks(data ?? []);
    } finally {
      setLoadingBreaks(false);
    }
  };

  const parseBreakTime = (timeStr: string): Date => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const upcomingBreaks = breaks.filter(b => parseBreakTime(b.break_end) > new Date());

  const totalCalories = cart.reduce((sum, item) => sum + (item.calories || 0) * item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.discountedPrice * item.quantity, 0);
  const totalSavings = cart
    .filter(item => (item.discountPercent ?? 0) > 0)
    .reduce((sum, item) => sum + (item.price - item.discountedPrice) * item.quantity, 0);
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
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);
    try {
      await onPlaceOrder(orderType, scheduledFor ?? undefined);
      if (scheduledFor) {
        setReserveMode(false);
        setScheduledFor(null);
        setBreaks([]);
      }
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

          return (
            <div key={shopId} className="space-y-3">
              {/* Shop Header */}
              <div className="flex items-center gap-2 px-1">
                <div className="bg-orange-500 p-1.5 rounded-lg flex-shrink-0">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm">{shop?.name ?? shopId}</h3>
                </div>
                {shop && (
                  <Badge variant="outline" className="text-xs">
                    {shop.campus === 'RUPP' ? '🎓 RUPP' : '📚 IFL'}
                  </Badge>
                )}
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
                              {(item.discountPercent ?? 0) > 0 && (
                                <Badge className="bg-orange-500 text-xs px-1.5 py-0">
                                  -{item.discountPercent?.toFixed(0)}%
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-sm text-orange-600">${(item.discountedPrice * item.quantity).toFixed(2)}</p>
                            {(item.discountPercent ?? 0) > 0 && (
                              <p className="text-xs text-gray-400 line-through">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            )}
                            {item.calories > 0 && (
                              <p className="text-xs text-gray-400 flex items-center justify-end gap-0.5 mt-0.5">
                                <Flame className="w-3 h-3 text-orange-400" />
                                {item.calories * item.quantity} kcal
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

      {/* Reservation Picker */}
      <Card className={reserveMode ? 'border-purple-300' : ''}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Schedule for later</span>
            </div>
            <Switch
              checked={reserveMode}
              onCheckedChange={v => {
                setReserveMode(v);
                if (v) loadBreaks();
                else { setScheduledFor(null); setCustomTime(''); }
              }}
            />
          </div>
          {reserveMode && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">
                Pick a preset class break or set your own time. Works for both pickup and dine-in.
              </p>
              {loadingBreaks ? (
                <p className="text-xs text-gray-400 py-2 text-center">Loading breaks…</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {upcomingBreaks.map((b, i) => {
                    const start = parseBreakTime(b.break_start);
                    const end = parseBreakTime(b.break_end);
                    const selected = scheduledFor != null && !customTime &&
                      scheduledFor.getHours() === start.getHours() &&
                      scheduledFor.getMinutes() === start.getMinutes();
                    return (
                      <button
                        key={i}
                        onClick={() => { setScheduledFor(start); setCustomTime(''); }}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left text-xs transition-colors ${
                          selected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-semibold">{b.break_label ?? 'Break'}</div>
                        <div className={selected ? 'text-purple-200' : 'text-gray-400'}>
                          {fmtTime(start)} – {fmtTime(end)}
                        </div>
                      </button>
                    );
                  })}
                  {/* Custom time chip */}
                  <div className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs transition-colors ${
                    customTime ? 'bg-purple-600 border-purple-600 text-white' : 'border-dashed border-gray-300 hover:border-purple-300'
                  }`}>
                    <div className="font-semibold mb-0.5">Custom</div>
                    <input
                      type="time"
                      value={customTime}
                      onChange={e => {
                        setCustomTime(e.target.value);
                        if (e.target.value) {
                          const [h, m] = e.target.value.split(':').map(Number);
                          const d = new Date();
                          d.setHours(h, m, 0, 0);
                          setScheduledFor(d);
                        } else {
                          setScheduledFor(null);
                        }
                      }}
                      className={`text-xs bg-transparent border-none outline-none w-20 ${customTime ? 'text-white' : 'text-gray-500'}`}
                    />
                  </div>
                </div>
              )}
              {scheduledFor && (
                <p className="text-xs text-purple-700 font-medium mt-2">
                  ✓ Order scheduled for {fmtTime(scheduledFor)}
                </p>
              )}
              {!scheduledFor && (
                <p className="text-xs text-amber-600 mt-2">
                  Select a time above to schedule — or place an immediate order below.
                </p>
              )}
            </div>
          )}
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
              <span>Discount savings</span>
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
          <CaloriePreview totalCalories={totalCalories} />
        </CardContent>
        <CardFooter className="flex-col gap-2 pt-0">
          <Button
            className={`w-full ${reserveMode && scheduledFor ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            onClick={() => handlePlaceOrder('pickup')}
            disabled={isPlacingOrder || Object.keys(itemsByShop).length > 1}
          >
            {reserveMode && scheduledFor ? (
              <><Calendar className="w-4 h-4 mr-2" />Reserve Pickup at {fmtTime(scheduledFor)}</>
            ) : (
              <><ShoppingBag className="w-4 h-4 mr-2" />Order for Pickup</>
            )}
          </Button>
          <Button
            variant="outline"
            className={`w-full ${reserveMode && scheduledFor ? 'border-purple-400 text-purple-700 hover:bg-purple-50' : ''}`}
            onClick={() => handlePlaceOrder('dine-in')}
            disabled={isPlacingOrder || Object.keys(itemsByShop).length > 1}
          >
            {reserveMode && scheduledFor ? (
              <><Calendar className="w-4 h-4 mr-2" />Reserve Dine-In at {fmtTime(scheduledFor)}</>
            ) : (
              <><Store className="w-4 h-4 mr-2" />Order for Dine-In</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}