import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Briefcase, FileText, Settings, MessageSquare, BarChart3, Shield, Users, Home, Building2 } from "lucide-react";
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
  { icon: Briefcase, label: "الوظائف المتاحة", href: "/dashboard/jobs" },
  { icon: FileText, label: "طلباتي", href: "/dashboard/applications" },
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
      {/* Sidebar */}
      <aside className="w-64 border-l border-border bg-card hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="text-xl font-bold text-gradient-primary font-heading">وظّفني</Link>
          <p className="text-xs text-muted-foreground mt-1">
            {userType === "admin" ? "لوحة الأدمن" : userType === "company" ? "لوحة الشركة" : "لوحة المرشح"}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                location.pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {userType === "admin" ? "مدير" : userType === "company" ? "شركة" : "مرشح"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-gradient-primary font-heading">وظّفني</Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{userName}</span>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden border-b border-border bg-card overflow-x-auto">
          <div className="flex p-2 gap-1 min-w-max">
            {links.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
