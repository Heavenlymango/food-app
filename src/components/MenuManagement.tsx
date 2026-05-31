import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Leaf, Clock, Tag, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  hide_healthy_badge: boolean | null;
  hide_unhealthy_badge: boolean | null;
  image_url: string | null;
  preparation_time: number | null;
  is_available: boolean | null;
}

interface PromotionScheme {
  id: string;
  label: string;
  discount_percent: number;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY_SCHEDULE = {
  label: 'Lunch Special',
  discount_percent: '20',
  days: [1, 2, 3, 4, 5] as number[],
  start_time: '11:00',
  end_time: '13:00',
};

const EMPTY_FORM = {
  name: '', description: '', price: '', category: 'Main Course',
  calories: '', preparation_time: '15', is_healthy: false, is_special: false,
  hide_healthy_badge: false, hide_unhealthy_badge: false,
  is_available: true, image_url: '',
};

export function MenuManagement({ shopId }: MenuManagementProps) {
  const [items, setItems] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopUuid, setShopUuid] = useState<string | null>(null);
  const [shopWideDiscount, setShopWideDiscount] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // per-item promotion schemes
  const [schedules, setSchedules] = useState<PromotionScheme[]>([]);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => { resolveShop(); }, [shopId]);

  async function resolveShop() {
    setLoading(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(shopId);
      const col = isUUID ? 'id' : 'shop_code';
      const { data, error } = await supabase.from('shops').select('id, discount_percent').eq(col, shopId).single();
      if (error) throw error;
      setShopUuid(data.id);
      setShopWideDiscount((data.discount_percent as number) ?? 0);
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
      const all = data ?? [];
      // Deduplicate by name — keep only the first occurrence, delete the rest from DB silently
      const seenNames = new Set<string>();
      const unique: RawItem[] = [];
      const duplicateIds: string[] = [];
      for (const item of all) {
        if (seenNames.has(item.name.toLowerCase())) {
          duplicateIds.push(item.id);
        } else {
          seenNames.add(item.name.toLowerCase());
          unique.push(item);
        }
      }
      if (duplicateIds.length > 0) {
        await supabase.from('menu_items').delete().in('id', duplicateIds);
      }
      setItems(unique);
    } catch (e: any) {
      toast.error('Error loading menu: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSchedules([]);
    setShowScheduleForm(false);
    setIsDialogOpen(true);
  }

  async function openEdit(item: RawItem) {
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
      hide_healthy_badge: item.hide_healthy_badge ?? false,
      hide_unhealthy_badge: item.hide_unhealthy_badge ?? false,
      is_available: item.is_available ?? true,
      image_url: item.image_url ?? '',
    });
    setShowScheduleForm(false);
    setIsDialogOpen(true);
    await fetchSchedules(item.id);
  }

  async function fetchSchedules(itemId: string) {
    const { data } = await supabase
      .from('item_discount_schedules')
      .select('*')
      .eq('menu_item_id', itemId)
      .order('created_at', { ascending: false });
    setSchedules((data ?? []) as PromotionScheme[]);
  }

  async function handleAddSchedule() {
    if (!editingItem) return;
    const pct = parseFloat(scheduleForm.discount_percent);
    if (!pct || pct < 1 || pct > 100) { toast.error('Discount must be 1–100'); return; }
    if (scheduleForm.days.length === 0) { toast.error('Select at least one day'); return; }
    if (scheduleForm.start_time >= scheduleForm.end_time) { toast.error('End time must be after start time'); return; }
    setSavingSchedule(true);
    try {
      const { error } = await supabase.from('item_discount_schedules').insert({
        menu_item_id: editingItem.id,
        label: scheduleForm.label.trim() || 'Deal',
        discount_percent: pct,
        days_of_week: scheduleForm.days,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        is_active: true,
      });
      if (error) throw error;
      toast.success('Promotion scheme added!');
      setShowScheduleForm(false);
      setScheduleForm(EMPTY_SCHEDULE);
      await fetchSchedules(editingItem.id);
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule(id: string) {
    const { error } = await supabase.from('item_discount_schedules').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  async function handleToggleSchedule(id: string, current: boolean) {
    const { error } = await supabase
      .from('item_discount_schedules')
      .update({ is_active: !current })
      .eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
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
      hide_healthy_badge: form.hide_healthy_badge,
      hide_unhealthy_badge: form.hide_unhealthy_badge,
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input type="number" min="0" value={f.calories} onChange={e => set('calories', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Prep (min)</Label>
                  <Input type="number" min="1" value={f.preparation_time} onChange={e => set('preparation_time', e.target.value)} />
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

              {/* Per-item badge overrides — let the seller suppress an
                  auto-classified badge they disagree with. */}
              <div className="border-t pt-3 mt-1 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Badge overrides</p>
                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <Switch
                    checked={f.hide_healthy_badge}
                    onCheckedChange={v => set('hide_healthy_badge', v)}
                  />
                  <span>
                    <span className="font-medium">Hide Healthy badge</span>
                    <span className="block text-xs text-gray-500">
                      Suppresses the green leaf even when the item is marked Healthy.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <Switch
                    checked={f.hide_unhealthy_badge}
                    onCheckedChange={v => set('hide_unhealthy_badge', v)}
                  />
                  <span>
                    <span className="font-medium">Hide Unhealthy badge</span>
                    <span className="block text-xs text-gray-500">
                      Suppresses the auto-classifier's orange Unhealthy / Heavy meal label
                      for this item.
                    </span>
                  </span>
                </label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add to Menu'}
                </Button>
              </DialogFooter>
            </form>

            {/* Promotion schemes — only when editing an existing item */}
            {editingItem && (
              <div className="mt-4 border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Tag className="w-4 h-4 text-orange-500" /> Promotion Schemes
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowScheduleForm(v => !v)}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>

                {showScheduleForm && (
                  <div className="border rounded-lg p-3 space-y-3 bg-orange-50">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input value={scheduleForm.label} onChange={e => setScheduleForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Lunch Special" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discount %</Label>
                      <Input type="number" min="1" max="100" value={scheduleForm.discount_percent}
                        onChange={e => setScheduleForm(p => ({ ...p, discount_percent: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Days</Label>
                      <div className="flex gap-1 flex-wrap">
                        {DAY_NAMES.map((d, i) => (
                          <button key={i} type="button"
                            onClick={() => setScheduleForm(p => ({
                              ...p,
                              days: p.days.includes(i) ? p.days.filter(x => x !== i) : [...p.days, i],
                            }))}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              scheduleForm.days.includes(i)
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Input type="time" value={scheduleForm.start_time}
                          onChange={e => setScheduleForm(p => ({ ...p, start_time: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Input type="time" value={scheduleForm.end_time}
                          onChange={e => setScheduleForm(p => ({ ...p, end_time: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowScheduleForm(false)} className="flex-1">Cancel</Button>
                      <Button size="sm" disabled={savingSchedule} onClick={handleAddSchedule}
                        className="flex-1 bg-orange-600 hover:bg-orange-700">
                        {savingSchedule ? 'Saving…' : 'Save Promotion'}
                      </Button>
                    </div>
                  </div>
                )}

                {schedules.length === 0 && !showScheduleForm && (
                  <p className="text-xs text-gray-400">No promotion schemes yet.</p>
                )}

                {schedules.map(s => {
                  const days = s.days_of_week.sort((a, b) => a - b).map(d => DAY_NAMES[d]).join(', ');
                  const fmt = (t: string) => {
                    const [h, m] = t.split(':').map(Number);
                    return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                  };
                  return (
                    <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${s.is_active ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-500 text-xs">-{s.discount_percent}%</Badge>
                          <span className="font-medium text-xs">{s.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <Clock className="w-3 h-3 inline mr-1" />{days} · {fmt(s.start_time)} – {fmt(s.end_time)}
                        </p>
                      </div>
                      <Switch checked={s.is_active} onCheckedChange={() => handleToggleSchedule(s.id, s.is_active)} />
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(s.id)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {shopWideDiscount > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-300 rounded-lg px-3 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-orange-800">
            <span className="font-semibold">Shop-wide {shopWideDiscount}% discount is active</span> — all items are discounted for students.
            Go to <span className="font-semibold">Shop Settings</span> tab → "Shop-wide Discount %" and set it to 0 to remove it.
          </p>
        </div>
      )}

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
