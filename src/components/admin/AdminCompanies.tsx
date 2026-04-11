import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle, XCircle, Snowflake, Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const AdminCompanies = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "frozen">("all");
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; companyId: string; reason: string }>({ open: false, companyId: "", reason: "" });
  const [freezeDialog, setFreezeDialog] = useState<{ open: boolean; companyId: string; reason: string }>({ open: false, companyId: "", reason: "" });
  const [detailCompany, setDetailCompany] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (data) setCompanies(data);
    setLoading(false);
  };

  const approveCompany = async (id: string) => {
    const { error } = await supabase.from("companies").update({ is_approved: true, rejection_reason: null }).eq("id", id);
    if (!error) {
      toast({ title: "تمت الموافقة على الشركة ✓" });
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_approved: true, rejection_reason: null } : c));
    }
  };

  const rejectCompany = async () => {
    const { companyId, reason } = rejectDialog;
    const { error } = await supabase.from("companies").update({ is_approved: false, rejection_reason: reason }).eq("id", companyId);
    if (!error) {
      toast({ title: "تم رفض الشركة" });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, is_approved: false, rejection_reason: reason } : c));
      setRejectDialog({ open: false, companyId: "", reason: "" });
    }
  };

  const freezeCompany = async () => {
    const { companyId, reason } = freezeDialog;
    const { error } = await supabase.from("companies").update({ is_frozen: true, frozen_reason: reason }).eq("id", companyId);
    if (!error) {
      toast({ title: "تم تجميد الشركة" });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, is_frozen: true, frozen_reason: reason } : c));
      setFreezeDialog({ open: false, companyId: "", reason: "" });
    }
  };

  const unfreezeCompany = async (id: string) => {
    const { error } = await supabase.from("companies").update({ is_frozen: false, frozen_reason: null }).eq("id", id);
    if (!error) {
      toast({ title: "تم إلغاء تجميد الشركة" });
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_frozen: false, frozen_reason: null } : c));
    }
  };

  const filtered = companies.filter(c => {
    if (filter === "pending") return !c.is_approved;
    if (filter === "approved") return c.is_approved && !c.is_frozen;
    if (filter === "frozen") return c.is_frozen;
    return true;
  }).filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الشركات</h2>

      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "pending", "approved", "frozen"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : f === "pending" ? "بانتظار الموافقة" : f === "approved" ? "مفعّلة" : "مجمدة"}
          </Button>
        ))}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pr-9" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد شركات</p>}
        {filtered.map(c => (
          <div key={c.id} className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {c.city && <span>📍 {c.city}</span>}
                  {c.industry && <span>🏭 {c.industry}</span>}
                  <span>📋 {c.jobs_posted} وظيفة</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {c.is_frozen ? (
                <Badge variant="destructive">مجمدة</Badge>
              ) : c.is_approved ? (
                <Badge className="bg-green-500/10 text-green-600">مفعّلة</Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-600">بانتظار الموافقة</Badge>
              )}

              <Button variant="ghost" size="icon" onClick={() => setDetailCompany(c)} title="تفاصيل">
                <Eye className="w-4 h-4" />
              </Button>

              {!c.is_approved && (
                <Button size="sm" onClick={() => approveCompany(c.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" /> موافقة
                </Button>
              )}

              {!c.is_approved && (
                <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ open: true, companyId: c.id, reason: "" })}>
                  <XCircle className="w-4 h-4" /> رفض
                </Button>
              )}

              {c.is_approved && !c.is_frozen && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setFreezeDialog({ open: true, companyId: c.id, reason: "" })}>
                  <Snowflake className="w-4 h-4" /> تجميد
                </Button>
              )}

              {c.is_frozen && (
                <Button size="sm" variant="outline" onClick={() => unfreezeCompany(c.id)}>
                  إلغاء التجميد
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => !open && setRejectDialog(d => ({ ...d, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>سبب رفض الشركة</DialogTitle></DialogHeader>
          <Textarea value={rejectDialog.reason} onChange={e => setRejectDialog(d => ({ ...d, reason: e.target.value }))} placeholder="اكتب سبب الرفض..." rows={3} />
          <Button variant="destructive" onClick={rejectCompany} disabled={!rejectDialog.reason.trim()}>تأكيد الرفض</Button>
        </DialogContent>
      </Dialog>

      {/* Freeze Dialog */}
      <Dialog open={freezeDialog.open} onOpenChange={open => !open && setFreezeDialog(d => ({ ...d, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>سبب تجميد الشركة</DialogTitle></DialogHeader>
          <Textarea value={freezeDialog.reason} onChange={e => setFreezeDialog(d => ({ ...d, reason: e.target.value }))} placeholder="اكتب سبب التجميد..." rows={3} />
          <Button variant="destructive" onClick={freezeCompany} disabled={!freezeDialog.reason.trim()}>تأكيد التجميد</Button>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailCompany} onOpenChange={open => !open && setDetailCompany(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تفاصيل الشركة</DialogTitle></DialogHeader>
          {detailCompany && (
            <div className="space-y-3 text-sm">
              <div><strong>الاسم:</strong> {detailCompany.name}</div>
              <div><strong>المدينة:</strong> {detailCompany.city || "—"}</div>
              <div><strong>القطاع:</strong> {detailCompany.industry || "—"}</div>
              <div><strong>الموقع:</strong> {detailCompany.website || "—"}</div>
              <div><strong>الوصف:</strong> {detailCompany.description || "—"}</div>
              <div><strong>الوظائف المنشورة:</strong> {detailCompany.jobs_posted}</div>
              <div><strong>المشاهدات بدون shortlist:</strong> {detailCompany.views_without_shortlist}</div>
              {detailCompany.rejection_reason && <div className="text-destructive"><strong>سبب الرفض:</strong> {detailCompany.rejection_reason}</div>}
              {detailCompany.frozen_reason && <div className="text-destructive"><strong>سبب التجميد:</strong> {detailCompany.frozen_reason}</div>}
              <div className="text-xs text-muted-foreground">تاريخ التسجيل: {new Date(detailCompany.created_at).toLocaleDateString("ar-SA")}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
