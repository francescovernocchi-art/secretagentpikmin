import styles from "@/styles/village-diorama.module.css";
import { ParticleEffect } from "@/components/fx/ParticleEffect";

interface DioramaTerrainProps {
  theme: {
    sky: string;
    ground: string;
    groundMid: string;
    groundDark: string;
    path: string;
    water?: string;
    accent: string;
    decor: string[];
  };
}

export function DioramaTerrain({ theme }: DioramaTerrainProps) {
  const rocks = [
    { left: 12, top: 70, size: "sm" },
    { left: 18, top: 35, size: "md" },
    { left: 76, top: 30, size: "sm" },
    { left: 84, top: 68, size: "lg" },
    { left: 58, top: 82, size: "sm" },
  ];
  const grass = [
    { left: 9, top: 54 }, { left: 16, top: 82 }, { left: 24, top: 27 }, { left: 38, top: 78 },
    { left: 48, top: 20 }, { left: 63, top: 76 }, { left: 73, top: 24 }, { left: 88, top: 52 },
  ];
  const flowers = [
    { left: 20, top: 58, icon: "✿" }, { left: 36, top: 30, icon: "✽" }, { left: 66, top: 58, icon: "✿" },
    { left: 80, top: 76, icon: "✽" },
  ];

  return (
    <div className={styles.terrainWrap} style={{ background: theme.sky }}>
      <ParticleEffect variant="dust" density="medium" />
      <ParticleEffect variant="energy" density="low" className="opacity-25" />
      <div className={styles.sunGlow} style={{ boxShadow: `0 0 80px 40px ${theme.accent}33` }} />
      <div className={styles.backgroundHills} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.backgroundTrees} aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} style={{ left: `${4 + i * 11}%`, animationDelay: `${i * 0.25}s` }} />
        ))}
      </div>
      <div className={styles.isoStage}>
        <div
          className={styles.groundPlate}
          style={{
            background: `linear-gradient(135deg, ${theme.ground} 0%, ${theme.groundMid} 45%, ${theme.groundDark} 100%)`,
            borderColor: `${theme.accent}44`,
          }}
        >
          <div className={styles.groundTexture} aria-hidden />
          <svg className={styles.pathSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 13 72 Q 28 64 50 55 Q 69 47 87 36" fill="none" stroke={theme.path} strokeWidth="7" strokeLinecap="round" opacity="0.58" />
            <path d="M 50 55 Q 49 42 50 25" fill="none" stroke={theme.path} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
            <path d="M 50 55 Q 42 45 28 42" fill="none" stroke={theme.path} strokeWidth="4" strokeLinecap="round" opacity="0.42" />
            <path d="M 50 55 Q 61 45 72 42" fill="none" stroke={theme.path} strokeWidth="4" strokeLinecap="round" opacity="0.42" />
            <path d="M 50 55 Q 40 68 30 72" fill="none" stroke={theme.path} strokeWidth="4" strokeLinecap="round" opacity="0.38" />
            <path d="M 50 55 Q 60 69 70 72" fill="none" stroke={theme.path} strokeWidth="4" strokeLinecap="round" opacity="0.38" />
          </svg>
          {theme.water && (
            <div className={styles.waterPond} style={{ background: theme.water, boxShadow: `inset 0 0 20px ${theme.accent}44` }} />
          )}
          {rocks.map((rock, i) => (
            <div
              key={i}
              className={`${styles.rock} ${rock.size === "lg" ? styles.rock_lg : rock.size === "md" ? styles.rock_md : styles.rock_sm}`}
              style={{ left: `${rock.left}%`, top: `${rock.top}%`, opacity: 0.5 + (i % 2) * 0.2 }}
            />
          ))}
          {grass.map((tuft, i) => (
            <span key={i} className={styles.grassTuft} style={{ left: `${tuft.left}%`, top: `${tuft.top}%`, animationDelay: `${i * 0.22}s` }} />
          ))}
          {flowers.map((flower, i) => (
            <span key={i} className={styles.flowerPatch} style={{ left: `${flower.left}%`, top: `${flower.top}%`, color: i % 2 ? "#fde047" : "#f9a8d4" }}>
              {flower.icon}
            </span>
          ))}
          {theme.decor.map((d, i) => (
            <span
              key={i}
              className={styles.decorItem}
              style={{ left: `${[8, 88, 5, 92, 18][i % 5]}%`, top: `${[15, 20, 75, 80, 45][i % 5]}%`, animationDelay: `${i * 0.7}s` }}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.foregroundFoliage} aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} style={{ left: `${i * 9 - 3}%`, animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}
