import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign,
  Users,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Leaf,
  Bell,
  LogOut,
  UtensilsCrossed,
  Tag,
  Settings as SettingsIcon
} from 'lucide-react';
import { CancelOrderDialog } from './CancelOrderDialog';
import { OrderChatDialog } from './OrderChatDialog';
import { MenuManagement } from './MenuManagement';
import { PromotionManagement } from './PromotionManagement';
import { ShopSettings } from './ShopSettings';
import { MessageNotificationMonitor } from './MessageNotificationMonitor';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../utils/api';
import logo from 'figma:asset/4b19b246aa3bf4bb775a1c4bcd3c068341bc26c6.png';

interface Order {
  id: string;
  studentId: string;
  studentName: string;
  items: Array<{ 
    id: string;
    name: string; 
    description: string;
    quantity: number; 
    price: number;
    image: string;
    category: string;
    calories: number;
    preparationTime: number;
    isHealthy: boolean;
    isSpecial: boolean;
    shop: string;
  }>;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderTime: string;
  orderType: 'pickup' | 'dine-in';
  estimatedReadyTime?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  isNewCancellation?: boolean;
}

interface SellerDashboardProps {
  user: {
    id: string;
    name: string;
    shopId: string;
    role: 'seller';
  };
  onLogout: () => void;
}

export function SellerDashboard({ user, onLogout }: SellerDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    today: { orders: 0, revenue: 0 },
    pending: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.get('/api/seller/orders', { shopId: user.shopId });
      setOrders(data.orders);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      console.error('Error details:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], cancellationReason?: string) => {
    try {
      await api.post('/api/seller/update-order', {
        orderId,
        status,
        shopId: user.shopId,
        cancellationReason,
      });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const markCancelledAsViewed = async () => {
    try {
      await api.post('/api/seller/mark-cancelled-viewed', {
        shopId: user.shopId,
      });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to mark cancelled as viewed:', err);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Check if an order is late
  const isOrderLate = (order: Order) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return 0;
    }
    
    const now = new Date();
    const orderTime = new Date(order.orderTime);
    
    // If order is from a previous day and still not completed, it's definitely late
    const orderDate = orderTime.toDateString();
    const todayDate = now.toDateString();
    
    if (orderDate !== todayDate) {
      // Calculate minutes since order was placed
      const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
      return diffMinutes;
    }
    
    // If order has estimated ready time, check if we're past it
    if (order.estimatedReadyTime) {
      const estimatedTime = new Date(order.estimatedReadyTime);
      const diffMinutes = Math.floor((now.getTime() - estimatedTime.getTime()) / (1000 * 60));
      return diffMinutes > 0 ? diffMinutes : 0;
    }
    
    // If no estimated time but order is more than 30 minutes old, consider it late
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    return diffMinutes > 30 ? diffMinutes : 0;
  };

  // Sort orders by late time (late orders first)
  const sortByLateTime = (ordersList: Order[]) => {
    return [...ordersList].sort((a, b) => {
      const aLate = isOrderLate(a);
      const bLate = isOrderLate(b);
      if (aLate > 0 && bLate === 0) return -1;
      if (bLate > 0 && aLate === 0) return 1;
      if (aLate > 0 && bLate > 0) return bLate - aLate;
      return new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime();
    });
  };

  const pendingOrders = sortByLateTime(orders.filter(o => o.status === 'pending'));
  const preparingOrders = sortByLateTime(orders.filter(o => o.status === 'preparing'));
  const readyOrders = sortByLateTime(orders.filter(o => o.status === 'ready'));
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const newCancellationsCount = cancelledOrders.filter(o => o.isNewCancellation).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Message Notification Monitor */}
      <MessageNotificationMonitor
        userId={user.shopId}
        userType="shop"
        onNewMessage={() => {
          // Refresh orders when new message arrives
          fetchOrders();
        }}
      />

      {/* Header */}
      <div className="bg-orange-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Campus Food" 
              className="h-12 w-auto bg-white rounded-lg p-1"
            />
            <div>
              <h1>{user.name}</h1>
              <p className="text-orange-100 text-sm">Shop {user.shopId} - Seller Dashboard</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="text-white hover:bg-orange-700"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Main Navigation Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders
              {pendingOrders.length > 0 && (
                <Badge className="ml-1 bg-red-600">{pendingOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="promotions" className="gap-2">
              <Tag className="w-4 h-4" />
              Promotions
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              Shop Settings
            </TabsTrigger>
          </TabsList>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Today's Orders</p>
                    <p className="text-2xl mt-1">{stats.today.orders}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-orange-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Today's Revenue</p>
                    <p className="text-2xl mt-1">${stats.today.revenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Orders</p>
                    <p className="text-2xl mt-1">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Completed Today</p>
                    <p className="text-2xl mt-1">{stats.completed}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
            </div>

            {/* Orders Tabs */}
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="pending" className="relative">
                  Pending
                  {pendingOrders.length > 0 && (
                    <Badge className="ml-2 bg-red-600">{pendingOrders.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preparing">
                  Preparing
                  {preparingOrders.length > 0 && (
                    <Badge className="ml-2 bg-blue-600">{preparingOrders.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ready">
                  Ready
                  {readyOrders.length > 0 && (
                    <Badge className="ml-2 bg-green-600">{readyOrders.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled" onClick={markCancelledAsViewed}>
                  Cancelled
                  {newCancellationsCount > 0 && (
                    <Badge className="ml-2 bg-red-600">{newCancellationsCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingOrders.length === 0 ? (
                  <Card className="p-8 text-center text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No pending orders</p>
                  </Card>
                ) : (
                  pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      shopId={user.shopId}
                      onUpdateStatus={updateOrderStatus}
                      actions={
                        <>
                          <OrderChatDialog
                            orderId={order.id}
                            shopId={user.shopId}
                            studentName={order.studentName}
                            isShop={true}
                          />
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Preparing
                          </Button>
                          <CancelOrderDialog
                            orderId={order.id}
                            onConfirm={(orderId, reason) => updateOrderStatus(orderId, 'cancelled', reason)}
                          />
                        </>
                      }
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="preparing" className="space-y-4 mt-4">
                {preparingOrders.length === 0 ? (
                  <Card className="p-8 text-center text-gray-500">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No orders in preparation</p>
                  </Card>
                ) : (
                  preparingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      shopId={user.shopId}
                      onUpdateStatus={updateOrderStatus}
                      actions={
                        <>
                          <OrderChatDialog
                            orderId={order.id}
                            shopId={user.shopId}
                            studentName={order.studentName}
                            isShop={true}
                          />
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark as Ready
                          </Button>
                        </>
                      }
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="ready" className="space-y-4 mt-4">
                {readyOrders.length === 0 ? (
                  <Card className="p-8 text-center text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No orders ready for pickup</p>
                  </Card>
                ) : (
                  readyOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      shopId={user.shopId}
                      onUpdateStatus={updateOrderStatus}
                      actions={
                        <>
                          <OrderChatDialog
                            orderId={order.id}
                            shopId={user.shopId}
                            studentName={order.studentName}
                            isShop={true}
                          />
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="bg-gray-600 hover:bg-gray-700"
                          >
                            Complete Order
                          </Button>
                        </>
                      }
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4 mt-4">
                {completedOrders.length === 0 ? (
                  <Card className="p-8 text-center text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No completed orders today</p>
                  </Card>
                ) : (
                  completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-4 mt-4">
                {cancelledOrders.length === 0 ? (
                  <Card className="p-8 text-center text-gray-500">
                    <XCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No cancelled orders</p>
                  </Card>
                ) : (
                  cancelledOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* MENU TAB */}
          <TabsContent value="menu" className="space-y-6">
            <MenuManagement shopId={user.shopId} shopName={user.name} />
          </TabsContent>

          {/* PROMOTIONS TAB */}
          <TabsContent value="promotions" className="space-y-6">
            <PromotionManagement shopId={user.shopId} menuItems={menuItems} />
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-6">
            <ShopSettings shopId={user.shopId} user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OrderCard({ 
  order, 
  onUpdateStatus, 
  actions 
}: { 
  order: Order; 
  onUpdateStatus: (id: string, status: Order['status'], cancellationReason?: string) => void;
  actions?: React.ReactNode;
}) {
  // Calculate if order is late
  const calculateLateTime = () => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return null;
    }

    const now = new Date();
    const orderTime = new Date(order.orderTime);
    
    // If order is from a previous day and still not completed, it's definitely late
    const orderDate = orderTime.toDateString();
    const todayDate = now.toDateString();
    
    if (orderDate !== todayDate) {
      // Calculate minutes since order was placed
      const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
      return diffMinutes;
    }
    
    // If order has estimated ready time, check if we're past it
    if (order.estimatedReadyTime) {
      const estimatedTime = new Date(order.estimatedReadyTime);
      const diffMinutes = Math.floor((now.getTime() - estimatedTime.getTime()) / (1000 * 60));
      return diffMinutes > 0 ? diffMinutes : null;
    }
    
    // If no estimated time but order is more than 30 minutes old, consider it late
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    return diffMinutes > 30 ? diffMinutes : null;
  };

  const lateMinutes = calculateLateTime();
  const isVeryLate = lateMinutes && lateMinutes > 10;
  
  // Check if order is from a previous day
  const orderTime = new Date(order.orderTime);
  const isFromYesterday = orderTime.toDateString() !== new Date().toDateString();

  // Status display configuration
  const getStatusDisplay = () => {
    switch (order.status) {
      case 'pending':
        return {
          label: 'Pending Acceptance',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: Clock,
        };
      case 'preparing':
        return {
          label: 'In Preparation',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: ShoppingBag,
        };
      case 'ready':
        return {
          label: 'Ready for Pickup',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: Bell,
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: CheckCircle2,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: XCircle,
        };
      default:
        return {
          label: order.status,
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Clock,
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <Card className={`p-4 relative transition-all ${
      lateMinutes 
        ? lateMinutes > 10 
          ? 'border-2 border-red-500 bg-red-50 shadow-lg' 
          : 'border-2 border-orange-400 bg-orange-50'
        : 'border border-gray-200'
    }`}>
      {/* Urgent Late Indicator */}
      {isVeryLate && (
        <div className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 shadow-xl z-10">
          <AlertTriangle className="h-5 w-5" />
        </div>
      )}
      
      {/* Header Section with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
          </div>
          
          {/* Status Badge - Prominent Display */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusDisplay.color} mb-2`}>
            <StatusIcon className="h-4 w-4" />
            <span className="font-medium text-sm">{statusDisplay.label}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="outline" className="text-xs">
              {order.orderType === 'pickup' ? '🥡 Pickup' : '🍽️ Dine-in'}
            </Badge>
            {isFromYesterday && (
              <Badge className="bg-purple-600 text-white text-xs">
                📅 Previous Day Order
              </Badge>
            )}
            {lateMinutes && (
              <Badge className={`${isVeryLate ? 'bg-red-600 animate-pulse' : 'bg-orange-500'} text-white text-xs flex items-center gap-1`}>
                <AlertTriangle className="h-3 w-3" />
                {lateMinutes} min overdue
              </Badge>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-2xl text-orange-600">${order.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Student:</span> {order.studentName}
        </p>
        <p className="text-sm text-gray-500">ID: {order.studentId}</p>
      </div>

      {/* Time Information - Enhanced ETA Display */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Order Placed:</span>
          <span className={`text-sm font-medium ${isFromYesterday && order.status !== 'completed' && order.status !== 'cancelled' ? 'text-red-600' : 'text-gray-900'}`}>
            {isFromYesterday && order.status !== 'completed' && order.status !== 'cancelled' && '⚠️ '}
            {new Date(order.orderTime).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
        
        {/* ETA Display - Only for active orders */}
        {order.estimatedReadyTime && order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className={`flex items-center justify-between pt-2 border-t ${lateMinutes ? 'border-orange-300' : 'border-gray-200'}`}>
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Expected Ready Time:
            </span>
            <span className={`text-sm font-bold ${
              lateMinutes 
                ? lateMinutes > 10 
                  ? 'text-red-700 text-base' 
                  : 'text-orange-700'
                : 'text-green-700'
            }`}>
              {new Date(order.estimatedReadyTime).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
              {lateMinutes && ` (${lateMinutes}m overdue)`}
              {isFromYesterday && !lateMinutes && ' (OVERDUE)'}
            </span>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="border-t border-b border-gray-200 py-3 mb-3 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Order Items</p>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex gap-3 bg-white rounded-lg p-2 border border-gray-200">
              {/* Item Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.quantity}× {item.name}
                      </span>
                      {item.isHealthy && (
                        <Leaf className="w-3 h-3 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {item.isSpecial && (
                        <Badge className="bg-orange-500 text-xs px-1.5 py-0">
                          -30%
                        </Badge>
                      )}
                      {item.isHealthy && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          Healthy
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Item Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">${(item.quantity * item.price).toFixed(2)}</p>
                    {item.isSpecial && (
                      <p className="text-xs text-gray-400 line-through">
                        ${((item.price / 0.7) * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancellation Reason */}
      {order.status === 'cancelled' && order.cancellationReason && (
        <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Cancellation Reason:
              </p>
              <p className="text-sm text-red-800 mt-1">
                {order.cancellationReason}
              </p>
              {order.cancelledAt && (
                <p className="text-xs text-red-600 mt-2">
                  Cancelled on: {new Date(order.cancelledAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {actions && (
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          {actions}
        </div>
      )}
    </Card>
  );
}