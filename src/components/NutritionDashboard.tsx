import { useMemo } from 'react';
import { Order } from '../App';
import { Card, CardContent, CardHeader } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Flame, Target, Utensils, Leaf, DollarSign, Award, TrendingUp,
} from 'lucide-react';

interface NutritionDashboardProps {
  orders: Order[];
}

const DAILY_GOAL = 2000;
const COLORS = {
  orange: '#ea580c',
  green: '#16a34a',
  red: '#dc2626',
  blue: '#2563eb',
  gray: '#94a3b8',
};

function orderCalories(order: Order): number {
  return order.items.reduce((sum, item) => sum + (item.calories || 0) * item.quantity, 0);
}

function healthyCalories(order: Order): number {
  return order.items.reduce(
    (sum, item) => sum + (item.isHealthy ? (item.calories || 0) * item.quantity : 0),
    0,
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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
  const data = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const active = orders.filter(o => o.status !== 'cancelled');

    // Today
    const todayOrders = active.filter(
      o => startOfDay(new Date(o.timestamp)).getTime() === todayStart.getTime(),
    );
    const todayCalories = todayOrders.reduce((s, o) => s + orderCalories(o), 0);
    const todaySpend = todayOrders.reduce((s, o) => s + o.total, 0);
    const mealsToday = todayOrders.length;
    const avgPerMeal = mealsToday > 0 ? Math.round(todayCalories / mealsToday) : 0;

    // 7-day calorie chart
    const days: { label: string; dateKey: string; kcal: number; spend: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateKey: d.toDateString(),
        kcal: 0,
        spend: 0,
      });
    }
    for (const o of active) {
      const key = new Date(o.timestamp).toDateString();
      const bucket = days.find(d => d.dateKey === key);
      if (!bucket) continue;
      bucket.kcal += orderCalories(o);
      bucket.spend += o.total;
    }
    const weekSpend = days.reduce((s, d) => s + d.spend, 0);
    const weekKcal = days.reduce((s, d) => s + d.kcal, 0);
    const avgDailyKcal = Math.round(weekKcal / 7);

    // Healthy vs Indulgent (by kcal, last 7 days)
    let healthyKcal = 0, otherKcal = 0;
    for (const o of active) {
      if (new Date(o.timestamp) < weekStart) continue;
      healthyKcal += healthyCalories(o);
      otherKcal += orderCalories(o) - healthyCalories(o);
    }
    const healthySplit = [
      { name: 'Healthy', value: Math.round(healthyKcal), fill: COLORS.green },
      { name: 'Indulgent', value: Math.round(otherKcal), fill: COLORS.orange },
    ];
    const totalSplit = healthyKcal + otherKcal;
    const healthyPct = totalSplit > 0 ? Math.round((healthyKcal / totalSplit) * 100) : 0;

    // Top 5 most ordered items (lifetime)
    const itemTotals: Record<string, { name: string; qty: number; kcal: number }> = {};
    for (const o of active) {
      for (const it of o.items) {
        const key = it.name;
        if (!itemTotals[key]) itemTotals[key] = { name: key, qty: 0, kcal: 0 };
        itemTotals[key].qty += it.quantity;
        itemTotals[key].kcal += (it.calories || 0) * it.quantity;
      }
    }
    const topItems = Object.values(itemTotals)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      todayCalories,
      todaySpend,
      mealsToday,
      avgPerMeal,
      days,
      weekSpend,
      weekKcal,
      avgDailyKcal,
      healthySplit,
      healthyPct,
      topItems,
      hasAnyData: active.length > 0,
    };
  }, [orders]);

  const rec = getRecommendation(data.avgPerMeal, data.todayCalories);
  const progress = Math.min(data.todayCalories / DAILY_GOAL, 1);
  const remaining = Math.max(DAILY_GOAL - data.todayCalories, 0);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Nutrition Dashboard</h1>
        <span className="text-xs text-gray-500">{dateStr}</span>
      </div>

      {/* Today's calorie hero card.
          overflow-hidden + box-border + w-full ensure rounded-2xl clips
          all four corners and the card never overflows the parent.
          Gradient stays inline because Tailwind v4 renamed gradient
          utilities (bg-gradient-to-r → bg-linear-to-r); inline style is
          version-proof. */}
      <div
        className="w-full box-border rounded-3xl overflow-hidden px-5 py-6 text-white shadow-md"
        style={{ background: 'linear-gradient(to right, #ea580c, #f97316)' }}
      >
        <p className="text-sm text-orange-100 font-medium mb-1">Today's Calories</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold leading-none">{data.todayCalories}</span>
          <span className="text-orange-100 text-sm mb-1">/ {DAILY_GOAL} kcal</span>
        </div>
        {/* Track is bg-white/40 + h-3 so the empty pill is clearly
            visible at 0 kcal — without it the middle of the card looks
            empty / "broken". rounded-full guarantees pill ends. */}
        <div className="mt-4 bg-white/40 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-orange-100 mt-2">
          <span>{Math.round(progress * 100)}% of daily goal</span>
          <span>{remaining} kcal remaining</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip
          label="Meals today"
          value={String(data.mealsToday)}
          icon={Utensils}
          color="text-blue-600 bg-blue-50"
        />
        <StatChip
          label="Avg / meal"
          value={`${data.avgPerMeal} kcal`}
          icon={Flame}
          color="text-orange-600 bg-orange-50"
        />
        <StatChip
          label="Spent today"
          value={`$${data.todaySpend.toFixed(2)}`}
          icon={DollarSign}
          color="text-green-600 bg-green-50"
        />
        <StatChip
          label="Healthy %"
          value={`${data.healthyPct}%`}
          icon={Leaf}
          color="text-emerald-600 bg-emerald-50"
        />
      </div>

      {/* 7-day calorie chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <h2 className="text-base font-semibold">Last 7 Days</h2>
          </div>
          <p className="text-xs text-gray-500">
            Avg {data.avgDailyKcal} kcal/day · ${data.weekSpend.toFixed(2)} this week
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.days} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}`} />
              <Tooltip
                formatter={(v: number, _name, p: any) => [
                  `${v} kcal · $${p.payload.spend.toFixed(2)}`,
                  'Total',
                ]}
                cursor={{ fill: '#fed7aa', opacity: 0.3 }}
              />
              <Bar dataKey="kcal" fill={COLORS.orange} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Healthy split */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-600" />
              <h2 className="text-base font-semibold">Healthy vs Indulgent</h2>
            </div>
            <p className="text-xs text-gray-500">By calories · last 7 days</p>
          </CardHeader>
          <CardContent>
            {data.healthySplit.every(s => s.value === 0) ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                No orders yet this week.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.healthySplit}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={(e: any) => `${e.value} kcal`}
                    labelLine={false}
                  >
                    {data.healthySplit.map((s, i) => (
                      <Cell key={i} fill={s.fill} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={24} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top items */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              <h2 className="text-base font-semibold">Your Top Items</h2>
            </div>
            <p className="text-xs text-gray-500">Most ordered (all-time)</p>
          </CardHeader>
          <CardContent>
            {data.topItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No orders yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={data.topItems}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v: number, _name, p: any) => [
                      `${v}× · ${p.payload.kcal} kcal`,
                      'Total',
                    ]}
                    cursor={{ fill: '#fed7aa', opacity: 0.4 }}
                  />
                  <Bar dataKey="qty" fill={COLORS.orange} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendation */}
      <div className={`text-sm p-3 rounded-xl border ${rec.cls}`}>
        {rec.msg}
      </div>

      {/* Today's orders list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Today's Orders</h2>
        {data.mealsToday === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Utensils className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No orders today — go grab something!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders
              .filter(
                o =>
                  o.status !== 'cancelled' &&
                  startOfDay(new Date(o.timestamp)).getTime() ===
                    startOfDay(new Date()).getTime(),
              )
              .map(order => {
                const kcal = orderCalories(order);
                const time = new Date(order.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit',
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

      <p className="text-xs text-center text-gray-400 pb-2">
        Calorie estimates are based on standard serving sizes. Goal of {DAILY_GOAL} kcal
        is a general adult reference.
      </p>
    </div>
  );
}

function StatChip({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={`inline-flex p-2 rounded-lg ${color} mb-1`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}
