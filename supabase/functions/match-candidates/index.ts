import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculateMatchScore(candidate: any, job: any): { score: number; breakdown: any } {
  const jobSkills = (job.required_skills || []).map((s: string) => s.toLowerCase().trim());
  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase().trim());

  // Skills matching (60% weight)
  let matchedSkills = 0;
  for (const skill of jobSkills) {
    if (candidateSkills.some((cs: string) => cs.includes(skill) || skill.includes(cs))) {
      matchedSkills++;
    }
  }
  const skillScore = jobSkills.length > 0 ? (matchedSkills / jobSkills.length) * 100 : 0;

  // Experience matching (40% weight)
  const candidateExp = candidate.experience_years || 0;
  const requiredExp = job.min_experience || 0;
  let expScore = 0;
  if (requiredExp === 0) {
    expScore = 100;
  } else if (candidateExp >= requiredExp) {
    expScore = 100;
  } else {
    expScore = (candidateExp / requiredExp) * 100;
  }

  const totalScore = (skillScore * 0.6) + (expScore * 0.4);

  return {
    score: Math.round(totalScore * 100) / 100,
    breakdown: {
      skills_score: Math.round(skillScore * 100) / 100,
      experience_score: Math.round(expScore * 100) / 100,
      matched_skills: matchedSkills,
      total_required_skills: jobSkills.length,
      candidate_experience: candidateExp,
      required_experience: requiredExp,
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get job
    const { data: job, error: jobError } = await adminClient
      .from("jobs").select("*, companies(user_id)").eq("id", job_id).single();
    if (jobError || !job) throw new Error("Job not found");

    // Verify ownership
    if (job.companies?.user_id !== user.id) throw new Error("Not authorized");

    // Get candidates, filtered by city if set
    let query = adminClient.from("candidates").select("*");
    if (job.city) {
      query = query.eq("city", job.city);
    }
    const { data: candidates, error: candError } = await query;
    if (candError) throw new Error("Failed to fetch candidates");

    // Calculate scores
    const results = (candidates || [])
      .map(c => {
        const { score, breakdown } = calculateMatchScore(c, job);
        return { candidate_id: c.id, user_id: c.user_id, score, breakdown };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    return new Response(JSON.stringify({ success: true, matches: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
