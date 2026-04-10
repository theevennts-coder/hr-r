import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { cv_text } = await req.json();
    if (!cv_text || typeof cv_text !== "string") {
      return new Response(JSON.stringify({ error: "cv_text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت محلل سير ذاتية محترف. استخرج البيانات التالية من السيرة الذاتية المقدمة وأرجعها بتنسيق JSON. لا تضف معلومات غير موجودة.`
          },
          {
            role: "user",
            content: `حلل السيرة الذاتية التالية واستخرج البيانات:\n\n${cv_text}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_cv_data",
            description: "Extract structured data from a CV/resume",
            parameters: {
              type: "object",
              properties: {
                full_name: { type: "string", description: "الاسم الكامل" },
                title: { type: "string", description: "المسمى الوظيفي الحالي أو المطلوب" },
                bio: { type: "string", description: "ملخص مهني قصير (2-3 جمل)" },
                skills: { type: "array", items: { type: "string" }, description: "قائمة المهارات" },
                experience_years: { type: "integer", description: "إجمالي سنوات الخبرة" },
                city: { type: "string", description: "المدينة الحالية" },
                education: { type: "array", items: { type: "object", properties: { degree: { type: "string" }, institution: { type: "string" }, year: { type: "string" } } } },
                experience: { type: "array", items: { type: "object", properties: { title: { type: "string" }, company: { type: "string" }, duration: { type: "string" }, description: { type: "string" } } } },
                languages: { type: "array", items: { type: "string" } },
              },
              required: ["full_name", "skills", "experience_years"],
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_cv_data" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للذكاء الاصطناعي" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsedData = JSON.parse(toolCall.function.arguments);

    // Update candidate record
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("candidates").update({
      skills: parsedData.skills || [],
      experience_years: parsedData.experience_years || 0,
      city: parsedData.city || null,
      title: parsedData.title || null,
      bio: parsedData.bio || null,
      cv_parsed_data: parsedData,
      ai_summary: parsedData.bio || null,
    }).eq("user_id", user.id);

    // Update profile name if extracted
    if (parsedData.full_name) {
      await adminClient.from("profiles").update({
        full_name: parsedData.full_name,
      }).eq("user_id", user.id);
    }

    // Log audit
    await adminClient.rpc("log_audit", {
      _event_type: "cv_parsed",
      _actor_id: user.id,
      _actor_type: "candidate",
      _target_type: "candidate",
      _metadata: { skills_count: parsedData.skills?.length || 0 },
    });

    return new Response(JSON.stringify({ success: true, data: parsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cv-parser error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
