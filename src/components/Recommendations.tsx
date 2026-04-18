import { MenuItem } from '../App';
import { MenuItemCard } from './MenuItemCard';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Leaf, DollarSign, TrendingDown, Heart } from 'lucide-react';
import { MENU_ITEMS } from '../data/menuData';

interface RecommendationsProps {
  onAddToCart: (item: MenuItem) => void;
}

export function Recommendations({ onAddToCart }: RecommendationsProps) {
  const healthyItems = MENU_ITEMS.filter(item => item.isHealthy).slice(0, 4);
  const specialItems = MENU_ITEMS.filter(item => item.isSpecial).slice(0, 4);
  const budgetItems = [...MENU_ITEMS]
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);
  const lowCalItems = [...MENU_ITEMS]
    .filter(item => item.calories < 300)
    .sort((a, b) => a.calories - b.calories)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Section Header: Healthy Recommendations */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Healthy Recommendations</h2>
            <p className="text-sm text-green-50">Nutritious choices for better health</p>
          </div>
        </div>
        <Badge className="bg-white text-green-700 text-xs">
          🌱 Good for your body & mind
        </Badge>
      </div>

      {/* Healthy Choices */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 bg-gradient-to-r from-green-200 to-transparent rounded"></div>
          <Badge variant="outline" className="text-xs border-green-500 text-green-700">
            <Leaf className="w-3 h-3 mr-1" />
            Balanced Nutrition
          </Badge>
          <div className="h-1 flex-1 bg-gradient-to-l from-green-200 to-transparent rounded"></div>
        </div>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Healthy Choices</h3>
                <p className="text-xs text-green-700 mt-1">Marked as healthy by nutritionists</p>
              </div>
              <Badge className="bg-green-600">
                Top Picks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthyItems.map(item => (
              <MenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Low Calorie Options */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 bg-gradient-to-r from-purple-200 to-transparent rounded"></div>
          <Badge variant="outline" className="text-xs border-purple-500 text-purple-700">
            <Heart className="w-3 h-3 mr-1" />
            Light Meals
          </Badge>
          <div className="h-1 flex-1 bg-gradient-to-l from-purple-200 to-transparent rounded"></div>
        </div>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-purple-900">Light & Fresh</h3>
                <p className="text-xs text-purple-700 mt-1">Under 300 calories per serving</p>
              </div>
              <Badge className="bg-purple-600">
                Low Cal
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowCalItems.map(item => (
              <MenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
            ))}
            <div className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border-2 border-purple-200 text-xs">
              <p className="text-purple-900">
                💜 <strong>Health Tip:</strong> Low-calorie doesn't mean less filling! These options are nutrient-dense.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Divider Between Sections */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-2 rounded-full border-2 border-orange-300 text-sm font-semibold text-gray-700">
            💰 Budget-Friendly Options Below
          </span>
        </div>
      </div>

      {/* Section Header: Budget-Friendly Suggestions */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Budget-Friendly Suggestions</h2>
            <p className="text-sm text-blue-50">Save money without compromising quality</p>
          </div>
        </div>
        <Badge className="bg-white text-blue-700 text-xs">
          💵 Student-friendly prices
        </Badge>
      </div>

      {/* Budget Friendly */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 bg-gradient-to-r from-blue-200 to-transparent rounded"></div>
          <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
            <DollarSign className="w-3 h-3 mr-1" />
            Best Value
          </Badge>
          <div className="h-1 flex-1 bg-gradient-to-l from-blue-200 to-transparent rounded"></div>
        </div>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Cheapest Options</h3>
                <p className="text-xs text-blue-700 mt-1">Lowest prices across all shops</p>
              </div>
              <Badge className="bg-blue-600">
                Under $1.50
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetItems.map(item => (
              <MenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
            ))}
            <div className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border-2 border-blue-200 text-xs">
              <p className="text-blue-900">
                💙 <strong>Money Tip:</strong> These items offer the best price-to-portion ratio!
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Specials - Save Money */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 bg-gradient-to-r from-orange-200 to-transparent rounded"></div>
          <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
            <TrendingDown className="w-3 h-3 mr-1" />
            Special Deals
          </Badge>
          <div className="h-1 flex-1 bg-gradient-to-l from-orange-200 to-transparent rounded"></div>
        </div>
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-900">Daily Specials</h3>
                <p className="text-xs text-orange-700 mt-1">Limited-time offers with great savings</p>
              </div>
              <Badge className="bg-orange-600 animate-pulse">
                Save 30%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {specialItems.map(item => (
              <MenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
            ))}
            <div className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border-2 border-orange-200 text-xs">
              <p className="text-orange-900">
                🎯 <strong>Pro Tip:</strong> Mix specials from different shops to maximize savings!
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Smart Shopping Tips */}
      <Card className="border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50">
        <CardHeader className="pb-3 border-b-2 border-gray-200 bg-white/50">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-2 rounded-lg">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h3 className="font-semibold">Smart Shopping Tips for Students</h3>
              <p className="text-xs text-gray-600 mt-1">Make the most of your campus food budget</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs pt-4">
          <div className="flex gap-3 p-3 bg-white rounded-lg border border-orange-200">
            <Badge className="bg-orange-500 h-fit text-xs px-2 py-1">1</Badge>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Compare Shops First</p>
              <p className="text-gray-600 mt-1">Same item can have different prices at different shops - always browse before ordering!</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white rounded-lg border border-green-200">
            <Badge className="bg-green-500 h-fit text-xs px-2 py-1">2</Badge>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Prioritize Healthy Shops</p>
              <p className="text-gray-600 mt-1">Shop A6 & B6 have 100% healthy options - invest in your health!</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white rounded-lg border border-blue-200">
            <Badge className="bg-blue-500 h-fit text-xs px-2 py-1">3</Badge>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Budget Smart</p>
              <p className="text-gray-600 mt-1">Most meals cost $2-3 - plan ahead and you can eat well all week!</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white rounded-lg border border-purple-200">
            <Badge className="bg-purple-500 h-fit text-xs px-2 py-1">4</Badge>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Use Pickup Option</p>
              <p className="text-gray-600 mt-1">Get notified when ready & skip the wait - perfect for busy students!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}