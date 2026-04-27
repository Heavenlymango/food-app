import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';

interface PromotionManagementProps {
  shopId: string;
  menuItems: any[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY_FORM = {
  menuItemId: '', label: '', discountPercent: '20',
  days: [1, 2, 3, 4, 5] as number[],
  startTime: '07:00', endTime: '09:30',
};

export function PromotionManagement({ shopId }: PromotionManagementProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopUuid, setShopUuid] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { init(); }, [shopId]);

  async function init() {
    setLoading(true);
    try {
      const { data: shopData } = await supabase.from('shops').select('id').eq('shop_code', shopId).single();
      if (!shopData) return;
      setShopUuid(shopData.id);
      const { data: items } = await supabase
        .from('menu_items').select('id, name').eq('shop_id', shopData.id).order('name');
      setShopItems(items ?? []);
      await fetchSchedules(shopData.id);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedules(uuid?: string) {
    const id = uuid ?? shopUuid;
    if (!id) return;
    const { data } = await supabase
      .from('item_discount_schedules')
      .select('*, menu_items!inner(name, shop_id)')
      .eq('menu_items.shop_id', id)
      .order('created_at', { ascending: false });
    setSchedules(data ?? []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.menuItemId || form.days.length === 0) {
      toast.error('Select an item and at least one day');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('item_discount_schedules').insert({
        menu_item_id: form.menuItemId,
        label: form.label.trim() || 'Deal',
        discount_percent: parseFloat(form.discountPercent),
        days_of_week: form.days,
        start_time: form.startTime + ':00',
        end_time: form.endTime + ':00',
        is_active: true,
      });
      if (error) throw error;
      toast.success('Discount schedule added!');
      setIsDialogOpen(false);
      setForm(EMPTY_FORM);
      fetchSchedules();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    const { error } = await supabase
      .from('item_discount_schedules').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount schedule?')) return;
    await supabase.from('item_discount_schedules').delete().eq('id', id);
    toast.success('Deleted');
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  function toggleDay(d: number) {
    setForm(p => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d].sort((a, b) => a - b),
    }));
  }

  function formatDays(days: number[]) {
    if (!days?.length) return '';
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.length === 5 && sorted[0] === 1 && sorted[4] === 5) return 'Mon–Fri';
    if (sorted.length === 6 && sorted[0] === 1 && sorted[5] === 6) return 'Mon–Sat';
    return sorted.map(d => DAY_NAMES[d]).join(', ');
  }

  function fmtTime(t: string) {
    const parts = t.split(':');
    const h = parseInt(parts[0]);
    const m = parts[1] ?? '00';
    return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Time-based Discounts</h2>
          <p className="text-sm text-gray-500">Schedule limited-time deals per menu item</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) setForm(EMPTY_FORM); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />Add Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Discount Window</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Menu Item *</Label>
                <Select value={form.menuItemId} onValueChange={v => setForm(p => ({ ...p, menuItemId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                  <SelectContent>
                    {shopItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Breakfast Deal" />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input type="number" min="1" max="100" value={form.discountPercent}
                    onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Days</Label>
                <div className="flex gap-1 flex-wrap">
                  {DAY_NAMES.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                        form.days.includes(i)
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'border-gray-300 hover:border-orange-400'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? 'Saving…' : 'Add Discount'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : schedules.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>No discount schedules yet.</p>
          <p className="text-sm mt-1">Add one to offer time-limited deals on menu items.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => {
            const isActive = s.is_active ?? true;
            return (
              <Card key={s.id} className={`p-3 border ${isActive ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs flex-shrink-0 ${isActive ? 'bg-orange-500' : 'bg-gray-400'}`}>
                    -{s.discount_percent}%
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {s.label || 'Deal'} · {(s.menu_items as any)?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDays(s.days_of_week)} · {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={() => handleToggle(s.id, isActive)} />
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
