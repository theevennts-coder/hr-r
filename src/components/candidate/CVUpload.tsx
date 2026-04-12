import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Sparkles, CheckCircle, Pencil, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CVUploadProps {
  userId: string;
}

interface ParsedCV {
  full_name: string;
  title: string;
  bio: string;
  skills: string[];
  experience_years: number;
  city: string;
  experience: { title: string; company: string; duration: string; description?: string }[];
  education: { degree: string; institution: string; year: string }[];
}

export const CVUpload = ({ userId }: CVUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCV | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [approved, setApproved] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf") && !file.type.includes("word") && !file.type.includes("text")) {
      toast({ title: "يرجى رفع ملف PDF أو Word", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت", variant: "destructive" });
      return;
    }

    setUploading(true);
    setParsedData(null);
    setApproved(false);
    setEditMode(false);
    try {
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from("candidates").update({ cv_url: filePath }).eq("user_id", userId);
      toast({ title: "تم رفع السيرة الذاتية بنجاح" });

      await parseCV(file);
    } catch (error: any) {
      toast({ title: "خطأ في الرفع", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const parseCV = async (file: File) => {
    setParsing(true);
    try {
      const text = await file.text();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-parser`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cv_text: text }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse CV");
      }

      const result = await response.json();
      setParsedData({
        full_name: result.data?.full_name || "",
        title: result.data?.title || "",
        bio: result.data?.bio || "",
        skills: result.data?.skills || [],
        experience_years: result.data?.experience_years || 0,
        city: result.data?.city || "",
        experience: result.data?.experience || [],
        education: result.data?.education || [],
      });
      toast({ title: "تم تحليل السيرة الذاتية بالذكاء الاصطناعي ✨" });
    } catch (error: any) {
      toast({ title: "خطأ في التحليل", description: error.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleApprove = async () => {
    if (!parsedData) return;
    try {
      const [profileRes, candidateRes] = await Promise.all([
        supabase.from("profiles").update({
          full_name: parsedData.full_name,
        }).eq("user_id", userId),
        supabase.from("candidates").update({
          title: parsedData.title,
          bio: parsedData.bio,
          skills: parsedData.skills,
          experience_years: parsedData.experience_years,
          city: parsedData.city,
          cv_parsed_data: parsedData as any,
        }).eq("user_id", userId),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (candidateRes.error) throw candidateRes.error;

      setApproved(true);
      setEditMode(false);
      toast({ title: "تم اعتماد البيانات وحفظها بنجاح ✅" });
    } catch (error: any) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && parsedData && !parsedData.skills.includes(newSkill.trim())) {
      setParsedData({ ...parsedData, skills: [...parsedData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    if (parsedData) {
      setParsedData({ ...parsedData, skills: parsedData.skills.filter(s => s !== skill) });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">سيرتي الذاتية</h2>
        <p className="text-muted-foreground">ارفع سيرتك الذاتية وسيحللها الذكاء الاصطناعي — راجع البيانات واعتمدها</p>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="relative cursor-pointer border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-primary/50 transition-colors bg-card"
      >
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleUpload} />
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium mb-1">اسحب الملف هنا أو اضغط للرفع</p>
        <p className="text-sm text-muted-foreground">PDF, DOC, DOCX — حد أقصى 5 ميجابايت</p>
      </div>

      {(uploading || parsing) && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-primary">
            {uploading ? "جاري رفع الملف..." : "جاري التحليل بالذكاء الاصطناعي..."}
          </span>
        </div>
      )}

      {/* Parsed Data - Editable */}
      {parsedData && !approved && (
        <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">البيانات المستخرجة</h3>
            </div>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="w-4 h-4" />
                تصحيح
              </Button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={parsedData.full_name} onChange={e => setParsedData({ ...parsedData, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي</Label>
                  <Input value={parsedData.title} onChange={e => setParsedData({ ...parsedData, title: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الملخص المهني</Label>
                <Textarea value={parsedData.bio} onChange={e => setParsedData({ ...parsedData, bio: e.target.value })} rows={3} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input value={parsedData.city} onChange={e => setParsedData({ ...parsedData, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>سنوات الخبرة</Label>
                  <Input type="number" min={0} value={parsedData.experience_years} onChange={e => setParsedData({ ...parsedData, experience_years: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المهارات</Label>
                <div className="flex gap-2">
                  <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="أضف مهارة" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
                  <Button type="button" variant="outline" onClick={addSkill}>إضافة</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedData.skills.map(skill => (
                    <Badge key={skill} variant="secondary" className="cursor-pointer hover:bg-destructive/20" onClick={() => removeSkill(skill)}>
                      {skill} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {parsedData.full_name && (
                <div className="flex justify-between items-start p-3 rounded-lg bg-muted/30">
                  <div><p className="text-xs text-muted-foreground">الاسم</p><p className="font-medium">{parsedData.full_name}</p></div>
                </div>
              )}
              {parsedData.title && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">المسمى الوظيفي</p><p className="font-medium">{parsedData.title}</p>
                </div>
              )}
              {parsedData.bio && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">الملخص المهني</p><p className="text-sm">{parsedData.bio}</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {parsedData.city && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">المدينة</p><p className="font-medium">{parsedData.city}</p>
                  </div>
                )}
                {parsedData.experience_years != null && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">سنوات الخبرة</p><p className="font-medium">{parsedData.experience_years} سنة</p>
                  </div>
                )}
              </div>
              {parsedData.skills?.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">المهارات</p>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
                  </div>
                </div>
              )}
              {parsedData.experience?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">الخبرات</p>
                  <div className="space-y-2">
                    {parsedData.experience.map((exp, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30">
                        <p className="font-medium">{exp.title}</p>
                        <p className="text-sm text-muted-foreground">{exp.company} — {exp.duration}</p>
                        {exp.description && <p className="text-sm mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {parsedData.education?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">التعليم</p>
                  {parsedData.education.map((edu, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 mb-2">
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">{edu.institution} — {edu.year}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleApprove} className="flex-1">
              <CheckCircle className="w-4 h-4" />
              اعتماد البيانات
            </Button>
            {editMode && (
              <Button variant="outline" onClick={() => setEditMode(false)}>
                معاينة
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Approved state */}
      {approved && (
        <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/30 text-center space-y-2">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
          <p className="font-bold text-lg">تم اعتماد البيانات بنجاح</p>
          <p className="text-sm text-muted-foreground">تم تحديث ملفك الشخصي والمهني ببيانات السيرة الذاتية</p>
        </div>
      )}
    </div>
  );
};
