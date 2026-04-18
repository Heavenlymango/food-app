import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { api } from '../utils/api';
import { MessageCircle } from 'lucide-react';

interface MessageNotificationMonitorProps {
  userId: string;
  userType: 'student' | 'shop';
  onNewMessage?: () => void;
}

export function MessageNotificationMonitor({ 
  userId, 
  userType,
  onNewMessage 
}: MessageNotificationMonitorProps) {
  const [lastMessageCount, setLastMessageCount] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      return () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      };
    };

    const playSound = createNotificationSound();
    (audioRef as any).current = playSound;
  }, []);

  // Poll for new messages
  useEffect(() => {
    const checkForNewMessages = async () => {
      try {
        const endpoint = userType === 'student' 
          ? `/api/messages/unread-count?studentId=${userId}`
          : `/api/messages/unread-count-shop?shopId=${userId}`;
        
        const data = await api.get(endpoint);
        
        // Check each order for new messages
        if (data.unreadByOrder) {
          Object.entries(data.unreadByOrder).forEach(([orderId, count]) => {
            const unreadCount = count as number;
            const previousCount = lastMessageCount[orderId] || 0;
            
            // New message detected
            if (unreadCount > previousCount) {
              const newMessagesCount = unreadCount - previousCount;
              
              // Play notification sound
              if (audioRef.current) {
                try {
                  (audioRef.current as any)();
                } catch (e) {
                  console.warn('Could not play notification sound:', e);
                }
              }
              
              // Show toast notification
              const shopName = data.orderDetails?.[orderId]?.shopName || 'Shop';
              const studentName = data.orderDetails?.[orderId]?.studentName || 'Student';
              
              toast(
                userType === 'student' 
                  ? `New message from ${shopName}` 
                  : `New message from ${studentName}`,
                {
                  description: `Order #${orderId.slice(-6)} - ${newMessagesCount} new message${newMessagesCount > 1 ? 's' : ''}`,
                  icon: <MessageCircle className="h-5 w-5 text-orange-600" />,
                  duration: 5000,
                  action: {
                    label: 'View',
                    onClick: () => {
                      onNewMessage?.();
                    },
                  },
                }
              );
              
              // Browser notification (if permission granted)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(
                  userType === 'student' ? `Message from ${shopName}` : `Message from ${studentName}`,
                  {
                    body: `You have ${newMessagesCount} new message${newMessagesCount > 1 ? 's' : ''}`,
                    icon: '/logo.png',
                    tag: `message-${orderId}`,
                    requireInteraction: false,
                  }
                );
              }
            }
          });
          
          // Update last message count
          setLastMessageCount(data.unreadByOrder);
        }
      } catch (err) {
        console.error('Failed to check for new messages:', err);
      }
    };

    // Check immediately
    checkForNewMessages();

    // Then check every 3 seconds
    const interval = setInterval(checkForNewMessages, 3000);

    return () => clearInterval(interval);
  }, [userId, userType, lastMessageCount, onNewMessage]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // This is a headless component
}
