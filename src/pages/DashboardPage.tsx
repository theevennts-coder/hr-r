import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CandidateProfile } from "@/components/candidate/CandidateProfile";
import { CVUpload } from "@/components/candidate/CVUpload";
import { JobsBrowse } from "@/components/candidate/JobsBrowse";
import { MyApplications } from "@/components/candidate/MyApplications";
import { CareerCoach } from "@/components/candidate/CareerCoach";
import { CompanyJobs } from "@/components/company/CompanyJobs";
import { CompanyCandidates } from "@/components/company/CompanyCandidates";
import { CompanySettings } from "@/components/company/CompanySettings";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCompanies } from "@/components/admin/AdminCompanies";
import { AdminJobs } from "@/components/admin/AdminJobs";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Users, FileText, MessageSquare, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardHome = ({ userType, userId }: { userType: string; userId: string }) => {
  const candidateCards = [
    { icon: FileText, label: "سيرتي الذاتية", href: "/dashboard/cv", desc: "رفع وتحليل السيرة الذاتية" },
    { icon: Briefcase, label: "الوظائف المتاحة", href: "/dashboard/jobs", desc: "تصفح وقدّم على الوظائف" },
    { icon: FileText, label: "طلباتي", href: "/dashboard/applications", desc: "متابعة حالة الطلبات" },
    { icon: MessageSquare, label: "المدرب المهني", href: "/dashboard/coach", desc: "احصل على نصائح ذكية" },
  ];

  const companyCards = [
    { icon: Briefcase, label: "الوظائف", href: "/dashboard/jobs", desc: "نشر وإدارة الوظائف" },
    { icon: Users, label: "المرشحون", href: "/dashboard/candidates", desc: "مطابقة وتقييم المرشحين" },
  ];

  const cards = userType === "admin" ? [] : userType === "company" ? companyCards : candidateCards;

  if (userType === "admin") return <AdminDashboard />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">مرحباً 👋</h1>
      <p className="text-muted-foreground mb-8">
        {userType === "company" ? "إدارة عمليات التوظيف" : "إدارة ملفك المهني"}
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(item => (
          <Link
            key={item.href}
            to={item.href}
            className="group p-6 rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">{item.label}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState("candidate");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/login");
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        navigate("/login");
        return;
      }

      // Check user type from profile
      const { data: profile } = await supabase
        .from("profiles").select("user_type").eq("user_id", session.user.id).single();
      if (profile) setUserType(profile.user_type);

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      if (roles?.some(r => r.role === "admin")) {
        setIsAdmin(true);
        setUserType("admin");
      }

      setLoading(false);
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

  if (!user) return null;

  const effectiveType = isAdmin ? "admin" : userType;
  const userName = user.user_metadata?.full_name || "المستخدم";

  return (
    <DashboardLayout userType={effectiveType} userName={userName} onLogout={handleLogout}>
      <Routes>
        <Route index element={<DashboardHome userType={effectiveType} userId={user.id} />} />

        {/* Candidate routes */}
        <Route path="profile" element={<CandidateProfile userId={user.id} />} />
        <Route path="cv" element={<CVUpload userId={user.id} />} />
        <Route path="applications" element={<MyApplications userId={user.id} />} />
        <Route path="coach" element={<CareerCoach userId={user.id} />} />

        {/* Shared: jobs (candidates browse, companies manage) */}
        <Route path="jobs" element={
          effectiveType === "company"
            ? <CompanyJobs userId={user.id} />
            : <JobsBrowse userId={user.id} />
        } />

        {/* Company routes */}
        <Route path="candidates" element={<CompanyCandidates userId={user.id} />} />
        <Route path="company-settings" element={<CompanySettings userId={user.id} />} />

        {/* Admin routes */}
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="all-jobs" element={<AdminJobs />} />
        <Route path="stats" element={<AdminDashboard />} />
        <Route path="audit" element={<AdminAuditLogs />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardPage;
