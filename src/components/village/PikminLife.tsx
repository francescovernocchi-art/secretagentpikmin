import { motion } from "framer-motion";
import { useMemo } from "react";
import type { FactionKey } from "@/lib/village/factions";
import type { PikminAccessory, PikminAura } from "@/lib/village/cosmetics";

interface BuildingPos {
  position_x: number;
  position_y: number;
  type: string;
}

interface Skin {
  body?: string;
  accessory?: PikminAccessory;
  aura?: PikminAura;
  accent?: string;
}

interface Props {
  count?: number;
  faction?: FactionKey | null;
  buildings?: BuildingPos[];
  threat?: boolean;
  phase?: "alba" | "giorno" | "tramonto" | "notte";
  skin?: Skin;
}

const FACTION_COLORS: Record<FactionKey, string[]> = {
  eco: ["#7be07b", "#a8e6a3", "#56c46b"],
  tech: ["#7dd3fc", "#38bdf8", "#c4b5fd"],
  battle: ["#fb7185", "#f97316", "#fbbf24"],
  mystic: ["#c084fc", "#a78bfa", "#f0abfc"],
};

const ACCESSORY_EMOJI: Record<PikminAccessory, string> = {
  nessuno: "",
  foglia: "🍃",
  fiore: "🌸",
  cappello: "🎩",
  elmo: "⛑️",
  stella: "⭐",
  antenna: "📡",
};

/** Pikmin "vivi": vagano, raccolgono presso gli edifici, si difendono se c'è minaccia. */
export function PikminLife({
  count = 8,
  faction = "eco",
  buildings = [],
  threat = false,
  phase = "giorno",
  skin,
}: Props) {
  type PikminAgent = {
    id: number;
    hue: string;
    role: "worker" | "guard" | "scout" | "sleeper";
    homeX: number;
    homeY: number;
    targetX: number;
    targetY: number;
    duration: number;
    delay: number;
    carry?: string;
  };


  const agents = useMemo<PikminAgent[]>(() => {
    const fpalette = FACTION_COLORS[faction ?? "eco"] ?? FACTION_COLORS.eco;
    const palette = skin?.body ? [skin.body, skin.body, skin.body] : fpalette;
    const sleep = phase === "notte";
    return Array.from({ length: count }).map((_, i) => {
      // ruolo
      let role: PikminAgent["role"];
      if (sleep) role = "sleeper";
      else if (threat && i % 2 === 0) role = "guard";
      else if (buildings.length > 0 && i % 3 !== 0) role = "worker";
      else role = "scout";

      const homeX = 10 + Math.random() * 80;
      const homeY = 8 + Math.random() * 18;

      // target dipende dal ruolo
      let targetX = homeX + (Math.random() * 30 - 15);
      let targetY = homeY + (Math.random() * 10 - 5);

      if (role === "worker" && buildings.length > 0) {
        const b = buildings[Math.floor(Math.random() * buildings.length)];
        targetX = b.position_x;
        targetY = 100 - b.position_y; // base usa bottom%, edifici usano top%
      }
      if (role === "guard") {
        // pattuglia sul fronte basso
        targetX = 10 + Math.random() * 80;
        targetY = 4 + Math.random() * 8;
      }

      return {
        id: i,
        hue: palette[i % palette.length],
        role,
        homeX,
        homeY,
        targetX: Math.max(4, Math.min(96, targetX)),
        targetY: Math.max(2, Math.min(40, targetY)),
        duration: role === "guard" ? 4 + Math.random() * 3 : 7 + Math.random() * 8,
        delay: Math.random() * 3,
        carry: role === "worker" && Math.random() > 0.5 ? "🍃" : undefined,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, faction, buildings.length, threat, phase, skin?.body]);

  const accessoryEmoji = skin?.accessory ? ACCESSORY_EMOJI[skin.accessory] : "";
  const auraShadow =
    skin?.aura === "neon"
      ? `0 0 10px ${skin?.body ?? "#7be07b"}`
      : skin?.aura === "scintille"
        ? `0 0 8px ${skin?.accent ?? "#fde047"}`
        : skin?.aura === "ombra"
          ? "0 0 8px #000a"
          : skin?.aura === "soffice"
            ? "0 0 6px #fff5"
            : "0 0 6px rgba(0,0,0,.4)";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {agents.map((p) => {
        const dx = p.targetX - p.homeX;
        const dy = p.targetY - p.homeY;
        const isSleeping = p.role === "sleeper";
        return (
          <motion.div
            key={`${p.id}-${p.role}`}
            className="absolute"
            style={{
              left: `${p.homeX}%`,
              bottom: `${p.homeY}%`,
              width: 14,
              height: 18,
              willChange: "transform",
            }}
            animate={
              isSleeping
                ? { y: [0, -1, 0], opacity: [0.4, 0.7, 0.4] }
                : {
                    x: [0, `${dx}%`, 0, `${-dx * 0.4}%`, 0],
                    y: [0, `${-dy}%`, 0, `${dy * 0.3}%`, 0],
                  }
            }
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* corpo */}
            <motion.div
              className="relative w-full h-full"
              animate={
                isSleeping
                  ? {}
                  : p.role === "guard"
                    ? { rotate: [0, 8, -8, 0] }
                    : { y: [0, -2, 0] }
              }
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff8, ${p.hue} 60%, #0006)`,
                  boxShadow: auraShadow,
                }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[1.5px] h-2"
                style={{ background: p.hue }}
              />
              {/* accessorio / segnale */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-0.5 text-[8px] leading-none">
                {p.role === "guard" ? "🛡" : p.role === "scout" ? "🔭" : (accessoryEmoji || p.carry || "🌱")}
              </div>
            </motion.div>
          </motion.div>
        );
      })}

      {/* segnale di allarme se minaccia */}
      {threat && (
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-red-300 font-display"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          ! squadra in difesa
        </motion.div>
      )}
    </div>
  );
}
