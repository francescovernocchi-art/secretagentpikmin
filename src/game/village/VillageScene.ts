import Phaser from "phaser";
import type { BaseBuilding } from "@/lib/base";
import type {
  VillageGameState,
  PlacementInfo,
  PikminLayerConfig,
  StructureVisualConfig,
} from "./VillageTypes";
import type { DioramaSlot } from "@/hooks/useActiveDiorama";
import type { VillageEventRow, ParticleKind } from "@/lib/village/eventTypes";

const BUILD_TEX_PREFIX = "bld:";
const BUILD_SHADOW_TEX_PREFIX = "bld-shadow:";
const BUILD_GLOW_TEX_PREFIX = "bld-glow:";
const DIORAMA_TEX_PREFIX = "diorama:";
const PIKMIN_TEX_PREFIX = "pkm:";
const EVENT_TEX_PREFIX = "evt:";
const PARTICLE_TEX_KEY = "evt-particle-px";

interface BuildingSprite {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image;
  art: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  glow?: Phaser.GameObjects.Image;
  data: BaseBuilding;
  hasTexture: boolean;
  textureKey: string;
  visualSignature: string;
  // Construction overlay
  cs?: {
    root: Phaser.GameObjects.Container;
    barBg: Phaser.GameObjects.Rectangle;
    barFill: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    spin: Phaser.GameObjects.Arc;
    tween: Phaser.Tweens.Tween;
  };
}

type PikminRole = "wander" | "patrol" | "carry" | "gather" | "sleep";
type PikminMotion = "walk" | "idle" | "run" | "sleep";

function urlKey(prefix: string, scope: string, url?: string | null) {
  if (!url) return prefix + scope + ":none";
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  return `${prefix}${scope}:${Math.abs(h).toString(36)}`;
}

interface PikminAgent {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Ellipse;
  carry?: Phaser.GameObjects.Arc;
  speciesKey: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  state: PikminMotion;
  role: PikminRole;
  /** home anchor (es. edificio assegnato) */
  homeX: number;
  homeY: number;
  /** id edificio assegnato (per interazioni) */
  homeBuildingId: string | null;
  /** stato carry: 0=vuoto andata, 1=carico ritorno */
  carrying: boolean;
  /** bobbing */
  bobPhase: number;
  bobAmp: number;
  nextThinkAt: number;
}

/**
 * VillageScene — motore Diorama RTS modulare.
 *
 * - Carica UN'IMMAGINE statica come mondo (diorama HD)
 * - Camera RTS mobile: drag pan, pinch zoom, wheel zoom, bounds
 * - Layer overlay: slots, edifici, fx
 * - Niente generazione procedurale.
 */
export class VillageScene extends Phaser.Scene {
  private state: VillageGameState | null = null;

  // dimensioni mondo (= dimensioni immagine diorama)
  private worldW = 2048;
  private worldH = 2048;

  // layers
  private layerBg!: Phaser.GameObjects.Container;
  private layerSlots!: Phaser.GameObjects.Container;
  private layerBuildings!: Phaser.GameObjects.Container;
  private layerPikmin!: Phaser.GameObjects.Container;
  private layerEvents!: Phaser.GameObjects.Container;
  private layerFx!: Phaser.GameObjects.Container;
  private layerPlacement!: Phaser.GameObjects.Container;

  // events
  private eventNodes = new Map<string, Phaser.GameObjects.GameObject[]>();
  private eventTexLoading = new Set<string>();

  private bgImage: Phaser.GameObjects.Image | null = null;
  private currentDioramaUrl: string | null = null;
  private buildingSprites = new Map<string, BuildingSprite>();
  private slotMarkers = new Map<string, Phaser.GameObjects.Container>();
  private placementGhost: Phaser.GameObjects.Container | null = null;

  // pikmin
  private pikminAgents: PikminAgent[] = [];
  private pikminCfg: PikminLayerConfig | null = null;
  private pikminTexLoading = new Set<string>();

  // input/camera
  private isPanning = false;
  private panStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };
  private pinchPrevDist = 0;
  private minZoom = 0.3;
  private maxZoom = 2.5;
  private dragMoved = false;

  constructor() {
    super("village");
  }

  // ───────── public API ─────────

  public applyState(next: VillageGameState) {
    this.state = next;
    if (next.diorama && next.diorama.image_url !== this.currentDioramaUrl) {
      this.loadDiorama(next.diorama.image_url, next.diorama.width, next.diorama.height);
    } else {
      this.refreshAll();
    }
  }

  public cameraZoomBy(factor: number) {
    const cam = this.cameras.main;
    const target = Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom);
    this.tweens.add({ targets: cam, zoom: target, duration: 200, ease: "Sine.Out" });
  }

  public cameraRecenter() {
    const cam = this.cameras.main;
    const fit = this.computeFitZoom();
    this.tweens.add({
      targets: cam,
      zoom: fit,
      scrollX: this.worldW / 2 - cam.width / 2 / fit,
      scrollY: this.worldH / 2 - cam.height / 2 / fit,
      duration: 350,
      ease: "Sine.Out",
    });
  }

  public focusBuilding(id: string) {
    const sp = this.buildingSprites.get(id);
    if (!sp) return;
    const cam = this.cameras.main;
    const z = Math.max(cam.zoom, 1.0);
    this.tweens.add({
      targets: cam,
      zoom: z,
      scrollX: sp.container.x - cam.width / 2 / z,
      scrollY: sp.container.y - cam.height / 2 / z,
      duration: 400,
      ease: "Sine.Out",
    });
  }

  // ───────── lifecycle ─────────

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x0a0f0a);

    this.layerBg = this.add.container(0, 0).setDepth(0);
    this.layerSlots = this.add.container(0, 0).setDepth(2);
    this.layerBuildings = this.add.container(0, 0).setDepth(3);
    this.layerPikmin = this.add.container(0, 0).setDepth(10);
    this.layerEvents = this.add.container(0, 0).setDepth(40);
    this.layerFx = this.add.container(0, 0).setDepth(50);
    this.layerPlacement = this.add.container(0, 0).setDepth(99);

    this.ensureParticleTexture();
    this.setupInput();
    this.scale.on("resize", () => this.refitOnResize());
  }

  update(_time: number, delta: number) {
    this.tickPikmin(delta);
    this.tickConstruction();
  }

  // ───────── diorama loading ─────────

  private loadDiorama(url: string, w: number, h: number) {
    this.currentDioramaUrl = url;
    this.worldW = w;
    this.worldH = h;
    const key = DIORAMA_TEX_PREFIX + url;

    const apply = () => {
      if (this.bgImage) {
        this.bgImage.destroy();
        this.bgImage = null;
      }
      const img = this.add.image(0, 0, key).setOrigin(0, 0);
      // se l'immagine ha dimensioni diverse, scaliamola sul world dichiarato
      const tex = this.textures.get(key).getSourceImage() as HTMLImageElement;
      if (tex.width && tex.height && (tex.width !== w || tex.height !== h)) {
        img.setDisplaySize(w, h);
      }
      this.layerBg.add(img);
      this.bgImage = img;

      const cam = this.cameras.main;
      cam.setBounds(0, 0, w, h);
      const fit = this.computeFitZoom();
      this.minZoom = fit * 0.6;
      this.maxZoom = Math.max(2.5, fit * 4);
      cam.setZoom(fit);
      cam.centerOn(w / 2, h / 2);

      this.refreshAll();
    };

    if (this.textures.exists(key)) {
      apply();
      return;
    }
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, apply);
    this.load.once("loaderror", (file: any) => {
      if (file?.key === key) console.warn("[diorama] load failed", url);
    });
    this.load.start();
  }

  private computeFitZoom() {
    const cam = this.cameras.main;
    const zx = cam.width / this.worldW;
    const zy = cam.height / this.worldH;
    // "cover" così riempie sempre il viewport (no bande nere)
    return Math.max(zx, zy);
  }

  private refitOnResize() {
    if (!this.bgImage) return;
    const cam = this.cameras.main;
    const fit = this.computeFitZoom();
    this.minZoom = fit * 0.6;
    this.maxZoom = Math.max(2.5, fit * 4);
    if (cam.zoom < this.minZoom) cam.setZoom(this.minZoom);
  }

  // ───────── refresh ─────────

  private refreshAll() {
    if (!this.state) return;
    this.ensureBuildingTextures();
    this.diffBuildings();
    this.rebuildSlotLayer();
    this.updatePlacementGhost();
    this.syncPikmin();
    this.syncEvents();
  }

  // ───────── slots ─────────

  private rebuildSlotLayer() {
    if (!this.state) return;
    this.slotMarkers.forEach((c) => c.destroy());
    this.slotMarkers.clear();
    this.layerSlots.removeAll(true);

    const mode = this.state.slotRenderMode ?? (this.state.placement ? "build" : "normal");
    if (mode === "normal") return;
    const inBuildMode = mode === "build" || !!this.state.placement;
    const inEditorMode = mode === "editor";
    const placement = this.state.placement;
    const usedSlotKeys = new Set<string>();
    for (const b of this.state.buildings) {
      if (b.slot_key) {
        usedSlotKeys.add(b.slot_key);
        continue;
      }
      const slot = this.findNearestSlot(
        (b.position_x / 100) * this.worldW,
        (b.position_y / 100) * this.worldH,
      );
      if (slot) usedSlotKeys.add(slot.slot_key);
    }

    for (const slot of this.state.slots) {
      const occupied = usedSlotKeys.has(slot.slot_key);
      const compatible =
        !placement ||
        slot.allowed_categories.length === 0 ||
        !placement.category ||
        slot.allowed_categories.includes(placement.category);
      if (inBuildMode && (!compatible || occupied)) continue;
      this.createSlotMarker(slot, !occupied, compatible, inBuildMode, inEditorMode);
    }
  }

  private createSlotMarker(
    slot: DioramaSlot,
    available: boolean,
    compatible: boolean,
    inBuildMode: boolean,
    inEditorMode: boolean,
  ) {
    const w = Math.max(
      24,
      slot.width ?? (slot.size === "large" ? 128 : slot.size === "small" ? 76 : 96),
    );
    const h = Math.max(
      24,
      slot.height ?? (slot.size === "large" ? 128 : slot.size === "small" ? 76 : 96),
    );
    const center = this.slotCenter(slot);
    const usable = available && compatible;
    // In build mode → verde acceso se compatibile, grigio se no/occupato
    // In modalità normale → ring discreto solo per slot liberi
    const color = inEditorMode ? 0x60a5fa : usable ? 0x6ee7a8 : 0x9ca3af;
    const fillAlpha = inEditorMode ? 0.16 : 0.25;
    const rect = this.add.rectangle(0, 0, w, h, color, fillAlpha);
    rect.setStrokeStyle(inBuildMode ? 4 : 2, color, inEditorMode ? 0.9 : 0.95);
    const label = inEditorMode
      ? this.add
          .text(-w / 2 + 6, -h / 2 + 4, slot.slot_key, {
            fontSize: "12px",
            color: "#ffffff",
            backgroundColor: "rgba(0,0,0,0.55)",
          })
          .setOrigin(0, 0)
      : null;

    const c = this.add.container(center.x, center.y, label ? [rect, label] : [rect]);
    c.setSize(w, h);
    c.setAngle(slot.rotation ?? 0);
    c.setDepth(center.y);

    if (available || inEditorMode) {
      c.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains,
      );
      c.on("pointerup", (p: Phaser.Input.Pointer) => {
        if (this.dragMoved) return;
        if (p.event && (p.event as any).stopPropagation) (p.event as any).stopPropagation();
        if (inBuildMode && compatible) {
          this.events.emit("placePosition", {
            x: (center.x / this.worldW) * 100,
            y: (center.y / this.worldH) * 100,
            slotKey: slot.slot_key,
          });
        } else if (inEditorMode) {
          this.events.emit("selectSlot", {
            slotKey: slot.slot_key,
            x: (center.x / this.worldW) * 100,
            y: (center.y / this.worldH) * 100,
            allowedCategories: slot.allowed_categories,
          });
        }
      });

      if (inBuildMode && usable) {
        this.tweens.add({
          targets: rect,
          scale: { from: 1, to: 1.08 },
          alpha: { from: fillAlpha, to: 0.08 },
          duration: 1400,
          repeat: -1,
          ease: "Sine.Out",
        });
      }
    }

    this.layerSlots.add(c);
    this.slotMarkers.set(slot.slot_key, c);
  }

  private findNearestSlot(wx: number, wy: number, maxDist = 80): DioramaSlot | null {
    if (!this.state) return null;
    let best: DioramaSlot | null = null;
    let bd = Infinity;
    for (const s of this.state.slots) {
      const center = this.slotCenter(s);
      const d = Math.hypot(center.x - wx, center.y - wy);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return bd <= maxDist ? best : null;
  }

  private slotCenter(slot: DioramaSlot) {
    const w = slot.width ?? (slot.size === "large" ? 128 : slot.size === "small" ? 76 : 96);
    const h = slot.height ?? (slot.size === "large" ? 128 : slot.size === "small" ? 76 : 96);
    return { x: slot.x + w / 2, y: slot.y + h / 2 };
  }

  // ───────── buildings ─────────

  private ensureBuildingTextures() {
    if (!this.state) return;
    const loadUrl = (key: string, url: string | null | undefined) => {
      if (!url || this.textures.exists(key)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!this.textures.exists(key)) this.textures.addImage(key, img);
        for (const sp of [...this.buildingSprites.values()]) this.refreshBuildingSprite(sp);
        this.updatePlacementGhost();
      };
      img.src = url;
    };
    for (const [type, url] of Object.entries(this.state.buildingImageByType)) {
      const key = BUILD_TEX_PREFIX + type;
      loadUrl(key, url);
    }
    for (const b of this.state.buildings) {
      const visual = this.visualForBuilding(b);
      if (!visual) continue;
      loadUrl(this.textureKeyForBuilding(b), visual.assetUrl);
      loadUrl(urlKey(BUILD_SHADOW_TEX_PREFIX, b.id, visual.shadowUrl), visual.shadowUrl);
      loadUrl(urlKey(BUILD_GLOW_TEX_PREFIX, b.id, visual.glowUrl), visual.glowUrl);
    }
    const pv = this.state.placement?.visual;
    if (this.state.placement && pv) {
      const scope = `placement:${this.state.placement.key}`;
      loadUrl(urlKey(BUILD_TEX_PREFIX, scope, pv.assetUrl), pv.assetUrl);
      loadUrl(urlKey(BUILD_SHADOW_TEX_PREFIX, scope, pv.shadowUrl), pv.shadowUrl);
      loadUrl(urlKey(BUILD_GLOW_TEX_PREFIX, scope, pv.glowUrl), pv.glowUrl);
    }
  }

  private visualForBuilding(b: BaseBuilding): StructureVisualConfig | null {
    return this.state?.structureVisualById?.[b.id] ?? null;
  }

  private visualSignature(b: BaseBuilding) {
    const v = this.visualForBuilding(b);
    return v
      ? [v.assetUrl, v.shadowUrl, v.glowUrl, v.slotFitScale, v.anchorX, v.anchorY, v.offsetX, v.offsetY, v.idleAnim].join("|")
      : "fallback";
  }

  private textureKeyForBuilding(b: BaseBuilding) {
    const visual = this.visualForBuilding(b);
    return visual?.assetUrl ? urlKey(BUILD_TEX_PREFIX, b.id, visual.assetUrl) : BUILD_TEX_PREFIX + b.type;
  }

  private slotForBuilding(b: BaseBuilding): DioramaSlot | null {
    if (!this.state) return null;
    if (b.slot_key) return this.state.slots.find((s) => s.slot_key === b.slot_key) ?? null;
    const pos = this.worldPosForBuilding(b);
    return this.findNearestSlot(pos.x, pos.y, 120);
  }

  private applyBuildingFit(
    art: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
    shadow: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image | null,
    visual: StructureVisualConfig | null,
    slot: DioramaSlot | null,
  ) {
    const sw = slot?.width ?? (slot?.size === "large" ? 128 : slot?.size === "small" ? 76 : 96);
    const sh = slot?.height ?? (slot?.size === "large" ? 128 : slot?.size === "small" ? 76 : 96);
    if (art instanceof Phaser.GameObjects.Image) {
      const targetW = visual && slot ? sw * visual.slotFitScale : 130;
      const targetH = visual && slot ? sh * visual.slotFitScale : 130;
      const s = Math.min(targetW / (art.width || targetW), targetH / (art.height || targetH));
      art.setScale(s);
    }
    if (!shadow) return;
    if (shadow instanceof Phaser.GameObjects.Image) {
      if (art instanceof Phaser.GameObjects.Image) shadow.setScale(art.scaleX, art.scaleY);
    } else if (visual && slot) {
      shadow.setPosition(0, 3);
      shadow.setSize(Math.max(36, sw * 0.72), Math.max(10, sh * 0.16));
    }
  }

  private diffBuildings() {
    if (!this.state) return;
    const liveIds = new Set(this.state.buildings.map((b) => b.id));
    for (const [id, sp] of this.buildingSprites) {
      if (!liveIds.has(id)) {
        sp.container.destroy();
        this.buildingSprites.delete(id);
      }
    }
    for (const b of this.state.buildings) {
      const existing = this.buildingSprites.get(b.id);
      if (!existing) this.createBuildingSprite(b);
      else this.updateBuildingSprite(existing, b);
    }
  }

  private worldPosForBuilding(b: BaseBuilding) {
    const visual = this.visualForBuilding(b);
    const slot = b.slot_key
      ? this.state?.slots.find((s) => s.slot_key === b.slot_key)
      : null;
    if (visual && slot) {
      const sw = slot.width ?? (slot.size === "large" ? 128 : slot.size === "small" ? 76 : 96);
      const sh = slot.height ?? (slot.size === "large" ? 128 : slot.size === "small" ? 76 : 96);
      return {
        x: slot.x + sw * visual.anchorX + visual.offsetX,
        y: slot.y + sh * visual.anchorY + visual.offsetY,
      };
    }
    return { x: (b.position_x / 100) * this.worldW, y: (b.position_y / 100) * this.worldH };
  }

  private createBuildingSprite(b: BaseBuilding) {
    if (!this.state) return;
    const pos = this.worldPosForBuilding(b);
    const visual = this.visualForBuilding(b);
    const slot = this.slotForBuilding(b);
    const shadowKey = visual?.shadowUrl ? urlKey(BUILD_SHADOW_TEX_PREFIX, b.id, visual.shadowUrl) : "";
    const shadow = shadowKey && this.textures.exists(shadowKey)
      ? this.add.image(0, 0, shadowKey).setOrigin(visual?.anchorX ?? 0.5, visual?.anchorY ?? 0.85).setAlpha(0.68)
      : this.add.ellipse(0, 30, 80, 22, 0x000000, 0.35);
    const key = this.textureKeyForBuilding(b);
    const hasTexture = this.textures.exists(key);
    const art: Phaser.GameObjects.Image | Phaser.GameObjects.Text = hasTexture
      ? this.add.image(0, 0, key).setOrigin(visual?.anchorX ?? 0.5, visual?.anchorY ?? 0.85)
      : this.add
          .text(0, 0, this.state.buildingEmojiByType[b.type] ?? "🏠", { fontSize: "72px" })
          .setOrigin(0.5, 0.85);
    this.applyBuildingFit(art, shadow, visual, slot);
    const glowKey = visual?.glowUrl ? urlKey(BUILD_GLOW_TEX_PREFIX, b.id, visual.glowUrl) : "";
    const glow = glowKey && this.textures.exists(glowKey)
      ? this.add.image(0, 0, glowKey).setOrigin(visual?.anchorX ?? 0.5, visual?.anchorY ?? 0.85).setAlpha(0.82).setBlendMode(Phaser.BlendModes.SCREEN)
      : undefined;
    if (glow) this.applyBuildingFit(glow, null, visual, slot);
    const children = glow ? [shadow, art, glow] : [shadow, art];
    const container = this.add.container(pos.x, pos.y, children);
    const hitW = Math.max(96, slot?.width ?? 120);
    const hitH = Math.max(96, slot?.height ?? 130);
    container.setSize(hitW, hitH);
    container.setDepth(pos.y);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH, hitW, hitH * 1.25),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerup", () => {
      if (this.dragMoved) return;
      this.events.emit("selectBuilding", b.id);
    });
    this.layerBuildings.add(container);

    // bobbing leggero
    if (!visual || visual.idleAnim === "bob") {
      this.tweens.add({ targets: art, y: { from: 0, to: -4 }, duration: 1800 + Math.random() * 600, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    } else if (visual.idleAnim === "sway") {
      this.tweens.add({ targets: art, angle: { from: -1.2, to: 1.2 }, duration: 2200 + Math.random() * 500, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }

    const sp: BuildingSprite = { container, shadow, art, glow, data: b, hasTexture, textureKey: key, visualSignature: this.visualSignature(b) };
    this.buildingSprites.set(b.id, sp);
    this.syncConstructionOverlay(sp);
  }

  private updateBuildingSprite(sp: BuildingSprite, b: BaseBuilding) {
    const levelChanged = sp.data.level !== b.level;
    const nextKey = this.textureKeyForBuilding(b);
    const nowHasTexture = this.textures.exists(nextKey);
    const visualChanged = sp.visualSignature !== this.visualSignature(b);
    sp.data = b;
    const pos = this.worldPosForBuilding(b);
    sp.container.x = pos.x;
    sp.container.y = pos.y;
    sp.container.setDepth(pos.y);
    // Se è cambiato il livello (o è apparsa una texture), rigenera lo sprite per cambiare immagine
    if (levelChanged || visualChanged || sp.textureKey !== nextKey || (!sp.hasTexture && nowHasTexture)) {
      this.refreshBuildingSprite(sp);
      return;
    }
    this.syncConstructionOverlay(sp);
  }

  private refreshBuildingSprite(sp: BuildingSprite) {
    sp.cs?.tween.stop();
    sp.cs?.root.destroy();
    sp.container.destroy();
    this.buildingSprites.delete(sp.data.id);
    this.createBuildingSprite(sp.data);
  }

  // ───────── construction overlay ─────────

  private syncConstructionOverlay(sp: BuildingSprite) {
    const isBusy = sp.data.status !== "idle";
    if (!isBusy) {
      if (sp.cs) {
        sp.cs.tween.stop();
        sp.cs.root.destroy();
        sp.cs = undefined;
      }
      return;
    }
    if (sp.cs) return; // già attivo: aggiornato dal tick
    const W = 90,
      H = 8;
    const root = this.add.container(0, 18);
    const ring = this.add.circle(0, -60, 22, 0xfacc15, 0).setStrokeStyle(3, 0xfacc15, 0.85);
    const spin = this.add
      .arc(0, -60, 26, 0, 270, false, 0xfacc15, 0)
      .setStrokeStyle(3, 0xfacc15, 0.95);
    const barBg = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setStrokeStyle(1, 0xfacc15, 0.7);
    const barFill = this.add.rectangle(-W / 2, 0, 1, H - 2, 0xfacc15, 1).setOrigin(0, 0.5);
    const label = this.add
      .text(0, 14, sp.data.status === "upgrading" ? "Upgrade…" : "Costruzione…", {
        fontSize: "10px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    root.add([ring, spin, barBg, barFill, label]);
    sp.container.add(root);
    const tween = this.tweens.add({
      targets: spin,
      angle: 360,
      duration: 1400,
      repeat: -1,
      ease: "Linear",
    });
    sp.cs = { root, barBg, barFill, label, spin, tween };
  }

  private tickConstruction() {
    if (this.buildingSprites.size === 0) return;
    const now = Date.now();
    const W = 90;
    for (const sp of this.buildingSprites.values()) {
      if (!sp.cs) continue;
      const b = sp.data;
      if (!b.build_end_at || !b.started_at) continue;
      const start = new Date(b.started_at).getTime();
      const end = new Date(b.build_end_at).getTime();
      const total = Math.max(1, end - start);
      const elapsed = Math.max(0, Math.min(total, now - start));
      const pct = elapsed / total;
      sp.cs.barFill.width = Math.max(1, pct * (W - 2));
      const remaining = Math.max(0, Math.round((end - now) / 1000));
      const mm = Math.floor(remaining / 60);
      const ss = (remaining % 60).toString().padStart(2, "0");
      const prefix = b.status === "upgrading" ? "Lv→" + (b.level + 1) + " " : "";
      sp.cs.label.setText(remaining > 0 ? `${prefix}${mm}:${ss}` : "Pronto!");
    }
  }

  // ───────── placement ghost ─────────

  private updatePlacementGhost() {
    this.layerPlacement.removeAll(true);
    this.placementGhost = null;
    if (!this.state?.placement) return;
    const p = this.state.placement;
    const visual = p.visual ?? null;
    const scope = `placement:${p.key}`;
    const key = visual?.assetUrl ? urlKey(BUILD_TEX_PREFIX, scope, visual.assetUrl) : BUILD_TEX_PREFIX + p.key;
    const art = this.textures.exists(key)
      ? this.add.image(0, 0, key).setOrigin(visual?.anchorX ?? 0.5, visual?.anchorY ?? 0.85).setAlpha(0.7)
      : this.add.text(0, 0, p.emoji, { fontSize: "72px" }).setOrigin(0.5, 0.85).setAlpha(0.7);
    const shadowKey = visual?.shadowUrl ? urlKey(BUILD_SHADOW_TEX_PREFIX, scope, visual.shadowUrl) : "";
    const shadow = shadowKey && this.textures.exists(shadowKey)
      ? this.add.image(0, 0, shadowKey).setOrigin(visual?.anchorX ?? 0.5, visual?.anchorY ?? 0.85).setAlpha(0.45)
      : null;
    this.applyBuildingFit(art, shadow, visual, null);
    const c = this.add.container(-9999, -9999, shadow ? [shadow, art] : [art]);
    this.layerPlacement.add(c);
    this.placementGhost = c;
  }

  // ───────── input: pan + pinch + wheel ─────────

  private setupInput() {
    const cam = this.cameras.main;
    const input = this.input;

    input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragMoved = false;
      if (input.pointer1?.isDown && input.pointer2?.isDown) {
        this.pinchPrevDist = Phaser.Math.Distance.Between(
          input.pointer1.x,
          input.pointer1.y,
          input.pointer2.x,
          input.pointer2.y,
        );
        this.isPanning = false;
        return;
      }
      // In placement mode il drag muove il fantasma, non la camera
      if (this.state?.placement && this.placementGhost) {
        this.isPanning = false;
        const w = cam.getWorldPoint(p.x, p.y);
        this.placementGhost.x = w.x;
        this.placementGhost.y = w.y;
        return;
      }
      this.isPanning = true;
      this.panStart = { x: p.x, y: p.y, scrollX: cam.scrollX, scrollY: cam.scrollY };
    });

    input.on("pointermove", (p: Phaser.Input.Pointer) => {
      // pinch
      if (input.pointer1?.isDown && input.pointer2?.isDown) {
        const d = Phaser.Math.Distance.Between(
          input.pointer1.x,
          input.pointer1.y,
          input.pointer2.x,
          input.pointer2.y,
        );
        if (this.pinchPrevDist > 0) {
          const factor = d / this.pinchPrevDist;
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom));
        }
        this.pinchPrevDist = d;
        this.dragMoved = true;
        return;
      }
      // ghost follow (anche senza pointer giù, per preview)
      if (this.placementGhost && this.state?.placement) {
        const w = cam.getWorldPoint(p.x, p.y);
        this.placementGhost.x = w.x;
        this.placementGhost.y = w.y;
        // evidenzia slot più vicino
        const near = this.findNearestSlot(w.x, w.y, 160);
        this.slotMarkers.forEach((c, key) => {
          c.setAlpha(near && near.slot_key === key ? 1 : 0.75);
        });
        return; // in placement mode non panniamo
      }
      // pan
      if (this.isPanning && p.isDown) {
        const dx = (p.x - this.panStart.x) / cam.zoom;
        const dy = (p.y - this.panStart.y) / cam.zoom;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragMoved = true;
        cam.setScroll(this.panStart.scrollX - dx, this.panStart.scrollY - dy);
      }
    });

    input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const wasDrag = this.dragMoved;
      this.isPanning = false;
      this.pinchPrevDist = 0;
      if (!this.state) return;
      // In placement mode: rilascio = piazza sullo slot più vicino (tap o drag, indifferente)
      if (this.state.placement) {
        const w = cam.getWorldPoint(p.x, p.y);
        const slot = this.findNearestSlot(w.x, w.y, 220);
        if (slot) {
          const center = this.slotCenter(slot);
          this.events.emit("placePosition", {
            x: (center.x / this.worldW) * 100,
            y: (center.y / this.worldH) * 100,
            slotKey: slot.slot_key,
          });
        }
        return;
      }
      // tap su terreno (no drag, no slot)
      if (!wasDrag) {
        this.events.emit("tapGround");
      }
    });

    input.on("wheel", (_p: any, _o: any, _dx: number, dy: number) => {
      const factor = dy > 0 ? 0.9 : 1.1;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom));
    });
  }

  // ───────── pikmin ─────────

  private ensurePikminTexture(speciesKey: string, url: string | null) {
    if (!url) return;
    const key = PIKMIN_TEX_PREFIX + speciesKey;
    if (this.textures.exists(key) || this.pikminTexLoading.has(key)) return;
    this.pikminTexLoading.add(key);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!this.textures.exists(key)) this.textures.addImage(key, img);
      this.pikminTexLoading.delete(key);
      // upgrade existing fallback arcs of this species to textured sprites
      for (const a of this.pikminAgents) {
        if (a.speciesKey === speciesKey && !(a.body instanceof Phaser.GameObjects.Image)) {
          this.replacePikminBody(a);
        }
      }
    };
    img.onerror = () => this.pikminTexLoading.delete(key);
    img.src = url;
  }

  private replacePikminBody(a: PikminAgent) {
    const key = PIKMIN_TEX_PREFIX + a.speciesKey;
    if (!this.textures.exists(key)) return;
    a.body.destroy();
    const img = this.add.image(0, -18, key).setOrigin(0.5, 0.5);
    const targetH = 48;
    const s = targetH / (img.height || targetH);
    img.setScale(s);
    a.body = img;
    a.container.add(img);
  }

  private computePikminPool(): string[] {
    const cfg = this.pikminCfg;
    if (!cfg || !cfg.show) return [];
    const owned = cfg.species
      .filter((s) => cfg.filters[s.key] !== false)
      .map((s) => ({ key: s.key, n: Math.max(0, Math.floor(cfg.breakdown[s.key] ?? 0)) }))
      .filter((e) => e.n > 0);
    const total = owned.reduce((a, e) => a + e.n, 0);
    if (total === 0) return [];
    const cap = Math.max(1, Math.min(60, cfg.maxCap));
    const pool: string[] = [];
    if (total <= cap) {
      for (const e of owned) for (let i = 0; i < e.n; i++) pool.push(e.key);
    } else {
      const scaled = owned.map((e) => ({
        key: e.key,
        n: Math.max(1, Math.round((e.n / total) * cap)),
      }));
      let sum = scaled.reduce((a, e) => a + e.n, 0);
      while (sum > cap) {
        const idx = scaled.reduce((mi, e, i, arr) => (e.n > arr[mi].n ? i : mi), 0);
        scaled[idx].n--;
        sum--;
      }
      while (sum < cap) {
        const idx = scaled.reduce((mi, e, i, arr) => (e.n < arr[mi].n ? i : mi), 0);
        scaled[idx].n++;
        sum++;
      }
      for (const e of scaled) for (let i = 0; i < e.n; i++) pool.push(e.key);
    }
    return pool;
  }

  private anchorPoints(): { x: number; y: number }[] {
    if (!this.state) return [{ x: this.worldW / 2, y: this.worldH / 2 }];
    const pts = this.state.buildings.map((b) => ({
      x: (b.position_x / 100) * this.worldW,
      y: (b.position_y / 100) * this.worldH,
    }));
    if (pts.length === 0) pts.push({ x: this.worldW / 2, y: this.worldH / 2 });
    return pts;
  }

  /** Trova edificio con categoria preferita, fallback any. */
  private pickHomeBuilding(prefer?: string[]): BaseBuilding | null {
    const list = this.state?.buildings ?? [];
    if (list.length === 0) return null;
    const cats = this.state?.buildingCategoryByType ?? {};
    if (prefer && prefer.length) {
      const filtered = list.filter((b) => prefer.includes(cats[b.type] ?? "utility"));
      if (filtered.length) return filtered[Math.floor(Math.random() * filtered.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  private buildingWorldPos(b: BaseBuilding) {
    return {
      x: (b.position_x / 100) * this.worldW,
      y: (b.position_y / 100) * this.worldH,
    };
  }

  /** Modalità globale derivata dagli eventi attivi. */
  private currentEventMode(): "alarm" | "shelter" | "nectar" | "none" {
    const evs = this.state?.events ?? [];
    if (!evs.length) return "none";
    for (const e of evs) {
      if (e.event_type === "invasione" || e.event_type === "meteora") return "alarm";
      if (e.event_type === "bufera" || e.event_type === "eruzione") return "shelter";
      if (e.event_type === "nettare") return "nectar";
    }
    return "none";
  }

  private assignRole(): PikminRole {
    const r = Math.random();
    if (r < 0.25) return "patrol";
    if (r < 0.5) return "carry";
    if (r < 0.75) return "gather";
    return "wander";
  }

  private syncPikmin() {
    const cfg = this.state?.pikmin ?? null;
    this.pikminCfg = cfg;
    if (!cfg || !cfg.show) {
      this.clearPikmin();
      return;
    }
    for (const s of cfg.species) this.ensurePikminTexture(s.key, s.imageUrl);

    const pool = this.computePikminPool();
    const anchors = this.anchorPoints();

    while (this.pikminAgents.length > pool.length) {
      const a = this.pikminAgents.pop();
      a?.container.destroy();
    }
    for (let i = 0; i < this.pikminAgents.length; i++) {
      const a = this.pikminAgents[i];
      const desired = pool[i];
      if (a.speciesKey !== desired) {
        a.container.destroy();
        this.pikminAgents[i] = this.spawnPikmin(desired, cfg, anchors);
      }
    }
    while (this.pikminAgents.length < pool.length) {
      const i = this.pikminAgents.length;
      this.pikminAgents.push(this.spawnPikmin(pool[i], cfg, anchors));
    }
  }

  private clearPikmin() {
    for (const a of this.pikminAgents) a.container.destroy();
    this.pikminAgents = [];
  }

  private spawnPikmin(
    speciesKey: string,
    cfg: PikminLayerConfig,
    anchors: { x: number; y: number }[],
  ): PikminAgent {
    const sp = cfg.species.find((s) => s.key === speciesKey);
    const tint = sp?.color ? Phaser.Display.Color.HexStringToColor(sp.color).color : 0xa3e635;

    const role: PikminRole = this.assignRole();
    const preferByRole: Record<PikminRole, string[]> = {
      patrol: ["defense"],
      carry: ["production", "energy", "science"],
      gather: ["social", "coop", "pikmin"],
      wander: [],
      sleep: [],
    };
    const home = this.pickHomeBuilding(preferByRole[role]);
    const homePos = home
      ? this.buildingWorldPos(home)
      : anchors[Math.floor(Math.random() * anchors.length)];

    const x = homePos.x + (Math.random() - 0.5) * 140;
    const y = homePos.y + (Math.random() - 0.5) * 140;

    const shadow = this.add.ellipse(0, 4, 28, 9, 0x000000, 0.35);
    const key = PIKMIN_TEX_PREFIX + speciesKey;
    const body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc = this.textures.exists(key)
      ? (() => {
          const im = this.add.image(0, -18, key).setOrigin(0.5, 0.5);
          const s = 48 / (im.height || 48);
          im.setScale(s);
          return im;
        })()
      : this.add.circle(0, -16, 14, tint, 1).setStrokeStyle(2, 0x000000, 0.45);

    const container = this.add.container(x, y, [shadow, body]);
    container.setDepth(y);
    this.layerPikmin.add(container);

    return {
      container,
      body,
      shadow,
      speciesKey,
      x,
      y,
      tx: x,
      ty: y,
      speed: 55 + Math.random() * 35,
      state: "walk",
      role,
      homeX: homePos.x,
      homeY: homePos.y,
      homeBuildingId: home?.id ?? null,
      carrying: false,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: 1.4 + Math.random() * 1.2,
      nextThinkAt: performance.now() + 400 + Math.random() * 1800,
    };
  }

  /** Aggiorna/rimuove icona carry. */
  private setCarryVisual(a: PikminAgent, on: boolean) {
    if (on && !a.carry) {
      a.carry = this.add.circle(8, -30, 4, 0xffd54a, 1).setStrokeStyle(1, 0x4a3000, 0.6);
      a.container.add(a.carry);
    } else if (!on && a.carry) {
      a.carry.destroy();
      a.carry = undefined;
    }
  }

  private pickRoleTarget(
    a: PikminAgent,
    anchors: { x: number; y: number }[],
  ): { x: number; y: number } {
    const jitter = (n: number) => (Math.random() - 0.5) * n;
    switch (a.role) {
      case "patrol": {
        // orbita attorno a home
        const ang = Math.random() * Math.PI * 2;
        const r = 60 + Math.random() * 60;
        return { x: a.homeX + Math.cos(ang) * r, y: a.homeY + Math.sin(ang) * r };
      }
      case "carry": {
        // alterna: home ↔ random anchor
        if (a.carrying) return { x: a.homeX + jitter(30), y: a.homeY + jitter(30) };
        const other = anchors[Math.floor(Math.random() * anchors.length)];
        return { x: other.x + jitter(40), y: other.y + jitter(40) };
      }
      case "gather": {
        return { x: a.homeX + jitter(80), y: a.homeY + jitter(80) };
      }
      default: {
        if (Math.random() < 0.6 && anchors.length) {
          const t = anchors[Math.floor(Math.random() * anchors.length)];
          return { x: t.x + jitter(120), y: t.y + jitter(120) };
        }
        return { x: Math.random() * this.worldW, y: Math.random() * this.worldH };
      }
    }
  }

  private tickPikmin(deltaMs: number) {
    const cfg = this.pikminCfg;
    if (!cfg || !cfg.show || this.pikminAgents.length === 0) return;
    const now = performance.now();
    const mode = this.currentEventMode();
    const night = !!cfg.night;
    const threat = !!cfg.threat || mode === "alarm";
    const speedMul = cfg.speed * (threat ? 1.7 : mode === "shelter" ? 1.4 : night ? 0.5 : 1);
    const anchors = this.anchorPoints();

    // Off-camera sleep: calcola bounds camera con margine
    const cam = this.cameras.main;
    const margin = 120;
    const view = cam.worldView;
    const inView = (x: number, y: number) =>
      x >= view.x - margin &&
      x <= view.x + view.width + margin &&
      y >= view.y - margin &&
      y <= view.y + view.height + margin;

    for (const a of this.pikminAgents) {
      // Sleep fuori camera: salta motion, mantieni pos
      if (!inView(a.x, a.y)) {
        // ricicla think saltuariamente per non bloccare per sempre
        if (now >= a.nextThinkAt) a.nextThinkAt = now + 3000 + Math.random() * 4000;
        continue;
      }

      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);

      if (a.state !== "idle" && a.state !== "sleep" && dist > 2) {
        const baseSpeed = a.state === "run" ? a.speed * 1.7 : a.speed;
        const v = baseSpeed * speedMul;
        const step = (v * deltaMs) / 1000;
        a.x += (dx / dist) * step;
        a.y += (dy / dist) * step;
        if (a.body instanceof Phaser.GameObjects.Image) a.body.setFlipX(dx < 0);

        // bobbing morbido durante walk/run
        a.bobPhase += deltaMs * 0.012 * (a.state === "run" ? 1.6 : 1);
        const bob = Math.sin(a.bobPhase) * a.bobAmp;
        a.container.x = a.x;
        a.container.y = a.y + bob;
        a.container.setDepth(a.y);
      } else if (dist <= 2 && a.state !== "idle" && a.state !== "sleep") {
        a.state = night ? "sleep" : "idle";
        // arrivato a destinazione carry → toggle stato
        if (a.role === "carry") {
          a.carrying = !a.carrying;
          this.setCarryVisual(a, a.carrying);
        }
        const idleMs =
          mode === "alarm"
            ? 300 + Math.random() * 400
            : mode === "shelter"
              ? 4000 + Math.random() * 3000
              : night
                ? 5000 + Math.random() * 5000
                : 800 + Math.random() * 2200;
        a.nextThinkAt = now + idleMs;
      }

      if (now >= a.nextThinkAt) {
        // Override comportamento per eventi globali
        if (mode === "alarm") {
          // corre al centro comando / defense più vicino
          const home = this.pickHomeBuilding(["defense", "pikmin"]);
          const target = home
            ? this.buildingWorldPos(home)
            : { x: this.worldW / 2, y: this.worldH / 2 };
          a.tx = target.x + (Math.random() - 0.5) * 60;
          a.ty = target.y + (Math.random() - 0.5) * 60;
          a.state = "run";
        } else if (mode === "shelter") {
          // corre al proprio home (riparo)
          a.tx = a.homeX + (Math.random() - 0.5) * 30;
          a.ty = a.homeY + (Math.random() - 0.5) * 30;
          a.state = "run";
        } else if (mode === "nectar") {
          // si radunano vicino a un anchor casuale (pioggia di nettare)
          const t = anchors[Math.floor(Math.random() * anchors.length)];
          a.tx = t.x + (Math.random() - 0.5) * 60;
          a.ty = t.y + (Math.random() - 0.5) * 60;
          a.state = "walk";
        } else if (night && Math.random() < 0.6) {
          a.state = "sleep";
          a.tx = a.x;
          a.ty = a.y;
        } else {
          const t = this.pickRoleTarget(a, anchors);
          a.tx = Phaser.Math.Clamp(t.x, 20, this.worldW - 20);
          a.ty = Phaser.Math.Clamp(t.y, 20, this.worldH - 20);
          a.state = Math.random() < 0.85 ? "walk" : "idle";
        }
        const baseThink = night ? 5000 : mode === "alarm" ? 1200 : 2500;
        a.nextThinkAt = now + baseThink + Math.random() * 3500;
      }
    }
  }

  // ───────── events (overlay diorama) ─────────

  private ensureParticleTexture() {
    if (this.textures.exists(PARTICLE_TEX_KEY)) return;
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(PARTICLE_TEX_KEY, 8, 8);
    g.destroy();
  }

  private ensureEventTexture(url: string, onReady: () => void) {
    const key = EVENT_TEX_PREFIX + url;
    if (this.textures.exists(key)) {
      onReady();
      return;
    }
    if (this.eventTexLoading.has(key)) return;
    this.eventTexLoading.add(key);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!this.textures.exists(key)) this.textures.addImage(key, img);
      this.eventTexLoading.delete(key);
      onReady();
    };
    img.onerror = () => this.eventTexLoading.delete(key);
    img.src = url;
  }

  private syncEvents() {
    const wanted = new Map<string, VillageEventRow>();
    for (const e of this.state?.events ?? []) wanted.set(e.id, e);

    // remove old
    for (const [id, nodes] of this.eventNodes) {
      if (!wanted.has(id)) {
        nodes.forEach((n) => {
          try {
            n.destroy();
          } catch {
            /* ignore */
          }
        });
        this.eventNodes.delete(id);
      }
    }
    // add new
    for (const [id, evt] of wanted) {
      if (!this.eventNodes.has(id)) this.spawnEvent(evt);
    }
  }

  private spawnEvent(evt: VillageEventRow) {
    const nodes: Phaser.GameObjects.GameObject[] = [];
    const fx = evt.effects ?? {};
    const w = this.worldW,
      h = this.worldH;

    // overlay tint full-world
    if (fx.overlay?.tint) {
      const color = Phaser.Display.Color.HexStringToColor(fx.overlay.tint).color;
      const rect = this.add.rectangle(0, 0, w, h, color, fx.overlay.alpha ?? 0.2).setOrigin(0, 0);
      rect.setBlendMode(Phaser.BlendModes.MULTIPLY);
      this.layerEvents.add(rect);
      nodes.push(rect);
    }

    // overlay image (es. neve, ragnatele, nebbia)
    if (evt.overlay_image_url) {
      const url = evt.overlay_image_url;
      this.ensureEventTexture(url, () => {
        if (!this.eventNodes.has(evt.id)) return; // already removed
        const key = EVENT_TEX_PREFIX + url;
        const img = this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(w, h).setAlpha(0.85);
        this.layerEvents.add(img);
        this.eventNodes.get(evt.id)!.push(img);
      });
    }

    // glow centrale
    if (fx.glow) {
      const c = Phaser.Display.Color.HexStringToColor(fx.glow.color).color;
      const radius = Math.min(w, h) * 0.6;
      const glow = this.add.circle(w / 2, h / 2, radius, c, fx.glow.intensity ?? 0.3);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      this.layerEvents.add(glow);
      this.tweens.add({
        targets: glow,
        alpha: { from: glow.alpha * 0.6, to: glow.alpha },
        duration: 1800,
        yoyo: true,
        repeat: -1,
      });
      nodes.push(glow);
    }

    // particelle
    if (fx.particles) {
      const p = this.spawnParticles(fx.particles.kind, fx.particles.color, fx.particles.count);
      if (p) {
        this.layerEvents.add(p);
        nodes.push(p);
      }
    }

    this.eventNodes.set(evt.id, nodes);
  }

  private spawnParticles(kind: ParticleKind, color: string | undefined, count: number | undefined) {
    if (!this.textures.exists(PARTICLE_TEX_KEY)) this.ensureParticleTexture();
    const w = this.worldW,
      h = this.worldH;
    const tint = color ? Phaser.Display.Color.HexStringToColor(color).color : 0xffffff;
    const qty = Math.max(4, Math.min(200, count ?? 40));

    const cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = (() => {
      switch (kind) {
        case "snow":
          return {
            x: { min: 0, max: w },
            y: -20,
            lifespan: 8000,
            speedY: { min: 30, max: 70 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.6, end: 0.4 },
            alpha: { start: 0.9, end: 0.5 },
            quantity: 1,
            frequency: 4000 / qty,
            tint,
          };
        case "rain":
          return {
            x: { min: 0, max: w },
            y: -20,
            lifespan: 1800,
            speedY: { min: 400, max: 700 },
            speedX: { min: -40, max: -10 },
            scaleX: 0.4,
            scaleY: 1.8,
            alpha: { start: 0.8, end: 0.2 },
            quantity: 2,
            frequency: 1500 / qty,
            tint,
          };
        case "leaves":
          return {
            x: { min: 0, max: w },
            y: -20,
            lifespan: 7000,
            speedY: { min: 40, max: 90 },
            speedX: { min: -60, max: 60 },
            rotate: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0.6 },
            alpha: { start: 1, end: 0.7 },
            quantity: 1,
            frequency: 5000 / qty,
            tint,
          };
        case "embers":
          return {
            x: { min: 0, max: w },
            y: h + 20,
            lifespan: 4500,
            speedY: { min: -120, max: -40 },
            speedX: { min: -25, max: 25 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: Phaser.BlendModes.ADD,
            quantity: 1,
            frequency: 3500 / qty,
            tint,
          };
        case "meteor":
          return {
            x: { min: 0, max: w },
            y: -50,
            lifespan: 1400,
            speedY: { min: 700, max: 1100 },
            speedX: { min: -300, max: -150 },
            scaleX: 0.6,
            scaleY: 3,
            alpha: { start: 1, end: 0 },
            blendMode: Phaser.BlendModes.ADD,
            quantity: 1,
            frequency: 9000 / qty,
            tint,
          };
        case "nectar":
          return {
            x: { min: 0, max: w },
            y: -20,
            lifespan: 6000,
            speedY: { min: 60, max: 130 },
            speedX: { min: -10, max: 10 },
            scale: { start: 0.7, end: 0.5 },
            alpha: { start: 0.95, end: 0.6 },
            blendMode: Phaser.BlendModes.ADD,
            quantity: 1,
            frequency: 4000 / qty,
            tint,
          };
        case "sparkle":
        default:
          return {
            x: { min: 0, max: w },
            y: { min: 0, max: h },
            lifespan: 1600,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: Phaser.BlendModes.ADD,
            quantity: 1,
            frequency: 200,
            tint,
          };
      }
    })();

    const em = this.add.particles(0, 0, PARTICLE_TEX_KEY, cfg);
    em.setDepth(40);
    return em;
  }
}
