import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

// Wrapper to log actions
export const addAuditLog = async ({
  userId,
  action,
  resource_type,
  resource_id,
  description,
  risk_level,
}: {
  userId: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  risk_level: "low" | "medium" | "high" | "critical";
}) => {
  const { error } = await supabase.from("audit_logs").insert([
    {
      user_id: userId, // real logged-in user UUID
      action,
      resource_type,
      resource_id: resource_id || null,
      details: { description, risk_level }, // stored as JSON
      ip_address: null, // can be filled server-side if needed
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("❌ Failed to insert audit log:", error);
  } else {
    console.log("✅ Audit log inserted");
  }
};
