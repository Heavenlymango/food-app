import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { MessageCircle, Send } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderId: string;
  senderType: 'shop' | 'student';
  message: string;
  timestamp: string;
}

interface OrderChatDialogProps {
  orderId: string;
  shopId: string;
  studentName: string;
  isShop?: boolean;
  studentId?: string;
}

export function OrderChatDialog({ 
  orderId, 
  shopId, 
  studentName,
  isShop = false,
  studentId
}: OrderChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when student opens chat
    if (isOpen && !isShop && studentId) {
      api.post('/api/messages/mark-read', { studentId, orderId });
    }
  }, [isOpen, isShop, studentId, orderId]);

  const fetchMessages = async () => {
    try {
      const data = await api.get(`/api/messages/${orderId}`);
      setMessages(data.messages);
      if (!isShop && studentId) {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      await api.post('/api/messages/send', {
        orderId,
        senderId: isShop ? shopId : studentId,
        senderType: isShop ? 'shop' : 'student',
        message: newMessage.trim(),
      });

      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSendMessage = isShop || messages.some(m => m.senderType === 'shop');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-orange-600 text-orange-600 hover:bg-orange-50"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {isShop ? 'Contact Student' : 'Messages'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isShop ? `Chat with ${studentName}` : `Chat with ${shopId}`}
          </DialogTitle>
          <DialogDescription>
            {isShop ? 'Send a message to the student about their order' : 'View and reply to messages from the shop'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[400px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg mb-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">
                  {isShop 
                    ? 'Start a conversation with the student' 
                    : 'No messages yet'}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    (isShop && msg.senderType === 'shop') || 
                    (!isShop && msg.senderType === 'student')
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      (isShop && msg.senderType === 'shop') || 
                      (!isShop && msg.senderType === 'student')
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        (isShop && msg.senderType === 'shop') || 
                        (!isShop && msg.senderType === 'student')
                          ? 'text-orange-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {canSendMessage ? (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isShop ? 'Type your message...' : 'Reply to shop...'}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
              The shop hasn't contacted you yet. You can reply once they send a message.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}