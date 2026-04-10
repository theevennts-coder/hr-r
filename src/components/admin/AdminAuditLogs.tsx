import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setLogs(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="w-6 h-6" />سجل التدقيق
      </h2>

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">لا توجد سجلات بعد</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
              <div>
                <Badge variant="outline">{log.event_type}</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.target_type && `${log.target_type} → `}
                  {new Date(log.created_at).toLocaleString("ar-SA")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{log.actor_id?.slice(0, 8)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
