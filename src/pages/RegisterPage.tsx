import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, ArrowLeft, Mail, Lock, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type UserType = "candidate" | "company";

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as UserType) || "candidate";
  const [userType, setUserType] = useState<UserType>(initialType);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    companyName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.name,
            user_type: userType,
            phone: form.phone,
            company_name: userType === "company" ? form.companyName : undefined,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "تم التسجيل بنجاح!",
        description: "تحقق من بريدك الإلكتروني لتأكيد الحساب",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "خطأ في التسجيل",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-gradient-primary font-heading inline-block mb-2">
            وظّفني
          </Link>
          <h1 className="text-2xl font-bold mb-2">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground">انضم إلى منصة التوظيف الذكية</p>
        </div>

        {/* Type Switcher */}
        <div className="flex rounded-xl bg-muted p-1 mb-8">
          <button
            onClick={() => setUserType("candidate")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
              userType === "candidate"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            مرشح
          </button>
          <button
            onClick={() => setUserType("company")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
              userType === "company"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            شركة
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              <User className="w-4 h-4 inline ml-1" />
              الاسم الكامل
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={userType === "company" ? "اسم المسؤول" : "اسمك الكامل"}
              required
            />
          </div>

          {userType === "company" && (
            <div className="space-y-2">
              <Label htmlFor="companyName">
                <Building2 className="w-4 h-4 inline ml-1" />
                اسم الشركة
              </Label>
              <Input
                id="companyName"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="اسم الشركة الرسمي"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="w-4 h-4 inline ml-1" />
              البريد الإلكتروني
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="w-4 h-4 inline ml-1" />
              رقم الجوال
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+966 5XX XXX XXXX"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              <Lock className="w-4 h-4 inline ml-1" />
              كلمة المرور
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              dir="ltr"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "جاري التسجيل..." : "إنشاء الحساب"}
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          لديك حساب بالفعل؟{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
