import { useState, useEffect } from 'react';
import { MenuBrowser } from './components/MenuBrowser';
import { FoodScan } from './components/FoodScan';
import { Cart } from './components/Cart';
import { OrderTracker } from './components/OrderTracker';
import { Recommendations } from './components/Recommendations';
import { StudentProfile } from './components/StudentProfile';
import { AuthForm } from './components/AuthForm';
import { SellerDashboard } from './components/SellerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationBell } from './components/NotificationBell';
import { MessageNotificationMonitor } from './components/MessageNotificationMonitor';
import { UtensilsCrossed, ShoppingCart, Receipt, Lightbulb, User, LogOut, ScanLine } from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { supabase, userFromSession } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import logo from 'figma:asset/4b19b246aa3bf4bb775a1c4bcd3c068341bc26c6.png';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercent: number;
  discountedPrice: number;
  category: string;
  calories: number;
  isHealthy: boolean;
  isSpecial: boolean;
  image: string;
  preparationTime: number;
  shop: string;
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  healthyCount: number;
  totalItems: number;
  campus: 'RUPP' | 'IFL';
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderType: 'pickup' | 'dine-in';
  timestamp: Date;
  estimatedReadyTime: Date;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders' | 'recommendations' | 'profile'>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showScan, setShowScan] = useState(false);

  // ── Auth via Supabase (mirrors Flutter AuthProvider) ──────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? userFromSession(session) : null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? userFromSession(session) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch student orders from DB (mirrors Flutter getStudentOrders) ────────
  useEffect(() => {
    if (user && user.role === 'student') {
      fetchStudentOrders();
      const interval = setInterval(fetchStudentOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchStudentOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('orders')
      .select('*, shops!inner(shop_code, name), order_items(*)')
      .eq('student_id', session.user.id)
      .order('ordered_at', { ascending: false })
      .limit(50);

    if (error || !data) return;

    const mapped: Order[] = data.map((o: any) => ({
      id: o.id,
      items: (o.order_items ?? []).map((oi: any) => ({
        id: oi.menu_item_id ?? oi.id ?? '',
        name: oi.item_name,
        description: '',
        price: oi.unit_price,
        discountPercent: 0,
        discountedPrice: oi.unit_price,
        category: '',
        calories: 0,
        isHealthy: false,
        isSpecial: false,
        image: '',
        preparationTime: 15,
        shop: o.shops?.shop_code ?? '',
        quantity: oi.quantity,
      })),
      total: o.total_amount,
      status: o.status,
      orderType: o.service_type ?? 'pickup',
      timestamp: new Date(o.ordered_at),
      estimatedReadyTime: o.estimated_ready_time
        ? new Date(o.estimated_ready_time)
        : new Date(Date.now() + 15 * 60000),
    }));

    setOrders(mapped);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCart([]);
    setOrders([]);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        toast.success(`Added another ${item.name}!`, {
          description: `${existing.quantity + 1}x in cart • $${((existing.quantity + 1) * item.discountedPrice).toFixed(2)}`,
          duration: 2000,
        });
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      toast.success(`${item.name} added to cart!`, {
        description: `$${item.discountedPrice.toFixed(2)} • From ${item.shop}`,
        duration: 2000,
      });
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      setCart(prev => prev.filter(i => i.id !== id));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  };

  // ── Place order (mirrors Flutter placeOrder) ──────────────────────────────
  const placeOrder = async (orderType: 'pickup' | 'dine-in') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Please log in to place an order'); return; }
    if (user?.role !== 'student') { toast.error('Only students can place orders'); return; }
    if (cart.length === 0) return;

    // Resolve shop code ('A1', 'IFL-NC', …) → UUID required by orders.shop_id
    const shopCode = cart[0]?.shop;
    const { data: shopData, error: shopErr } = await supabase
      .from('shops')
      .select('id')
      .eq('shop_code', shopCode)
      .single();

    if (shopErr || !shopData) {
      toast.error(`Shop "${shopCode}" not found. Please try again.`);
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.discountedPrice * item.quantity, 0);
    const estimatedMinutes = calculateEstimatedMinutes(cart);

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/orders/place`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            shopId: shopData.id,
            serviceType: orderType,
            items: cart.map(item => ({
              menuItemId: item.id,
              name: item.name,
              price: item.discountedPrice,
              quantity: item.quantity,
            })),
            total,
            estimatedMinutes,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      toast.success('Order placed!', {
        description: `~${estimatedMinutes} min • $${total.toFixed(2)}`,
        duration: 3000,
      });

      setCart([]);
      setActiveTab('orders');
      fetchStudentOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthForm onAuthSuccess={() => {}} />;
  if (user.role === 'seller') return <SellerDashboard user={user} onLogout={handleLogout} />;
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={handleLogout} />;

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 to-amber-50">
      <Toaster position="top-center" richColors />

      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Campus Food" className="h-10 w-auto" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Student: {user.name}</p>
            </div>
            {activeTab === 'menu' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScan(true)}
                className="text-orange-600 hover:bg-orange-50 flex items-center gap-1"
              >
                <ScanLine className="w-4 h-4" />
                <span className="text-xs font-medium">Scan</span>
              </Button>
            )}
            <NotificationBell
              studentId={user.id}
              onNotificationClick={() => setActiveTab('orders')}
            />
            <MessageNotificationMonitor
              userId={user.id}
              userType="student"
              onNewMessage={() => setActiveTab('orders')}
            />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-orange-600">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {showScan && (
        <FoodScan onAddToCart={addToCart} onClose={() => setShowScan(false)} />
      )}

      <main className="px-4 py-4 max-w-lg mx-auto">
        {activeTab === 'menu' && <MenuBrowser onAddToCart={addToCart} />}
        {activeTab === 'recommendations' && <Recommendations onAddToCart={addToCart} />}
        {activeTab === 'cart' && (
          <Cart cart={cart} onUpdateQuantity={updateQuantity} onPlaceOrder={placeOrder} />
        )}
        {activeTab === 'orders' && <OrderTracker orders={orders} studentId={user.id} />}
        {activeTab === 'profile' && (
          <StudentProfile
            user={user}
            onUpdateUser={(updatedUser: any) => setUser({ ...user, ...updatedUser })}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {[
            { tab: 'menu', icon: UtensilsCrossed, label: 'Menu' },
            { tab: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartItemCount },
            { tab: 'orders', icon: Receipt, label: 'Orders', dot: orders.some(o => o.status === 'ready') },
            { tab: 'recommendations', icon: Lightbulb, label: 'Tips' },
            { tab: 'profile', icon: User, label: 'Profile' },
          ].map(({ tab, icon: Icon, label, badge, dot }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation ${activeTab === tab ? 'text-orange-600' : 'text-gray-500'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-5 h-5" />
                {badge != null && badge > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs bg-orange-600">
                    {badge}
                  </Badge>
                )}
                {dot && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function calculateEstimatedMinutes(cart: CartItem[]): number {
  const BASE = 3;
  const maxPrep = Math.max(...cart.map(i => i.preparationTime));
  const qty = cart.reduce((s, i) => s + i.quantity, 0);
  const qtyBuffer = qty > 6 ? 4 : qty > 3 ? 2 : 0;
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const isPeak = (h === 8 && m >= 30) || (h === 9 && m < 15) || (h >= 11 && h < 14) || (h >= 17 && h < 19);
  return BASE + maxPrep + qtyBuffer + (isPeak ? 5 : 0);
}
