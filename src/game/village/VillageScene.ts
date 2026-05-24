import Phaser from "phaser";
import type { BaseBuilding } from "@/lib/base";
import type { VillageGameState, PlacementInfo, PikminLayerConfig } from "./VillageTypes";
import type { DioramaSlot } from "@/hooks/useActiveDiorama";

const BUILD_TEX_PREFIX = "bld:";
const DIORAMA_TEX_PREFIX = "diorama:";
const PIKMIN_TEX_PREFIX = "pkm:";

interface BuildingSprite {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  art: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  data: BaseBuilding;
}

interface PikminAgent {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Ellipse;
  speciesKey: string;
  x: number; y: number;
  tx: number; ty: number;
  speed: number;
  state: "walk" | "idle" | "run";
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
  private layerFx!: Phaser.GameObjects.Container;
  private layerPlacement!: Phaser.GameObjects.Container;

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

  constructor() { super("village"); }

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
      duration: 350, ease: "Sine.Out",
    });
  }

  public focusBuilding(id: string) {
    const sp = this.buildingSprites.get(id);
    if (!sp) return;
    const cam = this.cameras.main;
    const z = Math.max(cam.zoom, 1.0);
    this.tweens.add({
      targets: cam, zoom: z,
      scrollX: sp.container.x - cam.width / 2 / z,
      scrollY: sp.container.y - cam.height / 2 / z,
      duration: 400, ease: "Sine.Out",
    });
  }

  // ───────── lifecycle ─────────

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x0a0f0a);

    this.layerBg        = this.add.container(0, 0).setDepth(0);
    this.layerSlots     = this.add.container(0, 0).setDepth(2);
    this.layerBuildings = this.add.container(0, 0).setDepth(3);
    this.layerPikmin    = this.add.container(0, 0).setDepth(10);
    this.layerFx        = this.add.container(0, 0).setDepth(50);
    this.layerPlacement = this.add.container(0, 0).setDepth(99);

    this.setupInput();
    this.scale.on("resize", () => this.refitOnResize());
  }

  update(_time: number, delta: number) {
    this.tickPikmin(delta);
  }

  // ───────── diorama loading ─────────

  private loadDiorama(url: string, w: number, h: number) {
    this.currentDioramaUrl = url;
    this.worldW = w;
    this.worldH = h;
    const key = DIORAMA_TEX_PREFIX + url;

    const apply = () => {
      if (this.bgImage) { this.bgImage.destroy(); this.bgImage = null; }
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

    if (this.textures.exists(key)) { apply(); return; }
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
  }

  // ───────── slots ─────────

  private rebuildSlotLayer() {
    if (!this.state) return;
    this.slotMarkers.forEach((c) => c.destroy());
    this.slotMarkers.clear();
    this.layerSlots.removeAll(true);

    const inBuildMode = !!this.state.placement;
    if (!inBuildMode) return;

    const placement = this.state.placement!;
    const usedSlotKeys = new Set<string>();
    // mark slots already occupied (best-effort by proximity)
    for (const b of this.state.buildings) {
      const slot = this.findNearestSlot(
        (b.position_x / 100) * this.worldW,
        (b.position_y / 100) * this.worldH,
      );
      if (slot) usedSlotKeys.add(slot.slot_key);
    }

    for (const slot of this.state.slots) {
      const compatible = slot.allowed_categories.length === 0
        || !placement.category
        || slot.allowed_categories.includes(placement.category);
      const occupied = usedSlotKeys.has(slot.slot_key);
      this.createSlotMarker(slot, compatible && !occupied);
    }
  }

  private createSlotMarker(slot: DioramaSlot, available: boolean) {
    const radius = slot.size === "large" ? 64 : slot.size === "medium" ? 50 : 38;
    const color = available ? 0x6ee7a8 : 0x9ca3af;
    const ring = this.add.circle(0, 0, radius, color, 0);
    ring.setStrokeStyle(4, color, 0.95);
    const fill = this.add.circle(0, 0, radius - 8, color, available ? 0.25 : 0.1);
    const pulse = this.add.circle(0, 0, radius, color, 0.18);

    const c = this.add.container(slot.x, slot.y, [pulse, fill, ring]);
    c.setSize(radius * 2, radius * 2);
    c.setDepth(slot.y);

    if (available) {
      c.setInteractive(
        new Phaser.Geom.Circle(0, 0, radius),
        Phaser.Geom.Circle.Contains,
      );
      c.on("pointerup", (p: Phaser.Input.Pointer) => {
        if (this.dragMoved) return;
        if (p.event && (p.event as any).stopPropagation) (p.event as any).stopPropagation();
        this.events.emit("placePosition", {
          x: (slot.x / this.worldW) * 100,
          y: (slot.y / this.worldH) * 100,
          slotKey: slot.slot_key,
        });
      });

      this.tweens.add({
        targets: pulse, scale: { from: 0.9, to: 1.2 }, alpha: { from: 0.4, to: 0 },
        duration: 1400, repeat: -1, ease: "Sine.Out",
      });
    }

    this.layerSlots.add(c);
    this.slotMarkers.set(slot.slot_key, c);
  }

  private findNearestSlot(wx: number, wy: number, maxDist = 80): DioramaSlot | null {
    if (!this.state) return null;
    let best: DioramaSlot | null = null;
    let bd = Infinity;
    for (const s of this.state.slots) {
      const d = Math.hypot(s.x - wx, s.y - wy);
      if (d < bd) { bd = d; best = s; }
    }
    return bd <= maxDist ? best : null;
  }

  // ───────── buildings ─────────

  private ensureBuildingTextures() {
    if (!this.state) return;
    for (const [type, url] of Object.entries(this.state.buildingImageByType)) {
      const key = BUILD_TEX_PREFIX + type;
      if (!url || this.textures.exists(key)) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!this.textures.exists(key)) this.textures.addImage(key, img);
        // refresh sprites of this type
        for (const sp of this.buildingSprites.values()) {
          if (sp.data.type === type && sp.art instanceof Phaser.GameObjects.Text) {
            this.refreshBuildingSprite(sp);
          }
        }
      };
      img.src = url;
    }
  }

  private diffBuildings() {
    if (!this.state) return;
    const liveIds = new Set(this.state.buildings.map((b) => b.id));
    for (const [id, sp] of this.buildingSprites) {
      if (!liveIds.has(id)) { sp.container.destroy(); this.buildingSprites.delete(id); }
    }
    for (const b of this.state.buildings) {
      const existing = this.buildingSprites.get(b.id);
      if (!existing) this.createBuildingSprite(b);
      else this.updateBuildingSprite(existing, b);
    }
  }

  private worldPosForBuilding(b: BaseBuilding) {
    return { x: (b.position_x / 100) * this.worldW, y: (b.position_y / 100) * this.worldH };
  }

  private createBuildingSprite(b: BaseBuilding) {
    if (!this.state) return;
    const pos = this.worldPosForBuilding(b);
    const shadow = this.add.ellipse(0, 30, 80, 22, 0x000000, 0.35);
    const key = BUILD_TEX_PREFIX + b.type;
    const hasTexture = this.textures.exists(key);
    const art: Phaser.GameObjects.Image | Phaser.GameObjects.Text = hasTexture
      ? this.add.image(0, 0, key).setOrigin(0.5, 0.85)
      : this.add.text(0, 0, this.state.buildingEmojiByType[b.type] ?? "🏠",
          { fontSize: "72px" }).setOrigin(0.5, 0.85);
    if (art instanceof Phaser.GameObjects.Image) {
      const targetH = 130;
      const s = targetH / (art.height || 130);
      art.setScale(s);
    }
    const container = this.add.container(pos.x, pos.y, [shadow, art]);
    container.setSize(120, 130);
    container.setDepth(pos.y);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-60, -130, 120, 160),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerup", () => {
      if (this.dragMoved) return;
      this.events.emit("selectBuilding", b.id);
    });
    this.layerBuildings.add(container);

    // bobbing leggero
    this.tweens.add({
      targets: art, y: { from: 0, to: -4 },
      duration: 1800 + Math.random() * 600,
      yoyo: true, repeat: -1, ease: "Sine.InOut",
    });

    this.buildingSprites.set(b.id, { container, shadow, art, data: b });
  }

  private updateBuildingSprite(sp: BuildingSprite, b: BaseBuilding) {
    sp.data = b;
    const pos = this.worldPosForBuilding(b);
    sp.container.x = pos.x; sp.container.y = pos.y;
    sp.container.setDepth(pos.y);
  }

  private refreshBuildingSprite(sp: BuildingSprite) {
    sp.container.destroy();
    this.buildingSprites.delete(sp.data.id);
    this.createBuildingSprite(sp.data);
  }

  // ───────── placement ghost ─────────

  private updatePlacementGhost() {
    this.layerPlacement.removeAll(true);
    this.placementGhost = null;
    if (!this.state?.placement) return;
    const p = this.state.placement;
    const key = BUILD_TEX_PREFIX + p.key;
    const art = this.textures.exists(key)
      ? this.add.image(0, 0, key).setOrigin(0.5, 0.85).setAlpha(0.7)
      : this.add.text(0, 0, p.emoji, { fontSize: "72px" }).setOrigin(0.5, 0.85).setAlpha(0.7);
    if (art instanceof Phaser.GameObjects.Image) {
      const s = 130 / (art.height || 130);
      art.setScale(s);
    }
    const c = this.add.container(-9999, -9999, [art]);
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
          input.pointer1.x, input.pointer1.y,
          input.pointer2.x, input.pointer2.y,
        );
        this.isPanning = false;
        return;
      }
      this.isPanning = true;
      this.panStart = { x: p.x, y: p.y, scrollX: cam.scrollX, scrollY: cam.scrollY };
    });

    input.on("pointermove", (p: Phaser.Input.Pointer) => {
      // pinch
      if (input.pointer1?.isDown && input.pointer2?.isDown) {
        const d = Phaser.Math.Distance.Between(
          input.pointer1.x, input.pointer1.y,
          input.pointer2.x, input.pointer2.y,
        );
        if (this.pinchPrevDist > 0) {
          const factor = d / this.pinchPrevDist;
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom));
        }
        this.pinchPrevDist = d;
        this.dragMoved = true;
        return;
      }
      // ghost follow
      if (this.placementGhost && this.state?.placement) {
        const w = cam.getWorldPoint(p.x, p.y);
        this.placementGhost.x = w.x;
        this.placementGhost.y = w.y;
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
      // tap su terreno (no drag, no slot)
      if (!wasDrag && this.state) {
        const w = cam.getWorldPoint(p.x, p.y);
        // se in modalità placement e clicca su slot → gestito già da slot marker
        if (this.state.placement) {
          // tap libero su terreno = tenta piazzamento nello slot più vicino
          const slot = this.findNearestSlot(w.x, w.y, 120);
          if (slot) {
            this.events.emit("placePosition", {
              x: (slot.x / this.worldW) * 100,
              y: (slot.y / this.worldH) * 100,
              slotKey: slot.slot_key,
            });
          }
        } else {
          this.events.emit("tapGround");
        }
      }
    });

    input.on("wheel", (_p: any, _o: any, _dx: number, dy: number) => {
      const factor = dy > 0 ? 0.9 : 1.1;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom));
    });
  }
}
