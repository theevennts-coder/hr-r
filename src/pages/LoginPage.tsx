import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      toast({ title: "تم تسجيل الدخول بنجاح!" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
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
          <h1 className="text-2xl font-bold mb-2">تسجيل الدخول</h1>
          <p className="text-muted-foreground">أهلاً بعودتك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ليس لديك حساب؟{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            إنشاء حساب جديد
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
