import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, ArrowLeft } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    familyName: "",
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.fullName,
          phone: form.phone,
          family_name: form.familyName || form.fullName + " Family",
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error("خطأ في التسجيل", { description: error.message });
    } else {
      toast.success("تم إنشاء الحساب بنجاح!", {
        description: "يمكنك الآن تسجيل الدخول",
      });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 font-tajawal">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="text-4xl mb-2">🛒</div>
          <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            {step === 1 ? "أدخل بيانات العائلة والحساب" : "تخصيص إعدادات العائلة"}
          </CardDescription>
          {/* Step indicator */}
          <div className="flex gap-2 justify-center pt-2">
            <div className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`} />
            <div className={`h-2 w-12 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={step === 2 ? handleRegister : (e) => { e.preventDefault(); setStep(2); }} className="space-y-5">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-base">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    placeholder="أحمد محمد"
                    value={form.fullName}
                    onChange={(e) => updateForm("fullName", e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base">رقم الجوال</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="h-12 text-base"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    required
                    className="h-12 text-base"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="٦ أحرف على الأقل"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    required
                    minLength={6}
                    className="h-12 text-base"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base gap-2">
                  التالي
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="familyName" className="text-base">اسم العائلة (اختياري)</Label>
                  <Input
                    id="familyName"
                    placeholder="عائلة أحمد"
                    value={form.familyName}
                    onChange={(e) => updateForm("familyName", e.target.value)}
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">هذا الاسم سيظهر في لوحة التحكم</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 text-base"
                    onClick={() => setStep(1)}
                  >
                    رجوع
                  </Button>
                  <Button type="submit" className="flex-1 h-12 text-base gap-2" disabled={loading}>
                    {loading ? "جاري التسجيل..." : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        إنشاء الحساب
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            لديك حساب؟{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </p>
          <p className="text-center mt-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← الرجوع للصفحة الرئيسية
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
