import { useState, useEffect, useRef } from 'react';
import { Bell, X, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Notification {
  id: string;
  studentId: string;
  orderId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  studentId: string;
  onNotificationClick?: (orderId: string) => void;
}

export function NotificationBell({ studentId, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownToast, setHasShownToast] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/student/notifications?studentId=${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch notifications');
        return;
      }

      const data = await response.json();
      const newNotifications = data.notifications || [];
      
      // Show toast for new unread notifications
      newNotifications.forEach((notif: Notification) => {
        if (!notif.read && !hasShownToast.has(notif.id)) {
          toast.success(notif.title, {
            description: notif.message,
            duration: 5000,
          });
          setHasShownToast(prev => new Set([...prev, notif.id]));
        }
      });
      
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/student/notifications/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            notificationId,
            studentId,
          }),
        }
      );
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/student/notifications/read-all`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            studentId,
          }),
        }
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (onNotificationClick) {
      onNotificationClick(notification.orderId);
    }
    setIsOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleBellClick = () => {
    // Toggle dropdown
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBellClick}
        className="relative text-gray-600 hover:text-orange-600"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-600">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] overflow-hidden bg-white rounded-lg shadow-xl border z-50 flex flex-col">
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-600 text-white">{unreadCount}</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">We'll notify you about your orders</p>
            </div>
          ) : (
            <div className="overflow-y-auto divide-y">
              {notifications.map((notification) => {
                // Determine notification type and styling
                const getNotificationStyle = () => {
                  const title = notification.title.toLowerCase();
                  const message = notification.message.toLowerCase();
                  
                  // Order ready
                  if (title.includes('ready') || message.includes('ready for pickup')) {
                    return {
                      icon: '🎉',
                      iconBg: 'bg-green-100',
                      iconColor: 'text-green-600',
                      titleColor: 'text-green-900',
                      borderColor: 'border-l-green-500',
                      bg: notification.read ? 'bg-white' : 'bg-green-50',
                    };
                  }
                  
                  // Order late/delayed
                  if (title.includes('delay') || title.includes('late') || message.includes('taking longer')) {
                    return {
                      icon: '⏰',
                      iconBg: 'bg-orange-100',
                      iconColor: 'text-orange-600',
                      titleColor: 'text-orange-900',
                      borderColor: 'border-l-orange-500',
                      bg: notification.read ? 'bg-white' : 'bg-orange-50',
                    };
                  }
                  
                  // Order preparing/in progress
                  if (title.includes('preparing') || title.includes('accepted') || message.includes('being prepared')) {
                    return {
                      icon: '🍳',
                      iconBg: 'bg-blue-100',
                      iconColor: 'text-blue-600',
                      titleColor: 'text-blue-900',
                      borderColor: 'border-l-blue-500',
                      bg: notification.read ? 'bg-white' : 'bg-blue-50',
                    };
                  }
                  
                  // Order completed
                  if (title.includes('complete') || message.includes('completed')) {
                    return {
                      icon: '✅',
                      iconBg: 'bg-gray-100',
                      iconColor: 'text-gray-600',
                      titleColor: 'text-gray-900',
                      borderColor: 'border-l-gray-500',
                      bg: notification.read ? 'bg-white' : 'bg-gray-50',
                    };
                  }
                  
                  // Order cancelled
                  if (title.includes('cancel') || message.includes('cancelled')) {
                    return {
                      icon: '❌',
                      iconBg: 'bg-red-100',
                      iconColor: 'text-red-600',
                      titleColor: 'text-red-900',
                      borderColor: 'border-l-red-500',
                      bg: notification.read ? 'bg-white' : 'bg-red-50',
                    };
                  }
                  
                  // Shop message
                  if (title.includes('message') || message.includes('sent you a message')) {
                    return {
                      icon: '💬',
                      iconBg: 'bg-purple-100',
                      iconColor: 'text-purple-600',
                      titleColor: 'text-purple-900',
                      borderColor: 'border-l-purple-500',
                      bg: notification.read ? 'bg-white' : 'bg-purple-50',
                    };
                  }
                  
                  // Default
                  return {
                    icon: '🔔',
                    iconBg: 'bg-gray-100',
                    iconColor: 'text-gray-600',
                    titleColor: 'text-gray-900',
                    borderColor: 'border-l-gray-400',
                    bg: notification.read ? 'bg-white' : 'bg-orange-50',
                  };
                };

                const style = getNotificationStyle();

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-100 transition-colors border-l-4 ${style.borderColor} ${style.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center text-lg`}>
                        {style.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm font-semibold ${style.titleColor} ${!notification.read ? 'font-bold' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(notification.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}