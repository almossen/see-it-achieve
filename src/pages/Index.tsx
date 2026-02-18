import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mic, ShoppingCart, Truck, ArrowLeft, Users, Star, Shield } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "طلب صوتي",
    description: "اطلب مشترياتك بصوتك بكل سهولة — مصمم خصيصاً لكبار السن",
  },
  {
    icon: ShoppingCart,
    title: "تسوق بالصور",
    description: "تصفح المنتجات بالصور والرموز التعبيرية بدون الحاجة للقراءة",
  },
  {
    icon: Truck,
    title: "توصيل عائلي",
    description: "عيّن سائقاً من العائلة وتابع الطلب لحظة بلحظة عبر واتساب",
  },
];

const steps = [
  { number: "١", title: "سجّل عائلتك", description: "أنشئ حساب العائلة وأضف الأعضاء" },
  { number: "٢", title: "أضف المنتجات", description: "أضف قائمة البقالة المفضلة لعائلتك" },
  { number: "٣", title: "اطلب بسهولة", description: "اطلب بالصوت أو بالصور وعيّن السائق" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-tajawal">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <span className="text-xl font-bold text-primary">طلباتي</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">ابدأ مجاناً</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 text-sm font-medium">
              <Star className="h-4 w-4" />
              <span>مصمم خصيصاً لراحة كبار السن</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6 text-foreground">
              طلبات البقالة
              <br />
              <span className="text-primary">أسهل مع العائلة</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              تطبيق ذكي يجمع العائلة حول طلبات البقالة — بالصوت والصور، مع توصيل عائلي ومتابعة فورية عبر واتساب
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 h-14 w-full sm:w-auto gap-2">
                  ابدأ الآن مجاناً
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 w-full sm:w-auto">
                  لديّ حساب
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">لماذا طلباتي؟</h2>
            <p className="text-muted-foreground text-lg">مميزات مصممة لتسهيل حياة العائلة</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">كيف يعمل؟</h2>
            <p className="text-muted-foreground text-lg">ثلاث خطوات بسيطة لبداية سهلة</p>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex-1 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-5 text-2xl font-bold">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Shield className="h-6 w-6 text-primary" />
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">جاهز لتسهيل طلبات عائلتك؟</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              سجّل الآن وابدأ بإضافة أفراد عائلتك ومنتجاتك المفضلة
            </p>
            <Link to="/register">
              <Button size="lg" className="text-lg px-10 h-14 gap-2">
                أنشئ حساب عائلتك
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            🛒 طلباتي — تطبيق طلبات البقالة العائلي © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
