import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Users,
  Store,
  Settings,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Shield,
  Bell,
  BarChart3,
  UserCheck,
  UserX,
  Eye,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-36162e30`;

async function adminFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0, totalShops: 0, totalOrders: 0,
    totalRevenue: 0, activeOrders: 0, todayOrders: 0,
  });
  const [settings, setSettings] = useState({
    registrationsEnabled: true,
    maintenanceMode: false,
    emailNotifications: false,
    commission: 0,
    supportEmail: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Add User dialog ────────────────────────────────────────────────────────
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'seller', shopCode: '' });
  const [savingUser, setSavingUser] = useState(false);

  // ── Add Shop dialog ────────────────────────────────────────────────────────
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [newShop, setNewShop] = useState({ name: '', campus: 'RUPP', shopCode: '', category: '', description: '' });
  const [savingShop, setSavingShop] = useState(false);

  // ── View details dialog ────────────────────────────────────────────────────
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewType, setViewType] = useState<'user' | 'shop' | 'order' | null>(null);

  // ── Announcement ──────────────────────────────────────────────────────────
  const announceTitle = useRef('');
  const announceMsg = useRef('');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setIsLoading(true);
    try {
      const [statsData, usersData, shopsData, ordersData, settingsData] = await Promise.all([
        adminFetch('/admin/stats/db').catch(() => adminFetch('/admin/stats')),
        adminFetch('/admin/users'),
        adminFetch('/admin/shops'),
        adminFetch('/admin/orders?limit=50'),
        adminFetch('/admin/settings'),
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setShops(Array.isArray(shopsData) ? shopsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setSettings(settingsData);
    } catch (e: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }

  // ── User actions ──────────────────────────────────────────────────────────
  async function toggleUser(userId: string, current: boolean) {
    try {
      await adminFetch(`/admin/users/${userId}/toggle-status`, {
        method: 'POST', body: JSON.stringify({ isActive: !current }),
      });
      toast.success(current ? 'User deactivated' : 'User activated');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      toast.success('User deleted');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCreateUser() {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    setSavingUser(true);
    try {
      await adminFetch('/admin/users/create', {
        method: 'POST', body: JSON.stringify(newUser),
      });
      toast.success('User created');
      setAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'seller', shopCode: '' });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingUser(false); }
  }

  // ── Shop actions ──────────────────────────────────────────────────────────
  async function toggleShop(shopId: string, current: boolean) {
    try {
      await adminFetch(`/admin/shops/${shopId}/toggle-status`, {
        method: 'POST', body: JSON.stringify({ isActive: !current }),
      });
      toast.success(current ? 'Shop deactivated' : 'Shop activated');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCreateShop() {
    if (!newShop.name || !newShop.shopCode) {
      toast.error('Name and Shop Code are required');
      return;
    }
    setSavingShop(true);
    try {
      await adminFetch('/admin/shops/create', {
        method: 'POST', body: JSON.stringify(newShop),
      });
      toast.success('Shop created');
      setAddShopOpen(false);
      setNewShop({ name: '', campus: 'RUPP', shopCode: '', category: '', description: '' });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingShop(false); }
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true);
    try {
      await adminFetch('/admin/settings', {
        method: 'POST', body: JSON.stringify(settings),
      });
      toast.success('Settings saved');
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingSettings(false); }
  }

  async function broadcast() {
    const title = announceTitle.current;
    const message = announceMsg.current;
    if (!title || !message) { toast.error('Title and message are required'); return; }
    setBroadcasting(true);
    try {
      const res = await adminFetch('/admin/broadcast', {
        method: 'POST', body: JSON.stringify({ title, message }),
      });
      toast.success(`Broadcast sent to ${res.sent ?? 'all'} users`);
      announceTitle.current = '';
      announceMsg.current = '';
    } catch (e: any) { toast.error(e.message); }
    finally { setBroadcasting(false); }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportUsers() {
    const rows = [
      ['Name', 'Email', 'Role', 'Status', 'Joined'],
      ...filteredUsers.map(u => [u.name, u.email, u.role, u.isActive ? 'Active' : 'Inactive', u.createdAt]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
  }

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'default', ready: 'secondary', preparing: 'outline',
      cancelled: 'destructive', pending: 'outline',
    };
    return (map[status] ?? 'outline') as any;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-600" />
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">Welcome back, {user?.name ?? 'Admin'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAll} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportUsers}>
              <Download className="w-4 h-4 mr-2" />
              Export Users
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <UserX className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mb-6">
            <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="shops"><Store className="w-4 h-4 mr-2" />Shops</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="w-4 h-4 mr-2" />Orders</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, sub: 'Registered accounts' },
                { label: 'Active Shops', value: stats.totalShops, icon: Store, sub: 'Campus shops' },
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, sub: 'All time' },
                { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, sub: 'Platform revenue' },
                { label: 'Active Orders', value: stats.activeOrders, icon: TrendingUp, sub: 'Currently processing' },
                { label: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, sub: 'Orders today' },
              ].map(({ label, value, icon: Icon, sub }) => (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest orders across all shops</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 15).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-sm">{o.orderNumber ?? o.order_number ?? o.id?.slice(0, 8)}</TableCell>
                          <TableCell>{o.studentName ?? 'N/A'}</TableCell>
                          <TableCell>{o.shopName ?? o.shopId ?? 'N/A'}</TableCell>
                          <TableCell className="font-semibold">${(o.totalAmount ?? o.total ?? 0).toFixed(2)}</TableCell>
                          <TableCell><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(o.createdAt ?? o.ordered_at).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── USERS ────────────────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage all users in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="seller">Sellers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setAddUserOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Add User
                  </Button>
                </div>

                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Telegram</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : u.role === 'seller' ? 'secondary' : 'outline'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {u.isActive
                                ? <UserCheck className="w-4 h-4 text-green-600" />
                                : <UserX className="w-4 h-4 text-red-600" />}
                              <span className={u.isActive ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                                {u.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.telegramVerified
                              ? <Badge className="bg-blue-600 text-xs">✓ Verified</Badge>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm"
                                onClick={() => { setViewItem(u); setViewType('user'); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm"
                                onClick={() => toggleUser(u.id, u.isActive)}>
                                {u.isActive
                                  ? <UserX className="w-4 h-4 text-orange-500" />
                                  : <UserCheck className="w-4 h-4 text-green-600" />}
                              </Button>
                              {u.role !== 'admin' && (
                                <Button variant="ghost" size="sm"
                                  onClick={() => deleteUser(u.id, u.name)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SHOPS ────────────────────────────────────────────────────── */}
          <TabsContent value="shops" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shop Management</CardTitle>
                <CardDescription>Manage campus shops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setAddShopOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Add Shop
                  </Button>
                </div>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shop Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shops.map(s => (
                        <TableRow key={s.id ?? s.shopCode}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="font-mono text-sm">{s.id ?? s.shopCode}</TableCell>
                          <TableCell>
                            <Badge variant={s.campus === 'RUPP' ? 'default' : 'secondary'}>{s.campus}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.category ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={s.isActive ? 'default' : 'destructive'}>
                              {s.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{s.totalOrders ?? 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm"
                                onClick={() => { setViewItem(s); setViewType('shop'); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm"
                                onClick={() => toggleShop(s.id ?? s.shopCode, s.isActive)}>
                                <Settings className="w-4 h-4" />
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
          </TabsContent>

          {/* ── ORDERS ───────────────────────────────────────────────────── */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>View all orders across all shops</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[550px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-sm">
                            {o.orderNumber ?? o.order_number ?? o.id?.slice(0, 8)}
                          </TableCell>
                          <TableCell>{o.studentName ?? 'N/A'}</TableCell>
                          <TableCell>{o.shopName ?? o.shopId ?? 'N/A'}</TableCell>
                          <TableCell>{o.itemCount ?? o.items?.length ?? '—'}</TableCell>
                          <TableCell className="font-semibold">
                            ${(o.totalAmount ?? o.total ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {o.scheduledFor ?? o.scheduled_for
                              ? new Date(o.scheduledFor ?? o.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(o.createdAt ?? o.ordered_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm"
                              onClick={() => { setViewItem(o); setViewType('order'); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SETTINGS ─────────────────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Platform-wide configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    { key: 'registrationsEnabled', label: 'Enable New Registrations', desc: 'Allow new students to register' },
                    { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Temporarily disable the platform' },
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email notifications to users' },
                  ].map(({ key, label, desc }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{label}</Label>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          checked={(settings as any)[key]}
                          onCheckedChange={v => setSettings(s => ({ ...s, [key]: v }))}
                        />
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}

                  <div className="space-y-2">
                    <Label>Platform Commission (%)</Label>
                    <Input
                      type="number" min="0" max="100"
                      value={settings.commission}
                      onChange={e => setSettings(s => ({ ...s, commission: Number(e.target.value) }))}
                      className="w-32"
                    />
                    <p className="text-sm text-muted-foreground">Commission % from each order</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input
                      type="email"
                      placeholder="support@campus.edu.kh"
                      value={settings.supportEmail}
                      onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <Button onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Saving…' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" /> Broadcast Announcement
                </CardTitle>
                <CardDescription>Send a notification to all users on the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Canteen closed tomorrow"
                    onChange={e => { announceTitle.current = e.target.value; }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Enter a system-wide announcement message…"
                    rows={4}
                    onChange={e => { announceMsg.current = e.target.value; }}
                  />
                </div>
                <Button variant="outline" onClick={broadcast} disabled={broadcasting}>
                  <Bell className="w-4 h-4 mr-2" />
                  {broadcasting ? 'Sending…' : 'Broadcast to All Users'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Add User Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new seller or admin account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Sokha Chan' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'sokha@seller.local' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type={type} placeholder={placeholder}
                  value={(newUser as any)[key]}
                  onChange={e => setNewUser(u => ({ ...u, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser(u => ({ ...u, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === 'seller' && (
              <div className="space-y-1">
                <Label>Shop Code (e.g. A1, B2)</Label>
                <Input
                  placeholder="A1"
                  value={newUser.shopCode}
                  onChange={e => setNewUser(u => ({ ...u, shopCode: e.target.value.toUpperCase() }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Shop Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addShopOpen} onOpenChange={setAddShopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shop</DialogTitle>
            <DialogDescription>Register a new campus shop.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Shop Name</Label>
              <Input placeholder="Sokha's Kitchen"
                value={newShop.name}
                onChange={e => setNewShop(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Shop Code (unique, e.g. A3)</Label>
              <Input placeholder="A3"
                value={newShop.shopCode}
                onChange={e => setNewShop(s => ({ ...s, shopCode: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1">
              <Label>Campus</Label>
              <Select value={newShop.campus} onValueChange={v => setNewShop(s => ({ ...s, campus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUPP">RUPP</SelectItem>
                  <SelectItem value="IFL">IFL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Category (optional)</Label>
              <Input placeholder="Khmer, Drinks, Snacks…"
                value={newShop.category}
                onChange={e => setNewShop(s => ({ ...s, category: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Short description…" rows={2}
                value={newShop.description}
                onChange={e => setNewShop(s => ({ ...s, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddShopOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateShop} disabled={savingShop}>
              {savingShop ? 'Creating…' : 'Create Shop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog ──────────────────────────────────────────── */}
      <Dialog open={viewItem !== null} onOpenChange={v => { if (!v) setViewItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewType === 'user' ? 'User Details' : viewType === 'shop' ? 'Shop Details' : 'Order Details'}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <ScrollArea className="max-h-[400px]">
              <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                {JSON.stringify(viewItem, null, 2)}
              </pre>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>
              <X className="w-4 h-4 mr-2" />Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
