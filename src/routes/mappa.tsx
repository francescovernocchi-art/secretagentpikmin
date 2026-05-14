import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MapPin, Crosshair, Plus, X, Loader2, Gift, Sparkles, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { grantIngredients } from "@/lib/ingredients";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/mappa")({
  component: MappaPage,
});

type Drop = {
  id: string;
  created_by: string;
  lat: number;
  lng: number;
  radius_m: number;
  kind: "ingredient" | "object" | "mission";
  payload_key: string | null;
  name: string;
  emoji: string;
  xp: number;
  note: string | null;
  status: "active" | "collected" | "expired";
  collected_by: string | null;
  collected_at: string | null;
  created_at: string;
};

const DROP_TEMPLATES = [
  { kind: "ingredient", emoji: "🔴", name: "Seme Rosso", payload_key: "seed_red", xp: 5 },
  { kind: "ingredient", emoji: "🟡", name: "Seme Giallo", payload_key: "seed_yellow", xp: 5 },
  { kind: "ingredient", emoji: "🔵", name: "Seme Blu", payload_key: "seed_blue", xp: 5 },
  { kind: "ingredient", emoji: "💧", name: "Goccia d'acqua", payload_key: "water", xp: 5 },
  { kind: "ingredient", emoji: "🍯", name: "Miele dorato", payload_key: "honey", xp: 8 },
  { kind: "ingredient", emoji: "✨", name: "Scintilla", payload_key: "spark", xp: 10 },
  { kind: "object", emoji: "🎁", name: "Regalo di papà", payload_key: "papa_gift", xp: 25 },
  { kind: "object", emoji: "💎", name: "Cristallo segreto", payload_key: "crystal", xp: 30 },
  { kind: "object", emoji: "🗝️", name: "Chiave antica", payload_key: "ancient_key", xp: 25 },
  { kind: "mission", emoji: "📜", name: "Missione segreta", payload_key: null, xp: 15 },
] as const;

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function MappaPage() {
  const session = getSession();
  const role = session?.role ?? "lorenzo";
  const isPapa = role === "papa";

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const dropMarkersRef = useRef<Map<string, any>>(new Map());
  const dropCirclesRef = useRef<Map<string, any>>(new Map());
  const meMarkerRef = useRef<any>(null);
  const meAccuracyRef = useRef<any>(null);
  const placeModeRef = useRef(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  const [ready, setReady] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [placeMode, setPlaceMode] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedTpl, setSelectedTpl] = useState<number>(0);
  const [note, setNote] = useState("");
  const [missionText, setMissionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [collecting, setCollecting] = useState<string | null>(null);

  useEffect(() => {
    placeModeRef.current = placeMode;
  }, [placeMode]);

  // Init Leaflet map (client-only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;

      // Default icon fix (Leaflet's bundler-broken paths)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapEl.current, {
        center: [45.4642, 9.19], // Milano fallback
        zoom: 15,
        zoomControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomleft" }).addTo(map);

      map.on("click", (e: any) => {
        if (!placeModeRef.current) return;
        setPendingPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocalizzazione non supportata");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        setMe(next);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) toast.error("Posizione negata: abilita il GPS");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Center on first fix
  const centeredRef = useRef(false);
  useEffect(() => {
    if (!ready || !me || centeredRef.current) return;
    mapRef.current?.setView([me.lat, me.lng], 17);
    centeredRef.current = true;
  }, [ready, me]);

  // Render "me" marker
  useEffect(() => {
    if (!ready || !me) return;
    (async () => {
      const L = await import("leaflet");
      const map = mapRef.current;
      if (!map) return;
      if (meMarkerRef.current) {
        meMarkerRef.current.setLatLng([me.lat, me.lng]);
        meAccuracyRef.current?.setLatLng([me.lat, me.lng]).setRadius(me.acc);
      } else {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;border-radius:9999px;background:oklch(0.86 0.24 145);box-shadow:0 0 16px oklch(0.86 0.24 145),0 0 0 4px oklch(0.86 0.24 145 / 0.25);border:2px solid #0a0a0a;"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        meMarkerRef.current = L.marker([me.lat, me.lng], { icon, zIndexOffset: 1000 }).addTo(map);
        meAccuracyRef.current = L.circle([me.lat, me.lng], {
          radius: me.acc,
          color: "oklch(0.86 0.24 145)",
          weight: 1,
          opacity: 0.5,
          fillOpacity: 0.07,
        }).addTo(map);
      }
    })();
  }, [ready, me]);

  // Load drops + realtime subscription
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("drops")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setDrops((data ?? []) as Drop[]);
    };
    load();
    const ch = supabase
      .channel("drops-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "drops" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  // Render drop markers
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = await import("leaflet");
      const map = mapRef.current;
      if (!map) return;
      const seen = new Set<string>();
      for (const d of drops) {
        seen.add(d.id);
        const collected = d.status === "collected";
        const existing = dropMarkersRef.current.get(d.id);
        if (existing) {
          existing.setLatLng([d.lat, d.lng]);
        } else {
          const icon = L.divIcon({
            className: "",
            html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 0 8px ${collected ? "#666" : "oklch(0.86 0.24 145)"}); ${collected ? "opacity:0.4;" : ""}">${d.emoji}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const marker = L.marker([d.lat, d.lng], { icon }).addTo(map);
          marker.bindPopup(
            `<div style="min-width:160px"><b>${d.emoji} ${d.name}</b><br/><span style="opacity:.7">+${d.xp} XP · ${d.radius_m}m</span>${d.note ? `<br/><i>"${d.note}"</i>` : ""}${collected ? `<br/><span style="color:#888">Raccolto</span>` : ""}</div>`,
          );
          dropMarkersRef.current.set(d.id, marker);

          const circle = L.circle([d.lat, d.lng], {
            radius: d.radius_m,
            color: collected ? "#666" : "oklch(0.86 0.24 145)",
            weight: 1.5,
            opacity: collected ? 0.3 : 0.7,
            fillOpacity: collected ? 0.05 : 0.12,
            dashArray: collected ? "2 4" : undefined,
          }).addTo(map);
          dropCirclesRef.current.set(d.id, circle);
        }
      }
      // remove stale
      for (const [id, m] of dropMarkersRef.current.entries()) {
        if (!seen.has(id)) {
          map.removeLayer(m);
          dropMarkersRef.current.delete(id);
          const c = dropCirclesRef.current.get(id);
          if (c) {
            map.removeLayer(c);
            dropCirclesRef.current.delete(id);
          }
        }
      }
    })();
  }, [ready, drops]);

  const recenter = () => {
    if (me && mapRef.current) mapRef.current.setView([me.lat, me.lng], 17);
  };

  const cancelPlace = () => {
    setPlaceMode(false);
    setPendingPos(null);
    setNote("");
    setMissionText("");
  };

  const savePending = async () => {
    if (!pendingPos) return;
    const tpl = DROP_TEMPLATES[selectedTpl];
    setSaving(true);
    const payload = {
      created_by: role,
      lat: pendingPos.lat,
      lng: pendingPos.lng,
      radius_m: 5,
      kind: tpl.kind,
      payload_key: tpl.payload_key,
      name: tpl.name,
      emoji: tpl.emoji,
      xp: tpl.xp,
      note: tpl.kind === "mission" ? missionText.trim() || note.trim() || null : note.trim() || null,
    };
    const { error } = await supabase.from("drops").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Errore: " + error.message);
      return;
    }
    toast.success(`${tpl.emoji} Drop piazzato! Lorenzo lo vedrà subito.`);
    cancelPlace();
  };

  const collect = async (d: Drop, opts?: { manual?: boolean }) => {
    if (!me) {
      toast.error("Devo conoscere la tua posizione GPS");
      return;
    }
    const dist = distMeters(me, d);
    const inRange = dist <= d.radius_m;
    const inFuzzyRange = dist <= d.radius_m + me.acc;
    if (!inRange) {
      if (opts?.manual && inFuzzyRange) {
        const ok = confirm(
          `Il GPS è impreciso (±${Math.round(me.acc)}m) e risulti a ${Math.round(dist)}m da "${d.name}".\n\nSei davvero sul posto? Confermi la raccolta manuale?`,
        );
        if (!ok) return;
      } else {
        toast.warning(`Sei troppo lontano: ${Math.round(dist)}m (devi essere entro ${d.radius_m}m)`);
        return;
      }
    }
    setCollecting(d.id);
    try {
      const { error } = await supabase
        .from("drops")
        .update({ status: "collected", collected_by: role, collected_at: new Date().toISOString() })
        .eq("id", d.id)
        .eq("status", "active");
      if (error) throw error;

      if (d.kind === "ingredient" && d.payload_key) {
        await grantIngredients("lorenzo", [d.payload_key]);
      } else if (d.kind === "object" && d.payload_key) {
        await supabase.from("rewards").insert({
          agent: "lorenzo",
          badge: d.payload_key,
          title: d.name,
          icon: d.emoji,
        });
      } else if (d.kind === "mission") {
        await supabase.from("missions").insert({
          title: d.name,
          description: d.note ?? "Missione lasciata da papà sulla mappa",
          difficulty: "facile",
          xp: d.xp,
          status: "nuova",
          created_by: "papa",
        });
      }
      toast.success(`${d.emoji} Raccolto! +${d.xp} XP${d.note ? ` — "${d.note}"` : ""}`);
      navigator.vibrate?.([60, 40, 120]);
    } catch (e: any) {
      toast.error("Cattura fallita: " + (e?.message ?? "?"));
    } finally {
      setCollecting(null);
    }
  };

  const removeDrop = async (id: string) => {
    if (!confirm("Rimuovere questo drop?")) return;
    await supabase.from("drops").delete().eq("id", id);
  };

  // Drop più vicini a me (solo attivi), ordinati
  const nearby = useMemo(() => {
    if (!me) return [];
    return drops
      .filter((d) => d.status === "active")
      .map((d) => ({ d, dist: distMeters(me, d) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
  }, [drops, me]);

  // Notifica quando entri (o esci) dal raggio di un drop attivo
  useEffect(() => {
    if (!me || isPapa) return;
    const activeIds = new Set<string>();
    for (const d of drops) {
      if (d.status !== "active") continue;
      activeIds.add(d.id);
      const inRange = distMeters(me, d) <= d.radius_m;
      const already = notifiedRef.current.has(d.id);
      if (inRange && !already) {
        notifiedRef.current.add(d.id);
        toast.success(`${d.emoji} Sei vicino a "${d.name}" — tocca Raccogli!`, {
          description: d.note ? `"${d.note}"` : `+${d.xp} XP nel raggio di ${d.radius_m}m`,
          duration: 6000,
        });
        navigator.vibrate?.([40, 30, 40]);
      } else if (!inRange && already) {
        // esci dal raggio → resetta così alla prossima entrata avvisa di nuovo
        notifiedRef.current.delete(d.id);
      }
    }
    // pulisci drop non più attivi/esistenti
    for (const id of Array.from(notifiedRef.current)) {
      if (!activeIds.has(id)) notifiedRef.current.delete(id);
    }
  }, [me, drops, isPapa]);


  return (
    <PageShell
      title="Mappa Drop"
      subtitle={isPapa ? "Piazza drop per Lorenzo" : "Trova e raccogli i drop di papà"}
    >
      <div className="space-y-3">
        {/* Mappa */}
        <div className="panel-strong relative overflow-hidden rounded-2xl">
          <div ref={mapEl} className="w-full h-[55vh] min-h-[360px] rounded-2xl" />

          {/* Istruzioni place mode */}
          <AnimatePresence>
            {placeMode && !pendingPos && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-3 left-3 right-3 z-[400] panel px-3 py-2 text-xs text-primary text-center"
              >
                Tocca la mappa dove vuoi nascondere il drop
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recenter */}
          <button
            onClick={recenter}
            className="absolute bottom-3 right-3 z-[400] panel-strong p-2.5 text-primary"
            aria-label="Centra su di me"
          >
            <Crosshair className="h-4 w-4" />
          </button>

          {/* Toggle place mode (solo papà) */}
          {isPapa && !pendingPos && (
            <button
              onClick={() => setPlaceMode((p) => !p)}
              className={`absolute top-3 right-3 z-[400] panel-strong px-3 py-2 text-xs flex items-center gap-1.5 ${
                placeMode ? "text-destructive" : "text-primary"
              }`}
            >
              {placeMode ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {placeMode ? "Annulla" : "Piazza drop"}
            </button>
          )}

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-night/40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* GPS status */}
        <div className="panel px-3 py-2 text-[11px] flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-primary" />
            {me ? `Posizione: ±${Math.round(me.acc)}m` : "In attesa del GPS…"}
          </span>
          <span className="text-primary/70">
            {drops.filter((d) => d.status === "active").length} drop attivi
          </span>
        </div>

        {/* Form di creazione drop (papà) */}
        <AnimatePresence>
          {pendingPos && isPapa && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="panel-strong p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
                  // Nuovo drop
                </p>
                <button onClick={cancelPlace} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {DROP_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTpl(i)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xl border ${
                      selectedTpl === i
                        ? "border-primary bg-primary/15 text-glow"
                        : "border-border bg-background/40"
                    }`}
                    title={t.name}
                  >
                    <span>{t.emoji}</span>
                    <span className="text-[8px] uppercase tracking-wider mt-0.5 text-muted-foreground">
                      +{t.xp}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-foreground">
                <b>{DROP_TEMPLATES[selectedTpl].emoji} {DROP_TEMPLATES[selectedTpl].name}</b>
                <span className="text-muted-foreground"> · raggio 5m</span>
              </p>

              {DROP_TEMPLATES[selectedTpl].kind === "mission" && (
                <textarea
                  value={missionText}
                  onChange={(e) => setMissionText(e.target.value)}
                  placeholder="Cosa deve fare Lorenzo? (es. 'Conta i fiori del balcone')"
                  className="w-full bg-background/40 border border-border rounded-lg px-3 py-2 text-sm resize-none"
                  rows={2}
                />
              )}

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota per Lorenzo (opzionale)"
                className="w-full bg-background/40 border border-border rounded-lg px-3 py-2 text-sm"
                maxLength={140}
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={cancelPlace}
                  className="panel px-3 py-2 text-xs text-muted-foreground"
                >
                  Annulla
                </button>
                <button
                  onClick={savePending}
                  disabled={saving}
                  className="btn-neon flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                  Piazza qui
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista drop vicini (Lorenzo) */}
        {!isPapa && (
          <div className="panel-strong p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Drop vicini
            </p>
            {nearby.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nessun drop attivo. Aspetta che papà ne piazzi uno!
              </p>
            )}
            {nearby.map(({ d, dist }) => {
              const inRange = dist <= d.radius_m;
              const acc = me?.acc ?? 0;
              const fuzzy = !inRange && dist <= d.radius_m + acc && acc > d.radius_m / 2;
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 rounded-xl p-2.5 border ${
                    inRange
                      ? "border-primary/60 bg-primary/10"
                      : fuzzy
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-border bg-background/30"
                  }`}
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(dist)}m {inRange ? "· nel raggio!" : `· entro ${d.radius_m}m`}
                      {fuzzy ? ` · GPS ±${Math.round(acc)}m` : ""}
                      {d.note ? ` · "${d.note}"` : ""}
                    </p>
                  </div>
                  {fuzzy ? (
                    <button
                      onClick={() => collect(d, { manual: true })}
                      disabled={collecting === d.id}
                      className="text-[10px] uppercase tracking-widest px-3 py-2 rounded-full border border-amber-500/70 text-amber-400 disabled:opacity-50"
                      title="GPS impreciso: conferma manualmente"
                    >
                      {collecting === d.id ? "…" : "Sono qui"}
                    </button>
                  ) : (
                    <button
                      onClick={() => collect(d)}
                      disabled={!inRange || collecting === d.id}
                      className={`text-[10px] uppercase tracking-widest px-3 py-2 rounded-full border ${
                        inRange
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      } disabled:opacity-50`}
                    >
                      {collecting === d.id ? "…" : inRange ? "Raccogli" : "Lontano"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lista drop piazzati (papà) */}
        {isPapa && (
          <div className="panel-strong p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
              // I tuoi drop
            </p>
            {drops.length === 0 && (
              <p className="text-xs text-muted-foreground">Ancora nessun drop. Tocca "Piazza drop" sulla mappa.</p>
            )}
            {drops.slice(0, 8).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl p-2.5 border border-border bg-background/30"
              >
                <span className="text-xl">{d.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {d.name}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      {d.status === "collected" ? "· raccolto ✓" : "· in attesa"}
                    </span>
                  </p>
                  {d.note && <p className="text-[10px] text-muted-foreground truncate">"{d.note}"</p>}
                </div>
                <button
                  onClick={() => mapRef.current?.setView([d.lat, d.lng], 18)}
                  className="text-[10px] uppercase tracking-widest text-primary px-2 py-1"
                >
                  Vedi
                </button>
                <button
                  onClick={() => removeDrop(d.id)}
                  className="text-muted-foreground p-1"
                  aria-label="Rimuovi"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
