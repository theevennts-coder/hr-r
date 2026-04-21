import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Briefcase, Send, MessageSquare, Sparkles,
  TrendingUp, MapPin, ArrowLeft, CheckCircle2, Clock, Eye,
} from "lucide-react";

interface CandidateHomeProps {
  userId: string;
  userName: string;
}

interface Stats {
  applications: number;
  shortlisted: number;
  interviews: number;
  cvUploaded: boolean;
  profileComplete: number;
}

export const CandidateHome = ({ userId, userName }: CandidateHomeProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    applications: 0, shortlisted: 0, interviews: 0,
    cvUploaded: false, profileComplete: 0,
  });
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);

  useEffect(() => { loadDashboard(); }, [userId]);

  const loadDashboard = async () => {
    setLoading(true);

    const { data: candidate } = await supabase
      .from("candidates").select("*").eq("user_id", userId).maybeSingle();

    let completeness = 0;
    if (candidate) {
      const fields = [candidate.title, candidate.bio, candidate.city, candidate.cv_url, candidate.skills?.length, candidate.experience_years];
      completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    }

    let appsCount = 0, shortCount = 0, intCount = 0;
    let recent: any[] = [];
    if (candidate) {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, status, created_at, jobs(title, companies(name))")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (apps) {
        recent = apps;
        appsCount = apps.length;
        shortCount = apps.filter(a => a.status === "shortlisted").length;
        intCount = apps.filter(a => ["interview_scheduled", "interviewed"].includes(a.status)).length;
      }
    }

    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, city, required_skills, companies(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(4);

    setStats({
      applications: appsCount,
      shortlisted: shortCount,
      interviews: intCount,
      cvUploaded: !!candidate?.cv_url,
      profileComplete: completeness,
    });
    setRecommendedJobs(jobs || []);
    setRecentApps(recent);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (stats.profileComplete / 100) * circumference;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 md:p-10 text-primary-foreground shadow-xl-soft">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div>
            <p className="text-sm text-primary-foreground/70 mb-2 font-medium">مرحباً بعودتك 👋</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{userName}</h1>
            <p className="text-primary-foreground/80 max-w-md">
              {stats.profileComplete < 100
                ? "أكمل ملفك المهني لرفع فرصك في الحصول على الوظيفة المناسبة"
                : "ملفك مكتمل! استكشف الوظائف الموصى بها لك"}
            </p>
          </div>

          {/* Progress Ring */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full ring-progress" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-primary-foreground/15" />
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                stroke="hsl(var(--accent))" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{stats.profileComplete}%</span>
              <span className="text-[10px] text-primary-foreground/70">اكتمال</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Send} label="طلباتي" value={stats.applications}
          tone="primary" hint="تم التقديم"
        />
        <StatCard
          icon={CheckCircle2} label="مرشّح" value={stats.shortlisted}
          tone="success" hint="ضمن القائمة المختصرة"
        />
        <StatCard
          icon={MessageSquare} label="مقابلات" value={stats.interviews}
          tone="accent" hint="مجدولة أو منتهية"
        />
        <StatCard
          icon={FileText} label="السيرة" value={stats.cvUploaded ? "✓" : "—"}
          tone={stats.cvUploaded ? "success" : "warning"}
          hint={stats.cvUploaded ? "محمّلة ومحللة" : "لم تُرفع بعد"}
        />
      </div>

      {/* Two col: Recommended + Recent apps */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recommended jobs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold">وظائف موصى بها لك</h2>
            </div>
            <Link to="/dashboard/jobs">
              <Button variant="ghost" size="sm" className="gap-1">
                الكل <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {recommendedJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="لا توجد وظائف متاحة حالياً"
              hint="عُد لاحقاً للاطلاع على الفرص الجديدة"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recommendedJobs.map(job => (
                <Link
                  key={job.id}
                  to="/dashboard/jobs"
                  className="premium-card p-5 hover-lift group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-1 truncate group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{job.companies?.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">جديد</Badge>
                  </div>
                  {job.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3" />
                      {job.city}
                    </div>
                  )}
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.required_skills.slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px] py-0">{s}</Badge>
                      ))}
                      {job.required_skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">+{job.required_skills.length - 3}</span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent applications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">آخر طلباتي</h2>
          </div>
          {recentApps.length === 0 ? (
            <EmptyState icon={Send} title="لم تقدّم على وظائف بعد" hint="ابدأ من تبويب الوظائف" small />
          ) : (
            <div className="space-y-2">
              {recentApps.map(app => (
                <div key={app.id} className="premium-card p-4">
                  <p className="font-medium text-sm mb-1 line-clamp-1">{app.jobs?.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{app.jobs?.companies?.name}</p>
                  <Badge variant={
                    app.status === "hired" ? "default" :
                    app.status === "rejected" ? "destructive" :
                    app.status === "shortlisted" ? "secondary" : "outline"
                  } className="text-[10px]">
                    {statusLabel(app.status)}
                  </Badge>
                </div>
              ))}
              <Link to="/dashboard/applications">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  عرض كل الطلبات
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={FileText} label="رفع السيرة" href="/dashboard/cv" />
        <QuickAction icon={Briefcase} label="تصفح الوظائف" href="/dashboard/jobs" />
        <QuickAction icon={Send} label="طلباتي" href="/dashboard/applications" />
        <QuickAction icon={MessageSquare} label="المدرب المهني" href="/dashboard/coach" featured />
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone, hint }: any) => {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div className="stat-card">
      <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="relative">
        <p className="text-3xl font-bold mb-1">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, href, featured }: any) => (
  <Link
    to={href}
    className={`group flex items-center gap-3 p-4 rounded-2xl border transition-base hover-lift ${
      featured
        ? "border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5"
        : "border-border/60 bg-card"
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      featured ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
    }`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="font-medium text-sm flex-1">{label}</span>
    <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:translate-x-[-4px] transition-transform" />
  </Link>
);

const EmptyState = ({ icon: Icon, title, hint, small }: any) => (
  <div className={`premium-card flex flex-col items-center justify-center text-center ${small ? "p-6" : "p-10"}`}>
    <Icon className={`text-muted-foreground/40 mb-3 ${small ? "w-8 h-8" : "w-12 h-12"}`} />
    <p className="font-medium text-sm">{title}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const statusLabel = (s: string) => ({
  applied: "تم التقديم",
  shortlisted: "في القائمة المختصرة",
  interview_scheduled: "مقابلة مجدولة",
  interviewed: "تمت المقابلة",
  hired: "تم القبول",
  rejected: "غير مقبول",
} as Record<string, string>)[s] || s;
