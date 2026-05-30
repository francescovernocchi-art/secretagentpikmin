import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getBiomeByKey } from "@/data/secretPikminWorld";
import { useHomeDashboard, usePlayerBiome, useVillageDiorama } from "@/hooks/useGameData";
import { canRemoteControlVillage, fetchPrimaryVillage } from "@/lib/game/villages";
import { agentKeyFromSession } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import { hapticTap } from "@/lib/haptic";
import styles from "@/styles/village-diorama.module.css";

export function VillageContextStrip() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const { biome, location } = usePlayerBiome(agent);
  const { controlLevel, villageName, loading } = useVillageDiorama(agent);
  const { data } = useHomeDashboard();
  const [remote, setRemote] = useState<{ allowed: boolean; inRange: boolean; reason: string } | null>(null);
  const [radiusM, setRadiusM] = useState(500);

  const biomeDef = getBiomeByKey(biome);
  const activeExpeditions = data?.expeditions ?? [];

  useEffect(() => {
    fetchPrimaryVillage(agent).then(async (res) => {
      setRadiusM((res.village as { action_radius_m?: number }).action_radius_m ?? 500);
      const rc = await canRemoteControlVillage(agent, res.village.id, "expeditions");
      setRemote({ allowed: rc.allowed, inRange: rc.inRange, reason: rc.reason });
    });
  }, [agent, controlLevel]);

  return (
    <div className={styles.contextStrip}>
      <span className={styles.contextChip}>
        {biomeDef?.emoji ?? "🌍"} {biomeDef?.label ?? biome}
      </span>

      <span className={styles.contextChip}>
        📡 Raggio {radiusM}m
      </span>

      <span className={`${styles.contextChip} ${remote?.allowed ? styles.contextChipActive : styles.contextChipWarn}`}>
        {remote?.inRange ? "📍 In zona" : remote?.allowed ? "📶 Remoto OK" : "🔒 Remoto off"}
      </span>

      <span className={styles.contextChip}>
        CC Lv{controlLevel} · {loading ? "…" : villageName}
      </span>

      {activeExpeditions.length > 0 && (
        <Link to="/spedizioni" onClick={hapticTap} className={`${styles.contextChip} ${styles.contextChipActive}`}>
          🚀 {activeExpeditions.length} spedizioni
        </Link>
      )}

      {biomeDef && (
        <span className={styles.contextChip} title={biomeDef.resources.join(", ")}>
          🌿 {biomeDef.resources.slice(0, 2).join(" · ")}
        </span>
      )}

      {location?.source === "gps" && (
        <span className={styles.contextChip}>GPS attivo</span>
      )}
    </div>
  );
}
