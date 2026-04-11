import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, CheckCircle, XCircle, Search, Eye, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusLabels: Record<string, { label: string; variant: string }> = {
  draft: { label: "مسودة", variant: "bg-muted text-muted-foreground" },
  grace_period: { label: "فترة سماح", variant: "bg-amber-500/10 text-amber-600" },
  open: { label: "مفتوحة", variant: "bg-green-500/10 text-green-600" },
  closed: { label: "مغلقة", variant: "bg-muted text-muted-foreground" },
  frozen: { label: "مجمدة", variant: "bg-red-500/10 text-red-600" },
};

export const AdminJobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "frozen">("all");
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; jobId: string; reason: string }>({ open: false, jobId: "", reason: "" });
  const [detailJob, setDetailJob] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    setLoading(true);
    const [{ data: jobsData }, { data: companiesData }] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
    ]);
    if (jobsData) setJobs(jobsData);
    if (companiesData) {
      const map: Record<string, string> = {};
      companiesData.forEach(c => { map[c.id] = c.name; });
      setCompanies(map);
    }
    setLoading(false);
  };

  const approveJob = async (id: string) => {
    const { error } = await supabase.from("jobs").update({ admin_approved: true, status: "open", rejection_reason: null }).eq("id", id);
    if (!error) {
      toast({ title: "تمت الموافقة على الوظيفة ✓" });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, admin_approved: true, status: "open", rejection_reason: null } : j));
    }
  };

  const rejectJob = async () => {
    const { jobId, reason } = rejectDialog;
    const { error } = await supabase.from("jobs").update({ admin_approved: false, status: "closed", rejection_reason: reason }).eq("id", jobId);
    if (!error) {
      toast({ title: "تم رفض الوظيفة" });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, admin_approved: false, status: "closed", rejection_reason: reason } : j));
      setRejectDialog({ open: false, jobId: "", reason: "" });
    }
  };

  const freezeJob = async (id: string) => {
    const { error } = await supabase.from("jobs").update({ status: "frozen" }).eq("id", id);
    if (!error) {
      toast({ title: "تم تجميد الوظيفة" });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "frozen" } : j));
    }
  };

  const closeJob = async (id: string) => {
    const { error } = await supabase.from("jobs").update({ status: "closed" }).eq("id", id);
    if (!error) {
      toast({ title: "تم إغلاق الوظيفة" });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "closed" } : j));
    }
  };

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (!error) {
      toast({ title: "تم حذف الوظيفة" });
      setJobs(prev => prev.filter(j => j.id !== id));
    }
  };

  const filtered = jobs.filter(j => {
    if (filter === "pending") return !j.admin_approved && j.status !== "draft" && j.status !== "closed";
    if (filter === "approved") return j.admin_approved && j.status === "open";
    if (filter === "frozen") return j.status === "frozen";
    return true;
  }).filter(j => !search || j.title?.toLowerCase().includes(search.toLowerCase()) || companies[j.company_id]?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الوظائف</h2>

      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "pending", "approved", "frozen"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : f === "pending" ? "بانتظار الموافقة" : f === "approved" ? "مفتوحة" : "مجمدة"}
          </Button>
        ))}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pr-9" placeholder="بحث بالعنوان أو الشركة..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد وظائف</p>}
        {filtered.map(j => {
          const st = statusLabels[j.status] || statusLabels.draft;
          return (
            <div key={j.id} className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold truncate">{j.title}</h3>
                  <Badge className={st.variant}>{st.label}</Badge>
                  {j.admin_approved && <Badge className="bg-green-500/10 text-green-600 text-[10px]">معتمدة</Badge>}
                  {!j.is_compliant && <Badge variant="destructive" className="text-[10px]">غير متوافقة</Badge>}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>🏢 {companies[j.company_id] || "—"}</span>
                  {j.city && <span>📍 {j.city}</span>}
                  <span>👁 {j.views_count}</span>
                  <span>📩 {j.applications_count}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setDetailJob(j)} title="تفاصيل">
                  <Eye className="w-4 h-4" />
                </Button>

                {!j.admin_approved && j.status !== "draft" && j.status !== "closed" && (
                  <>
                    <Button size="sm" onClick={() => approveJob(j.id)} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4" /> موافقة
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ open: true, jobId: j.id, reason: "" })}>
                      <XCircle className="w-4 h-4" /> رفض
                    </Button>
                  </>
                )}

                {j.status === "open" && (
                  <>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => freezeJob(j.id)}>تجميد</Button>
                    <Button size="sm" variant="outline" onClick={() => closeJob(j.id)}>إغلاق</Button>
                  </>
                )}

                {(j.status === "closed" || j.status === "frozen") && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteJob(j.id)}>حذف</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => !open && setRejectDialog(d => ({ ...d, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>سبب رفض الوظيفة</DialogTitle></DialogHeader>
          <Textarea value={rejectDialog.reason} onChange={e => setRejectDialog(d => ({ ...d, reason: e.target.value }))} placeholder="اكتب سبب الرفض..." rows={3} />
          <Button variant="destructive" onClick={rejectJob} disabled={!rejectDialog.reason.trim()}>تأكيد الرفض</Button>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailJob} onOpenChange={open => !open && setDetailJob(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل الوظيفة</DialogTitle></DialogHeader>
          {detailJob && (
            <div className="space-y-3 text-sm">
              <div><strong>العنوان:</strong> {detailJob.title}</div>
              <div><strong>الشركة:</strong> {companies[detailJob.company_id] || "—"}</div>
              <div><strong>المدينة:</strong> {detailJob.city || "—"}</div>
              <div><strong>الخبرة المطلوبة:</strong> {detailJob.min_experience} سنوات</div>
              <div><strong>المهارات:</strong> {detailJob.required_skills?.join(", ") || "—"}</div>
              <div><strong>الوصف:</strong></div>
              <p className="whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">{detailJob.description}</p>
              {detailJob.compliance_notes && <div className="text-amber-600"><strong>ملاحظات الامتثال:</strong> {detailJob.compliance_notes}</div>}
              {detailJob.rejection_reason && <div className="text-destructive"><strong>سبب الرفض:</strong> {detailJob.rejection_reason}</div>}
              <div className="text-xs text-muted-foreground">تاريخ الإنشاء: {new Date(detailJob.created_at).toLocaleDateString("ar-SA")}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
