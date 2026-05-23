import { supabase } from "@/integrations/supabase/client";

/** Upload di un file (immagine/audio) in un bucket pubblico e ritorna l'URL pubblico. */
export async function uploadAsset(bucket: string, file: File, keyPrefix = ""): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const safe = (keyPrefix || file.name.replace(/\.[^.]+$/, "")).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const path = `${safe}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
