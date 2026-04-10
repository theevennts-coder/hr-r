import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Building2 } from "lucide-react";

interface CompanySettingsProps {
  userId: string;
}

export const CompanySettings = ({ userId }: CompanySettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [company, setCompany] = useState({
    name: "", description: "", website: "", city: "", industry: "",
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").eq("user_id", userId).single();
    if (data) {
      setCompany({
        name: data.name || "",
        description: data.description || "",
        website: data.website || "",
        city: data.city || "",
        industry: data.industry || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("companies").update(company).eq("user_id", userId);
      if (error) throw error;
      toast({ title: "تم حفظ بيانات الشركة" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">إعدادات الشركة</h2>
        <p className="text-muted-foreground">أكمل بيانات شركتك لتظهر للمرشحين</p>
      </div>

      <div className="space-y-4 p-6 rounded-2xl bg-card border border-border/50">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label><Building2 className="w-4 h-4 inline ml-1" />اسم الشركة</Label>
            <Input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>القطاع</Label>
            <Input value={company.industry} onChange={e => setCompany(c => ({ ...c, industry: e.target.value }))} placeholder="تقنية المعلومات" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>وصف الشركة</Label>
          <Textarea value={company.description} onChange={e => setCompany(c => ({ ...c, description: e.target.value }))} rows={3} placeholder="نبذة عن الشركة" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>المدينة</Label>
            <Input value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))} placeholder="الرياض" />
          </div>
          <div className="space-y-2">
            <Label>الموقع الإلكتروني</Label>
            <Input value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} placeholder="https://example.com" dir="ltr" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4" />
        {saving ? "جاري الحفظ..." : "حفظ"}
      </Button>
    </div>
  );
};
