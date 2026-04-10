import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Sparkles, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CVUploadProps {
  userId: string;
}

export const CVUpload = ({ userId }: CVUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
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
    try {
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update candidate CV URL
      await supabase.from("candidates").update({ cv_url: filePath }).eq("user_id", userId);
      setCvUrl(filePath);

      toast({ title: "تم رفع السيرة الذاتية بنجاح" });

      // Now parse with AI
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
      setParsedData(result.data);
      toast({ title: "تم تحليل السيرة الذاتية بالذكاء الاصطناعي ✨" });
    } catch (error: any) {
      toast({ title: "خطأ في التحليل", description: error.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">سيرتي الذاتية</h2>
        <p className="text-muted-foreground">ارفع سيرتك الذاتية وسيحللها الذكاء الاصطناعي تلقائياً</p>
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

      {/* Parsed Data Preview */}
      {parsedData && (
        <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">البيانات المستخرجة</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>

          {parsedData.full_name && (
            <div>
              <p className="text-sm text-muted-foreground">الاسم</p>
              <p className="font-medium">{parsedData.full_name}</p>
            </div>
          )}

          {parsedData.title && (
            <div>
              <p className="text-sm text-muted-foreground">المسمى الوظيفي</p>
              <p className="font-medium">{parsedData.title}</p>
            </div>
          )}

          {parsedData.bio && (
            <div>
              <p className="text-sm text-muted-foreground">الملخص المهني</p>
              <p className="text-sm">{parsedData.bio}</p>
            </div>
          )}

          {parsedData.skills?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">المهارات</p>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {parsedData.experience_years != null && (
            <div>
              <p className="text-sm text-muted-foreground">سنوات الخبرة</p>
              <p className="font-medium">{parsedData.experience_years} سنة</p>
            </div>
          )}

          {parsedData.experience?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">الخبرات</p>
              <div className="space-y-3">
                {parsedData.experience.map((exp: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
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
              {parsedData.education.map((edu: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium">{edu.degree}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution} — {edu.year}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            تم تحديث ملفك الشخصي تلقائياً بالبيانات المستخرجة
          </p>
        </div>
      )}
    </div>
  );
};
