import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Briefcase, FileText, Settings, MessageSquare, BarChart3, Shield, Users, Home, Building2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: string;
  userName: string;
  onLogout: () => void;
}

const candidateLinks = [
  { icon: Home, label: "الرئيسية", href: "/dashboard" },
  { icon: User, label: "ملفي الشخصي", href: "/dashboard/profile" },
  { icon: FileText, label: "سيرتي الذاتية", href: "/dashboard/cv" },
  { icon: Briefcase, label: "الوظائف", href: "/dashboard/jobs" },
  { icon: Send, label: "طلباتي", href: "/dashboard/applications" },
  { icon: MessageSquare, label: "المدرب المهني", href: "/dashboard/coach" },
];

const companyLinks = [
  { icon: Home, label: "الرئيسية", href: "/dashboard" },
  { icon: Briefcase, label: "الوظائف", href: "/dashboard/jobs" },
  { icon: Users, label: "المرشحون", href: "/dashboard/candidates" },
  { icon: Settings, label: "إعدادات الشركة", href: "/dashboard/company-settings" },
];

const adminLinks = [
  { icon: Home, label: "الرئيسية", href: "/dashboard" },
  { icon: Building2, label: "الشركات", href: "/dashboard/companies" },
  { icon: Briefcase, label: "الوظائف", href: "/dashboard/all-jobs" },
  { icon: Users, label: "المستخدمون", href: "/dashboard/users" },
  { icon: BarChart3, label: "الإحصائيات", href: "/dashboard/stats" },
  { icon: Shield, label: "سجل التدقيق", href: "/dashboard/audit" },
];

export const DashboardLayout = ({ children, userType, userName, onLogout }: DashboardLayoutProps) => {
  const location = useLocation();
  const links = userType === "admin" ? adminLinks : userType === "company" ? companyLinks : candidateLinks;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (dark premium) */}
      <aside className="w-72 bg-sidebar text-sidebar-foreground hidden md:flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold font-heading text-sidebar-foreground">وظّفني</p>
              <p className="text-[10px] text-sidebar-foreground/50 -mt-0.5">
                {userType === "admin" ? "لوحة الأدمن" : userType === "company" ? "لوحة الشركة" : "لوحة المرشح"}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(item => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-base group",
                  active
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {active && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-sidebar-primary" />
                )}
                <item.icon className={cn("w-[18px] h-[18px] transition-base", active && "scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-accent/40">
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
              <p className="text-[11px] text-sidebar-foreground/50">
                {userType === "admin" ? "مدير" : userType === "company" ? "شركة" : "مرشح"}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={onLogout} title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold font-heading">وظّفني</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden border-b border-border bg-card overflow-x-auto sticky top-[57px] z-10">
          <div className="flex p-2 gap-1 min-w-max">
            {links.map(item => {
              const active = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-base",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}>
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto bg-gradient-mesh">
          {children}
        </main>
      </div>
    </div>
  );
};
