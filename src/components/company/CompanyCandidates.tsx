import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Star, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CompanyCandidatesProps {
  userId: string;
}

const statusLabels: Record<string, string> = {
  applied: "تم التقديم",
  shortlisted: "مُرشح",
  interview_scheduled: "مقابلة محددة",
  interviewed: "تمت المقابلة",
  hired: "تم التوظيف",
  rejected: "مرفوض",
};

export const CompanyCandidates = ({ userId }: CompanyCandidatesProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [evalDialog, setEvalDialog] = useState<{ app: any } | null>(null);
  const [evalForm, setEvalForm] = useState({
    technical_score: 3, communication_score: 3, problem_solving_score: 3, values_alignment_score: 3, notes: "", recommendation: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
  }, [userId]);

  useEffect(() => {
    if (selectedJob) loadApplications(selectedJob);
  }, [selectedJob]);

  const loadJobs = async () => {
    setLoading(true);
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", userId).single();
    if (company) {
      const { data } = await supabase.from("jobs").select("id, title, status").eq("company_id", company.id);
      if (data) {
        setJobs(data);
        if (data.length > 0) setSelectedJob(data[0].id);
      }
    }
    setLoading(false);
  };

  const loadApplications = async (jobId: string) => {
    const { data } = await supabase
      .from("applications")
      .select("*, candidates(id, user_id, skills, experience_years, city, title, bio)")
      .eq("job_id", jobId)
      .order("match_score", { ascending: false });
    
    if (data) {
      // Fetch profile names for each candidate
      const enriched = await Promise.all(data.map(async (app: any) => {
        if (app.candidates?.user_id) {
          const { data: profile } = await supabase
            .from("profiles").select("full_name, phone").eq("user_id", app.candidates.user_id).single();
          return { ...app, candidate_profile: profile };
        }
        return app;
      }));
      setApplications(enriched);
    }
  };

const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from("applications").update({ status: newStatus as any }).eq("id", appId);
    if (!error) {
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      toast({ title: `تم تحديث الحالة إلى: ${statusLabels[newStatus]}` });
    }
  };

  const runMatching = async () => {
    if (!selectedJob) return;
    setMatching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ job_id: selectedJob }),
      });
      const result = await resp.json();
      if (result.success) {
        toast({ title: `تم العثور على ${result.matches.length} مرشح مطابق` });
        // Update scores for existing applications
        for (const match of result.matches) {
          await supabase.from("applications")
            .update({ match_score: match.score, match_breakdown: match.breakdown })
            .eq("job_id", selectedJob)
            .eq("candidate_id", match.candidate_id);
        }
        loadApplications(selectedJob);
      }
    } catch {
      toast({ title: "خطأ في المطابقة", variant: "destructive" });
    } finally {
      setMatching(false);
    }
  };

  const submitEvaluation = async () => {
    if (!evalDialog) return;
    try {
      const overall = (evalForm.technical_score + evalForm.communication_score + evalForm.problem_solving_score + evalForm.values_alignment_score) / 4;
      const { error } = await supabase.from("evaluations").insert({
        application_id: evalDialog.app.id,
        evaluator_id: userId,
        ...evalForm,
        overall_score: Math.round(overall * 10) / 10,
      });
      if (error) throw error;
      toast({ title: "تم حفظ التقييم" });
      setEvalDialog(null);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">المرشحون</h2>
          <p className="text-muted-foreground">إدارة المتقدمين ومطابقة المرشحين</p>
        </div>
        <Button onClick={runMatching} disabled={matching || !selectedJob} variant="outline">
          <Sparkles className="w-4 h-4" />
          {matching ? "جاري المطابقة..." : "تشغيل المطابقة الذكية"}
        </Button>
      </div>

      {jobs.length > 1 && (
        <Select value={selectedJob || ""} onValueChange={setSelectedJob}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="اختر وظيفة" />
          </SelectTrigger>
          <SelectContent>
            {jobs.map(job => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا يوجد متقدمون لهذه الوظيفة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map(app => {
            return (
              <div key={app.id} className="p-5 rounded-2xl bg-card border border-border/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{app.candidate_profile?.full_name || "مرشح"}</h3>
                    <p className="text-sm text-muted-foreground">{app.candidates?.title || ""}</p>
                    {app.candidates?.city && <p className="text-xs text-muted-foreground">📍 {app.candidates.city}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {app.match_score != null && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {app.match_score}% مطابقة
                      </Badge>
                    )}
                    <Select value={app.status} onValueChange={(val) => updateStatus(app.id, val)}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {app.candidates?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {app.candidates.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                )}

                {(app.status === "interviewed" || app.status === "interview_scheduled") && (
                  <Button variant="outline" size="sm" onClick={() => { setEvalDialog({ app }); setEvalForm({ technical_score: 3, communication_score: 3, problem_solving_score: 3, values_alignment_score: 3, notes: "", recommendation: "" }); }}>
                    <Star className="w-4 h-4" />تقييم المقابلة
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Evaluation Dialog */}
      <Dialog open={!!evalDialog} onOpenChange={() => setEvalDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تقييم المقابلة</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            {[
              { key: "technical_score", label: "المهارات التقنية" },
              { key: "communication_score", label: "مهارات التواصل" },
              { key: "problem_solving_score", label: "حل المشكلات" },
              { key: "values_alignment_score", label: "توافق القيم" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setEvalForm(f => ({ ...f, [key]: n }))}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        (evalForm as any)[key] >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={evalForm.notes} onChange={e => setEvalForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>التوصية</Label>
              <Select value={evalForm.recommendation} onValueChange={v => setEvalForm(f => ({ ...f, recommendation: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strongly_recommend">أوصي بشدة</SelectItem>
                  <SelectItem value="recommend">أوصي</SelectItem>
                  <SelectItem value="neutral">محايد</SelectItem>
                  <SelectItem value="not_recommend">لا أوصي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submitEvaluation} className="w-full">حفظ التقييم</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
