import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Save, MapPin, Phone } from "lucide-react";

interface CandidateProfileProps {
  userId: string;
}

export const CandidateProfile = ({ userId }: CandidateProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [profile, setProfile] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [city, setCity] = useState("");

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const [profileRes, candidateRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("candidates").select("city").eq("user_id", userId).single(),
    ]);

    if (profileRes.data) {
      setProfile({
        full_name: profileRes.data.full_name || "",
        phone: profileRes.data.phone || "",
        avatar_url: profileRes.data.avatar_url || "",
      });
    }
    if (candidateRes.data) {
      setCity(candidateRes.data.city || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const [profileRes, candidateRes] = await Promise.all([
        supabase.from("profiles").update({
          full_name: profile.full_name,
          phone: profile.phone,
        }).eq("user_id", userId),
        supabase.from("candidates").update({
          city,
        }).eq("user_id", userId),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (candidateRes.error) throw candidateRes.error;

      toast({ title: "تم حفظ البيانات بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
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
        <h2 className="text-2xl font-bold mb-1">بياناتي الشخصية</h2>
        <p className="text-muted-foreground">معلوماتك الأساسية للتواصل</p>
      </div>

      <div className="space-y-4 p-6 rounded-2xl bg-card border border-border/50">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label><User className="w-4 h-4 inline ml-1" />الاسم الكامل</Label>
            <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label><Phone className="w-4 h-4 inline ml-1" />رقم الجوال</Label>
            <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
          </div>
        </div>

        <div className="space-y-2">
          <Label><MapPin className="w-4 h-4 inline ml-1" />المدينة</Label>
          <Input value={city} onChange={e => setCity(e.target.value)} placeholder="الرياض" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
        <Save className="w-4 h-4" />
        {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
      </Button>
    </div>
  );
};
