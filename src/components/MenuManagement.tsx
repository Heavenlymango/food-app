import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Leaf, Flame, Calendar, ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { unsplash_tool } from '../utils/unsplash';
import { MENU_ITEMS } from '../data/menuData';

interface MenuItem {
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
  isAvailable: boolean;
  availableFrom?: string;
  availableUntil?: string;
  availableDays?: string[];
  stockQuantity?: number;
}

interface MenuManagementProps {
  shopId: string;
  shopName: string;
}

const CATEGORIES = [
  'Rice Dishes',
  'Noodles',
  'Soup',
  'Snacks',
  'Beverages',
  'Desserts',
  'Breakfast',
  'Healthy Options'
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export function MenuManagement({ shopId, shopName }: MenuManagementProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Rice Dishes',
    calories: '',
    preparationTime: '',
    isHealthy: false,
    isSpecial: false,
    isAvailable: true,
    image: '',
    availableFrom: '',
    availableUntil: '',
    availableDays: [] as string[],
    stockQuantity: ''
  });

  useEffect(() => {
    loadMenuItems();
  }, [shopId]);

  const loadMenuItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/menu/${shopId}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchImage = async () => {
    if (!formData.name) {
      toast.error('Please enter a dish name first');
      return;
    }

    setIsSearchingImage(true);
    try {
      // Use Unsplash to get a relevant food image
      const searchQuery = `${formData.name} food dish`;
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1`, {
        headers: {
          'Authorization': 'Client-ID your-unsplash-access-key'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0]) {
          setFormData(prev => ({ ...prev, image: data.results[0].urls.regular }));
          toast.success('Image found!');
        } else {
          // Fallback to a generic food image
          const fallbackImage = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop`;
          setFormData(prev => ({ ...prev, image: fallbackImage }));
          toast.info('Using default food image');
        }
      }
    } catch (error) {
      console.error('Error searching image:', error);
      const fallbackImage = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop`;
      setFormData(prev => ({ ...prev, image: fallbackImage }));
    } finally {
      setIsSearchingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const itemData = {
        ...formData,
        shopId,
        shop: shopName,
        price: parseFloat(formData.price),
        calories: parseInt(formData.calories) || 0,
        preparationTime: parseInt(formData.preparationTime) || 10,
        stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
        id: editingItem?.id || undefined
      };

      const url = editingItem
        ? `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/menu/${editingItem.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/menu`;

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        toast.success(editingItem ? 'Menu item updated!' : 'Menu item added!');
        setIsDialogOpen(false);
        resetForm();
        loadMenuItems();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save menu item');
      }
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      toast.error(error.message || 'Failed to save menu item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      calories: item.calories.toString(),
      preparationTime: item.preparationTime.toString(),
      isHealthy: item.isHealthy,
      isSpecial: item.isSpecial,
      isAvailable: item.isAvailable,
      image: item.image,
      availableFrom: item.availableFrom || '',
      availableUntil: item.availableUntil || '',
      availableDays: item.availableDays || [],
      stockQuantity: item.stockQuantity?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/menu/${itemId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        toast.success('Menu item deleted');
        loadMenuItems();
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/menu/${itemId}/toggle`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isAvailable: !currentStatus }),
        }
      );

      if (response.ok) {
        toast.success(`Item ${!currentStatus ? 'enabled' : 'disabled'}`);
        loadMenuItems();
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Rice Dishes',
      calories: '',
      preparationTime: '',
      isHealthy: false,
      isSpecial: false,
      isAvailable: true,
      image: '',
      availableFrom: '',
      availableUntil: '',
      availableDays: [],
      stockQuantity: ''
    });
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const handleImportFromLibrary = async () => {
    setIsLoading(true);
    try {
      // Get items from menuData.ts that match this shop
      const shopItems = MENU_ITEMS.filter(item => item.shop === shopId);
      
      if (shopItems.length === 0) {
        toast.info('No pre-existing items found for this shop');
        return;
      }

      let imported = 0;
      for (const item of shopItems) {
        const itemData = {
          ...item,
          shopId,
          shop: shopName,
          isAvailable: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/vendor/menu`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData),
          }
        );

        if (response.ok) {
          imported++;
        }
      }

      toast.success(`Imported ${imported} menu items from library!`);
      loadMenuItems();
    } catch (error) {
      console.error('Error importing menu:', error);
      toast.error('Failed to import menu items');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Menu Management</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, and manage your menu items
          </p>
        </div>
        <div className="flex gap-2">
          {menuItems.length === 0 && (
            <Button 
              variant="outline" 
              onClick={handleImportFromLibrary}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Import From Library
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for your menu item
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Fried Rice with Chicken"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your dish..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calories">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        value={formData.calories}
                        onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prepTime">Prep Time (min)</Label>
                      <Input
                        id="prepTime"
                        type="number"
                        value={formData.preparationTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: e.target.value }))}
                        placeholder="10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Qty</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                        placeholder="∞"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Image */}
                <div className="space-y-2">
                  <Label>Item Image</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="Image URL or search for one"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSearchImage}
                      disabled={isSearchingImage}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {isSearchingImage ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                  {formData.image && (
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-md mt-2"
                    />
                  )}
                </div>

                <Separator />

                {/* Availability Schedule */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Availability Schedule
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="availableFrom">Available From (Time)</Label>
                      <Input
                        id="availableFrom"
                        type="time"
                        value={formData.availableFrom}
                        onChange={(e) => setFormData(prev => ({ ...prev, availableFrom: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="availableUntil">Available Until (Time)</Label>
                      <Input
                        id="availableUntil"
                        type="time"
                        value={formData.availableUntil}
                        onChange={(e) => setFormData(prev => ({ ...prev, availableUntil: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Available Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <Badge
                          key={day}
                          variant={formData.availableDays.includes(day) ? 'default' : 'outline'}
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

                {/* Flags */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-green-600" />
                        Healthy Option
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mark as a healthy choice
                      </p>
                    </div>
                    <Switch
                      checked={formData.isHealthy}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHealthy: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-600" />
                        Special Item
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Feature as today's special
                      </p>
                    </div>
                    <Switch
                      checked={formData.isSpecial}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSpecial: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Available Now</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable for customers to order
                      </p>
                    </div>
                    <Switch
                      checked={formData.isAvailable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
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
                    {isLoading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Menu Items ({menuItems.length})</CardTitle>
          <CardDescription>Manage your complete menu</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={() => toggleAvailability(item.id, item.isAvailable)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.isHealthy && (
                          <Badge variant="secondary" className="text-xs">
                            <Leaf className="w-3 h-3" />
                          </Badge>
                        )}
                        {item.isSpecial && (
                          <Badge variant="default" className="text-xs">
                            <Flame className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}