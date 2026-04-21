import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Sparkles, CheckCircle2, Pencil, FileText,
  X, Loader2, ArrowRight, ArrowLeft, RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CVUploadProps { userId: string; }

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

type Step = "upload" | "analyzing" | "review" | "approved";

export const CVUpload = ({ userId }: CVUploadProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCV | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.includes("pdf") && !file.type.includes("word") && !file.type.includes("text")) {
      toast({ title: "يرجى رفع ملف PDF أو Word", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت", variant: "destructive" });
      return;
    }

    setFileMeta({ name: file.name, size: file.size });
    setStep("analyzing");
    setParsedData(null);

    try {
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      await supabase.from("candidates").update({ cv_url: filePath }).eq("user_id", userId);

      const text = await file.text();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-parser`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cv_text: text }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "فشل تحليل السيرة الذاتية");
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
      setStep("review");
      toast({ title: "تم التحليل بنجاح ✨", description: "راجع البيانات واعتمدها" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setStep("upload");
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleApprove = async () => {
    if (!parsedData) return;
    try {
      const [profileRes, candidateRes] = await Promise.all([
        supabase.from("profiles").update({ full_name: parsedData.full_name }).eq("user_id", userId),
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
      setStep("approved");
      toast({ title: "تم اعتماد البيانات ✅" });
    } catch (error: any) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    }
  };

  const reset = () => {
    setStep("upload");
    setParsedData(null);
    setFileMeta(null);
    setEditMode(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold mb-2">السيرة الذاتية</h2>
        <p className="text-muted-foreground">ارفع سيرتك ودع الذكاء الاصطناعي يحللها — راجع البيانات واعتمدها بثقة</p>
      </div>

      {/* Stepper */}
      <Stepper currentStep={step} />

      {/* Upload step */}
      {step === "upload" && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDrop={onDrop}
          className={cn(
            "relative cursor-pointer rounded-3xl p-12 md:p-16 text-center transition-base border-2 border-dashed",
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02]"
          )}
        >
          <input
            ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary mx-auto mb-6 flex items-center justify-center shadow-glow">
            <Upload className="w-9 h-9 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">اسحب سيرتك الذاتية هنا</h3>
          <p className="text-muted-foreground mb-6">أو اضغط لاختيار ملف من جهازك</p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">PDF</Badge>
            <Badge variant="outline">DOC</Badge>
            <Badge variant="outline">DOCX</Badge>
            <span className="mx-2">•</span>
            <span>حد أقصى 5MB</span>
          </div>
        </div>
      )}

      {/* Analyzing */}
      {step === "analyzing" && (
        <div className="rounded-3xl bg-card border border-border/60 p-12 text-center shadow-soft">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-20 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-primary-foreground animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">جاري التحليل بالذكاء الاصطناعي</h3>
          <p className="text-muted-foreground mb-6">{fileMeta?.name}</p>
          <div className="max-w-xs mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full animate-shimmer" style={{
              backgroundSize: "200% 100%",
              backgroundImage: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 50%, hsl(var(--primary)) 100%)",
            }} />
          </div>
        </div>
      )}

      {/* Review */}
      {step === "review" && parsedData && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* File preview */}
          <div className="lg:col-span-1">
            <div className="premium-card p-5 sticky top-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{fileMeta?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {((fileMeta?.size || 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="w-full justify-center py-2 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-success" />
                تم الرفع والتحليل
              </Badge>
              <Button variant="outline" size="sm" className="w-full" onClick={reset}>
                <RotateCcw className="w-4 h-4" />
                رفع سيرة جديدة
              </Button>
            </div>
          </div>

          {/* Extracted data */}
          <div className="lg:col-span-2 premium-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-bold">البيانات المستخرجة</h3>
              </div>
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                <Pencil className="w-4 h-4" />
                {editMode ? "تم" : "تصحيح"}
              </Button>
            </div>

            {editMode ? (
              <EditView data={parsedData} setData={setParsedData} newSkill={newSkill} setNewSkill={setNewSkill} />
            ) : (
              <PreviewView data={parsedData} />
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button onClick={handleApprove} className="flex-1 shadow-glow">
                <CheckCircle2 className="w-4 h-4" />
                اعتماد البيانات
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approved */}
      {step === "approved" && (
        <div className="premium-card p-12 text-center bg-gradient-to-br from-success/5 to-transparent border-success/30">
          <div className="w-20 h-20 rounded-full bg-success/15 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h3 className="text-2xl font-bold mb-2">تم الاعتماد بنجاح</h3>
          <p className="text-muted-foreground mb-6">ملفك المهني محدّث وجاهز للتقديم على الوظائف</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="outline">
              <RotateCcw className="w-4 h-4" />
              رفع سيرة جديدة
            </Button>
            <Button asChild>
              <a href="/dashboard/jobs">
                استكشف الوظائف
                <ArrowLeft className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ====== Stepper ======
const Stepper = ({ currentStep }: { currentStep: Step }) => {
  const steps = [
    { id: "upload", label: "رفع" },
    { id: "analyzing", label: "تحليل" },
    { id: "review", label: "مراجعة" },
    { id: "approved", label: "اعتماد" },
  ];
  const currentIdx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-base shrink-0",
              i < currentIdx ? "bg-success text-success-foreground" :
              i === currentIdx ? "bg-primary text-primary-foreground shadow-glow scale-110" :
              "bg-muted text-muted-foreground"
            )}>
              {i < currentIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-xs md:text-sm font-medium hidden sm:inline",
              i <= currentIdx ? "text-foreground" : "text-muted-foreground"
            )}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-[2px] mx-2 md:mx-4 rounded transition-base",
              i < currentIdx ? "bg-success" : "bg-border"
            )} />
          )}
        </div>
      ))}
    </div>
  );
};

// ====== Edit view ======
const EditView = ({ data, setData, newSkill, setNewSkill }: any) => {
  const addSkill = () => {
    if (newSkill.trim() && !data.skills.includes(newSkill.trim())) {
      setData({ ...data, skills: [...data.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="الاسم الكامل" value={data.full_name} onChange={(v: string) => setData({ ...data, full_name: v })} />
        <Field label="المسمى الوظيفي" value={data.title} onChange={(v: string) => setData({ ...data, title: v })} />
      </div>
      <div className="space-y-2">
        <Label>الملخص المهني</Label>
        <Textarea value={data.bio} onChange={e => setData({ ...data, bio: e.target.value })} rows={3} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="المدينة" value={data.city} onChange={(v: string) => setData({ ...data, city: v })} />
        <div className="space-y-2">
          <Label>سنوات الخبرة</Label>
          <Input
            type="number" min={0} value={data.experience_years}
            onChange={e => setData({ ...data, experience_years: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>المهارات</Label>
        <div className="flex gap-2">
          <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="أضف مهارة"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
          <Button type="button" variant="outline" onClick={addSkill}>إضافة</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.skills.map((skill: string) => (
            <Badge key={skill} variant="secondary" className="gap-1 pr-1">
              {skill}
              <button onClick={() => setData({ ...data, skills: data.skills.filter((s: string) => s !== skill) })}
                className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

// ====== Preview view ======
const PreviewView = ({ data }: { data: ParsedCV }) => (
  <div className="space-y-4">
    {data.full_name && <InfoRow label="الاسم" value={data.full_name} />}
    {data.title && <InfoRow label="المسمى" value={data.title} />}
    {data.bio && <InfoRow label="الملخص المهني" value={data.bio} multiline />}
    <div className="grid md:grid-cols-2 gap-3">
      {data.city && <InfoRow label="المدينة" value={data.city} />}
      {data.experience_years != null && <InfoRow label="الخبرة" value={`${data.experience_years} سنة`} />}
    </div>
    {data.skills?.length > 0 && (
      <div className="p-4 rounded-xl bg-muted/40">
        <p className="text-xs text-muted-foreground mb-2 font-medium">المهارات</p>
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
        </div>
      </div>
    )}
    {data.experience?.length > 0 && (
      <div>
        <p className="text-sm font-bold mb-2">الخبرات العملية</p>
        <div className="space-y-2">
          {data.experience.map((exp, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/40 border-r-2 border-primary">
              <p className="font-medium">{exp.title}</p>
              <p className="text-sm text-muted-foreground">{exp.company} • {exp.duration}</p>
              {exp.description && <p className="text-sm mt-2 leading-relaxed">{exp.description}</p>}
            </div>
          ))}
        </div>
      </div>
    )}
    {data.education?.length > 0 && (
      <div>
        <p className="text-sm font-bold mb-2">التعليم</p>
        <div className="space-y-2">
          {data.education.map((edu, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/40 border-r-2 border-accent">
              <p className="font-medium">{edu.degree}</p>
              <p className="text-sm text-muted-foreground">{edu.institution} • {edu.year}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const InfoRow = ({ label, value, multiline }: any) => (
  <div className="p-4 rounded-xl bg-muted/40">
    <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
    <p className={cn("font-medium", multiline ? "text-sm leading-relaxed" : "")}>{value}</p>
  </div>
);
