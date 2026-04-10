import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, User } from "lucide-react";

export const AdminUsers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>

      <div className="grid gap-3">
        {profiles.map(p => (
          <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{p.full_name || "بدون اسم"}</p>
                <p className="text-xs text-muted-foreground">{p.phone}</p>
              </div>
            </div>
            <Badge variant={p.user_type === "company" ? "default" : "secondary"}>
              {p.user_type === "company" ? "شركة" : "مرشح"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
