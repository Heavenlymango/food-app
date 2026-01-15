import { Order } from '../App';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, CheckCircle2, ShoppingBag, Store, AlertTriangle, XCircle, Leaf } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { CancelOrderDialog } from './CancelOrderDialog';
import { OrderChatDialog } from './OrderChatDialog';
import { SHOPS } from '../data/menuData';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface OrderTrackerProps {
  orders: Order[];
  studentId: string;
}

export function OrderTracker({ orders, studentId }: OrderTrackerProps) {
  // Calculate if an order is late
  const calculateLateTime = (order: Order) => {
    if (order.status === 'completed' || order.status === 'ready') {
      return null;
    }

    const now = new Date();
    const estimatedTime = new Date(order.estimatedReadyTime);
    const diffMinutes = Math.floor((now.getTime() - estimatedTime.getTime()) / (1000 * 60));
    
    // Only show if order is late (after estimated time)
    if (diffMinutes > 0) {
      return diffMinutes;
    }
    
    return null;
  };

  // Calculate time remaining until ready
  const calculateTimeRemaining = (order: Order) => {
    if (order.status === 'completed' || order.status === 'ready') {
      return null;
    }

    const now = new Date();
    const estimatedTime = new Date(order.estimatedReadyTime);
    const diffMinutes = Math.floor((estimatedTime.getTime() - now.getTime()) / (1000 * 60));
    
    // Only show if order is not yet ready (positive remaining time)
    if (diffMinutes > 0) {
      return diffMinutes;
    }
    
    return null;
  };

  // Sort orders - late orders first, then by timestamp
  const sortedOrders = [...orders].sort((a, b) => {
    const aLate = calculateLateTime(a);
    const bLate = calculateLateTime(b);
    
    // Late orders come first
    if (aLate && !bLate) return -1;
    if (bLate && !aLate) return 1;
    
    // If both late, most late comes first
    if (aLate && bLate) return bLate - aLate;
    
    // Otherwise sort by timestamp (newest first)
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg">No orders yet</h2>
          <p className="text-sm text-gray-500 mt-1">Your orders will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ready Orders Alert */}
      {orders.some(o => o.status === 'ready') && (
        <Card className="bg-gradient-to-r from-green-500 to-green-600 border-green-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 rounded-full p-2 animate-pulse">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Your order is ready!</p>
                <p className="text-sm text-green-50">Head to the counter to pick it up 🎉</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Late Orders Alert */}
      {sortedOrders.some(o => calculateLateTime(o)) && (
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 border-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 rounded-full p-2 animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Order taking longer than expected</p>
                <p className="text-sm text-orange-50">Thanks for your patience!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {sortedOrders.map(order => {
        // Group order items by shop
        const itemsByShop = order.items.reduce((acc, item) => {
          if (!acc[item.shop]) {
            acc[item.shop] = [];
          }
          acc[item.shop].push(item);
          return acc;
        }, {} as Record<string, typeof order.items>);

        const lateMinutes = calculateLateTime(order);
        const timeRemaining = calculateTimeRemaining(order);
        const isVeryLate = lateMinutes && lateMinutes > 10;

        // Status display configuration
        const getStatusDisplay = () => {
          switch (order.status) {
            case 'preparing':
              return {
                label: 'Being Prepared',
                color: 'bg-blue-100 text-blue-800 border-blue-300',
                icon: Clock,
                iconColor: 'text-blue-600',
                borderColor: lateMinutes ? 'border-orange-400' : 'border-blue-200',
                bgColor: lateMinutes ? 'bg-orange-50' : '',
              };
            case 'ready':
              return {
                label: 'Ready for Pickup!',
                color: 'bg-green-100 text-green-800 border-green-300',
                icon: CheckCircle2,
                iconColor: 'text-green-600',
                borderColor: 'border-green-400',
                bgColor: 'bg-green-50',
              };
            case 'completed':
              return {
                label: 'Completed',
                color: 'bg-gray-100 text-gray-700 border-gray-300',
                icon: CheckCircle2,
                iconColor: 'text-gray-500',
                borderColor: 'border-gray-200',
                bgColor: '',
              };
            default:
              return {
                label: 'Processing',
                color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: Clock,
                iconColor: 'text-yellow-600',
                borderColor: 'border-yellow-200',
                bgColor: '',
              };
          }
        };

        const statusDisplay = getStatusDisplay();
        const StatusIcon = statusDisplay.icon;

        return (
          <Card 
            key={order.id} 
            className={`relative border-2 transition-all ${statusDisplay.borderColor} ${statusDisplay.bgColor}`}
          >
            {/* Urgent Late Indicator */}
            {isVeryLate && (
              <div className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 shadow-xl z-10 animate-bounce">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            
            <CardHeader className="pb-3">
              {/* Status Badge - Large and Prominent */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border mb-3 ${statusDisplay.color}`}>
                <StatusIcon className={`h-5 w-5 ${order.status === 'ready' ? 'animate-pulse' : ''}`} />
                <span className="font-semibold">{statusDisplay.label}</span>
              </div>

              {/* Order Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {order.orderType === 'pickup' ? (
                        <>
                          <ShoppingBag className="w-3 h-3" />
                          Pickup
                        </>
                      ) : (
                        <>
                          <Store className="w-3 h-3" />
                          Dine-In
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Placed at {format(order.timestamp, 'h:mm a')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl text-orange-600">${order.total.toFixed(2)}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Time Estimate - Prominent Display */}
              {order.status === 'preparing' && (
                <div className={`rounded-lg p-3 border-2 ${
                  lateMinutes 
                    ? 'bg-orange-100 border-orange-400' 
                    : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-5 w-5 ${lateMinutes ? 'text-orange-600' : 'text-blue-600'}`} />
                      <span className={`text-sm font-medium ${lateMinutes ? 'text-orange-900' : 'text-blue-900'}`}>
                        Expected Ready Time:
                      </span>
                    </div>
                    <span className={`font-bold ${lateMinutes ? 'text-orange-700' : 'text-blue-700'}`}>
                      {format(order.estimatedReadyTime, 'h:mm a')}
                    </span>
                  </div>
                  {timeRemaining && !lateMinutes && (
                    <p className="text-xs text-blue-700 mt-1">
                      ⏱️ About {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                  {lateMinutes && (
                    <div className="flex items-center gap-1 mt-2">
                      <Badge className={`${isVeryLate ? 'bg-red-600 animate-pulse' : 'bg-orange-600'} text-white text-xs`}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {lateMinutes} min overdue - taking longer than expected
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {order.status === 'ready' && (
                <div className="bg-gradient-to-r from-green-100 to-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-600 text-white rounded-full p-2 animate-pulse">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 text-sm mb-1">
                        {order.orderType === 'pickup' 
                          ? '🎉 Ready for pickup!'
                          : '🎉 Your order is ready!'
                        }
                      </p>
                      <p className="text-xs text-green-800">
                        {order.orderType === 'pickup' 
                          ? 'Head to the counter to collect your order.'
                          : 'Find a seat and we\'ll bring it to you.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {order.status === 'completed' && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-sm font-medium">Order completed. Thank you! 🙏</p>
                  </div>
                </div>
              )}

              {/* Order Items Grouped by Shop */}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Order Details</p>
                {Object.entries(itemsByShop).map(([shopId, items]) => {
                  const shop = SHOPS.find(s => s.id === shopId);
                  if (!shop) return null;

                  return (
                    <div key={shopId} className="mb-4 last:mb-0">
                      {/* Shop Header with Campus Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{shop.name}</h4>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {shop.campus === 'RUPP' ? '🎓 RUPP' : '📚 IFL'}
                        </Badge>
                      </div>
                      {/* Shop Items - Visual Cards */}
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex gap-3 bg-white rounded-lg p-2 border border-gray-200">
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
                  );
                })}
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-orange-600">${order.total.toFixed(2)}</span>
              </div>

              {/* Chat Button - Only for active orders */}
              {(order.status === 'pending' || order.status === 'preparing' || order.status === 'ready') && (
                <div className="pt-2 border-t border-gray-200">
                  {Object.keys(itemsByShop).map(shopId => (
                    <OrderChatDialog
                      key={shopId}
                      orderId={order.id}
                      shopId={shopId}
                      studentName="You"  // Not displayed on student side
                      isShop={false}
                      studentId={studentId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}