import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("خطأ في تسجيل الدخول", { description: error.message });
    } else {
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 font-tajawal">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="text-4xl mb-2">🛒</div>
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>أدخل بياناتك للوصول إلى حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base pe-12"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
              {loading ? "جاري الدخول..." : (
                <>
                  <LogIn className="h-5 w-5" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              سجّل الآن
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

export default Login;
