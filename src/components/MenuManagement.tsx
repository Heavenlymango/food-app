import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Leaf } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';

const CATEGORIES = ['Main Course', 'Snacks', 'Drinks', 'Desserts', 'Breakfast', 'Salads'];

interface MenuManagementProps {
  shopId: string;
  shopName: string;
}

interface RawItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  calories: number | null;
  is_healthy: boolean | null;
  is_special: boolean | null;
  image_url: string | null;
  preparation_time: number | null;
  is_available: boolean | null;
  discount_percent: number | null;
}

const EMPTY_FORM = {
  name: '', description: '', price: '', category: 'Main Course',
  calories: '', preparation_time: '15', is_healthy: false, is_special: false,
  is_available: true, image_url: '',
};

export function MenuManagement({ shopId }: MenuManagementProps) {
  const [items, setItems] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopUuid, setShopUuid] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { resolveShop(); }, [shopId]);

  async function resolveShop() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('shops').select('id').eq('shop_code', shopId).single();
      if (error) throw error;
      setShopUuid(data.id);
      await fetchItems(data.id);
    } catch (e: any) {
      toast.error('Could not find shop: ' + e.message);
      setLoading(false);
    }
  }

  async function fetchItems(uuid?: string) {
    const id = uuid ?? shopUuid;
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('menu_items').select('*').eq('shop_id', id).order('name');
      if (error) throw error;
      setItems(data ?? []);
    } catch (e: any) {
      toast.error('Error loading menu: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  }

  function openEdit(item: RawItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price.toString(),
      category: item.category ?? 'Main Course',
      calories: item.calories?.toString() ?? '',
      preparation_time: item.preparation_time?.toString() ?? '15',
      is_healthy: item.is_healthy ?? false,
      is_special: item.is_special ?? false,
      is_available: item.is_available ?? true,
      image_url: item.image_url ?? '',
    });
    setIsDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!shopUuid) return;
    setSaving(true);
    const payload = {
      shop_id: shopUuid,
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      category: form.category,
      calories: parseInt(form.calories) || 0,
      preparation_time: parseInt(form.preparation_time) || 15,
      is_healthy: form.is_healthy,
      is_special: form.is_special,
      is_available: form.is_available,
      image_url: form.image_url.trim() || null,
    };
    try {
      if (editingItem) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Item updated!');
      } else {
        const { error } = await supabase.from('menu_items').insert(payload);
        if (error) throw error;
        toast.success('Item added!');
      }
      setIsDialogOpen(false);
      fetchItems();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    fetchItems();
  }

  async function handleToggle(id: string, current: boolean) {
    const { error } = await supabase.from('menu_items').update({ is_available: !current }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_available: !current } : i));
  }

  const f = form;
  const set = (key: keyof typeof EMPTY_FORM, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Menu Management</h2>
          <p className="text-sm text-gray-500">{items.length} items</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={f.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={f.description} onChange={e => set('description', e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price ($) *</Label>
                  <Input type="number" step="0.01" min="0" value={f.price} onChange={e => set('price', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={f.category} onValueChange={v => set('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input type="number" min="0" value={f.calories} onChange={e => set('calories', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Prep (min)</Label>
                  <Input type="number" min="1" value={f.preparation_time} onChange={e => set('preparation_time', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input type="number" min="0" max="100" value={f.discount_percent} onChange={e => set('discount_percent', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={f.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch checked={f.is_healthy} onCheckedChange={v => set('is_healthy', v)} />
                  <Leaf className="w-4 h-4 text-green-500" /> Healthy
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch checked={f.is_available} onCheckedChange={v => set('is_available', v)} />
                  Available
                </label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add to Menu'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <p>No menu items yet. Add your first item!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="p-3">
              <div className="flex items-center gap-3">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.is_healthy && <Leaf className="w-3 h-3 text-green-500" />}
                  </div>
                  <p className="text-xs text-gray-500">{item.category} · ${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch checked={item.is_available ?? true} onCheckedChange={() => handleToggle(item.id, item.is_available ?? true)} />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
