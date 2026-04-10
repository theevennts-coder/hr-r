import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Save, MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CandidateProfileProps {
  userId: string;
}

export const CandidateProfile = ({ userId }: CandidateProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [profile, setProfile] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [candidate, setCandidate] = useState({
    title: "", bio: "", city: "", experience_years: 0, skills: [] as string[],
  });
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const [profileRes, candidateRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("candidates").select("*").eq("user_id", userId).single(),
    ]);

    if (profileRes.data) {
      setProfile({
        full_name: profileRes.data.full_name || "",
        phone: profileRes.data.phone || "",
        avatar_url: profileRes.data.avatar_url || "",
      });
    }

    if (candidateRes.data) {
      setCandidate({
        title: candidateRes.data.title || "",
        bio: candidateRes.data.bio || "",
        city: candidateRes.data.city || "",
        experience_years: candidateRes.data.experience_years || 0,
        skills: candidateRes.data.skills || [],
      });
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
          title: candidate.title,
          bio: candidate.bio,
          city: candidate.city,
          experience_years: candidate.experience_years,
          skills: candidate.skills,
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

  const addSkill = () => {
    if (newSkill.trim() && !candidate.skills.includes(newSkill.trim())) {
      setCandidate(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setCandidate(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">ملفي الشخصي</h2>
        <p className="text-muted-foreground">أكمل بياناتك لتحسين فرص المطابقة</p>
      </div>

      <div className="space-y-4 p-6 rounded-2xl bg-card border border-border/50">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label><User className="w-4 h-4 inline ml-1" />الاسم الكامل</Label>
            <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>رقم الجوال</Label>
            <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
          </div>
        </div>

        <div className="space-y-2">
          <Label><Briefcase className="w-4 h-4 inline ml-1" />المسمى الوظيفي</Label>
          <Input value={candidate.title} onChange={e => setCandidate(c => ({ ...c, title: e.target.value }))} placeholder="مثال: مطور واجهات أمامية" />
        </div>

        <div className="space-y-2">
          <Label>نبذة مهنية</Label>
          <Textarea value={candidate.bio} onChange={e => setCandidate(c => ({ ...c, bio: e.target.value }))} placeholder="اكتب نبذة مختصرة عن خبراتك" rows={3} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label><MapPin className="w-4 h-4 inline ml-1" />المدينة</Label>
            <Input value={candidate.city} onChange={e => setCandidate(c => ({ ...c, city: e.target.value }))} placeholder="الرياض" />
          </div>
          <div className="space-y-2">
            <Label>سنوات الخبرة</Label>
            <Input type="number" min={0} value={candidate.experience_years} onChange={e => setCandidate(c => ({ ...c, experience_years: parseInt(e.target.value) || 0 }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>المهارات</Label>
          <div className="flex gap-2">
            <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="أضف مهارة" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} />
            <Button type="button" variant="outline" onClick={addSkill}>إضافة</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {candidate.skills.map(skill => (
              <Badge key={skill} variant="secondary" className="cursor-pointer hover:bg-destructive/20" onClick={() => removeSkill(skill)}>
                {skill} ✕
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
        <Save className="w-4 h-4" />
        {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
      </Button>
    </div>
  );
};
