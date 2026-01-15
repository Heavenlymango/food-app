import { useState, useEffect } from 'react';
import { MenuBrowser } from './components/MenuBrowser';
import { Cart } from './components/Cart';
import { OrderTracker } from './components/OrderTracker';
import { Recommendations } from './components/Recommendations';
import { StudentProfile } from './components/StudentProfile';
import { AuthForm } from './components/AuthForm';
import { SellerDashboard } from './components/SellerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationBell } from './components/NotificationBell';
import { MessageNotificationMonitor } from './components/MessageNotificationMonitor';
import { UtensilsCrossed, ShoppingCart, Receipt, Lightbulb, LogOut, Bell, User } from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from './utils/supabase/info';
import logo from 'figma:asset/4b19b246aa3bf4bb775a1c4bcd3c068341bc26c6.png';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
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
  status: 'preparing' | 'ready' | 'completed';
  orderType: 'pickup' | 'dine-in';
  timestamp: Date;
  estimatedReadyTime: Date;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders' | 'recommendations' | 'profile'>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);;

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('campusfood_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('campusfood_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Fetch student orders when user logs in
  useEffect(() => {
    if (user && user.role === 'student') {
      fetchStudentOrders();
      // Poll for order updates every 5 seconds
      const interval = setInterval(fetchStudentOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchStudentOrders = async () => {
    if (!user || user.role !== 'student') return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/student/orders?studentId=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch orders:', errorData);
        return;
      }

      const data = await response.json();
      
      // Convert backend orders to frontend format
      const fetchedOrders: Order[] = data.orders.map((order: any) => ({
        id: order.id,
        items: order.items,
        total: order.total,
        status: order.status,
        orderType: order.orderType,
        timestamp: new Date(order.createdAt),
        estimatedReadyTime: new Date(order.estimatedReadyTime),
      }));
      
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    localStorage.setItem('campusfood_user', JSON.stringify(authenticatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('campusfood_user');
    setCart([]);
    setOrders([]);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        toast.success(`Added another ${item.name}!`, {
          description: `${existing.quantity + 1}x in cart • $${((existing.quantity + 1) * item.price).toFixed(2)}`,
          duration: 2000,
        });
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      toast.success(`${item.name} added to cart!`, {
        description: `$${item.price.toFixed(2)} • From ${item.shop}`,
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

  const placeOrder = async (orderType: 'pickup' | 'dine-in') => {
    if (!user || user.role !== 'student') {
      alert('Please login as a student to place orders');
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Smart time calculation
    const estimatedReadyTime = calculateEstimatedReadyTime(cart);
    
    // Get shop ID from first item in cart (assuming all items from same shop)
    const shopId = cart[0]?.shop;
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/orders/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          studentId: user.id,
          shopId,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            category: item.category,
            calories: item.calories,
            preparationTime: item.preparationTime,
            isHealthy: item.isHealthy,
            isSpecial: item.isSpecial,
            shop: item.shop,
          })),
          total,
          orderType,
          estimatedReadyTime: estimatedReadyTime.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      const newOrder: Order = {
        id: data.order.id,
        items: [...cart],
        total,
        status: 'preparing',
        orderType,
        timestamp: new Date(),
        estimatedReadyTime,
      };
      
      setOrders(prev => [newOrder, ...prev]);
      setCart([]);
      setActiveTab('orders');
    } catch (error: any) {
      console.error('Place order error:', error);
      alert(error.message || 'Failed to place order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Show seller dashboard if user is a seller
  if (user.role === 'seller') {
    return <SellerDashboard user={user} onLogout={handleLogout} />;
  }

  // Show admin dashboard if user is an admin
  if (user.role === 'admin' || user.role === 'super_admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 to-amber-50">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Campus Food" 
              className="h-10 w-auto"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">
                Student: {user.name}
              </p>
            </div>
            <NotificationBell 
              studentId={user.id}
              onNotificationClick={(orderId) => {
                setActiveTab('orders');
              }}
            />
            <MessageNotificationMonitor
              userId={user.id}
              userType="student"
              onNewMessage={() => {
                setActiveTab('orders');
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-orange-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 max-w-lg mx-auto">
        {activeTab === 'menu' && <MenuBrowser onAddToCart={addToCart} />}
        {activeTab === 'recommendations' && <Recommendations onAddToCart={addToCart} />}
        {activeTab === 'cart' && (
          <Cart
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onPlaceOrder={placeOrder}
          />
        )}
        {activeTab === 'orders' && <OrderTracker orders={orders} studentId={user.id} />}
        {activeTab === 'profile' && (
          <StudentProfile 
            user={user} 
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('campusfood_user', JSON.stringify(updatedUser));
            }}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation ${
              activeTab === 'menu' 
                ? 'text-orange-600' 
                : 'text-gray-500'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <UtensilsCrossed className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap">Menu</span>
          </button>

          <button
            onClick={() => setActiveTab('cart')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative touch-manipulation ${
              activeTab === 'cart' 
                ? 'text-orange-600' 
                : 'text-gray-500'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs bg-orange-600">
                  {cartItemCount}
                </Badge>
              )}
            </div>
            <span className="text-xs font-medium whitespace-nowrap">Cart</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors relative touch-manipulation ${
              activeTab === 'orders' 
                ? 'text-orange-600' 
                : 'text-gray-500'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative flex-shrink-0">
              <Receipt className="w-5 h-5" />
              {orders.some(o => o.status === 'ready') && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs font-medium whitespace-nowrap">Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation ${
              activeTab === 'recommendations' 
                ? 'text-orange-600' 
                : 'text-gray-500'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Lightbulb className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap">Tips</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation ${
              activeTab === 'profile' 
                ? 'text-orange-600' 
                : 'text-gray-500'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Smart time calculation function
function calculateEstimatedReadyTime(cart: CartItem[]): Date {
  // Base processing time (order review, payment, queue)
  const BASE_PROCESSING_TIME = 3; // minutes
  
  // Get the maximum preparation time from all items
  const maxPrepTime = Math.max(...cart.map(item => item.preparationTime));
  
  // Calculate total item quantity
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Add buffer for quantity (more items = more time)
  // +2 min if more than 3 items, +4 min if more than 6 items
  let quantityBuffer = 0;
  if (totalQuantity > 6) {
    quantityBuffer = 4;
  } else if (totalQuantity > 3) {
    quantityBuffer = 2;
  }
  
  // Check if it's peak hours (8:30-9:15am, 11am-2pm, or 5pm-7pm)
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isBreakfastRush = (hour === 8 && minute >= 30) || (hour === 9 && minute < 15);
  const isLunchRush = hour >= 11 && hour < 14;
  const isDinnerRush = hour >= 17 && hour < 19;
  const isPeakHour = isBreakfastRush || isLunchRush || isDinnerRush;
  const peakHourBuffer = isPeakHour ? 5 : 0;
  
  // Check if items are from different categories (sequential preparation needed)
  const categories = new Set(cart.map(item => item.category));
  const categoryBuffer = categories.size > 2 ? 3 : 0;
  
  // Calculate total estimated time
  const totalMinutes = 
    BASE_PROCESSING_TIME + 
    maxPrepTime + 
    quantityBuffer + 
    peakHourBuffer + 
    categoryBuffer;
  
  // Return estimated ready time
  return new Date(Date.now() + totalMinutes * 60000);
}