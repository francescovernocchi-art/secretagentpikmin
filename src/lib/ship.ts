import { supabase } from "@/integrations/supabase/client";

/**
 * Registra un pezzo di navicella come recuperato dalla squadra.
 * Idempotente: se è già stato recuperato non fa nulla.
 */
export async function collectShipPart(opts: {
  partKey: string;
  collectedBy: string;
  source: "drop" | "mission" | "manual";
  dropId?: string | null;
  missionId?: string | null;
}) {
  const { partKey, collectedBy, source, dropId, missionId } = opts;
  // Esiste già?
  const { data: existing } = await supabase
    .from("ship_parts_collected")
    .select("id")
    .eq("part_key", partKey)
    .maybeSingle();
  if (existing) return { alreadyCollected: true };

  const { error } = await supabase.from("ship_parts_collected").insert({
    part_key: partKey,
    collected_by: collectedBy,
    source,
    drop_id: dropId ?? null,
    mission_id: missionId ?? null,
  });
  if (error) throw error;
  return { alreadyCollected: false };
}
