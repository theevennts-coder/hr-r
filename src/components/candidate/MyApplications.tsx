import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

interface MyApplicationsProps {
  userId: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  applied: { label: "تم التقديم", color: "bg-blue-500/10 text-blue-600" },
  shortlisted: { label: "مُرشح", color: "bg-amber-500/10 text-amber-600" },
  interview_scheduled: { label: "مقابلة محددة", color: "bg-purple-500/10 text-purple-600" },
  interviewed: { label: "تمت المقابلة", color: "bg-indigo-500/10 text-indigo-600" },
  hired: { label: "تم التوظيف", color: "bg-green-500/10 text-green-600" },
  rejected: { label: "مرفوض", color: "bg-red-500/10 text-red-600" },
};

export const MyApplications = ({ userId }: MyApplicationsProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, [userId]);

  const loadApplications = async () => {
    setLoading(true);
    const { data: candidate } = await supabase
      .from("candidates").select("id").eq("user_id", userId).single();

    if (candidate) {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, city, companies(name))")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false });

      if (!error && data) setApplications(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">طلباتي</h2>
        <p className="text-muted-foreground">تابع حالة طلبات التوظيف</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لم تتقدم لأي وظيفة بعد</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map(app => {
            const status = statusLabels[app.status] || statusLabels.applied;
            return (
              <div key={app.id} className="p-5 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{app.jobs?.title}</h3>
                  <p className="text-sm text-muted-foreground">{app.jobs?.companies?.name}</p>
                  {app.match_score != null && (
                    <p className="text-xs text-muted-foreground mt-1">درجة المطابقة: {app.match_score}%</p>
                  )}
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
