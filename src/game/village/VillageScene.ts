import Phaser from "phaser";
import type { BaseBuilding } from "@/lib/base";
import type { PikminSpeciesRow } from "@/hooks/usePikminSpecies";
import {
  WORLD_W, WORLD_H, BIOME_COLORS,
  pctToWorld, worldToPct, isInBuildableArea,
  type VillageGameState, type PlacementInfo,
} from "./VillageTypes";

/** PRNG deterministico (mulberry32). */
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
  art: Phaser.GameObjects.Image;
  progress?: Phaser.GameObjects.Graphics;
  data: BaseBuilding;
}

interface PikminSprite {
  art: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  vx: number;
  vy: number;
  speciesKey: string;
  bob: number;
}

const EMOJI_TEXTURE_PREFIX = "emoji:";
const BUILD_TEXTURE_PREFIX = "bld:";
const PIK_TEXTURE_PREFIX = "pik:";

/** Oggetti quotidiani giganti, per dare identità al mondo. */
const GIANT_PROPS = ["🥫", "🍾", "🧴", "🔩", "🔧", "🪤", "🔥", "☕", "🪙", "🧴", "📎", "🪫"];

export class VillageScene extends Phaser.Scene {
  private state: VillageGameState | null = null;

  // layers
  private layerTerrain!: Phaser.GameObjects.Container;       // base + blobs
  private layerPaths!: Phaser.GameObjects.Container;         // sentieri
  private layerDecor!: Phaser.GameObjects.Container;         // grass/flowers/pebbles (flat)
  private layerVeg!: Phaser.GameObjects.Container;           // alberi/cespugli (depth=y)
  private layerProps!: Phaser.GameObjects.Container;         // oggetti giganti (depth=y)
  private layerBuildings!: Phaser.GameObjects.Container;     // edifici (depth=y)
  private layerPikmin!: Phaser.GameObjects.Container;        // pikmin (depth=y)
  private layerEffects!: Phaser.GameObjects.Container;       // fog/particelle
  private layerPlacement!: Phaser.GameObjects.Container;     // ghost build

  private buildingSprites = new Map<string, BuildingSprite>();
  private pikminSprites: PikminSprite[] = [];

  private placementGhost: Phaser.GameObjects.Container | null = null;
  private placementValid = false;

  private isPanning = false;
  private pinchPrevDist = 0;

  constructor() { super("village"); }

  public applyState(next: VillageGameState) {
    const prev = this.state;
    this.state = next;
    if (!prev || prev.biome !== next.biome || prev.seed !== next.seed) {
      this.rebuildWorld();
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
    cam.setBackgroundColor(0x86b377);

    this.layerTerrain   = this.add.container(0, 0).setDepth(0);
    this.layerPaths     = this.add.container(0, 0).setDepth(1);
    this.layerDecor     = this.add.container(0, 0).setDepth(2);
    this.layerVeg       = this.add.container(0, 0).setDepth(3);
    this.layerProps     = this.add.container(0, 0).setDepth(3);
    this.layerBuildings = this.add.container(0, 0).setDepth(3);
    this.layerPikmin    = this.add.container(0, 0).setDepth(3);
    this.layerEffects   = this.add.container(0, 0).setDepth(50);
    this.layerPlacement = this.add.container(0, 0).setDepth(99);

    this.setupInput();
    this.fitCamera(true);
    this.scale.on("resize", () => this.fitCamera(false));

    this.events.on(Phaser.Scenes.Events.UPDATE, this.tickPikmin, this);

    if (this.state) {
      this.rebuildWorld();
      this.ensureBuildingTextures();
      this.ensurePikminTextures();
      this.diffBuildings();
      this.rebuildPikminPool();
    }
  }

  /** Centro logico = Campo Base (centro mappa). */
  private campCenter() { return { x: WORLD_W / 2, y: WORLD_H / 2 }; }

  private fitCamera(recenter: boolean) {
    const cam = this.cameras.main;
    const w = this.scale.width, h = this.scale.height;
    const fillZoom = Math.max(w / WORLD_W, h / WORLD_H) * 1.02;
    const startZoom = Math.min(2.0, Math.max(fillZoom * 1.9, fillZoom));
    (cam as any).__minZoom = fillZoom;
    (cam as any).__maxZoom = 2.6;
    if (recenter || !cam.zoom) cam.setZoom(startZoom);
    else cam.setZoom(Phaser.Math.Clamp(cam.zoom, fillZoom, 2.6));
    const c = this.campCenter();
    if (recenter) cam.centerOn(c.x, c.y);
  }

  /** API esposta a React per i pulsanti +/-/centra. */
  public cameraZoomBy(factor: number) {
    const cam = this.cameras.main;
    const mn = (cam as any).__minZoom ?? 0.4;
    const mx = (cam as any).__maxZoom ?? 2.6;
    this.tweens.add({ targets: cam, zoom: Phaser.Math.Clamp(cam.zoom * factor, mn, mx), duration: 180 });
  }
  public cameraRecenter() {
    const cam = this.cameras.main;
    const c = this.campCenter();
    this.tweens.add({
      targets: cam,
      scrollX: c.x - this.scale.width / (2 * cam.zoom),
      scrollY: c.y - this.scale.height / (2 * cam.zoom),
      zoom: Math.min((cam as any).__maxZoom ?? 2.6, Math.max(cam.zoom, 1.4)),
      duration: 260,
    });
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
        const [a, b] = pointers;
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.pinchPrevDist > 0) {
          const minZoom = (cam as any).__minZoom ?? 0.4;
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dist / this.pinchPrevDist), minZoom, 2));
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
      const world = cam.getWorldPoint(p.x, p.y);
      if (this.state?.placement) {
        if (this.placementValid) {
          const pct = worldToPct(world.x, world.y);
          this.events.emit("placePosition", { x: pct.x, y: pct.y });
        }
        return;
      }
      const hit = this.findBuildingAt(world.x, world.y);
      if (hit) this.events.emit("selectBuilding", hit.data.id);
      else this.events.emit("tapGround");
    });

    this.input.on("wheel", (_p: any, _o: any, _dx: number, dy: number) => {
      const minZoom = (cam as any).__minZoom ?? 0.4;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), minZoom, 2));
    });
  }

  // ─────────── WORLD BUILD ───────────
  private rebuildWorld() {
    this.layerTerrain.removeAll(true);
    this.layerPaths.removeAll(true);
    this.layerDecor.removeAll(true);
    this.layerVeg.removeAll(true);
    this.layerProps.removeAll(true);
    this.layerEffects.removeAll(true);
    if (!this.state) return;
    const palette = BIOME_COLORS[this.state.biome];
    const seed = hash((this.state.seed ?? "v") + ":" + this.state.biome);
    const rnd = mulberry32(seed);

    // 1) base
    this.layerTerrain.add(this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, palette.ground));

    // 2) macchie organiche di erba (blob morbidi)
    for (let i = 0; i < 90; i++) {
      const x = rnd() * WORLD_W;
      const y = rnd() * WORLD_H;
      const rx = 140 + rnd() * 240;
      const ry = 90 + rnd() * 180;
      const tint = Phaser.Display.Color.IntegerToColor(palette.grass);
      // 2-3 ellissi sovrapposte per look soffice
      this.layerTerrain.add(this.add.ellipse(x, y, rx * 2, ry * 2, palette.grass, 0.45));
      this.layerTerrain.add(this.add.ellipse(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 60,
        rx * 1.4, ry * 1.3,
        Phaser.Display.Color.GetColor(Math.max(0, tint.red - 20), Math.max(0, tint.green - 10), Math.max(0, tint.blue - 10)),
        0.4));
    }

    // 3) chiazze di "dirt" più scure tra le macchie
    for (let i = 0; i < 30; i++) {
      const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
      this.layerTerrain.add(this.add.ellipse(x, y, 200 + rnd() * 180, 130 + rnd() * 100,
        palette.ground, 0.35));
    }

    // 4) sentieri curvi che convergono al centro (Bezier)
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    const pathColor = Phaser.Display.Color.IntegerToColor(palette.ground);
    const pathHex = Phaser.Display.Color.GetColor(
      Math.min(255, pathColor.red + 30),
      Math.min(255, pathColor.green + 24),
      Math.min(255, pathColor.blue + 18),
    );
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd() * 0.4;
      const endX = cx + Math.cos(a) * (WORLD_W * 0.42);
      const endY = cy + Math.sin(a) * (WORLD_H * 0.42);
      const c1x = cx + Math.cos(a) * 280 + (rnd() - 0.5) * 200;
      const c1y = cy + Math.sin(a) * 280 + (rnd() - 0.5) * 200;
      const c2x = cx + Math.cos(a) * 600 + (rnd() - 0.5) * 240;
      const c2y = cy + Math.sin(a) * 600 + (rnd() - 0.5) * 240;
      const curve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(cx, cy),
        new Phaser.Math.Vector2(c1x, c1y),
        new Phaser.Math.Vector2(c2x, c2y),
        new Phaser.Math.Vector2(endX, endY),
      );
      const pts = curve.getPoints(40);
      const g = this.add.graphics();
      g.lineStyle(28, pathHex, 0.55);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k].x, pts[k].y);
      g.strokePath();
      g.lineStyle(14, pathHex, 0.85);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k].x, pts[k].y);
      g.strokePath();
      this.layerPaths.add(g);
    }

    // 5) micro decor: ciuffi, fiori, sassi (flat) - densità alta
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
      const v = rnd();
      if (v < 0.55) {
        this.layerDecor.add(this.add.ellipse(x, y, 9, 4, 0x1f3b22, 0.75));
        this.layerDecor.add(this.add.ellipse(x + 2, y - 1, 6, 3, 0x2e5a3a, 0.6));
      } else if (v < 0.85) {
        // fiore con stelo
        this.layerDecor.add(this.add.rectangle(x, y + 2, 1, 5, 0x2e5a3a));
        this.layerDecor.add(this.add.circle(x, y, 3.5, palette.flower));
        this.layerDecor.add(this.add.circle(x, y, 1.4, 0xfff7d6));
      } else {
        this.layerDecor.add(this.add.ellipse(x, y + 1, 8, 3, 0x000000, 0.25));
        this.layerDecor.add(this.add.ellipse(x, y, 7, 5, palette.rock, 0.85));
      }
    }

    // 5b) chiazze di fiori a cluster (più decorative)
    for (let i = 0; i < 22; i++) {
      const cxF = rnd() * WORLD_W, cyF = rnd() * WORLD_H;
      const n = 8 + Math.floor(rnd() * 10);
      const colors = [palette.flower, 0xffffff, 0xff9ec4, 0xffd166];
      const col = colors[Math.floor(rnd() * colors.length)];
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2; const r = rnd() * 36;
        const fx = cxF + Math.cos(a) * r, fy = cyF + Math.sin(a) * r;
        this.layerDecor.add(this.add.rectangle(fx, fy + 2, 1, 5, 0x2e5a3a));
        this.layerDecor.add(this.add.circle(fx, fy, 3.5, col));
        this.layerDecor.add(this.add.circle(fx, fy, 1.4, 0xfff7d6));
      }
    }

    // 6) vegetazione "3D-ish": alberi, cespugli, rocce con depth=y
    const vegCount = 380;
    for (let i = 0; i < vegCount; i++) {
      const x = rnd() * WORLD_W;
      const y = rnd() * WORLD_H;
      const distFromCenter = Math.hypot(x - cx, y - cy);
      const edgeBias = distFromCenter / Math.hypot(cx, cy);
      if (rnd() > 0.30 + edgeBias * 0.70) continue;
      // evita di piantare dentro il Campo Base
      if (Math.hypot(x - cx, y - cy) < 260) continue;
      const kind = rnd();
      if (kind < 0.55) this.spawnTree(x, y, palette, rnd);
      else if (kind < 0.85) this.spawnBush(x, y, palette, rnd);
      else this.spawnRock(x, y, palette, rnd);
    }

    // 7) oggetti quotidiani GIGANTI (lattine, bottiglie, viti, fiammiferi, accendini, tappi)
    const giantKinds: Array<"can" | "bottle" | "screw" | "match" | "lighter" | "cap" | "battery"> = [
      "can", "bottle", "screw", "match", "lighter", "cap", "battery",
    ];
    for (let i = 0; i < 16; i++) {
      let x = 0, y = 0, tries = 0;
      do { x = rnd() * WORLD_W; y = rnd() * WORLD_H; tries++; }
      while ((isInBuildableArea(x, y) || Math.hypot(x - cx, y - cy) < 340) && tries < 8);
      const kind = giantKinds[Math.floor(rnd() * giantKinds.length)];
      this.drawGiantObject(kind, x, y, rnd);
    }


    // 8) fog vignette MOLTO leggero (solo bordi)
    const fog = this.add.graphics();
    fog.fillStyle(palette.fog, 0.18);
    fog.fillRect(0, 0, WORLD_W, 90);
    fog.fillRect(0, WORLD_H - 90, WORLD_W, 90);
    fog.fillRect(0, 0, 90, WORLD_H);
    fog.fillRect(WORLD_W - 90, 0, 90, WORLD_H);
    fog.fillStyle(palette.fog, 0.10);
    fog.fillRect(0, 0, WORLD_W, 180);
    fog.fillRect(0, WORLD_H - 180, WORLD_W, 180);
    fog.fillRect(0, 0, 180, WORLD_H);
    fog.fillRect(WORLD_W - 180, 0, 180, WORLD_H);
    this.layerEffects.add(fog);

    // 9) particelle ambientali (pollen / fireflies)
    this.spawnAmbientParticles(palette);

    // 10) Campo Base permanente (bandiera + radura) sempre visibile, anche con 0 edifici
    this.spawnHomeCamp(palette, rnd);
  }

  private spawnHomeCamp(palette: typeof BIOME_COLORS[keyof typeof BIOME_COLORS], rnd: () => number) {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    // radura chiara
    const clearing = this.add.graphics();
    const groundLight = Phaser.Display.Color.IntegerToColor(palette.ground);
    const lighter = Phaser.Display.Color.GetColor(
      Math.min(255, groundLight.red + 38),
      Math.min(255, groundLight.green + 30),
      Math.min(255, groundLight.blue + 22),
    );
    clearing.fillStyle(lighter, 0.7);
    clearing.fillEllipse(cx, cy, 520, 360);
    clearing.fillStyle(lighter, 0.45);
    clearing.fillEllipse(cx, cy, 720, 500);
    this.layerPaths.add(clearing);

    // sassi a cerchio (focolare/bordo campo)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rx = cx + Math.cos(a) * 90;
      const ry = cy + Math.sin(a) * 60;
      this.layerDecor.add(this.add.ellipse(rx, ry, 14, 9, palette.rock, 0.95));
    }

    // casse di legno (starter camp)
    const crateColor = 0x8b5a2b;
    const crateDark = 0x5e3a18;
    const crates = [
      { x: cx - 150, y: cy + 60 },
      { x: cx - 175, y: cy + 90, small: true },
      { x: cx + 150, y: cy + 70 },
    ];
    for (const k of crates) {
      const s = k.small ? 22 : 32;
      const c = this.add.container(k.x, k.y);
      c.add(this.add.ellipse(0, s * 0.45, s * 1.4, s * 0.35, 0x000000, 0.32));
      c.add(this.add.rectangle(0, 0, s * 1.5, s * 1.1, crateColor).setStrokeStyle(2, crateDark));
      c.add(this.add.line(0, 0, -s * 0.75, 0, s * 0.75, 0, crateDark).setLineWidth(1.5));
      c.add(this.add.line(0, 0, 0, -s * 0.55, 0, s * 0.55, crateDark).setLineWidth(1.5));
      c.setDepth(k.y);
      this.layerProps.add(c);
    }

    // BANDIERA del Campo Base (sempre visibile)
    const flag = this.add.container(cx, cy - 8);
    flag.add(this.add.ellipse(0, 36, 70, 16, 0x000000, 0.35));
    // basamento
    flag.add(this.add.ellipse(0, 26, 56, 18, 0x6e6862));
    flag.add(this.add.ellipse(0, 22, 56, 16, 0x9a8d80));
    // palo
    flag.add(this.add.rectangle(0, -20, 4, 70, 0x3a2a1a).setOrigin(0.5, 1));
    // stendardo
    const banner = this.add.graphics();
    banner.fillStyle(0xe94560, 1);
    banner.fillTriangle(2, -84, 40, -74, 2, -64);
    banner.fillStyle(0xb02a3e, 1);
    banner.fillTriangle(2, -64, 26, -68, 2, -56);
    flag.add(banner);
    flag.setDepth(cy);
    this.layerBuildings.add(flag);

    // micro-cartello "Campo Base"
    const label = this.add.text(cx, cy - 100, "Campo Base", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      color: "#fffbe8",
      stroke: "#1a1a1a",
      strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(cy + 1);
    this.layerBuildings.add(label);

    // 2 piccoli ambient pikmin sempre presenti (anche con 0 nell'inventario)
    // li gestiamo come decor (non sono nello sprite pool reale)
    const ambientColors = [0xef4444, 0x3b82f6];
    for (let i = 0; i < ambientColors.length; i++) {
      const ax = cx - 40 + i * 80 + (rnd() - 0.5) * 20;
      const ay = cy + 30 + (rnd() - 0.5) * 16;
      const ac = this.add.container(ax, ay);
      ac.add(this.add.ellipse(0, 10, 16, 5, 0x000000, 0.35));
      ac.add(this.add.ellipse(0, 0, 14, 18, ambientColors[i]));
      ac.add(this.add.circle(0, -8, 5, ambientColors[i]));
      ac.add(this.add.circle(-3, -9, 1.2, 0x111111));
      ac.add(this.add.circle(3, -9, 1.2, 0x111111));
      // stelo
      ac.add(this.add.rectangle(0, -14, 1.5, 8, 0x1f3b22));
      ac.add(this.add.circle(0, -18, 3, 0xffffff));
      ac.setDepth(ay);
      this.tweens.add({ targets: ac, y: ay - 3, duration: 700 + rnd() * 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.layerPikmin.add(ac);
    }
  }

  private spawnTree(x: number, y: number, palette: typeof BIOME_COLORS[keyof typeof BIOME_COLORS], rnd: () => number) {
    const size = 38 + rnd() * 36;
    const trunkColor = 0x4a2d1a;
    const canopyA = palette.grass;
    const canopyB = Phaser.Display.Color.IntegerToColor(palette.grass);
    const canopyDark = Phaser.Display.Color.GetColor(
      Math.max(0, canopyB.red - 30), Math.max(0, canopyB.green - 30), Math.max(0, canopyB.blue - 30),
    );
    const c = this.add.container(x, y);
    c.add(this.add.ellipse(0, size * 0.45, size * 1.2, size * 0.35, 0x000000, 0.32));
    // tronco
    c.add(this.add.rectangle(0, -size * 0.05, size * 0.22, size * 0.55, trunkColor).setOrigin(0.5, 1));
    // chioma (3 cerchi)
    c.add(this.add.circle(-size * 0.35, -size * 0.55, size * 0.55, canopyDark));
    c.add(this.add.circle(size * 0.30, -size * 0.50, size * 0.50, canopyDark));
    c.add(this.add.circle(0, -size * 0.85, size * 0.65, canopyA));
    c.setDepth(y);
    this.layerVeg.add(c);
  }

  private spawnBush(x: number, y: number, palette: typeof BIOME_COLORS[keyof typeof BIOME_COLORS], rnd: () => number) {
    const size = 22 + rnd() * 18;
    const c = this.add.container(x, y);
    c.add(this.add.ellipse(0, size * 0.35, size * 1.1, size * 0.32, 0x000000, 0.28));
    const col = Phaser.Display.Color.IntegerToColor(palette.grass);
    const dark = Phaser.Display.Color.GetColor(Math.max(0, col.red - 28), Math.max(0, col.green - 28), Math.max(0, col.blue - 28));
    c.add(this.add.circle(-size * 0.4, 0, size * 0.55, dark));
    c.add(this.add.circle(size * 0.4, 0, size * 0.55, dark));
    c.add(this.add.circle(0, -size * 0.2, size * 0.7, palette.grass));
    if (rnd() < 0.5) c.add(this.add.circle(0, -size * 0.4, 3, palette.flower));
    c.setDepth(y);
    this.layerVeg.add(c);
  }

  private spawnRock(x: number, y: number, palette: typeof BIOME_COLORS[keyof typeof BIOME_COLORS], rnd: () => number) {
    const size = 20 + rnd() * 28;
    const c = this.add.container(x, y);
    c.add(this.add.ellipse(0, size * 0.35, size * 1.2, size * 0.35, 0x000000, 0.3));
    c.add(this.add.ellipse(0, 0, size * 1.1, size * 0.85, palette.rock));
    const lighter = Phaser.Display.Color.IntegerToColor(palette.rock);
    c.add(this.add.ellipse(-size * 0.2, -size * 0.2, size * 0.6, size * 0.4,
      Phaser.Display.Color.GetColor(Math.min(255, lighter.red + 30), Math.min(255, lighter.green + 30), Math.min(255, lighter.blue + 30)),
      0.7));
    c.setDepth(y);
    this.layerVeg.add(c);
  }

  private spawnGiantProp(x: number, y: number, emoji: string, size: number) {
    const tex = this.ensureEmojiTexture(emoji, 128);
    const c = this.add.container(x, y);
    c.add(this.add.ellipse(0, size * 0.4, size * 1.0, size * 0.28, 0x000000, 0.4));
    const img = this.add.image(0, 0, tex);
    img.setDisplaySize(size, size);
    img.setOrigin(0.5, 0.85);
    c.add(img);
    c.setDepth(y);
    this.layerProps.add(c);
  }

  private spawnAmbientParticles(palette: typeof BIOME_COLORS[keyof typeof BIOME_COLORS]) {
    // texture puntiforme
    const key = "__dot";
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, 8, 8);
      if (c) {
        const ctx = c.getContext();
        const grd = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
        grd.addColorStop(0, "rgba(255,255,255,0.9)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grd; ctx.fillRect(0, 0, 8, 8);
        c.refresh();
      }
    }
    const flowerHex = "#" + palette.flower.toString(16).padStart(6, "0");
    const emitter = this.add.particles(0, 0, key, {
      x: { min: 0, max: WORLD_W },
      y: { min: 0, max: WORLD_H },
      lifespan: 6000,
      speedX: { min: -10, max: 10 },
      speedY: { min: -6, max: 6 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      quantity: 1,
      frequency: 220,
      tint: [0xffffff, Phaser.Display.Color.HexStringToColor(flowerHex).color],
      blendMode: "ADD",
    });
    this.layerEffects.add(emitter);
  }

  // ─────────── TEXTURES ───────────
  private ensureBuildingTextures() {
    if (!this.state) return;
    const { buildingImageByType, buildingEmojiByType, buildings } = this.state;
    for (const b of buildings) {
      const url = buildingImageByType[b.type] ?? null;
      if (url) {
        const key = `${BUILD_TEXTURE_PREFIX}${b.type}:${url}`;
        if (!this.textures.exists(key)) this.loadImage(key, url);
      } else {
        this.ensureEmojiTexture(buildingEmojiByType[b.type] ?? "🏠");
      }
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

  private ensureEmojiTexture(emoji: string, size = 96): string {
    const key = `${EMOJI_TEXTURE_PREFIX}${emoji}@${size}`;
    if (this.textures.exists(key)) return key;
    const c = this.textures.createCanvas(key, size, size);
    if (!c) return key;
    const ctx = c.getContext();
    ctx.clearRect(0, 0, size, size);
    ctx.font = `${Math.floor(size * 0.78)}px serif`;
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

  // ─────────── BUILDINGS ───────────
  private diffBuildings() {
    if (!this.state) return;
    const visible = this.state.buildings.filter(
      (b) => b.status === "idle" || b.status === "building" || b.status === "upgrading",
    );
    const seen = new Set<string>();
    for (const b of visible) {
      seen.add(b.id);
      const ex = this.buildingSprites.get(b.id);
      if (ex) this.updateBuildingSprite(ex, b);
      else this.spawnBuildingSprite(b);
    }
    for (const [id, sp] of this.buildingSprites) {
      if (!seen.has(id)) { sp.container.destroy(true); this.buildingSprites.delete(id); }
    }
  }

  private buildingTextureKey(b: BaseBuilding): string {
    const url = this.state?.buildingImageByType[b.type] ?? null;
    if (url) return `${BUILD_TEXTURE_PREFIX}${b.type}:${url}`;
    return `${EMOJI_TEXTURE_PREFIX}${this.state?.buildingEmojiByType[b.type] ?? "🏠"}@96`;
  }

  private spawnBuildingSprite(b: BaseBuilding) {
    const { x, y } = pctToWorld(b.position_x, b.position_y);
    const container = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 38, 110, 28, 0x000000, 0.4);
    const tex = this.buildingTextureKey(b);
    const art = this.add.image(0, 0, tex);
    art.setDisplaySize(130, 130);
    art.setOrigin(0.5, 0.85);
    if (!this.textures.exists(tex)) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (art && art.active && this.textures.exists(tex)) art.setTexture(tex);
      });
    }
    container.add([shadow, art]);
    container.setDepth(y);
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
    if (this.textures.exists(tex) && sp.art.texture?.key !== tex) sp.art.setTexture(tex);
    if (b.status !== "idle") {
      if (!sp.progress) this.attachProgress(sp);
      this.updateProgress(sp, b);
    } else if (sp.progress) { sp.progress.destroy(); sp.progress = undefined; }
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
    sp.progress.fillRoundedRect(-50, -100, 100, 8, 4);
    sp.progress.fillStyle(0xfacc15, 1);
    sp.progress.fillRoundedRect(-50, -100, 100 * pct, 8, 4);
  }

  private findBuildingAt(x: number, y: number): BuildingSprite | null {
    let hit: BuildingSprite | null = null;
    let bestDepth = -Infinity;
    for (const sp of this.buildingSprites.values()) {
      const dx = x - sp.container.x;
      const dy = y - sp.container.y;
      if (Math.abs(dx) < 65 && dy > -110 && dy < 50 && sp.container.depth > bestDepth) {
        hit = sp; bestDepth = sp.container.depth;
      }
    }
    return hit;
  }

  // ─────────── PIKMIN ───────────
  private rebuildPikminPool() {
    if (!this.state) return;
    const targetTotal = Math.min(
      this.state.pikminMaxVisible,
      Object.values(this.state.pikminBreakdown).reduce((a, b) => a + b, 0),
    );
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
      const tex = url ? `${PIK_TEXTURE_PREFIX}${sp.key}:${url}` : `${EMOJI_TEXTURE_PREFIX}${this.pikminEmojiFor(sp)}@96`;
      for (let i = 0; i < n; i++) {
        const x = WORLD_W * 0.35 + rnd() * WORLD_W * 0.3;
        const y = WORLD_H * 0.35 + rnd() * WORLD_H * 0.3;
        const shadow = this.add.ellipse(x, y + 14, 22, 8, 0x000000, 0.35);
        const art = this.add.image(x, y, this.textures.exists(tex) ? tex : `${EMOJI_TEXTURE_PREFIX}${this.pikminEmojiFor(sp)}@96`);
        art.setDisplaySize(36, 36);
        art.setOrigin(0.5, 0.85);
        this.layerPikmin.add(shadow); this.layerPikmin.add(art);
        if (!this.textures.exists(tex) && url) {
          this.load.once(Phaser.Loader.Events.COMPLETE, () => {
            if (art && art.active && this.textures.exists(tex)) art.setTexture(tex);
          });
        }
        const angle = rnd() * Math.PI * 2;
        const speed = 18 + rnd() * 16;
        this.pikminSprites.push({
          art, shadow,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          speciesKey: sp.key,
          bob: rnd() * Math.PI * 2,
        });
      }
      if (this.pikminSprites.length >= targetTotal) break;
    }
  }

  private tickPikmin(t: number, dt: number) {
    if (this.pikminSprites.length === 0) return;
    const sec = dt / 1000;
    const padX = WORLD_W * 0.18, padY = WORLD_H * 0.18;
    for (const p of this.pikminSprites) {
      if (Math.random() < 0.006) {
        const a = Math.random() * Math.PI * 2;
        const s = 14 + Math.random() * 22;
        p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      }
      p.art.x += p.vx * sec; p.art.y += p.vy * sec;
      if (p.art.x < padX || p.art.x > WORLD_W - padX) p.vx *= -1;
      if (p.art.y < padY || p.art.y > WORLD_H - padY) p.vy *= -1;
      p.bob += sec * 6;
      const bob = Math.sin(p.bob) * 1.5;
      p.art.flipX = p.vx < 0;
      p.art.setScale(p.art.scaleX, p.art.scaleY); // keep
      p.art.y += bob * sec;
      p.shadow.x = p.art.x; p.shadow.y = p.art.y + 14;
      p.art.depth = p.art.y + 0.5;
      p.shadow.depth = p.art.y - 0.5;
    }
  }

  // ─────────── PLACEMENT ───────────
  private updatePlacementMode() {
    if (!this.state) return;
    if (this.state.placement) {
      if (!this.placementGhost) this.createGhost(this.state.placement);
    } else if (this.placementGhost) {
      this.placementGhost.destroy(true); this.placementGhost = null;
    }
  }

  private createGhost(p: PlacementInfo) {
    const container = this.add.container(WORLD_W / 2, WORLD_H / 2);
    const ring = this.add.circle(0, 18, 64, 0x22c55e, 0.25);
    ring.setStrokeStyle(3, 0x22c55e, 0.9);
    const url = p.imageUrl ?? null;
    const tex = url ? `${BUILD_TEXTURE_PREFIX}${p.key}:${url}` : `${EMOJI_TEXTURE_PREFIX}${p.emoji}@96`;
    if (url && !this.textures.exists(tex)) this.loadImage(tex, url);
    if (!url) this.ensureEmojiTexture(p.emoji);
    const art = this.add.image(0, 0, this.textures.exists(tex) ? tex : `${EMOJI_TEXTURE_PREFIX}${p.emoji}@96`);
    art.setDisplaySize(130, 130);
    art.setOrigin(0.5, 0.85);
    art.setAlpha(0.78);
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
