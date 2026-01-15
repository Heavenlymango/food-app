import React, { useState, useEffect } from 'react';
import { MenuItem, Shop } from '../App';
import { MenuItemCard } from './MenuItemCard';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Filter, Store, Tag, Percent, Gift, DollarSign } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { SHOPS, MENU_ITEMS } from '../data/menuData';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface MenuBrowserProps {
  onAddToCart: (item: MenuItem) => void;
}

export function MenuBrowser({ onAddToCart }: MenuBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<string>('All');
  const [selectedCampus, setSelectedCampus] = useState<'All' | 'RUPP' | 'IFL'>('All');
  const [showHealthyOnly, setShowHealthyOnly] = useState(false);
  const [showSpecialsOnly, setShowSpecialsOnly] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);

  // Fetch all active promotions
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        // Fetch promotions for all shops
        const allPromotions: any[] = [];
        for (const shop of SHOPS) {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/promotions/${shop.id}`,
            { headers: { Authorization: `Bearer ${publicAnonKey}` } }
          );
          if (response.ok) {
            const data = await response.json();
            const activePromos = (data.promotions || []).filter((p: any) => {
              if (!p.isActive) return false;
              const now = new Date();
              const start = new Date(p.startDate);
              const end = new Date(p.endDate);
              return now >= start && now <= end;
            });
            allPromotions.push(...activePromos);
          }
        }
        setPromotions(allPromotions);
      } catch (error) {
        console.error('Error fetching promotions:', error);
      }
    };
    fetchPromotions();
  }, []);

  const getShopPromotions = (shopId: string) => {
    return promotions.filter(p => p.shopId === shopId);
  };

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'bogo': return <Gift className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const filteredShops = SHOPS.filter(shop => {
    const matchesCampus = selectedCampus === 'All' || shop.campus === selectedCampus;
    const matchesShop = selectedShop === 'All' || shop.id === selectedShop;
    return matchesCampus && matchesShop;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Campus Filter - Prominent */}
        <div className="flex gap-2">
          <Button
            variant={selectedCampus === 'All' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSelectedCampus('All'); setSelectedShop('All'); }}
            className="text-xs flex-1"
          >
            🏫 All Campuses
          </Button>
          <Button
            variant={selectedCampus === 'RUPP' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSelectedCampus('RUPP'); setSelectedShop('All'); }}
            className="text-xs flex-1"
          >
            🎓 RUPP
          </Button>
          <Button
            variant={selectedCampus === 'IFL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSelectedCampus('IFL'); setSelectedShop('All'); }}
            className="text-xs flex-1"
          >
            📚 IFL
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showHealthyOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHealthyOnly(!showHealthyOnly)}
            className="text-xs flex-1"
          >
            🥗 Healthy
          </Button>
          <Button
            variant={showSpecialsOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowSpecialsOnly(!showSpecialsOnly)}
            className="text-xs flex-1"
          >
            💰 Specials
          </Button>
        </div>

        {/* Scrollable Shop Filter */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Select Shop:</p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
            <Button
              variant={selectedShop === 'All' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedShop('All')}
              className="text-xs whitespace-nowrap flex-shrink-0 snap-start"
            >
              All Shops
            </Button>
            {SHOPS.filter(shop => selectedCampus === 'All' || shop.campus === selectedCampus).map(shop => (
              <Button
                key={shop.id}
                variant={selectedShop === shop.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedShop(shop.id)}
                className="text-xs whitespace-nowrap flex-shrink-0 snap-start"
              >
                {shop.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Shops Display */}
      <div className="space-y-6">
        {filteredShops.map(shop => {
          const shopItems = MENU_ITEMS.filter(item => {
            const matchesShop = item.shop === shop.id;
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesHealthy = !showHealthyOnly || item.isHealthy;
            const matchesSpecials = !showSpecialsOnly || item.isSpecial;
            return matchesShop && matchesSearch && matchesHealthy && matchesSpecials;
          });

          if (shopItems.length === 0) return null;

          const healthyPercent = Math.round((shop.healthyCount / shop.totalItems) * 100);
          const shopPromos = getShopPromotions(shop.id);

          return (
            <div key={shop.id} className="space-y-3">
              {/* Shop Header */}
              <Card className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-500 p-2 rounded-lg flex-shrink-0">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base">{shop.name}</h2>
                        <Badge variant="outline" className="text-xs">
                          {shop.campus === 'RUPP' ? '🎓 RUPP' : '📚 IFL'}
                        </Badge>
                        {healthyPercent >= 70 && (
                          <Badge className="bg-green-500 text-xs">
                            🌿 {healthyPercent}% Healthy
                          </Badge>
                        )}
                        {healthyPercent < 30 && (
                          <Badge variant="secondary" className="text-xs">
                            Fast Food
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{shop.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {shop.healthyCount} healthy / {shop.totalItems} items
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Active Promotions Banner */}
              {shopPromos.length > 0 && (
                <div className="space-y-2">
                  {shopPromos.map((promo) => (
                    <Alert key={promo.id} className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
                      <div className="flex items-start gap-3">
                        <div className="bg-pink-500 p-2 rounded-lg text-white flex-shrink-0">
                          {getPromotionIcon(promo.type)}
                        </div>
                        <AlertDescription className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-semibold text-sm text-pink-900">🎉 {promo.name}</p>
                                <Badge className="bg-pink-500 text-xs">
                                  {promo.type === 'percentage' 
                                    ? `${promo.discountValue}% OFF` 
                                    : promo.type === 'fixed'
                                    ? `$${promo.discountValue} OFF`
                                    : promo.type === 'bogo'
                                    ? 'BOGO'
                                    : 'BUNDLE'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-700">{promo.description}</p>
                              {(promo.minPurchase || promo.startTime || promo.validDays?.length > 0) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {promo.minPurchase && (
                                    <Badge variant="outline" className="text-xs">
                                      Min: ${promo.minPurchase}
                                    </Badge>
                                  )}
                                  {promo.startTime && promo.endTime && (
                                    <Badge variant="outline" className="text-xs">
                                      {promo.startTime} - {promo.endTime}
                                    </Badge>
                                  )}
                                  {promo.validDays && promo.validDays.length > 0 && promo.validDays.length < 7 && (
                                    <Badge variant="outline" className="text-xs">
                                      {promo.validDays.map((d: string) => d.slice(0, 3)).join(', ')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Shop Items */}
              <div className="space-y-3">
                {shopItems.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredShops.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No items found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}