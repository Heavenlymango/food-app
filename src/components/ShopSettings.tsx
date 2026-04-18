import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Store, 
  Clock,
  Phone,
  MapPin,
  Save,
  AlertCircle,
  Info,
  Calendar,
  XCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ShopSettingsProps {
  shopId: string;
  user: any;
}

interface ShopDetails {
  id: string;
  name: string;
  description: string;
  phone?: string;
  location?: string;
  campus: 'RUPP' | 'IFL';
  isOpen: boolean;
  operatingHours: {
    [key: string]: { open: string; close: string; isClosed: boolean };
  };
  specialClosures: SpecialClosure[];
}

interface SpecialClosure {
  id?: string;
  date: string;
  reason: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export function ShopSettings({ shopId, user }: ShopSettingsProps) {
  const [shopDetails, setShopDetails] = useState<ShopDetails>({
    id: shopId,
    name: '',
    description: '',
    phone: '',
    location: '',
    campus: 'RUPP',
    isOpen: true,
    operatingHours: {
      Monday: { open: '07:00', close: '18:00', isClosed: false },
      Tuesday: { open: '07:00', close: '18:00', isClosed: false },
      Wednesday: { open: '07:00', close: '18:00', isClosed: false },
      Thursday: { open: '07:00', close: '18:00', isClosed: false },
      Friday: { open: '07:00', close: '18:00', isClosed: false },
      Saturday: { open: '08:00', close: '17:00', isClosed: false },
      Sunday: { open: '00:00', close: '00:00', isClosed: true }
    },
    specialClosures: []
  });

  const [newClosure, setNewClosure] = useState({ date: '', reason: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadShopDetails();
  }, [shopId]);

  const loadShopDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/shop/${shopId}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShopDetails(prev => ({
          ...prev,
          ...data.shop,
          operatingHours: data.shop.operatingHours || prev.operatingHours,
          specialClosures: data.shop.specialClosures || []
        }));
      }
    } catch (error) {
      console.error('Error loading shop details:', error);
      toast.error('Failed to load shop details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/shop/${shopId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(shopDetails),
        }
      );

      if (response.ok) {
        toast.success('Shop details updated successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update shop');
      }
    } catch (error: any) {
      console.error('Error saving shop details:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShopStatus = async () => {
    const newStatus = !shopDetails.isOpen;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/shop/${shopId}/toggle-status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isOpen: newStatus }),
        }
      );

      if (response.ok) {
        setShopDetails(prev => ({ ...prev, isOpen: newStatus }));
        toast.success(`Shop ${newStatus ? 'opened' : 'closed'} successfully`);
      }
    } catch (error) {
      console.error('Error toggling shop status:', error);
      toast.error('Failed to update shop status');
    }
  };

  const handleHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setShopDetails(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  const toggleDayClosed = (day: string) => {
    setShopDetails(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          isClosed: !prev.operatingHours[day].isClosed
        }
      }
    }));
  };

  const addSpecialClosure = async () => {
    if (!newClosure.date || !newClosure.reason) {
      toast.error('Please fill in both date and reason');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/shop/${shopId}/closures`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newClosure),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShopDetails(prev => ({
          ...prev,
          specialClosures: [...prev.specialClosures, data.closure]
        }));
        setNewClosure({ date: '', reason: '' });
        toast.success('Special closure added');
      }
    } catch (error) {
      console.error('Error adding closure:', error);
      toast.error('Failed to add closure');
    }
  };

  const removeSpecialClosure = async (closureId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/shop/${shopId}/closures/${closureId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        setShopDetails(prev => ({
          ...prev,
          specialClosures: prev.specialClosures.filter(c => c.id !== closureId)
        }));
        toast.success('Closure removed');
      }
    } catch (error) {
      console.error('Error removing closure:', error);
      toast.error('Failed to remove closure');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shop Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage your shop details and operating hours
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Shop Status Alert */}
      <Alert variant={shopDetails.isOpen ? 'default' : 'destructive'}>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your shop is currently <strong>{shopDetails.isOpen ? 'OPEN' : 'CLOSED'}</strong> for orders.
        </AlertDescription>
      </Alert>

      {/* Quick Shop Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Shop Status
          </CardTitle>
          <CardDescription>
            Quickly open or close your shop for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Shop is {shopDetails.isOpen ? 'Open' : 'Closed'}</Label>
              <p className="text-sm text-muted-foreground">
                {shopDetails.isOpen 
                  ? 'Customers can place orders right now'
                  : 'Customers cannot place orders until you reopen'
                }
              </p>
            </div>
            <Switch
              checked={shopDetails.isOpen}
              onCheckedChange={toggleShopStatus}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your shop's public details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              value={shopDetails.name}
              onChange={(e) => setShopDetails(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your shop name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shopDesc">Description</Label>
            <Textarea
              id="shopDesc"
              value={shopDetails.description}
              onChange={(e) => setShopDetails(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell customers about your shop..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopPhone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="shopPhone"
                value={shopDetails.phone}
                onChange={(e) => setShopDetails(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+855-12-345-678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopLocation" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Input
                id="shopLocation"
                value={shopDetails.location}
                onChange={(e) => setShopDetails(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Building A, 1st Floor"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Campus</Label>
            <div className="flex gap-2">
              <Badge 
                variant={shopDetails.campus === 'RUPP' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setShopDetails(prev => ({ ...prev, campus: 'RUPP' }))}
              >
                RUPP Campus
              </Badge>
              <Badge 
                variant={shopDetails.campus === 'IFL' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setShopDetails(prev => ({ ...prev, campus: 'IFL' }))}
              >
                IFL Campus
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Operating Hours
          </CardTitle>
          <CardDescription>Set your weekly schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24">
                <Label>{day}</Label>
              </div>
              
              {shopDetails.operatingHours[day].isClosed ? (
                <div className="flex-1 flex items-center justify-between">
                  <Badge variant="secondary">Closed</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDayClosed(day)}
                  >
                    Open
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={shopDetails.operatingHours[day].open}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={shopDetails.operatingHours[day].close}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDayClosed(day)}
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Special Closures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Special Closures
          </CardTitle>
          <CardDescription>
            Set specific dates when your shop will be closed (holidays, events, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Closure */}
          <div className="flex gap-2">
            <Input
              type="date"
              value={newClosure.date}
              onChange={(e) => setNewClosure(prev => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1"
            />
            <Input
              value={newClosure.reason}
              onChange={(e) => setNewClosure(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason (e.g., Public Holiday)"
              className="flex-1"
            />
            <Button onClick={addSpecialClosure}>
              Add
            </Button>
          </div>

          <Separator />

          {/* List of Closures */}
          <div className="space-y-2">
            {shopDetails.specialClosures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No special closures scheduled
              </p>
            ) : (
              shopDetails.specialClosures.map((closure) => (
                <div 
                  key={closure.id} 
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(closure.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">{closure.reason}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closure.id && removeSpecialClosure(closure.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button at Bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}