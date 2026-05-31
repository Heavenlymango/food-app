import { useState, useEffect } from 'react';
import { MenuItem } from '../App';
import { MenuItemCard } from './MenuItemCard';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardHeader } from './ui/card';
import { Search, Store, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface Shop {
  id: string;
  name: string;
  description: string;
  campus: 'RUPP' | 'IFL';
  healthyCount: number;
  totalItems: number;
}

interface MenuBrowserProps {
  onAddToCart: (item: MenuItem) => void;
}

export function MenuBrowser({ onAddToCart }: MenuBrowserProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState('All');
  const [selectedCampus, setSelectedCampus] = useState<'All' | 'RUPP' | 'IFL'>('All');
  const [showHealthyOnly, setShowHealthyOnly] = useState(false);
  const [showDiscountOnly, setShowDiscountOnly] = useState(false);

  useEffect(() => { loadMenu(); }, []);

  async function loadMenu() {
    setLoading(true);
    try {
      const now = new Date();
      const dow = now.getDay(); // 0=Sun
      const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"

      const [itemsRes, shopsRes, schedulesRes] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, name, description, price, category, calories, is_healthy, is_special, hide_healthy_badge, hide_unhealthy_badge, image_url, preparation_time, shops!inner(shop_code, name, campus, description, discount_percent)')
          .eq('is_available', true),
        supabase
          .from('shops')
          .select('shop_code, name, description, campus, discount_percent')
          .eq('is_active', true),
        supabase
          .from('item_discount_schedules')
          .select('menu_item_id, discount_percent')
          .eq('is_active', true)
          .contains('days_of_week', [dow])
          .lte('start_time', timeStr)
          .gte('end_time', timeStr),
      ]);

      const rawItems = itemsRes.data ?? [];
      const rawShops = shopsRes.data ?? [];
      const rawSchedules = schedulesRes.data ?? [];

      // Best active schedule discount per item
      const scheduleMap: Record<string, number> = {};
      for (const s of rawSchedules) {
        const cur = scheduleMap[s.menu_item_id] ?? 0;
        if (s.discount_percent > cur) scheduleMap[s.menu_item_id] = s.discount_percent;
      }

      // Shop-level discount map
      const shopDiscountMap: Record<string, number> = {};
      for (const s of rawShops) {
        shopDiscountMap[s.shop_code] = (s.discount_percent as number) ?? 0;
      }

      const mappedItems: MenuItem[] = rawItems.map((item: any) => {
        const shopCode = (item.shops as any)?.shop_code ?? '';
        const shopPct = shopDiscountMap[shopCode] ?? 0;
        const itemPct = scheduleMap[item.id] ?? 0;
        const effectivePct = Math.max(shopPct, itemPct);
        const price = item.price as number;
        return {
          id: item.id,
          name: item.name,
          description: item.description ?? '',
          price,
          discountPercent: effectivePct,
          discountedPrice: effectivePct > 0 ? price * (1 - effectivePct / 100) : price,
          category: item.category ?? '',
          calories: item.calories ?? 0,
          isHealthy: item.is_healthy ?? false,
          isSpecial: item.is_special ?? false,
          hideHealthyBadge: item.hide_healthy_badge ?? false,
          hideUnhealthyBadge: item.hide_unhealthy_badge ?? false,
          image: item.image_url ?? '',
          preparationTime: item.preparation_time ?? 15,
          shop: shopCode,
        };
      });

      // Build shop list with counts derived from live items
      const shopMap: Record<string, Shop> = {};
      for (const s of rawShops) {
        shopMap[s.shop_code] = {
          id: s.shop_code,
          name: s.name,
          description: s.description ?? '',
          campus: s.campus as 'RUPP' | 'IFL',
          healthyCount: 0,
          totalItems: 0,
        };
      }
      for (const item of mappedItems) {
        if (shopMap[item.shop]) {
          shopMap[item.shop].totalItems++;
          if (item.isHealthy) shopMap[item.shop].healthyCount++;
        }
      }

      setItems(mappedItems);
      setShops(Object.values(shopMap).sort((a, b) => a.id.localeCompare(b.id)));
    } catch (err) {
      console.error('Failed to load menu', err);
    } finally {
      setLoading(false);
    }
  }

  const visibleShops = shops.filter(s =>
    selectedCampus === 'All' || s.campus === selectedCampus
  );

  const itemsForShop = (shopId: string) =>
    items.filter(item => {
      if (item.shop !== shopId) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (showHealthyOnly && !item.isHealthy) return false;
      if (showDiscountOnly && item.discountPercent === 0) return false;
      if (selectedShop !== 'All' && item.shop !== selectedShop) return false;
      return true;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search menu…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex gap-2">
          {(['All', 'RUPP', 'IFL'] as const).map(c => (
            <Button key={c} variant={selectedCampus === c ? 'default' : 'outline'} size="sm"
              onClick={() => { setSelectedCampus(c); setSelectedShop('All'); }}
              className={`text-xs flex-1 ${selectedCampus === c ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
              {c === 'All' ? '🏫 All' : c === 'RUPP' ? '🎓 RUPP' : '📚 IFL'}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant={showHealthyOnly ? 'default' : 'outline'} size="sm"
            onClick={() => setShowHealthyOnly(v => !v)}
            className={`text-xs flex-1 ${showHealthyOnly ? 'bg-green-600 hover:bg-green-700' : ''}`}>
            🥗 Healthy
          </Button>
          <Button variant={showDiscountOnly ? 'default' : 'outline'} size="sm"
            onClick={() => setShowDiscountOnly(v => !v)}
            className={`text-xs flex-1 ${showDiscountOnly ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
            💰 Discounts
          </Button>
          <Button variant="outline" size="sm" onClick={loadMenu} className="text-xs">
            ↺
          </Button>
        </div>

        {/* Shop scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          <Button variant={selectedShop === 'All' ? 'default' : 'outline'} size="sm"
            onClick={() => setSelectedShop('All')}
            className={`text-xs whitespace-nowrap flex-shrink-0 ${selectedShop === 'All' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
            All Shops
          </Button>
          {visibleShops.map(shop => (
            <Button key={shop.id} variant={selectedShop === shop.id ? 'default' : 'outline'} size="sm"
              onClick={() => setSelectedShop(shop.id)}
              className={`text-xs whitespace-nowrap flex-shrink-0 ${selectedShop === shop.id ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
              {shop.name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {visibleShops.map(shop => {
            const shopItems = itemsForShop(shop.id);
            if (shopItems.length === 0) return null;
            const healthyPct = shop.totalItems > 0 ? Math.round((shop.healthyCount / shop.totalItems) * 100) : 0;

            return (
              <div key={shop.id} className="space-y-3">
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-500 p-2 rounded-lg flex-shrink-0">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-semibold">{shop.name}</h2>
                          <Badge variant="outline" className="text-xs">
                            {shop.campus === 'RUPP' ? '🎓 RUPP' : '📚 IFL'}
                          </Badge>
                          {healthyPct >= 70 && <Badge className="bg-green-500 text-xs">🌿 {healthyPct}% Healthy</Badge>}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{shop.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{shopItems.length} items available</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <div className="space-y-3">
                  {shopItems.map(item => (
                    <MenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
                  ))}
                </div>
              </div>
            );
          })}

          {visibleShops.every(s => itemsForShop(s.id).length === 0) && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No items found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
