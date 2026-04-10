import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, Eye, Users, Edit, Trash2, Shield, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CompanyJobsProps {
  userId: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
  grace_period: { label: "فترة سماح", color: "bg-amber-500/10 text-amber-600" },
  open: { label: "مفتوحة", color: "bg-green-500/10 text-green-600" },
  closed: { label: "مغلقة", color: "bg-muted text-muted-foreground" },
  frozen: { label: "مجمدة", color: "bg-red-500/10 text-red-600" },
};

export const CompanyJobs = ({ userId }: CompanyJobsProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", description: "", city: "", min_experience: 0, required_skills: [] as string[],
  });
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    loadJobs();
  }, [userId]);

  const loadJobs = async () => {
    setLoading(true);
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", userId).single();
    if (company) {
      setCompanyId(company.id);
      const { data } = await supabase.from("jobs").select("*").eq("company_id", company.id).order("created_at", { ascending: false });
      if (data) setJobs(data);
    }
    setLoading(false);
  };

  const checkCompliance = async () => {
    if (!form.title || !form.description) {
      toast({ title: "أدخل العنوان والوصف أولاً", variant: "destructive" });
      return;
    }
    setChecking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compliance-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      const result = await resp.json();
      setComplianceResult(result);
    } catch (e) {
      toast({ title: "خطأ في الفحص", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const createJob = async () => {
    if (!companyId || !form.title || !form.description) return;
    setSaving(true);
    try {
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 24);

      const { error } = await supabase.from("jobs").insert({
        company_id: companyId,
        title: form.title,
        description: form.description,
        city: form.city || null,
        min_experience: form.min_experience,
        required_skills: form.required_skills,
        status: "grace_period",
        grace_period_ends_at: gracePeriodEnd.toISOString(),
        is_compliant: complianceResult?.is_compliant !== false,
        compliance_notes: complianceResult?.issues?.join("; ") || null,
      });

      if (error) throw error;

      toast({ title: "تم إنشاء الوظيفة — ستُفتح بعد 24 ساعة" });
      setShowCreate(false);
      setForm({ title: "", description: "", city: "", min_experience: 0, required_skills: [] });
      setComplianceResult(null);
      loadJobs();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (!error) {
      setJobs(prev => prev.filter(j => j.id !== id));
      toast({ title: "تم حذف المسودة" });
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setForm(prev => ({ ...prev, required_skills: [...prev.required_skills, newSkill.trim()] }));
      setNewSkill("");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">الوظائف</h2>
          <p className="text-muted-foreground">إدارة إعلانات الوظائف</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" />إضافة وظيفة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>وظيفة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>عنوان الوظيفة *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="مطور Full Stack" />
              </div>
              <div className="space-y-2">
                <Label>وصف الوظيفة *</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="المهام والمتطلبات..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="الرياض" />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأدنى للخبرة (سنوات)</Label>
                  <Input type="number" min={0} value={form.min_experience} onChange={e => setForm(f => ({ ...f, min_experience: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المهارات المطلوبة</Label>
                <div className="flex gap-2">
                  <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="أضف مهارة" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                  <Button type="button" variant="outline" onClick={addSkill}>إضافة</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.required_skills.map(skill => (
                    <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => setForm(f => ({ ...f, required_skills: f.required_skills.filter(s => s !== skill) }))}>
                      {skill} ✕
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Compliance Check */}
              <Button type="button" variant="outline" className="w-full" onClick={checkCompliance} disabled={checking}>
                <Shield className="w-4 h-4" />
                {checking ? "جاري الفحص..." : "فحص الامتثال"}
              </Button>

              {complianceResult && (
                <div className={`p-4 rounded-xl border ${complianceResult.is_compliant ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <p className="font-medium text-sm mb-2">
                    {complianceResult.is_compliant ? "✓ متوافق" : "✗ يوجد مخالفات"}
                  </p>
                  {complianceResult.issues?.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {complianceResult.issues.map((issue: string, i: number) => (
                        <li key={i} className="text-red-600">• {issue}</li>
                      ))}
                    </ul>
                  )}
                  {complianceResult.suggestions?.length > 0 && (
                    <ul className="text-xs space-y-1 mt-2">
                      {complianceResult.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-muted-foreground">💡 {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Button onClick={createJob} disabled={saving} className="w-full">
                {saving ? "جاري الإنشاء..." : "نشر الوظيفة (فترة سماح 24 ساعة)"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لم تنشر أي وظيفة بعد</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map(job => {
            const status = statusLabels[job.status] || statusLabels.draft;
            return (
              <div key={job.id} className="p-5 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{job.title}</h3>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {job.city && <span>📍 {job.city}</span>}
                    <span><Eye className="w-3 h-3 inline" /> {job.views_count} مشاهدة</span>
                    <span><Users className="w-3 h-3 inline" /> {job.applications_count} طلب</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {job.status === "draft" && (
                    <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
