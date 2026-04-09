import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Briefcase, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as SupaUser } from "@supabase/supabase-js";

const DashboardPage = () => {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "تم تسجيل الخروج" });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userType = user?.user_metadata?.user_type || "candidate";
  const userName = user?.user_metadata?.full_name || "المستخدم";

  const candidateLinks = [
    { icon: User, label: "ملفي الشخصي", href: "/dashboard/profile", desc: "تعديل بياناتك ومهاراتك" },
    { icon: FileText, label: "سيرتي الذاتية", href: "/dashboard/cv", desc: "رفع وإدارة السيرة الذاتية" },
    { icon: Briefcase, label: "طلباتي", href: "/dashboard/applications", desc: "متابعة طلبات التوظيف" },
  ];

  const companyLinks = [
    { icon: Briefcase, label: "الوظائف", href: "/dashboard/jobs", desc: "إدارة إعلانات الوظائف" },
    { icon: User, label: "المرشحون", href: "/dashboard/candidates", desc: "استعراض المرشحين المطابقين" },
    { icon: Settings, label: "إعدادات الشركة", href: "/dashboard/company-settings", desc: "إدارة بيانات الشركة" },
  ];

  const links = userType === "company" ? companyLinks : candidateLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gradient-primary font-heading">وظّفني</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">مرحباً، {userName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">لوحة التحكم</h1>
        <p className="text-muted-foreground mb-8">
          {userType === "company" ? "إدارة عمليات التوظيف" : "إدارة ملفك المهني"}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {links.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="group p-6 rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
