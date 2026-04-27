import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Building2, 
  Wallet,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Bell,
  Globe,
  Shield,
  Save,
  Construction
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface StudentProfileProps {
  user: any;
  onUpdateUser: (user: any) => void;
}

interface PaymentMethod {
  id: string;
  type: 'aba' | 'wing' | 'card' | 'cash';
  accountNumber?: string;
  accountName?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  isDefault: boolean;
  createdAt: string;
}

export function StudentProfile({ user, onUpdateUser }: StudentProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    studentId: user?.id || '',
  });

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    type: 'aba' as 'aba' | 'wing' | 'card' | 'cash',
    accountNumber: '',
    accountName: '',
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    promotions: true,
    language: 'en',
  });

  useEffect(() => {
    // payment methods are WIP — no API call needed
  }, [user?.id]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: profileData.name.trim() },
      });
      if (error) throw error;
      onUpdateUser({ name: profileData.name.trim() });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Payment methods not yet implemented
    setIsPaymentDialogOpen(false);
    resetPaymentForm();
  };

  const handleDeletePayment = async (_paymentId: string) => {
    // Payment methods not yet implemented
  };

  const handleSetDefaultPayment = async (_paymentId: string) => {
    // Payment methods not yet implemented
  };

  const handleEditPayment = (payment: PaymentMethod) => {
    setEditingPayment(payment);
    setPaymentFormData({
      type: payment.type,
      accountNumber: payment.accountNumber || '',
      accountName: payment.accountName || '',
      cardNumber: payment.cardNumber || '',
      cardHolder: payment.cardHolder || '',
      expiryDate: payment.expiryDate || '',
    });
    setIsPaymentDialogOpen(true);
  };

  const resetPaymentForm = () => {
    setEditingPayment(null);
    setPaymentFormData({
      type: 'aba',
      accountNumber: '',
      accountName: '',
      cardNumber: '',
      cardHolder: '',
      expiryDate: '',
    });
  };

  const handlePreferenceUpdate = () => {
    setSuccessMessage('Preferences saved!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'aba':
        return <Building2 className="w-5 h-5" />;
      case 'wing':
        return <Wallet className="w-5 h-5" />;
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  const getPaymentLabel = (type: string) => {
    switch (type) {
      case 'aba':
        return 'ABA Bank';
      case 'wing':
        return 'Wing Money';
      case 'card':
        return 'Credit/Debit Card';
      case 'cash':
        return 'Cash';
      default:
        return type;
    }
  };

  const maskAccountNumber = (number: string) => {
    if (!number || number.length < 4) return number;
    return '**** **** ' + number.slice(-4);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {successMessage && (
        <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="mb-4 bg-red-50 text-red-900 border-red-200">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="payment" className="relative">
            <span className="line-through opacity-60">Payment</span>
            <Badge variant="secondary" className="ml-2 text-xs">WIP</Badge>
          </TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={profileData.studentId}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-10"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+855 12 345 678"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>Manage your payment options</CardDescription>
                </div>
                <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
                  setIsPaymentDialogOpen(open);
                  if (!open) resetPaymentForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}
                      </DialogTitle>
                      <DialogDescription>
                        Add a new payment method for faster checkout
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Payment Type *</Label>
                        <Select
                          value={paymentFormData.type}
                          onValueChange={(value: any) =>
                            setPaymentFormData({ ...paymentFormData, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aba">ABA Bank</SelectItem>
                            <SelectItem value="wing">Wing Money</SelectItem>
                            <SelectItem value="card">Credit/Debit Card</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(paymentFormData.type === 'aba' || paymentFormData.type === 'wing') && (
                        <>
                          <div className="space-y-2">
                            <Label>Account Number *</Label>
                            <Input
                              value={paymentFormData.accountNumber}
                              onChange={(e) =>
                                setPaymentFormData({ ...paymentFormData, accountNumber: e.target.value })
                              }
                              placeholder="000 123 456"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Name *</Label>
                            <Input
                              value={paymentFormData.accountName}
                              onChange={(e) =>
                                setPaymentFormData({ ...paymentFormData, accountName: e.target.value })
                              }
                              placeholder="Full name on account"
                              required
                            />
                          </div>
                        </>
                      )}

                      {paymentFormData.type === 'card' && (
                        <>
                          <div className="space-y-2">
                            <Label>Card Number *</Label>
                            <Input
                              value={paymentFormData.cardNumber}
                              onChange={(e) =>
                                setPaymentFormData({ ...paymentFormData, cardNumber: e.target.value })
                              }
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Cardholder Name *</Label>
                              <Input
                                value={paymentFormData.cardHolder}
                                onChange={(e) =>
                                  setPaymentFormData({ ...paymentFormData, cardHolder: e.target.value })
                                }
                                placeholder="JOHN DOE"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Expiry Date *</Label>
                              <Input
                                value={paymentFormData.expiryDate}
                                onChange={(e) =>
                                  setPaymentFormData({ ...paymentFormData, expiryDate: e.target.value })
                                }
                                placeholder="MM/YY"
                                maxLength={5}
                                required
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {paymentFormData.type === 'cash' && (
                        <Alert>
                          <AlertDescription>
                            Cash payment will be collected upon pickup or delivery
                          </AlertDescription>
                        </Alert>
                      )}

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPaymentDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Saving...' : editingPayment ? 'Update' : 'Add Payment Method'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No payment methods added yet</p>
                    <p className="text-sm">Add a payment method for faster checkout</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <Card key={method.id} className={method.isDefault ? 'border-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getPaymentIcon(method.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{getPaymentLabel(method.type)}</p>
                                {method.isDefault && (
                                  <Badge variant="default" className="text-xs">Default</Badge>
                                )}
                              </div>
                              {method.accountNumber && (
                                <p className="text-sm text-muted-foreground">
                                  {maskAccountNumber(method.accountNumber)}
                                </p>
                              )}
                              {method.cardNumber && (
                                <p className="text-sm text-muted-foreground">
                                  {maskAccountNumber(method.cardNumber)}
                                </p>
                              )}
                              {method.accountName && (
                                <p className="text-xs text-muted-foreground">{method.accountName}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!method.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultPayment(method.id)}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(method)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(method.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Get instant updates</p>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, pushNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Updates</p>
                  <p className="text-sm text-muted-foreground">Status changes and ready notifications</p>
                </div>
                <Switch
                  checked={preferences.orderUpdates}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, orderUpdates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Promotions & Deals</p>
                  <p className="text-sm text-muted-foreground">Get notified about special offers</p>
                </div>
                <Switch
                  checked={preferences.promotions}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, promotions: checked })
                  }
                />
              </div>

              <Button onClick={handlePreferenceUpdate} disabled={isLoading} className="w-full mt-4">
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Two-Factor Authentication
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}