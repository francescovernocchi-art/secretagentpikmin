import Phaser from "phaser";
import type { BaseBuilding } from "@/lib/base";
import type { BiomeKey } from "@/lib/village/biomes";
import type { PikminSpeciesRow } from "@/hooks/usePikminSpecies";
import {
  WORLD_W, WORLD_H, BIOME_COLORS,
  pctToWorld, worldToPct, isInBuildableArea,
  type VillageGameState, type PlacementInfo,
} from "./VillageTypes";

/** PRNG deterministico (mulberry32) per scena stabile cross-reload. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

interface BuildingSprite {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  art: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  progress?: Phaser.GameObjects.Graphics;
  data: BaseBuilding;
}

interface PikminSprite {
  art: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  vx: number;
  vy: number;
  speciesKey: string;
}

const EMOJI_TEXTURE_PREFIX = "emoji:";
const BUILD_TEXTURE_PREFIX = "bld:";
const PIK_TEXTURE_PREFIX = "pik:";

export class VillageScene extends Phaser.Scene {
  private state: VillageGameState | null = null;

  // layers
  private layerTerrain!: Phaser.GameObjects.Container;
  private layerDecor!: Phaser.GameObjects.Container;
  private layerShadows!: Phaser.GameObjects.Container;
  private layerBuildings!: Phaser.GameObjects.Container;
  private layerPikmin!: Phaser.GameObjects.Container;
  private layerEffects!: Phaser.GameObjects.Container;
  private layerPlacement!: Phaser.GameObjects.Container;

  private buildingSprites = new Map<string, BuildingSprite>();
  private pikminSprites: PikminSprite[] = [];

  // placement
  private placementGhost: Phaser.GameObjects.Container | null = null;
  private placementValid = false;

  // input pan/zoom
  private isPanning = false;
  private pinchPrevDist = 0;

  constructor() { super("village"); }

  /** API esterna chiamata dal canvas React quando lo stato cambia. */
  public applyState(next: VillageGameState) {
    const prev = this.state;
    this.state = next;
    if (!prev || prev.biome !== next.biome || prev.seed !== next.seed) {
      this.rebuildTerrain();
    }
    this.ensureBuildingTextures();
    this.ensurePikminTextures();
    this.diffBuildings();
    this.rebuildPikminPool();
    this.updatePlacementMode();
  }

  create() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setBackgroundColor(0x0a0f0a);

    this.layerTerrain = this.add.container(0, 0).setDepth(0);
    this.layerDecor = this.add.container(0, 0).setDepth(1);
    this.layerShadows = this.add.container(0, 0).setDepth(2);
    this.layerBuildings = this.add.container(0, 0).setDepth(3);
    this.layerPikmin = this.add.container(0, 0).setDepth(4);
    this.layerEffects = this.add.container(0, 0).setDepth(5);
    this.layerPlacement = this.add.container(0, 0).setDepth(6);

    this.setupInput();
    this.fitCamera();

    this.scale.on("resize", () => this.fitCamera());

    // tick AI pikmin
    this.events.on(Phaser.Scenes.Events.UPDATE, this.tickPikmin, this);

    if (this.state) {
      this.rebuildTerrain();
      this.ensureBuildingTextures();
      this.ensurePikminTextures();
      this.diffBuildings();
      this.rebuildPikminPool();
    }
  }

  private fitCamera() {
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;
    const minZoomX = w / WORLD_W;
    const minZoomY = h / WORLD_H;
    const minZoom = Math.max(minZoomX, minZoomY) * 1.05; // un filo oltre, nessun bordo
    cam.setZoom(Math.max(cam.zoom || minZoom, minZoom));
    (cam as any).__minZoom = minZoom;
    cam.centerOn(WORLD_W / 2, WORLD_H / 2);
  }

  private setupInput() {
    const cam = this.cameras.main;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.isPanning = false;
      (p as any).__startX = p.x; (p as any).__startY = p.y;
      (p as any).__startCamX = cam.scrollX; (p as any).__startCamY = cam.scrollY;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const pointers = this.input.manager.pointers.filter((pp: any) => pp.isDown);
      if (pointers.length >= 2) {
        // pinch
        const [a, b] = pointers;
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.pinchPrevDist > 0) {
          const minZoom = (cam as any).__minZoom ?? 0.4;
          const factor = dist / this.pinchPrevDist;
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, minZoom, 2));
        }
        this.pinchPrevDist = dist;
        return;
      }
      this.pinchPrevDist = 0;
      const dx = p.x - ((p as any).__startX ?? p.x);
      const dy = p.y - ((p as any).__startY ?? p.y);
      if (Math.abs(dx) + Math.abs(dy) > 6) this.isPanning = true;
      if (this.isPanning) {
        cam.scrollX = ((p as any).__startCamX ?? 0) - dx / cam.zoom;
        cam.scrollY = ((p as any).__startCamY ?? 0) - dy / cam.zoom;
      }
      if (this.state?.placement) this.moveGhost(p);
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      this.pinchPrevDist = 0;
      if (this.isPanning) return;
      // tap
      const world = cam.getWorldPoint(p.x, p.y);
      if (this.state?.placement) {
        if (this.placementValid) {
          const pct = worldToPct(world.x, world.y);
          this.events.emit("placePosition", { x: pct.x, y: pct.y });
        }
        return;
      }
      // hit test building
      const hit = this.findBuildingAt(world.x, world.y);
      if (hit) {
        this.events.emit("selectBuilding", hit.data.id);
      } else {
        this.events.emit("tapGround");
      }
    });

    // wheel zoom
    this.input.on("wheel", (_p: any, _o: any, _dx: number, dy: number) => {
      const minZoom = (cam as any).__minZoom ?? 0.4;
      const factor = dy > 0 ? 0.9 : 1.1;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, minZoom, 2));
    });
  }

  // ─────────── TERRENO ───────────
  private rebuildTerrain() {
    this.layerTerrain.removeAll(true);
    this.layerDecor.removeAll(true);
    if (!this.state) return;
    const palette = BIOME_COLORS[this.state.biome];

    // background pieno
    const bg = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, palette.ground);
    this.layerTerrain.add(bg);

    // macchie ondulate di "erba" più chiara
    const rnd = mulberry32(hash(this.state.seed + ":terrain"));
    const patchCount = 60;
    for (let i = 0; i < patchCount; i++) {
      const x = rnd() * WORLD_W;
      const y = rnd() * WORLD_H;
      const rx = 120 + rnd() * 180;
      const ry = 80 + rnd() * 140;
      const e = this.add.ellipse(x, y, rx * 2, ry * 2, palette.grass, 0.55);
      this.layerTerrain.add(e);
    }

    // decorazioni (fiori, sassi, ciuffi)
    const decoCount = 420;
    for (let i = 0; i < decoCount; i++) {
      const x = rnd() * WORLD_W;
      const y = rnd() * WORLD_H;
      const v = rnd();
      if (v < 0.5) {
        // ciuffo erba (mini ellisse scura)
        const e = this.add.ellipse(x, y, 8, 4, 0x254a2a, 0.7);
        this.layerDecor.add(e);
      } else if (v < 0.85) {
        // fiore
        const c = this.add.circle(x, y, 3, palette.flower);
        this.layerDecor.add(c);
        const core = this.add.circle(x, y, 1.2, 0xfff7d6);
        this.layerDecor.add(core);
      } else {
        // sasso
        const r = this.add.ellipse(x, y, 6, 4, palette.rock, 0.7);
        this.layerDecor.add(r);
      }
    }

    // anello esterno di "alberi/rocce" per nascondere bordi
    const ringCount = 140;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2 + rnd() * 0.3;
      const radius = Math.min(WORLD_W, WORLD_H) * (0.46 + rnd() * 0.08);
      const x = WORLD_W / 2 + Math.cos(angle) * radius * 1.15;
      const y = WORLD_H / 2 + Math.sin(angle) * radius * 0.85;
      const size = 24 + rnd() * 30;
      const t = this.add.ellipse(x, y, size, size * 0.9, palette.rock, 0.95);
      this.layerDecor.add(t);
      const top = this.add.circle(x, y - size * 0.35, size * 0.5, palette.grass, 0.95);
      this.layerDecor.add(top);
    }

    // fog radiale (vignette) — overlay nero con foro centrale
    const fog = this.add.graphics();
    fog.setBlendMode(Phaser.BlendModes.MULTIPLY);
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    const maxR = Math.max(WORLD_W, WORLD_H) * 0.7;
    const steps = 18;
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      const alpha = (1 - t) * 0.55;
      const color = Phaser.Display.Color.IntegerToColor(palette.fog);
      fog.fillStyle(Phaser.Display.Color.GetColor(color.red, color.green, color.blue), alpha);
      fog.fillCircle(cx, cy, maxR * t);
    }
    // overlay scuro bordi
    fog.fillStyle(palette.fog, 0.65);
    fog.fillRect(0, 0, WORLD_W, WORLD_H);
    fog.fillStyle(0x000000, 0);
    this.layerEffects.add(fog);
  }

  // ─────────── TEXTURES BUILDINGS ───────────
  private ensureBuildingTextures() {
    if (!this.state) return;
    const { buildingImageByType, buildingEmojiByType, buildings } = this.state;
    for (const b of buildings) {
      const url = buildingImageByType[b.type] ?? null;
      const key = url ? `${BUILD_TEXTURE_PREFIX}${b.type}:${url}` : `${EMOJI_TEXTURE_PREFIX}${buildingEmojiByType[b.type] ?? "🏠"}`;
      if (url && !this.textures.exists(key)) this.loadImage(key, url);
      if (!url) this.ensureEmojiTexture(buildingEmojiByType[b.type] ?? "🏠");
    }
  }

  private ensurePikminTextures() {
    if (!this.state) return;
    for (const sp of this.state.pikminSpecies) {
      const url = sp.sprite_idle_url || sp.image_url || sp.icon_url || null;
      if (url) {
        const key = `${PIK_TEXTURE_PREFIX}${sp.key}:${url}`;
        if (!this.textures.exists(key)) this.loadImage(key, url);
      } else {
        this.ensureEmojiTexture(this.pikminEmojiFor(sp));
      }
    }
  }

  private loadImage(key: string, url: string) {
    this.load.image(key, url);
    if (!this.load.isLoading()) this.load.start();
  }

  private ensureEmojiTexture(emoji: string) {
    const key = `${EMOJI_TEXTURE_PREFIX}${emoji}`;
    if (this.textures.exists(key)) return key;
    const size = 96;
    const c = this.textures.createCanvas(key, size, size);
    if (!c) return key;
    const ctx = c.getContext();
    ctx.clearRect(0, 0, size, size);
    ctx.font = "72px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, size / 2, size / 2 + 4);
    c.refresh();
    return key;
  }

  private pikminEmojiFor(sp: PikminSpeciesRow): string {
    const map: Record<string, string> = {
      red: "🔴", blue: "🔵", yellow: "🟡", purple: "🟣", white: "⚪", rock: "⚫",
    };
    return map[sp.key] ?? "🌱";
  }

  // ─────────── BUILDINGS DIFF ───────────
  private diffBuildings() {
    if (!this.state) return;
    const visible = this.state.buildings.filter(
      (b) => b.status === "idle" || b.status === "building" || b.status === "upgrading",
    );
    const seen = new Set<string>();
    for (const b of visible) {
      seen.add(b.id);
      const ex = this.buildingSprites.get(b.id);
      if (ex) {
        this.updateBuildingSprite(ex, b);
      } else {
        this.spawnBuildingSprite(b);
      }
    }
    // remove
    for (const [id, sp] of this.buildingSprites) {
      if (!seen.has(id)) {
        sp.container.destroy(true);
        this.buildingSprites.delete(id);
      }
    }
  }

  private buildingTextureKey(b: BaseBuilding): string {
    const url = this.state?.buildingImageByType[b.type] ?? null;
    if (url) return `${BUILD_TEXTURE_PREFIX}${b.type}:${url}`;
    return `${EMOJI_TEXTURE_PREFIX}${this.state?.buildingEmojiByType[b.type] ?? "🏠"}`;
  }

  private spawnBuildingSprite(b: BaseBuilding) {
    const { x, y } = pctToWorld(b.position_x, b.position_y);
    const container = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 38, 110, 28, 0x000000, 0.35);
    const tex = this.buildingTextureKey(b);
    let art: Phaser.GameObjects.Image;
    const baseSize = 120;
    if (this.textures.exists(tex)) {
      art = this.add.image(0, 0, tex);
    } else {
      // attendi carico async
      art = this.add.image(0, 0, tex);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (art && art.active) art.setTexture(tex);
      });
    }
    art.setDisplaySize(baseSize, baseSize);
    art.setOrigin(0.5, 0.8);
    container.add([shadow, art]);
    container.setDepth(y); // 2.5D
    this.layerBuildings.add(container);
    const sp: BuildingSprite = { container, shadow, art, data: b };
    if (b.status !== "idle") this.attachProgress(sp);
    this.buildingSprites.set(b.id, sp);
  }

  private updateBuildingSprite(sp: BuildingSprite, b: BaseBuilding) {
    const { x, y } = pctToWorld(b.position_x, b.position_y);
    sp.container.setPosition(x, y);
    sp.container.setDepth(y);
    const tex = this.buildingTextureKey(b);
    if (this.textures.exists(tex) && (sp.art as Phaser.GameObjects.Image).texture?.key !== tex) {
      (sp.art as Phaser.GameObjects.Image).setTexture(tex);
    }
    if (b.status !== "idle") {
      if (!sp.progress) this.attachProgress(sp);
      this.updateProgress(sp, b);
    } else if (sp.progress) {
      sp.progress.destroy(); sp.progress = undefined;
    }
    sp.data = b;
  }

  private attachProgress(sp: BuildingSprite) {
    const g = this.add.graphics();
    sp.container.add(g);
    sp.progress = g;
    this.updateProgress(sp, sp.data);
  }

  private updateProgress(sp: BuildingSprite, b: BaseBuilding) {
    if (!sp.progress) return;
    const total = b.build_end_at && b.started_at
      ? Math.max(1, new Date(b.build_end_at).getTime() - new Date(b.started_at).getTime()) : 1;
    const elapsed = b.started_at ? Date.now() - new Date(b.started_at).getTime() : 0;
    const pct = Phaser.Math.Clamp(elapsed / total, 0, 1);
    sp.progress.clear();
    sp.progress.fillStyle(0x000000, 0.6);
    sp.progress.fillRoundedRect(-50, -90, 100, 8, 4);
    sp.progress.fillStyle(0xfacc15, 1);
    sp.progress.fillRoundedRect(-50, -90, 100 * pct, 8, 4);
  }

  private findBuildingAt(x: number, y: number): BuildingSprite | null {
    let hit: BuildingSprite | null = null;
    let bestDepth = -Infinity;
    for (const sp of this.buildingSprites.values()) {
      const dx = x - sp.container.x;
      const dy = y - sp.container.y;
      if (Math.abs(dx) < 60 && dy > -100 && dy < 50 && sp.container.depth > bestDepth) {
        hit = sp; bestDepth = sp.container.depth;
      }
    }
    return hit;
  }

  // ─────────── PIKMIN ───────────
  private rebuildPikminPool() {
    if (!this.state) return;
    // semplice: ricrea solo se cambia il totale o le specie
    const targetTotal = Math.min(
      this.state.pikminMaxVisible,
      Object.values(this.state.pikminBreakdown).reduce((a, b) => a + b, 0),
    );
    if (this.pikminSprites.length === targetTotal && this.pikminSprites.every((p) => this.state!.pikminBreakdown[p.speciesKey] > 0)) {
      return;
    }
    for (const p of this.pikminSprites) { p.art.destroy(); p.shadow.destroy(); }
    this.pikminSprites = [];

    if (targetTotal === 0) return;

    const owned = this.state.pikminSpecies.filter((s) => (this.state!.pikminBreakdown[s.key] ?? 0) > 0);
    if (owned.length === 0) return;
    const totalOwned = owned.reduce((a, s) => a + (this.state!.pikminBreakdown[s.key] ?? 0), 0);

    const rnd = mulberry32(hash((this.state.seed ?? "x") + ":pik"));
    for (const sp of owned) {
      const n = Math.max(1, Math.round((this.state.pikminBreakdown[sp.key] / totalOwned) * targetTotal));
      const url = sp.sprite_idle_url || sp.image_url || sp.icon_url || null;
      const tex = url ? `${PIK_TEXTURE_PREFIX}${sp.key}:${url}` : `${EMOJI_TEXTURE_PREFIX}${this.pikminEmojiFor(sp)}`;
      for (let i = 0; i < n; i++) {
        const x = WORLD_W * 0.3 + rnd() * WORLD_W * 0.4;
        const y = WORLD_H * 0.3 + rnd() * WORLD_H * 0.4;
        const shadow = this.add.ellipse(x, y + 12, 22, 8, 0x000000, 0.35);
        const art = this.add.image(x, y, this.textures.exists(tex) ? tex : `${EMOJI_TEXTURE_PREFIX}${this.pikminEmojiFor(sp)}`);
        art.setDisplaySize(32, 32);
        art.setOrigin(0.5, 0.85);
        this.layerPikmin.add(shadow); this.layerPikmin.add(art);
        if (!this.textures.exists(tex) && url) {
          this.load.once(Phaser.Loader.Events.COMPLETE, () => {
            if (art && art.active && this.textures.exists(tex)) art.setTexture(tex);
          });
        }
        const angle = rnd() * Math.PI * 2;
        const speed = 18 + rnd() * 14;
        this.pikminSprites.push({
          art, shadow,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          speciesKey: sp.key,
        });
      }
      if (this.pikminSprites.length >= targetTotal) break;
    }
  }

  private tickPikmin(_t: number, dt: number) {
    if (this.pikminSprites.length === 0) return;
    const sec = dt / 1000;
    const padX = WORLD_W * 0.15, padY = WORLD_H * 0.15;
    for (const p of this.pikminSprites) {
      // occasionale cambio direzione
      if (Math.random() < 0.005) {
        const a = Math.random() * Math.PI * 2;
        const s = 14 + Math.random() * 20;
        p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      }
      p.art.x += p.vx * sec; p.art.y += p.vy * sec;
      if (p.art.x < padX || p.art.x > WORLD_W - padX) p.vx *= -1;
      if (p.art.y < padY || p.art.y > WORLD_H - padY) p.vy *= -1;
      p.art.flipX = p.vx < 0;
      p.shadow.x = p.art.x; p.shadow.y = p.art.y + 12;
      // squash
      const s = 1 + Math.sin((p.art.x + p.art.y) * 0.05 + this.time.now * 0.01) * 0.05;
      p.art.scaleY = (p.art.scaleX = 1) * s * (32 / Math.max(1, p.art.width));
      p.art.scaleX = 32 / Math.max(1, p.art.width);
      // depth = y per 2.5D
      p.art.depth = p.art.y + 0.5;
    }
  }

  // ─────────── PLACEMENT ───────────
  private updatePlacementMode() {
    if (!this.state) return;
    if (this.state.placement) {
      if (!this.placementGhost) this.createGhost(this.state.placement);
    } else {
      if (this.placementGhost) { this.placementGhost.destroy(true); this.placementGhost = null; }
    }
  }

  private createGhost(p: PlacementInfo) {
    const container = this.add.container(WORLD_W / 2, WORLD_H / 2);
    const ring = this.add.circle(0, 18, 64, 0x22c55e, 0.25);
    ring.setStrokeStyle(3, 0x22c55e, 0.9);
    const url = p.imageUrl ?? null;
    const tex = url ? `${BUILD_TEXTURE_PREFIX}${p.key}:${url}` : `${EMOJI_TEXTURE_PREFIX}${p.emoji}`;
    if (url && !this.textures.exists(tex)) this.loadImage(tex, url);
    if (!url) this.ensureEmojiTexture(p.emoji);
    const art = this.add.image(0, 0, this.textures.exists(tex) ? tex : `${EMOJI_TEXTURE_PREFIX}${p.emoji}`);
    art.setDisplaySize(120, 120);
    art.setOrigin(0.5, 0.8);
    art.setAlpha(0.75);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (art && art.active && this.textures.exists(tex)) art.setTexture(tex);
    });
    container.add([ring, art]);
    container.setDepth(99999);
    this.layerPlacement.add(container);
    this.placementGhost = container;
  }

  private moveGhost(p: Phaser.Input.Pointer) {
    if (!this.placementGhost) return;
    const cam = this.cameras.main;
    const w = cam.getWorldPoint(p.x, p.y);
    this.placementGhost.setPosition(w.x, w.y);
    const valid = isInBuildableArea(w.x, w.y) && !this.overlapsBuilding(w.x, w.y);
    this.placementValid = valid;
    const ring = this.placementGhost.list[0] as Phaser.GameObjects.Arc;
    ring.fillColor = valid ? 0x22c55e : 0xef4444;
    ring.setStrokeStyle(3, valid ? 0x22c55e : 0xef4444, 0.9);
  }

  private overlapsBuilding(x: number, y: number): boolean {
    for (const sp of this.buildingSprites.values()) {
      const dx = sp.container.x - x;
      const dy = sp.container.y - y;
      if (dx * dx + dy * dy < 100 * 100) return true;
    }
    return false;
  }
}
