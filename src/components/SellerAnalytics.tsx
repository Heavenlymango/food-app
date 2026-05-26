import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, ShoppingBag, TrendingUp, XCircle, Clock, Award,
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  isSpecial?: boolean;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderTime: string;
  orderType: 'pickup' | 'dine-in';
  scheduledFor?: string | null;
}

interface SellerAnalyticsProps {
  orders: Order[];
}

const COLORS = {
  orange: '#ea580c',
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  yellow: '#ca8a04',
  purple: '#9333ea',
  gray: '#94a3b8',
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function SellerAnalytics({ orders }: SellerAnalyticsProps) {
  const data = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6); // last 7 days inclusive

    // Filter helpers
    const inLast7 = (o: Order) => new Date(o.orderTime) >= weekStart;
    const completed = orders.filter(o => o.status === 'completed');
    const cancelled = orders.filter(o => o.status === 'cancelled');

    // 7-day revenue + order counts (completed only for revenue)
    const days: { label: string; dateKey: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateKey: d.toDateString(),
        revenue: 0,
        orders: 0,
      });
    }
    for (const o of orders) {
      const key = new Date(o.orderTime).toDateString();
      const bucket = days.find(d => d.dateKey === key);
      if (!bucket) continue;
      if (o.status !== 'cancelled') bucket.orders += 1;
      if (o.status === 'completed') bucket.revenue += o.total;
    }

    // Top 5 selling items (lifetime, exclude cancelled)
    const itemTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      for (const it of o.items) {
        const key = it.name;
        if (!itemTotals[key]) itemTotals[key] = { name: key, qty: 0, revenue: 0 };
        itemTotals[key].qty += it.quantity;
        itemTotals[key].revenue += it.price * it.quantity;
      }
    }
    const topItems = Object.values(itemTotals)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Service type split (last 7 days, non-cancelled)
    let pickup = 0, dineIn = 0;
    for (const o of orders.filter(inLast7)) {
      if (o.status === 'cancelled') continue;
      if (o.orderType === 'dine-in') dineIn += 1; else pickup += 1;
    }

    // Peak hours (last 7 days, non-cancelled)
    const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
    for (const o of orders.filter(inLast7)) {
      if (o.status === 'cancelled') continue;
      const h = new Date(o.orderTime).getHours();
      hourBuckets[h].orders += 1;
    }
    // Trim to active hours (6am–10pm) to keep the chart readable
    const peakHours = hourBuckets.slice(6, 22).map(b => ({
      hour: b.hour === 0 ? '12a' : b.hour < 12 ? `${b.hour}a` : b.hour === 12 ? '12p' : `${b.hour - 12}p`,
      orders: b.orders,
    }));

    // KPIs (last 7 days)
    const orders7d = orders.filter(inLast7);
    const completed7d = orders7d.filter(o => o.status === 'completed');
    const cancelled7d = orders7d.filter(o => o.status === 'cancelled');
    const revenue7d = completed7d.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = completed7d.length > 0 ? revenue7d / completed7d.length : 0;
    const cancelRate = orders7d.length > 0 ? (cancelled7d.length / orders7d.length) * 100 : 0;

    return {
      days,
      topItems,
      service: [
        { name: 'Pickup', value: pickup, fill: COLORS.orange },
        { name: 'Dine-In', value: dineIn, fill: COLORS.blue },
      ],
      peakHours,
      kpis: {
        revenue7d,
        orders7d: orders7d.length,
        avgOrderValue,
        cancelRate,
        completed: completed.length,
        cancelled: cancelled.length,
      },
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue (7d)"
          value={`$${data.kpis.revenue7d.toFixed(2)}`}
          icon={DollarSign}
          color="text-green-600 bg-green-50"
        />
        <KpiCard
          label="Orders (7d)"
          value={String(data.kpis.orders7d)}
          icon={ShoppingBag}
          color="text-orange-600 bg-orange-50"
        />
        <KpiCard
          label="Avg Order Value"
          value={`$${data.kpis.avgOrderValue.toFixed(2)}`}
          icon={TrendingUp}
          color="text-blue-600 bg-blue-50"
        />
        <KpiCard
          label="Cancel Rate (7d)"
          value={`${data.kpis.cancelRate.toFixed(1)}%`}
          icon={XCircle}
          color="text-red-600 bg-red-50"
        />
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h2 className="text-base font-semibold">Revenue — Last 7 Days</h2>
          </div>
          <p className="text-xs text-gray-500">Completed orders only</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.days} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']}
                cursor={{ fill: '#fef3c7', opacity: 0.4 }}
              />
              <Bar dataKey="revenue" fill={COLORS.green} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top items */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              <h2 className="text-base font-semibold">Top Selling Items</h2>
            </div>
            <p className="text-xs text-gray-500">By quantity sold (all-time)</p>
          </CardHeader>
          <CardContent>
            {data.topItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No sales yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.topItems}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v: number, _name, p: any) => [
                      `${v} sold · $${p.payload.revenue.toFixed(2)}`,
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

        {/* Service type split */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-semibold">Pickup vs Dine-In</h2>
            </div>
            <p className="text-xs text-gray-500">Last 7 days</p>
          </CardHeader>
          <CardContent>
            {data.service.every(s => s.value === 0) ? (
              <p className="text-sm text-gray-400 py-6 text-center">No orders in the last 7 days.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.service}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    labelLine={false}
                  >
                    {data.service.map((s, i) => (
                      <Cell key={i} fill={s.fill} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={24} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak hours */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <h2 className="text-base font-semibold">Peak Hours</h2>
          </div>
          <p className="text-xs text-gray-500">Orders by hour of day · last 7 days</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.peakHours} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, 'Orders']}
                cursor={{ fill: '#ede9fe', opacity: 0.5 }}
              />
              <Bar dataKey="orders" fill={COLORS.purple} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-xs">{label}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
