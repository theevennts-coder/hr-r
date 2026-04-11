import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, User, Search, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AdminUsers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "candidate" | "company">("all");
  const { toast } = useToast();

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (profilesData) setProfiles(profilesData);
    if (rolesData) {
      const map: Record<string, string[]> = {};
      rolesData.forEach(r => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      setRoles(map);
    }
    setLoading(false);
  };

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (!error) {
      toast({ title: `تمت إضافة دور ${role === "admin" ? "مدير" : role === "moderator" ? "مشرف" : "مستخدم"}` });
      setRoles(prev => ({ ...prev, [userId]: [...(prev[userId] || []), role] }));
    } else {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (!error) {
      toast({ title: "تم إزالة الدور" });
      setRoles(prev => ({ ...prev, [userId]: (prev[userId] || []).filter(r => r !== role) }));
    }
  };

  const filtered = profiles.filter(p => {
    if (filter === "candidate") return p.user_type === "candidate";
    if (filter === "company") return p.user_type === "company";
    return true;
  }).filter(p => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>

      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "candidate", "company"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : f === "candidate" ? "مرشحون" : "شركات"}
          </Button>
        ))}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pr-9" placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} مستخدم</p>

      <div className="grid gap-3">
        {filtered.map(p => {
          const userRoles = roles[p.user_id] || [];
          return (
            <div key={p.id} className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {userRoles.includes("admin") ? <Shield className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.full_name || "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground">{p.phone || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Badge variant={p.user_type === "company" ? "default" : "secondary"}>
                  {p.user_type === "company" ? "شركة" : "مرشح"}
                </Badge>

                {userRoles.map(role => (
                  <Badge key={role} className="bg-primary/10 text-primary gap-1">
                    {role === "admin" ? "مدير" : role === "moderator" ? "مشرف" : "مستخدم"}
                    <button onClick={() => removeRole(p.user_id, role)} className="hover:text-destructive">✕</button>
                  </Badge>
                ))}

                <Select onValueChange={val => addRole(p.user_id, val)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="+ إضافة دور" />
                  </SelectTrigger>
                  <SelectContent>
                    {!userRoles.includes("admin") && <SelectItem value="admin">مدير</SelectItem>}
                    {!userRoles.includes("moderator") && <SelectItem value="moderator">مشرف</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
