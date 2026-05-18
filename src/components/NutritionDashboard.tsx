import { Order } from '../App';
import { Card, CardContent, CardHeader } from './ui/card';
import { Flame, Target, TrendingUp, RefreshCw, Utensils } from 'lucide-react';

interface NutritionDashboardProps {
  orders: Order[];
}

const DAILY_GOAL = 2000;
const AVG_MEAL_KCAL = 600;

function orderCalories(order: Order): number {
  return order.items.reduce((sum, item) => sum + (item.calories || 0) * item.quantity, 0);
}

function getRecommendation(avgPerMeal: number, todayCalories: number) {
  if (todayCalories === 0) {
    return {
      msg: "You haven't ordered yet today. A balanced meal is around 500–700 kcal.",
      cls: 'bg-blue-50 border-blue-200 text-blue-800',
    };
  }
  if (avgPerMeal <= 400) {
    return {
      msg: 'Your meals are quite light. Consider adding a protein-rich side to stay energized.',
      cls: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };
  }
  if (avgPerMeal <= 700) {
    return {
      msg: 'Great balance! Your meals are well within the healthy range. Keep it up!',
      cls: 'bg-green-50 border-green-200 text-green-800',
    };
  }
  if (avgPerMeal <= 900) {
    return {
      msg: 'Slightly above average. Consider lighter options or smaller portions next time.',
      cls: 'bg-orange-50 border-orange-200 text-orange-800',
    };
  }
  return {
    msg: 'High calorie meals today. Try adding vegetables or choosing a lighter dish to balance out.',
    cls: 'bg-red-50 border-red-200 text-red-800',
  };
}

export function NutritionDashboard({ orders }: NutritionDashboardProps) {
  const now = new Date();

  const todayOrders = orders.filter(o => {
    const d = new Date(o.timestamp);
    return (
      d.toDateString() === now.toDateString() &&
      o.status !== 'cancelled'
    );
  });

  const todayCalories = todayOrders.reduce((sum, o) => sum + orderCalories(o), 0);
  const progress = Math.min(todayCalories / DAILY_GOAL, 1);
  const mealsCount = todayOrders.length;
  const avgPerMeal = mealsCount > 0 ? Math.round(todayCalories / mealsCount) : 0;
  const remaining = Math.max(DAILY_GOAL - todayCalories, 0);

  const rec = getRecommendation(avgPerMeal, todayCalories);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Nutrition Dashboard</h1>
        <span className="text-xs text-gray-500">{dateStr}</span>
      </div>

      {/* Today's calorie card */}
      <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
        <p className="text-sm text-orange-100 font-medium mb-1">Today's Calories</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold leading-none">{todayCalories}</span>
          <span className="text-orange-200 text-sm mb-1">/ {DAILY_GOAL} kcal</span>
        </div>
        <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-xs text-orange-100 mt-1">
          {Math.round(progress * 100)}% of daily goal
        </p>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's Orders", value: String(mealsCount), icon: Utensils, color: 'text-blue-600 bg-blue-50' },
          { label: 'Avg / Meal', value: `${avgPerMeal} kcal`, icon: Flame, color: 'text-orange-600 bg-orange-50' },
          { label: 'Goal Left', value: `${remaining} kcal`, icon: Target, color: 'text-green-600 bg-green-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <div className={`inline-flex p-2 rounded-lg ${color} mb-1`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Meal comparison */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Meal Comparison</h2>
          </div>
          <p className="text-xs text-gray-500">Your avg meal vs recommended</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {[
            { label: 'Your avg', kcal: avgPerMeal, color: 'bg-orange-500' },
            { label: 'Avg meal', kcal: AVG_MEAL_KCAL, color: 'bg-gray-300' },
          ].map(({ label, kcal, color }) => (
            <div key={label} className="flex items-center gap-3 text-xs">
              <span className="w-16 text-gray-600 shrink-0">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${Math.min((kcal / DAILY_GOAL) * 100, 100)}%` }}
                />
              </div>
              <span className="w-16 text-right font-semibold text-gray-700">{kcal} kcal</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendation */}
      <div className={`text-sm p-3 rounded-xl border ${rec.cls}`}>
        {rec.msg}
      </div>

      {/* Today's orders */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Today's Orders</h2>

        {todayOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Utensils className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No orders today — start eating!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayOrders.map(order => {
              const kcal = orderCalories(order);
              const time = new Date(order.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });
              return (
                <Card key={order.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">{time}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span className="text-sm font-bold text-gray-900">{kcal} kcal</span>
                        </div>
                        <p className="text-xs text-gray-400">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Calorie note */}
      <p className="text-xs text-center text-gray-400 pb-2">
        Calorie estimates are based on standard serving sizes.
      </p>
    </div>
  );
}
