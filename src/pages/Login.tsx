import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Mail, Phone } from "lucide-react";

type LoginMethod = "email" | "phone";

const Login = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("phone");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let email = identifier;

    // If logging in with phone, look up the email from profiles
    if (loginMethod === "phone") {
      const phone = identifier.trim();
      const { data: fnData, error: fnError } = await supabase.functions.invoke("get-user-email", {
        body: { phone }
      });

      if (fnError || !fnData?.email) {
        toast.error("لم يتم العثور على حساب بهذا الرقم");
        setLoading(false);
        return;
      }
      email = fnData.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("خطأ في تسجيل الدخول", { description: "البريد أو كلمة المرور غير صحيحة" });
    } else {
      toast.success("تم تسجيل الدخول بنجاح");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const userRoles = roles?.map((r: any) => r.role) || [];
      if (userRoles.includes("admin")) {
        navigate("/admin");
      } else if (userRoles.includes("driver")) {
        navigate("/driver");
      } else if (userRoles.includes("elder")) {
        navigate("/elder");
      } else {
        navigate("/member");
      }
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
          {/* Toggle between email and phone */}
          <div className="flex gap-2 mb-5 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => { setLoginMethod("phone"); setIdentifier(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                loginMethod === "phone"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="h-4 w-4" />
              رقم الجوال
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod("email"); setIdentifier(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                loginMethod === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-base">
                {loginMethod === "phone" ? "رقم الجوال" : "البريد الإلكتروني"}
              </Label>
              <Input
                id="identifier"
                type={loginMethod === "email" ? "email" : "tel"}
                placeholder={loginMethod === "phone" ? "05XXXXXXXX" : "example@email.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
