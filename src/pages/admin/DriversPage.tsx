import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserPlus, Phone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeleteUser } from "@/hooks/useDeleteUser";

const DriversPage = () => {
  const { tenantId } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", phone: "", whatsapp: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const { deleting, deleteUser } = useDeleteUser(() => fetchDrivers());

  const fetchDrivers = async () => {
    if (!tenantId) return;
    // Fetch drivers and profiles separately since there's no FK between them
    const { data: driversData } = await supabase
      .from("drivers")
      .select("*")
      .eq("tenant_id", tenantId);

    if (driversData && driversData.length > 0) {
      const userIds = driversData.map((d) => d.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profilesData || []).map((p) => [p.user_id, p])
      );

      setDrivers(driversData.map((d) => ({ ...d, profiles: profileMap[d.user_id] || null })));
    } else {
      setDrivers([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, [tenantId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-driver`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone,
          whatsapp: form.whatsapp || form.phone,
        }),
      }
    );

    const result = await res.json();

    if (!res.ok) {
      toast.error("خطأ", { description: result.error });
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    toast.success("تم إضافة السائق بنجاح");
    setDialogOpen(false);
    setForm({ email: "", fullName: "", phone: "", whatsapp: "", password: "" });
    fetchDrivers();
  };

  const toggleAvailability = async (driverId: string, current: boolean) => {
    await supabase.from("drivers").update({ is_available: !current }).eq("id", driverId);
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, is_available: !current } : d));
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">إدارة السائقين</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة السائقين</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" />إضافة سائق</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة سائق جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required dir="ltr" minLength={6} placeholder="6 أحرف على الأقل" />
              </div>
              <div className="space-y-2">
                <Label>رقم الجوال</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>رقم واتساب</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} dir="ltr" placeholder="اختياري — يُستخدم الجوال إن لم يُحدد" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جاري الإضافة..." : "إضافة السائق"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver) => (
          <Card key={driver.id}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 font-bold text-lg">
                  {driver.profiles?.full_name?.charAt(0) || "🚗"}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{driver.profiles?.full_name || "سائق"}</p>
                  {driver.whatsapp_number && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {driver.whatsapp_number}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">متاح للتوصيل</span>
                <Switch
                  checked={driver.is_available}
                  onCheckedChange={() => toggleAvailability(driver.id, driver.is_available)}
                />
              </div>
              <div className={cn(
                "text-xs text-center py-1 rounded-full font-medium",
                driver.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {driver.is_available ? "متاح ✅" : "غير متاح ❌"}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 gap-2" disabled={deleting === driver.user_id}>
                    <Trash2 className="h-4 w-4" />
                    {deleting === driver.user_id ? "جاري الحذف..." : "حذف السائق"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف {driver.profiles?.full_name || "السائق"}؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف هذا السائق نهائياً من النظام. لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteUser(driver.user_id, driver.profiles?.full_name || "السائق")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      حذف
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
        {drivers.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">لا يوجد سائقين بعد</p>
        )}
      </div>
    </div>
  );
};

export default DriversPage;
