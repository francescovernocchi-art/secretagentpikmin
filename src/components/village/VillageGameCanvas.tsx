import { useEffect, useMemo, useRef } from "react";
import type { BaseBuilding, BuildingCatalog } from "@/lib/base";
import { resolveBiome } from "@/lib/village/biomes";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { pickBuildingImage } from "@/lib/village/buildingImages";
import { usePikminSpecies } from "@/hooks/usePikminSpecies";
import type { PlacementInfo, VillageGameState } from "@/game/village/VillageTypes";

interface Props {
  agent: string;
  biomeKey: string | null | undefined;
  buildings: BaseBuilding[];
  catalog: BuildingCatalog[];
  pikminBreakdown: Record<string, number>;
  pikminMaxVisible?: number;
  placement: BuildingCatalog | null;
  onSelectBuilding?: (id: string) => void;
  onPlacePosition?: (pct: { x: number; y: number }) => void;
  onTapGround?: () => void;
}

/** Canvas Phaser RTS 2.5D del Villaggio. Tutta l'UI resta React fuori da qui. */
export function VillageGameCanvas({
  agent, biomeKey, buildings, catalog, pikminBreakdown, pikminMaxVisible = 18,
  placement, onSelectBuilding, onPlacePosition, onTapGround,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingStateRef = useRef<VillageGameState | null>(null);

  const imageMap = useBuildingImages();
  const { species } = usePikminSpecies();
  const biome = resolveBiome(biomeKey).key;

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
        sceneRef.current.events.on("selectBuilding", (id: string) => onSelectBuildingRef.current?.(id));
        sceneRef.current.events.on("placePosition", (pct: any) => onPlacePositionRef.current?.(pct));
        sceneRef.current.events.on("tapGround", () => onTapGroundRef.current?.());
        if (pendingStateRef.current) sceneRef.current.applyState(pendingStateRef.current);
      });
    })();
    return () => {
      destroyed = true;
      readyRef.current = false;
      sceneRef.current = null;
      if (gameRef.current) {
        try { gameRef.current.destroy(true); } catch { /* ignore */ }
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep latest callbacks
  const onSelectBuildingRef = useRef(onSelectBuilding); onSelectBuildingRef.current = onSelectBuilding;
  const onPlacePositionRef = useRef(onPlacePosition); onPlacePositionRef.current = onPlacePosition;
  const onTapGroundRef = useRef(onTapGround); onTapGroundRef.current = onTapGround;

  const buildingImageByType = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const b of buildings) {
      map[b.type] = pickBuildingImage(imageMap.get(b.type), b.level);
    }
    return map;
  }, [buildings, imageMap]);

  const buildingEmojiByType = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of catalog) map[c.key] = c.emoji ?? "🏠";
    return map;
  }, [catalog]);

  const placementInfo: PlacementInfo | null = useMemo(() => {
    if (!placement) return null;
    const owned = buildings.find((b) => b.type === placement.key);
    return {
      key: placement.key,
      emoji: placement.emoji ?? "🏠",
      imageUrl: pickBuildingImage(imageMap.get(placement.key), owned?.level ?? 1),
    };
  }, [placement, imageMap, buildings]);

  // push state
  useEffect(() => {
    const state: VillageGameState = {
      biome: biome as any,
      seed: agent,
      buildings,
      buildingImageByType,
      buildingEmojiByType,
      pikminBreakdown,
      pikminSpecies: species,
      pikminMaxVisible,
      placement: placementInfo,
    };
    pendingStateRef.current = state;
    if (readyRef.current && sceneRef.current) sceneRef.current.applyState(state);
  }, [agent, biome, buildings, buildingImageByType, buildingEmojiByType, pikminBreakdown, species, pikminMaxVisible, placementInfo]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 select-none touch-none"
      style={{ touchAction: "none" }}
      aria-label="Villaggio - mappa di gioco"
    />
  );
}
