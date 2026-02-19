import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "مدير",
  elder: "كبير السن",
  member: "عضو",
  driver: "سائق",
};

const MembersPage = () => {
  const { tenantId } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: "", fullName: "", phone: "", role: "member", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    if (!tenantId) return;
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenantId);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", tenantId);

    const rolesMap: Record<string, any[]> = {};
    (rolesData || []).forEach((r) => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r);
    });

    setMembers(
      (profilesData || []).map((p) => ({
        ...p,
        user_roles: rolesMap[p.user_id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [tenantId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email: newMember.email,
          password: newMember.password,
          fullName: newMember.fullName,
          phone: newMember.phone,
          role: newMember.role,
        }),
      }
    );

    const result = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error("خطأ في إضافة العضو", { description: result.error });
    } else {
      toast.success("تم إضافة العضو بنجاح");
      setDialogOpen(false);
      setNewMember({ email: "", fullName: "", phone: "", role: "member", password: "" });
      fetchMembers();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">إدارة الأعضاء</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأعضاء</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              إضافة عضو
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عضو جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={newMember.fullName}
                  onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                  required
                  placeholder="أحمد محمد"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  required
                  dir="ltr"
                  placeholder="user@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="text"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  required
                  dir="ltr"
                  minLength={6}
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الجوال</Label>
                <Input
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">عضو</SelectItem>
                    <SelectItem value="elder">كبير السن</SelectItem>
                    <SelectItem value="driver">سائق</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                {member.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.full_name}</p>
                {member.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {member.phone}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {member.user_roles?.map((r: any) => (
                  <span
                    key={r.role}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      r.role === "admin" ? "bg-primary/10 text-primary" :
                      r.role === "elder" ? "bg-purple-100 text-purple-800" :
                      r.role === "driver" ? "bg-orange-100 text-orange-800" :
                      "bg-muted text-muted-foreground"
                    )}
                  >
                    {roleLabels[r.role] || r.role}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {members.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا يوجد أعضاء بعد</p>
        )}
      </div>
    </div>
  );
};

export default MembersPage;
