import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, MapPin, Clock, Send } from "lucide-react";

interface JobsBrowseProps {
  userId: string;
}

export const JobsBrowse = ({ userId }: JobsBrowseProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [myApplications, setMyApplications] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
  }, [userId]);

  const loadJobs = async () => {
    setLoading(true);

    // Get candidate ID
    const { data: candidate } = await supabase
      .from("candidates").select("id").eq("user_id", userId).single();

    if (candidate) {
      const { data: apps } = await supabase
        .from("applications").select("job_id").eq("candidate_id", candidate.id);
      setMyApplications((apps || []).map(a => a.job_id));
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("*, companies(name, logo_url, city)")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!error && data) setJobs(data);
    setLoading(false);
  };

  const handleApply = async (jobId: string) => {
    setApplying(jobId);
    try {
      const { data: candidate } = await supabase
        .from("candidates").select("id").eq("user_id", userId).single();

      if (!candidate) throw new Error("أكمل ملفك الشخصي أولاً");

      const { error } = await supabase.from("applications").insert({
        candidate_id: candidate.id,
        job_id: jobId,
        status: "applied",
      });

      if (error) throw error;

      setMyApplications(prev => [...prev, jobId]);
      toast({ title: "تم التقديم بنجاح ✓" });
    } catch (error: any) {
      toast({ title: "خطأ في التقديم", description: error.message, variant: "destructive" });
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">الوظائف المتاحة</h2>
        <p className="text-muted-foreground">تصفح الوظائف وقدّم على المناسب لك</p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد وظائف متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map(job => (
            <div key={job.id} className="p-6 rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{job.companies?.name}</p>
                  <p className="text-sm mb-4 line-clamp-2">{job.description}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.city && (
                      <Badge variant="outline"><MapPin className="w-3 h-3 ml-1" />{job.city}</Badge>
                    )}
                    {job.min_experience > 0 && (
                      <Badge variant="outline"><Clock className="w-3 h-3 ml-1" />{job.min_experience}+ سنوات خبرة</Badge>
                    )}
                  </div>

                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.required_skills.map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {myApplications.includes(job.id) ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">تم التقديم ✓</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleApply(job.id)} disabled={applying === job.id}>
                      <Send className="w-4 h-4" />
                      {applying === job.id ? "..." : "تقديم"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
