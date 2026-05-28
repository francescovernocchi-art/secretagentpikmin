import { useEffect, useMemo, useRef } from "react";
import type { BaseBuilding, BuildingCatalog } from "@/lib/base";
import { resolveBiome } from "@/lib/village/biomes";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { pickBuildingImage } from "@/lib/village/buildingImages";
import { useActiveDiorama } from "@/hooks/useActiveDiorama";
import { useStructureAssets } from "@/hooks/useStructureAssets";
import { usePikminSpecies } from "@/hooks/usePikminSpecies";
import { useActiveVillageEvents } from "@/hooks/useVillageEvents";
import type {
  PlacementInfo,
  StructureVisualConfig,
  VillageGameState,
  PikminLayerConfig,
  PikminSpeciesInfo,
} from "@/game/village/VillageTypes";

interface Props {
  agent: string;
  biomeKey: string | null | undefined;
  buildings: BaseBuilding[];
  catalog: BuildingCatalog[];
  placement: BuildingCatalog | null;
  /** Configurazione layer Pikmin (mostra/cap/velocità/filtri + breakdown specie). */
  pikminConfig?: Omit<PikminLayerConfig, "species"> | null;
  onSelectBuilding?: (id: string) => void;
  onSelectSlot?: (info: {
    slotKey: string;
    x: number;
    y: number;
    allowedCategories: string[];
  }) => void;
  onPlacePosition?: (pct: { x: number; y: number; slotKey?: string }) => void;
  onTapGround?: () => void;
  slotRenderMode?: "normal" | "build" | "editor";
  onReady?: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
    focusBuilding: (id: string) => void;
  }) => void;
}

/** Canvas Phaser Diorama RTS del Villaggio. Tutta l'UI resta React fuori da qui. */
export function VillageGameCanvas({
  agent,
  biomeKey,
  buildings,
  catalog,
  placement,
  pikminConfig,
  onSelectBuilding,
  onSelectSlot,
  onPlacePosition,
  onTapGround,
  slotRenderMode,
  onReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingStateRef = useRef<VillageGameState | null>(null);

  const imageMap = useBuildingImages();
  const biome = resolveBiome(biomeKey).key;
  const { diorama, slots } = useActiveDiorama(biome);
  const { pick: pickStructureAsset } = useStructureAssets(biome);
  const { species } = usePikminSpecies();
  const { events } = useActiveVillageEvents(biome);

  // mount Phaser
  useEffect(() => {
    if (typeof window === "undefined" || !hostRef.current) return;
    let destroyed = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const { VillageScene } = await import("@/game/village/VillageScene");
      if (destroyed) return;
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current!,
        backgroundColor: "#0a0f0a",
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: "100%",
          height: "100%",
        },
        render: { antialias: true, pixelArt: false },
        scene: [VillageScene],
        banner: false,
        disableContextMenu: true,
      });
      gameRef.current = game;
      game.events.once(Phaser.Core.Events.READY, () => {
        sceneRef.current = game.scene.getScene("village");
        readyRef.current = true;
        sceneRef.current.events.on("selectBuilding", (id: string) =>
          onSelectBuildingRef.current?.(id),
        );
        sceneRef.current.events.on("selectSlot", (info: any) => onSelectSlotRef.current?.(info));
        sceneRef.current.events.on("placePosition", (pct: any) =>
          onPlacePositionRef.current?.(pct),
        );
        sceneRef.current.events.on("tapGround", () => onTapGroundRef.current?.());
        if (pendingStateRef.current) sceneRef.current.applyState(pendingStateRef.current);
        onReadyRef.current?.({
          zoomIn: () => sceneRef.current?.cameraZoomBy(1.25),
          zoomOut: () => sceneRef.current?.cameraZoomBy(0.8),
          recenter: () => sceneRef.current?.cameraRecenter(),
          focusBuilding: (id: string) => sceneRef.current?.focusBuilding(id),
        });
      });
    })();
    return () => {
      destroyed = true;
      readyRef.current = false;
      sceneRef.current = null;
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch {
          /* ignore */
        }
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep latest callbacks
  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;
  const onSelectSlotRef = useRef(onSelectSlot);
  onSelectSlotRef.current = onSelectSlot;
  const onPlacePositionRef = useRef(onPlacePosition);
  onPlacePositionRef.current = onPlacePosition;
  const onTapGroundRef = useRef(onTapGround);
  onTapGroundRef.current = onTapGround;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const buildingImageByType = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const b of buildings) {
      // Priority: per-biome custom structure asset → catalog image fallback
      const biomeAsset = pickStructureAsset(b.type, b.level);
      map[b.type] = biomeAsset?.asset_url ?? pickBuildingImage(imageMap.get(b.type), b.level);
    }
    if (placement) {
      const owned = buildings.find((bb) => bb.type === placement.key);
      const lvl = owned?.level ?? 1;
      const biomeAsset = pickStructureAsset(placement.key, lvl);
      map[placement.key] =
        biomeAsset?.asset_url ?? pickBuildingImage(imageMap.get(placement.key), lvl);
    }
    return map;
  }, [buildings, imageMap, placement, pickStructureAsset]);

  const buildingEmojiByType = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of catalog) map[c.key] = c.emoji ?? "🏠";
    return map;
  }, [catalog]);

  const buildingCategoryByType = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of catalog) map[c.key] = c.category ?? "utility";
    return map;
  }, [catalog]);

  const visualFromAsset = (asset: ReturnType<typeof pickStructureAsset>): StructureVisualConfig | null =>
    asset
      ? {
          assetUrl: asset.asset_url,
          shadowUrl: asset.shadow_url,
          glowUrl: asset.glow_url,
          slotFitScale: asset.slot_fit_scale,
          anchorX: asset.anchor_x,
          anchorY: asset.anchor_y,
          offsetX: asset.offset_x,
          offsetY: asset.offset_y,
          idleAnim: asset.idle_anim,
        }
      : null;

  const structureVisualById = useMemo(() => {
    const map: Record<string, StructureVisualConfig> = {};
    for (const b of buildings) {
      const asset = pickStructureAsset(b.type, Math.max(1, b.level));
      const visual = visualFromAsset(asset);
      if (visual) map[b.id] = visual;
    }
    return map;
  }, [buildings, pickStructureAsset]);

  const placementInfo: PlacementInfo | null = useMemo(() => {
    if (!placement) return null;
    const biomeAsset = pickStructureAsset(placement.key, 1);
    return {
      key: placement.key,
      emoji: placement.emoji ?? "🏠",
      category: placement.category ?? "utility",
      visual: visualFromAsset(biomeAsset),
      imageUrl: biomeAsset?.asset_url ?? pickBuildingImage(imageMap.get(placement.key), 1),
    };
  }, [placement, imageMap, pickStructureAsset]);

  const pikminFull: PikminLayerConfig | null = useMemo(() => {
    if (!pikminConfig) return null;
    const specs: PikminSpeciesInfo[] = species.map((s) => ({
      key: s.key,
      name: s.name,
      color: s.color,
      imageUrl: s.image_url ?? s.icon_url ?? null,
    }));
    return { ...pikminConfig, species: specs };
  }, [pikminConfig, species]);

  // push state
  useEffect(() => {
    const state: VillageGameState = {
      biome: biome as any,
      seed: agent,
      diorama,
      slots,
      buildings,
      buildingImageByType,
      structureVisualById,
      buildingEmojiByType,
      buildingCategoryByType,
      placement: placementInfo,
      pikmin: pikminFull ?? undefined,
      events,
      slotRenderMode,
    };
    pendingStateRef.current = state;
    if (readyRef.current && sceneRef.current) sceneRef.current.applyState(state);
  }, [
    agent,
    biome,
    diorama,
    slots,
    buildings,
    buildingImageByType,
    structureVisualById,
    buildingEmojiByType,
    buildingCategoryByType,
    placementInfo,
    pikminFull,
    events,
    slotRenderMode,
  ]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 select-none touch-none"
      style={{ touchAction: "none" }}
      aria-label="Villaggio - diorama"
    />
  );
}
