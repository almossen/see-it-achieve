import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const SettingsPage = () => {
  const { tenantId, profile, user, signOut } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [tenantForm, setTenantForm] = useState({ name: "", phone: "", whatsapp_number: "", default_driver_id: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      const [{ data: tenantData }, { data: driversData }] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase.from("drivers").select("id, user_id, profiles!drivers_user_id_fkey(full_name)").eq("tenant_id", tenantId),
      ]);
      if (tenantData) {
        setTenant(tenantData);
        setTenantForm({ name: tenantData.name, phone: tenantData.phone || "", whatsapp_number: tenantData.whatsapp_number || "", default_driver_id: (tenantData as any).default_driver_id || "" });
      }
      setDrivers(driversData || []);
      if (profile) {
        setProfileForm({ full_name: profile.full_name, phone: profile.phone || "" });
      }
      setLoading(false);
    };
    fetchData();
  }, [tenantId, profile]);

  const saveTenant = async () => {
    const updateData: any = { name: tenantForm.name, phone: tenantForm.phone, whatsapp_number: tenantForm.whatsapp_number };
    if (tenantForm.default_driver_id) {
      updateData.default_driver_id = tenantForm.default_driver_id;
    } else {
      updateData.default_driver_id = null;
    }
    const { error } = await supabase.from("tenants").update(updateData).eq("id", tenantId);
    if (error) toast.error("خطأ", { description: error.message });
    else toast.success("تم حفظ إعدادات العائلة");
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(profileForm).eq("user_id", user.id);
    if (error) toast.error("خطأ", { description: error.message });
    else toast.success("تم حفظ الملف الشخصي");
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <Tabs defaultValue="family" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="family">العائلة</TabsTrigger>
          <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          <TabsTrigger value="account">الحساب</TabsTrigger>
        </TabsList>

        <TabsContent value="family">
          <Card>
            <CardHeader><CardTitle>إعدادات العائلة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم العائلة</Label>
                <Input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>رقم واتساب السائق الافتراضي</Label>
                <Input value={tenantForm.whatsapp_number} onChange={(e) => setTenantForm({ ...tenantForm, whatsapp_number: e.target.value })} dir="ltr" placeholder="966XXXXXXXXX" />
              </div>
              {drivers.length > 0 && (
                <div className="space-y-2">
                  <Label>السائق الافتراضي</Label>
                  <Select value={tenantForm.default_driver_id} onValueChange={(v) => setTenantForm({ ...tenantForm, default_driver_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السائق الافتراضي" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.profiles?.full_name || "سائق"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={saveTenant}>حفظ</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>الملف الشخصي</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>رقم الجوال</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} dir="ltr" />
              </div>
              <Button onClick={saveProfile}>حفظ</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle>إدارة الحساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">البريد: {user?.email}</p>
              <Button variant="destructive" onClick={signOut}>تسجيل الخروج</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
