import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Store } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';

interface ShopSettingsProps {
  shopId: string;
  user: any;
}

export function ShopSettings({ shopId }: ShopSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { fetchShop(); }, [shopId]);

  async function fetchShop() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('shops').select('*').eq('shop_code', shopId).single();
      if (error) throw error;
      setShop(data);
      setName(data.name ?? '');
      setDescription(data.description ?? '');
    } catch (e: any) {
      toast.error('Failed to load shop: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleOpen() {
    if (!shop) return;
    const newVal = !(shop.is_active ?? true);
    const { error } = await supabase.from('shops').update({ is_active: newVal }).eq('shop_code', shopId);
    if (error) { toast.error('Failed to update'); return; }
    setShop((p: any) => ({ ...p, is_active: newVal }));
    toast.success(newVal ? 'Shop is now OPEN' : 'Shop is now CLOSED');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('shops').update({
        name: name.trim(),
        description: description.trim(),
      }).eq('shop_code', shopId);
      if (error) throw error;
      setShop((p: any) => ({ ...p, name: name.trim(), description: description.trim() }));
      toast.success('Saved!');
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (!shop) return <div className="text-center py-12 text-red-500">Shop not found</div>;

  const isOpen = shop.is_active ?? true;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Shop Settings</h2>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex-1">
            <p className={`font-semibold ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
              Shop is {isOpen ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="text-xs text-gray-500">
              {isOpen ? 'Customers can place orders' : 'No new orders will be accepted'}
            </p>
          </div>
          <Switch checked={isOpen} onCheckedChange={handleToggleOpen} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="w-4 h-4" /> Shop Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Shop Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <p className="text-xs text-gray-400">Shop ID: {shopId} · Campus: {shop.campus}</p>
            <Button type="submit" disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
