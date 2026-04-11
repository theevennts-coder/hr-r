import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, FileText, Building2, CheckCircle, Clock, XCircle } from "lucide-react";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    candidates: 0, companies: 0, jobs: 0, applications: 0,
    pendingCompanies: 0, pendingJobs: 0, frozenCompanies: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const [candidates, companies, jobs, applications, pendingCompanies, pendingJobs, frozenCompanies] = await Promise.all([
      supabase.from("candidates").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("admin_approved", false).neq("status", "draft"),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_frozen", true),
    ]);

    setStats({
      candidates: candidates.count || 0,
      companies: companies.count || 0,
      jobs: jobs.count || 0,
      applications: applications.count || 0,
      pendingCompanies: pendingCompanies.count || 0,
      pendingJobs: pendingJobs.count || 0,
      frozenCompanies: frozenCompanies.count || 0,
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const mainCards = [
    { icon: Users, label: "المرشحون", count: stats.candidates, color: "text-primary" },
    { icon: Building2, label: "الشركات", count: stats.companies, color: "text-accent" },
    { icon: Briefcase, label: "الوظائف", count: stats.jobs, color: "text-primary" },
    { icon: FileText, label: "الطلبات", count: stats.applications, color: "text-accent" },
  ];

  const actionCards = [
    { icon: Clock, label: "شركات بانتظار الموافقة", count: stats.pendingCompanies, color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Clock, label: "وظائف بانتظار الموافقة", count: stats.pendingJobs, color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: XCircle, label: "شركات مجمدة", count: stats.frozenCompanies, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">لوحة تحكم الأدمن</h2>

      <div className="grid md:grid-cols-4 gap-4">
        {mainCards.map(card => (
          <div key={card.label} className="p-6 rounded-2xl bg-card border border-border/50 text-center">
            <card.icon className={`w-8 h-8 mx-auto mb-3 ${card.color}`} />
            <p className="text-3xl font-bold">{card.count}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold">تنبيهات تحتاج إجراء</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {actionCards.map(card => (
          <div key={card.label} className={`p-5 rounded-2xl border border-border/50 ${card.bg}`}>
            <div className="flex items-center gap-3">
              <card.icon className={`w-6 h-6 ${card.color}`} />
              <div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.count}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
