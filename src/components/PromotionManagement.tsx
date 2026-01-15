import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Tag, 
  Edit, 
  Trash2, 
  Percent,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Gift,
  TrendingUp,
  AlertCircle,
  Timer,
  Copy
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Promotion {
  id: string;
  shopId: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  discountValue: number;
  applicableItems: string[];
  minPurchase?: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  validDays?: string[];
}

interface PromotionManagementProps {
  shopId: string;
  menuItems: any[];
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

export function PromotionManagement({ shopId, menuItems }: PromotionManagementProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'bogo' | 'bundle',
    discountValue: '',
    applicableItems: [] as string[],
    minPurchase: '',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isActive: true,
    usageLimit: '',
    validDays: [] as string[]
  });

  useEffect(() => {
    loadPromotions();
  }, [shopId]);

  const loadPromotions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/promotions/${shopId}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      toast.error('Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const promoData = {
        ...formData,
        shopId,
        discountValue: parseFloat(formData.discountValue),
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        id: editingPromo?.id || undefined
      };

      const url = editingPromo
        ? `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/promotions/${editingPromo.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/promotions`;

      const response = await fetch(url, {
        method: editingPromo ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promoData),
      });

      if (response.ok) {
        toast.success(editingPromo ? 'Promotion updated!' : 'Promotion created!');
        setIsDialogOpen(false);
        resetForm();
        loadPromotions();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save promotion');
      }
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast.error(error.message || 'Failed to save promotion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      description: promo.description,
      type: promo.type,
      discountValue: promo.discountValue.toString(),
      applicableItems: promo.applicableItems,
      minPurchase: promo.minPurchase?.toString() || '',
      maxDiscount: promo.maxDiscount?.toString() || '',
      startDate: promo.startDate,
      endDate: promo.endDate,
      startTime: promo.startTime || '',
      endTime: promo.endTime || '',
      isActive: promo.isActive,
      usageLimit: promo.usageLimit?.toString() || '',
      validDays: promo.validDays || []
    });
    setIsDialogOpen(true);
  };

  const handleUseAsTemplate = (promo: Promotion) => {
    // Don't set editingPromo - we want to create a NEW promotion
    setEditingPromo(null);
    
    // Pre-fill form with promotion data but update dates to future
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    setFormData({
      name: `${promo.name} (Copy)`,
      description: promo.description,
      type: promo.type,
      discountValue: promo.discountValue.toString(),
      applicableItems: promo.applicableItems,
      minPurchase: promo.minPurchase?.toString() || '',
      maxDiscount: promo.maxDiscount?.toString() || '',
      startDate: today.toISOString().split('T')[0], // Today
      endDate: nextMonth.toISOString().split('T')[0], // One month from today
      startTime: promo.startTime || '',
      endTime: promo.endTime || '',
      isActive: true, // Default to active for new promotion
      usageLimit: promo.usageLimit?.toString() || '',
      validDays: promo.validDays || []
    });
    
    setIsDialogOpen(true);
    toast.success('Template loaded! Edit and save as new promotion');
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/promotions/${promoId}?shopId=${shopId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        toast.success('Promotion deleted');
        loadPromotions();
      } else {
        throw new Error('Failed to delete promotion');
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Failed to delete promotion');
    }
  };

  const togglePromoStatus = async (promoId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/promotions/${promoId}/toggle`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      );

      if (response.ok) {
        toast.success(`Promotion ${!currentStatus ? 'activated' : 'deactivated'}`);
        loadPromotions();
      }
    } catch (error) {
      console.error('Error toggling promotion:', error);
      toast.error('Failed to update promotion');
    }
  };

  const resetForm = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      discountValue: '',
      applicableItems: [],
      minPurchase: '',
      maxDiscount: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      isActive: true,
      usageLimit: '',
      validDays: []
    });
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      validDays: prev.validDays.includes(day)
        ? prev.validDays.filter(d => d !== day)
        : [...prev.validDays, day]
    }));
  };

  const applyTemplate = (template: string) => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch(template) {
      case 'lunch-special':
        setFormData({
          name: 'Lunch Special - 20% Off',
          description: 'Get 20% off on all items during lunch hours',
          type: 'percentage',
          discountValue: '20',
          applicableItems: [],
          minPurchase: '',
          maxDiscount: '5',
          startDate: today,
          endDate: nextWeek,
          startTime: '11:00',
          endTime: '14:00',
          isActive: true,
          usageLimit: '',
          validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        });
        break;
      
      case 'happy-hour':
        setFormData({
          name: 'Happy Hour - Buy 1 Get 1',
          description: 'Buy one drink, get one free during happy hours',
          type: 'bogo',
          discountValue: '100',
          applicableItems: [],
          minPurchase: '',
          maxDiscount: '',
          startDate: today,
          endDate: nextWeek,
          startTime: '15:00',
          endTime: '17:00',
          isActive: true,
          usageLimit: '100',
          validDays: DAYS_OF_WEEK
        });
        break;

      case 'weekend-deal':
        setFormData({
          name: 'Weekend Special - $2 Off',
          description: 'Save $2 on orders over $10 this weekend',
          type: 'fixed',
          discountValue: '2',
          applicableItems: [],
          minPurchase: '10',
          maxDiscount: '',
          startDate: today,
          endDate: nextWeek,
          startTime: '',
          endTime: '',
          isActive: true,
          usageLimit: '',
          validDays: ['Saturday', 'Sunday']
        });
        break;

      case 'student-discount':
        setFormData({
          name: 'Student Discount - 15% Off',
          description: 'All students get 15% off anytime',
          type: 'percentage',
          discountValue: '15',
          applicableItems: [],
          minPurchase: '5',
          maxDiscount: '',
          startDate: today,
          endDate: nextWeek,
          startTime: '',
          endTime: '',
          isActive: true,
          usageLimit: '',
          validDays: DAYS_OF_WEEK
        });
        break;
    }
  };

  const handleItemToggle = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      applicableItems: prev.applicableItems.includes(itemId)
        ? prev.applicableItems.filter(id => id !== itemId)
        : [...prev.applicableItems, itemId]
    }));
  };

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed':
        return <DollarSign className="w-4 h-4" />;
      case 'bogo':
        return <Gift className="w-4 h-4" />;
      case 'bundle':
        return <Tag className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const isPromoActive = (promo: Promotion) => {
    if (!promo.isActive) return false;
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);
    return now >= start && now <= end;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promotions & Special Deals</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage discounts and special offers
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? 'Edit Promotion' : 'Create New Promotion'}
              </DialogTitle>
              <DialogDescription>
                Set up a special deal or discount for your customers
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promoName">Promotion Name *</Label>
                  <Input
                    id="promoName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Happy Hour Special, Weekend Deal"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promoDesc">Description *</Label>
                  <Textarea
                    id="promoDesc"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your promotion..."
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="promoType">Promotion Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage Off</SelectItem>
                        <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                        <SelectItem value="bogo">Buy One Get One</SelectItem>
                        <SelectItem value="bundle">Bundle Deal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      {formData.type === 'percentage' ? 'Discount (%)' : 'Discount ($)'} *
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      step="0.01"
                      value={formData.discountValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                      placeholder={formData.type === 'percentage' ? '10' : '2.00'}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPurchase">Minimum Purchase ($)</Label>
                    <Input
                      id="minPurchase"
                      type="number"
                      step="0.01"
                      value={formData.minPurchase}
                      onChange={(e) => setFormData(prev => ({ ...prev, minPurchase: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDiscount">Max Discount ($)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      step="0.01"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxDiscount: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Applicable Items */}
              <div className="space-y-2">
                <Label>Applicable Menu Items</Label>
                <ScrollArea className="h-48 border rounded-md p-4">
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`item-${item.id}`}
                          checked={formData.applicableItems.includes(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`item-${item.id}`} className="text-sm cursor-pointer">
                          {item.name} - ${item.price.toFixed(2)}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  Select items this promotion applies to (leave empty for all items)
                </p>
              </div>

              <Separator />

              {/* Date & Time Range */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Promotion Period
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Start Time (Optional)
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">
                      <Clock className="w-4 h-4 inline mr-1" />
                      End Time (Optional)
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valid Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <Badge
                        key={day}
                        variant={formData.validDays.includes(day) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleDayToggle(day)}
                      >
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty for all days
                  </p>
                </div>
              </div>

              <Separator />

              {/* Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="usageLimit">
                    <Timer className="w-4 h-4 inline mr-1" />
                    Usage Limit (Optional)
                  </Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
                    placeholder="Leave empty for unlimited"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of times this promotion can be used
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this promotion immediately
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingPromo ? 'Update Promotion' : 'Create Promotion'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Promotions Alert */}
      {promotions.filter(p => isPromoActive(p)).length > 0 && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            You have {promotions.filter(p => isPromoActive(p)).length} active promotion(s) running right now!
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Templates */}
      {promotions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Start Templates</CardTitle>
            <CardDescription>Click a template to get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => {
                  applyTemplate('lunch-special');
                  setIsDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold">Lunch Special</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  20% off during lunch hours (11am-2pm) on weekdays
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => {
                  applyTemplate('happy-hour');
                  setIsDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-600" />
                  <h4 className="font-semibold">Happy Hour</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Buy 1 Get 1 free on drinks (3pm-5pm daily)
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => {
                  applyTemplate('weekend-deal');
                  setIsDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold">Weekend Special</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  $2 off on orders over $10 (Sat & Sun only)
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => {
                  applyTemplate('student-discount');
                  setIsDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold">Student Discount</h4>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  15% off for all students on orders over $5
                </p>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Promotions ({promotions.length})</CardTitle>
          <CardDescription>Manage all your deals and special offers</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{promo.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {promo.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getPromotionTypeIcon(promo.type)}
                        {promo.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {promo.type === 'percentage' 
                        ? `${promo.discountValue}%` 
                        : `$${promo.discountValue.toFixed(2)}`
                      }
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(promo.startDate).toLocaleDateString()}
                      <br />
                      to {new Date(promo.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {promo.usageLimit 
                        ? `${promo.usageCount}/${promo.usageLimit}`
                        : `${promo.usageCount}/∞`
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Switch
                          checked={promo.isActive}
                          onCheckedChange={() => togglePromoStatus(promo.id, promo.isActive)}
                        />
                        {isPromoActive(promo) && (
                          <Badge variant="default" className="text-xs">
                            Live
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(promo)}
                          title="Edit promotion"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseAsTemplate(promo)}
                          title="Use as template for new promotion"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
                          title="Delete promotion"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {promotions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Gift className="w-12 h-12 opacity-20" />
                        <p className="text-sm">No promotions yet</p>
                        <p className="text-xs">Click "Create Promotion" or use a template above to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}