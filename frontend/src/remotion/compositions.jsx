import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BRAND,
  HERO_EXPLAINER_DURATION,
  HERO_METRICS,
  HERO_STORY_SCENES,
  LINKEDIN_DURATION,
  LINKEDIN_VARIANTS,
  PROPOSAL_DURATION,
  RECRUITING_DURATION,
  SAMPLE_JOB,
  SAMPLE_PROPOSAL,
  VIDEO_FPS,
} from "./videoData";

export {
  HERO_EXPLAINER_DURATION,
  LINKEDIN_DURATION,
  PROPOSAL_DURATION,
  RECRUITING_DURATION,
  VIDEO_FPS,
};

const fontFamily = '"Outfit", "IBM Plex Sans", Arial, sans-serif';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function appear(frame, start = 0, duration = 24) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function fadeWindow(frame, start, end, fade = 20) {
  const fadeIn = appear(frame, start, fade);
  const fadeOut = interpolate(frame, [end - fade, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
}

function BrandBackdrop({ accent = BRAND.blue }) {
  const frame = useCurrentFrame();
  const drift = frame * 0.42;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% 10%, ${BRAND.softBlue} 0, transparent 34%), linear-gradient(135deg, #ffffff 0%, #f8fbff 42%, #eef5ff 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(10,25,47,0.07) 1px, transparent 1px)`,
          backgroundSize: "92px 92px",
          transform: `translate(${drift % 92}px, ${(drift / 2) % 92}px)`,
          opacity: 0.42,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -180,
          top: -180,
          width: 520,
          height: 520,
          borderRadius: "50%",
          border: `48px solid ${accent}`,
          opacity: 0.1,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -150,
          bottom: -120,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: BRAND.navy,
          opacity: 0.06,
        }}
      />
    </AbsoluteFill>
  );
}

function BrandHeader({ label = "SaturnMax Technologies" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 66,
        left: 82,
        right: 82,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <img
          src={staticFile("favicon.png")}
          alt=""
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            objectFit: "contain",
            boxShadow: "0 16px 40px rgba(37,99,235,0.22)",
          }}
        />
        <div style={{ color: BRAND.ink, fontSize: 30, fontWeight: 800 }}>{label}</div>
      </div>
      <div
        style={{
          color: BRAND.blue,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        IT consulting and staffing
      </div>
    </div>
  );
}

function SceneTitle({ eyebrow, headline, body, style }) {
  return (
    <div style={{ fontFamily, ...style }}>
      <div
        style={{
          display: "inline-flex",
          borderRadius: 999,
          padding: "12px 18px",
          background: "rgba(37,99,235,0.1)",
          color: BRAND.blue,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          marginTop: 28,
          color: BRAND.ink,
          fontSize: 76,
          lineHeight: 0.96,
          fontWeight: 900,
          maxWidth: 920,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          marginTop: 28,
          color: BRAND.muted,
          fontSize: 31,
          lineHeight: 1.35,
          maxWidth: 860,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function StoryProgress({ activeIndex }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        right: 82,
        top: 146,
        display: "grid",
        gridTemplateColumns: `repeat(${HERO_STORY_SCENES.length}, 1fr)`,
        gap: 12,
        fontFamily,
      }}
    >
      {HERO_STORY_SCENES.map((scene, index) => {
        const active = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <div
            key={scene.id}
            style={{
              borderRadius: 999,
              padding: "11px 14px",
              background: active ? BRAND.navy : complete ? "rgba(37,99,235,0.14)" : "rgba(255,255,255,0.74)",
              border: `1px solid ${active ? BRAND.navy : BRAND.line}`,
              color: active ? "#ffffff" : complete ? BRAND.blueDark : BRAND.muted,
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {scene.chapter}
          </div>
        );
      })}
    </div>
  );
}

function MetricsStrip({ progress }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 82,
        bottom: 112,
        display: "flex",
        gap: 14,
        borderRadius: 24,
        padding: "18px 20px",
        background: "rgba(255,255,255,0.92)",
        border: `1px solid ${BRAND.line}`,
        boxShadow: "0 18px 54px rgba(15,23,42,0.12)",
        fontFamily,
        transform: `translateY(${(1 - progress) * 18}px) scale(${0.96 + progress * 0.04})`,
        opacity: progress,
      }}
    >
      {HERO_METRICS.map((item, index) => (
        <div
          key={item.label}
          style={{
            minWidth: 170,
            paddingRight: index === HERO_METRICS.length - 1 ? 0 : 16,
            borderRight: index === HERO_METRICS.length - 1 ? "none" : `1px solid ${BRAND.line}`,
          }}
        >
          <div style={{ color: BRAND.blue, fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{item.metric}</div>
          <div style={{ color: BRAND.ink, marginTop: 6, fontSize: 17, fontWeight: 800 }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SceneCopy({ scene, progress }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        top: 230,
        width: 830,
        fontFamily,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 26}px)`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          borderRadius: 999,
          padding: "12px 18px",
          background: "rgba(37,99,235,0.1)",
          color: BRAND.blue,
          fontSize: 21,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {scene.eyebrow}
      </div>
      <div
        style={{
          marginTop: 26,
          color: BRAND.ink,
          fontSize: 66,
          lineHeight: 0.98,
          fontWeight: 950,
          maxWidth: 820,
        }}
      >
        {scene.headline}
      </div>
      <div
        style={{
          marginTop: 24,
          color: BRAND.muted,
          fontSize: 28,
          lineHeight: 1.34,
          maxWidth: 760,
        }}
      >
        {scene.body}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
        {scene.proof.map((detail, index) => (
          <div
            key={detail}
            style={{
              borderRadius: 999,
              padding: "11px 16px",
              background: index === 0 ? BRAND.navy : "rgba(255,255,255,0.82)",
              border: `1px solid ${index === 0 ? BRAND.navy : BRAND.line}`,
              color: index === 0 ? "#ffffff" : BRAND.blueDark,
              boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            {detail}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepBadge({ label, active }) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "9px 12px",
        background: active ? BRAND.blue : BRAND.softBlue,
        color: active ? "#ffffff" : BRAND.blueDark,
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

function StoryPanel({ scene, activeIndex, localFrame, progress }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 82,
        top: 216,
        width: 810,
        height: 710,
        borderRadius: 38,
        padding: 34,
        background: "rgba(255,255,255,0.92)",
        border: `1px solid ${BRAND.line}`,
        boxShadow: "0 30px 92px rgba(15,23,42,0.16)",
        fontFamily,
        overflow: "hidden",
        opacity: progress,
        transform: `translateX(${(1 - progress) * 30}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: BRAND.blue, fontSize: 18, fontWeight: 950, letterSpacing: 2, textTransform: "uppercase" }}>
            {scene.visualTitle}
          </div>
          <div style={{ marginTop: 8, color: BRAND.ink, fontSize: 34, fontWeight: 950, lineHeight: 1 }}>
            {scene.visualSubtitle}
          </div>
        </div>
        <StepBadge label={`0${activeIndex + 1} / 05`} active />
      </div>

      {scene.id === "pressure" && <DemandVisual scene={scene} localFrame={localFrame} />}
      {scene.id === "scope" && <ScopeVisual scene={scene} localFrame={localFrame} />}
      {scene.id === "team" && <TeamVisual scene={scene} localFrame={localFrame} />}
      {scene.id === "rhythm" && <RhythmVisual scene={scene} localFrame={localFrame} />}
      {scene.id === "scale" && <ScaleVisual scene={scene} localFrame={localFrame} />}

      <div
        style={{
          position: "absolute",
          left: 34,
          right: 34,
          bottom: 30,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
        }}
      >
        {HERO_STORY_SCENES.map((item, index) => (
          <div
            key={item.id}
            style={{
              height: 8,
              borderRadius: 999,
              background: index <= activeIndex ? BRAND.blue : "#DCE7F5",
              opacity: index === activeIndex ? 1 : 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DemandVisual({ scene, localFrame }) {
  return (
    <div style={{ position: "relative", height: 520, marginTop: 38 }}>
      <div style={{ display: "grid", gap: 18, width: 320 }}>
        {scene.visualItems.map((item, index) => {
          const itemProgress = appear(localFrame, 24 + index * 14, 16);
          return (
            <div
              key={item}
              style={{
                borderRadius: 24,
                padding: 22,
                background: index === 0 ? BRAND.navy : BRAND.softBlue,
                color: index === 0 ? "#ffffff" : BRAND.ink,
                opacity: itemProgress,
                transform: `translateX(${(1 - itemProgress) * -26}px)`,
                boxShadow: "0 18px 48px rgba(15,23,42,0.12)",
              }}
            >
              <div style={{ color: index === 0 ? "#93C5FD" : BRAND.blue, fontSize: 16, fontWeight: 950, letterSpacing: 1.4 }}>
                SIGNAL 0{index + 1}
              </div>
              <div style={{ marginTop: 8, fontSize: 28, lineHeight: 1.05, fontWeight: 950 }}>{item}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 346,
          top: 82,
          width: 248,
          height: 248,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BRAND.blue} 0%, ${BRAND.navy} 70%)`,
          display: "grid",
          placeItems: "center",
          color: "#ffffff",
          fontSize: 28,
          lineHeight: 1.05,
          fontWeight: 950,
          textAlign: "center",
          boxShadow: "0 30px 90px rgba(37,99,235,0.32)",
          transform: `scale(${0.94 + appear(localFrame, 42, 22) * 0.06})`,
        }}
      >
        SaturnMax
        <br />
        delivery
      </div>
      <div style={{ position: "absolute", right: 0, top: 62, display: "grid", gap: 16, width: 198 }}>
        {["Pilot", "Squad", "Scale"].map((item, index) => (
          <div
            key={item}
            style={{
              borderRadius: 18,
              padding: "18px 16px",
              background: "#ffffff",
              border: `1px solid ${BRAND.line}`,
              color: BRAND.ink,
              fontSize: 23,
              fontWeight: 950,
              boxShadow: "0 16px 42px rgba(15,23,42,0.1)",
              opacity: appear(localFrame, 70 + index * 12, 16),
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScopeVisual({ scene, localFrame }) {
  return (
    <div style={{ position: "relative", height: 520, marginTop: 38 }}>
      <div
        style={{
          borderRadius: 30,
          padding: 30,
          background: BRAND.navy,
          color: "#ffffff",
          width: 430,
          minHeight: 380,
          boxShadow: "0 26px 72px rgba(10,25,47,0.24)",
        }}
      >
        <div style={{ color: "#93C5FD", fontSize: 18, fontWeight: 950, letterSpacing: 2 }}>DISCOVERY CALL</div>
        <div style={{ marginTop: 18, fontSize: 56, lineHeight: 0.95, fontWeight: 950 }}>48 HR pilot brief</div>
        <div style={{ marginTop: 24, display: "grid", gap: 15 }}>
          {scene.visualItems.map((item, index) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, opacity: appear(localFrame, 32 + index * 16, 14) }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "#93C5FD" }} />
              <span style={{ fontSize: 24, fontWeight: 850 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", right: 10, top: 26, width: 286, display: "grid", gap: 18 }}>
        {["Team shape", "Success metric", "Pilot milestone"].map((item, index) => (
          <div
            key={item}
            style={{
              borderRadius: 22,
              padding: 22,
              background: "#ffffff",
              border: `1px solid ${BRAND.line}`,
              boxShadow: "0 18px 48px rgba(15,23,42,0.1)",
              opacity: appear(localFrame, 60 + index * 12, 16),
              transform: `translateY(${(1 - appear(localFrame, 60 + index * 12, 16)) * 20}px)`,
            }}
          >
            <div style={{ color: BRAND.blue, fontSize: 15, fontWeight: 950, letterSpacing: 1.3 }}>OUTPUT</div>
            <div style={{ marginTop: 8, color: BRAND.ink, fontSize: 26, fontWeight: 950 }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamVisual({ scene, localFrame }) {
  const roles = [
    { name: "Lead engineer", skill: scene.visualItems[0] },
    { name: "AI builder", skill: scene.visualItems[1] },
    { name: "Cloud/data", skill: scene.visualItems[2] },
  ];
  return (
    <div style={{ height: 520, marginTop: 38 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        {roles.map((role, index) => {
          const itemProgress = appear(localFrame, 28 + index * 18, 18);
          return (
            <div
              key={role.name}
              style={{
                borderRadius: 26,
                padding: 22,
                minHeight: 260,
                background: index === 1 ? BRAND.navy : "#ffffff",
                border: `1px solid ${index === 1 ? BRAND.navy : BRAND.line}`,
                color: index === 1 ? "#ffffff" : BRAND.ink,
                boxShadow: "0 22px 60px rgba(15,23,42,0.13)",
                opacity: itemProgress,
                transform: `translateY(${(1 - itemProgress) * 24}px)`,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: index === 1 ? "rgba(147,197,253,0.18)" : BRAND.softBlue,
                  color: index === 1 ? "#93C5FD" : BRAND.blue,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 28,
                  fontWeight: 950,
                }}
              >
                0{index + 1}
              </div>
              <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.05, fontWeight: 950 }}>{role.name}</div>
              <div style={{ marginTop: 14, fontSize: 18, lineHeight: 1.24, color: index === 1 ? "rgba(255,255,255,0.7)" : BRAND.muted }}>
                {role.skill}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 26,
          borderRadius: 26,
          padding: 26,
          background: BRAND.softBlue,
          color: BRAND.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 950 }}>Embedded with US overlap</div>
        <div style={{ color: BRAND.blue, fontSize: 22, fontWeight: 950 }}>{"screened -> matched -> onboarded"}</div>
      </div>
    </div>
  );
}

function RhythmVisual({ scene, localFrame }) {
  return (
    <div style={{ height: 520, marginTop: 38 }}>
      <div style={{ display: "grid", gap: 17 }}>
        {scene.visualItems.map((item, index) => {
          const width = [72, 86, 100][index];
          return (
            <div
              key={item}
              style={{
                borderRadius: 24,
                padding: 22,
                background: index === 2 ? BRAND.navy : "#ffffff",
                border: `1px solid ${index === 2 ? BRAND.navy : BRAND.line}`,
                boxShadow: "0 18px 48px rgba(15,23,42,0.1)",
                opacity: appear(localFrame, 28 + index * 18, 16),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ color: index === 2 ? "#93C5FD" : BRAND.blue, fontSize: 17, fontWeight: 950, letterSpacing: 1.6 }}>
                  WEEKLY RHYTHM
                </div>
                <div style={{ color: index === 2 ? "#ffffff" : BRAND.ink, fontSize: 25, fontWeight: 950 }}>{item}</div>
              </div>
              <div style={{ marginTop: 18, height: 12, borderRadius: 999, background: index === 2 ? "rgba(255,255,255,0.18)" : "#E8EEF8" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${width}%`,
                    borderRadius: 999,
                    background: index === 2 ? "#93C5FD" : BRAND.blue,
                    transform: `scaleX(${appear(localFrame, 46 + index * 18, 28)})`,
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {["Status visible", "Risks surfaced"].map((item) => (
          <div key={item} style={{ borderRadius: 24, padding: 22, background: BRAND.softBlue, color: BRAND.blueDark, fontSize: 25, fontWeight: 950 }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScaleVisual({ scene, localFrame }) {
  return (
    <div style={{ position: "relative", height: 520, marginTop: 38 }}>
      <div style={{ display: "flex", alignItems: "end", gap: 20, height: 330 }}>
        {scene.visualItems.map((item, index) => {
          const heights = [150, 230, 310];
          const itemProgress = appear(localFrame, 30 + index * 18, 18);
          return (
            <div key={item} style={{ flex: 1 }}>
              <div
                style={{
                  height: heights[index] * itemProgress,
                  borderRadius: "26px 26px 12px 12px",
                  background: index === 2 ? BRAND.navy : BRAND.blue,
                  boxShadow: "0 22px 58px rgba(37,99,235,0.22)",
                  display: "flex",
                  alignItems: "end",
                  overflow: "hidden",
                  padding: 18,
                  color: "#ffffff",
                  fontSize: 24,
                  lineHeight: 1.05,
                  fontWeight: 950,
                  opacity: itemProgress,
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 34,
          borderRadius: 30,
          padding: 28,
          background: BRAND.navy,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ color: "#93C5FD", fontSize: 18, fontWeight: 950, letterSpacing: 2 }}>NEXT STEP</div>
          <div style={{ marginTop: 8, fontSize: 32, fontWeight: 950 }}>Start with a scoped pilot</div>
        </div>
        <div style={{ borderRadius: 999, background: "#ffffff", color: BRAND.navy, padding: "16px 22px", fontSize: 22, fontWeight: 950 }}>
          saturnmax.com
        </div>
      </div>
    </div>
  );
}

function FooterCta({ children = "saturnmax.com | info@saturnmax.com" }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 82,
        bottom: 58,
        color: BRAND.muted,
        fontFamily,
        fontSize: 22,
        fontWeight: 700,
      }}
    >
      <span>{children}</span>
    </div>
  );
}

export function HeroExplainerVideo() {
  const frame = useCurrentFrame();
  const sceneDuration = HERO_EXPLAINER_DURATION / HERO_STORY_SCENES.length;
  const sceneIndex = Math.min(HERO_STORY_SCENES.length - 1, Math.floor(frame / sceneDuration));
  const scene = HERO_STORY_SCENES[sceneIndex];
  const sceneStart = sceneIndex * sceneDuration;
  const localFrame = frame - sceneStart;
  const progress = appear(localFrame, 4, 24);

  return (
    <AbsoluteFill>
      <BrandBackdrop />
      <BrandHeader />
      <StoryProgress activeIndex={sceneIndex} />
      <SceneCopy scene={scene} progress={progress} />
      <StoryPanel scene={scene} activeIndex={sceneIndex} localFrame={localFrame} progress={progress} />
      <MetricsStrip progress={progress} />
      <FooterCta />
    </AbsoluteFill>
  );
}

export function LinkedInMarketingVideo({ variant = "devTeams" }) {
  const frame = useCurrentFrame();
  const data = LINKEDIN_VARIANTS[variant] || LINKEDIN_VARIANTS.devTeams;
  const intro = spring({ frame, fps: VIDEO_FPS, config: { damping: 20, stiffness: 90 } });
  const pulse = 1 + Math.sin(frame / 18) * 0.018;
  return (
    <AbsoluteFill>
      <BrandBackdrop accent={variant === "aiAutomation" ? BRAND.green : BRAND.blue} />
      <BrandHeader label="SaturnMax" />
      <div
        style={{
          position: "absolute",
          left: 82,
          right: 82,
          top: 200,
          bottom: 90,
          borderRadius: 42,
          padding: 58,
          background: BRAND.navy,
          fontFamily,
          color: "#fff",
          overflow: "hidden",
          transform: `scale(${0.96 + intro * 0.04})`,
          opacity: intro,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            right: -90,
            top: -80,
            borderRadius: "50%",
            background: BRAND.blue,
            opacity: 0.24,
            transform: `scale(${pulse})`,
          }}
        />
        <div style={{ color: "#93C5FD", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
          SATURNMAX FOR US BUSINESSES
        </div>
        <div style={{ marginTop: 34, fontSize: 76, lineHeight: 0.98, fontWeight: 900, maxWidth: 820 }}>
          {data.title}
        </div>
        <div style={{ marginTop: 28, fontSize: 34, lineHeight: 1.22, color: "rgba(255,255,255,0.72)" }}>
          {data.subtitle}
        </div>
        <div style={{ marginTop: 48, display: "grid", gap: 18 }}>
          {data.points.map((point, index) => {
            const pointProgress = appear(frame, 74 + index * 22, 16);
            return (
              <div
                key={point}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 27,
                  fontWeight: 800,
                  opacity: pointProgress,
                  transform: `translateX(${(1 - pointProgress) * -24}px)`,
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: 5, background: BRAND.blue }} />
                {point}
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 58,
            bottom: 48,
            borderRadius: 999,
            padding: "18px 28px",
            background: "#ffffff",
            color: BRAND.navy,
            fontSize: 26,
            fontWeight: 900,
          }}
        >
          {data.cta}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function RecruitingClip({ job = SAMPLE_JOB }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const heroProgress = appear(frame, 8, 26);
  return (
    <AbsoluteFill style={{ background: BRAND.navy, fontFamily, color: "#fff", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 10%, rgba(37,99,235,0.55), transparent 28%), radial-gradient(circle at 80% 72%, rgba(5,150,105,0.28), transparent 30%)",
        }}
      />
      <div style={{ position: "absolute", top: 70, left: 62, right: 62 }}>
        <div style={{ color: "#93C5FD", fontSize: 30, fontWeight: 900, letterSpacing: 2 }}>
          SATURNMAX CAREERS
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 82,
            lineHeight: 0.98,
            fontWeight: 900,
            opacity: heroProgress,
            transform: `translateY(${(1 - heroProgress) * 36}px)`,
          }}
        >
          {job.role}
        </div>
        <div style={{ marginTop: 32, fontSize: 38, color: "rgba(255,255,255,0.72)", lineHeight: 1.25 }}>
          {job.pitch}
        </div>
        <div style={{ marginTop: 52, display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[job.location, job.type, ...job.skills].map((item, index) => {
            const progress = appear(frame, 84 + index * 10, 12);
            return (
              <span
                key={item}
                style={{
                  padding: "18px 24px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 28,
                  fontWeight: 800,
                  opacity: progress,
                  transform: `translateY(${(1 - progress) * 18}px)`,
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 62,
          right: 62,
          bottom: 72,
          borderRadius: 36,
          padding: 34,
          background: "#ffffff",
          color: BRAND.navy,
          fontSize: 35,
          fontWeight: 900,
          lineHeight: 1.2,
          transform: `translateY(${Math.sin(frame / 16) * 4}px)`,
        }}
      >
        {job.cta}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: `${clamp01(frame / RECRUITING_DURATION) * 100}%`,
          height: 12,
          background: BRAND.blue,
        }}
      />
      <div style={{ position: "absolute", right: 62, top: height - 176, color: "#93C5FD", fontSize: 28, fontWeight: 900 }}>
        saturnmax.com
      </div>
    </AbsoluteFill>
  );
}

export function ClientProposalSnippet({ proposal = SAMPLE_PROPOSAL }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <BrandBackdrop accent={BRAND.amber} />
      <BrandHeader />
      <SceneTitle
        eyebrow={`Proposal snapshot: ${proposal.client}`}
        headline={proposal.challenge}
        body={proposal.solution}
        style={{ position: "absolute", left: 90, top: 210 }}
      />
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 260,
          width: 600,
          display: "grid",
          gap: 20,
          fontFamily,
        }}
      >
        {proposal.outcomes.map((outcome, index) => {
          const progress = fadeWindow(frame, 80 + index * 34, PROPOSAL_DURATION - 40, 22);
          return (
            <div
              key={outcome}
              style={{
                borderRadius: 28,
                padding: 30,
                background: index === 0 ? BRAND.navy : "rgba(255,255,255,0.9)",
                color: index === 0 ? "#fff" : BRAND.ink,
                border: `1px solid ${index === 0 ? BRAND.navy : BRAND.line}`,
                boxShadow: "0 22px 60px rgba(15,23,42,0.12)",
                opacity: progress,
                transform: `translateX(${(1 - progress) * 28}px)`,
              }}
            >
              <div style={{ color: index === 0 ? "#93C5FD" : BRAND.blue, fontSize: 20, fontWeight: 900 }}>
                MODULE 0{index + 1}
              </div>
              <div style={{ marginTop: 10, fontSize: 31, lineHeight: 1.12, fontWeight: 900 }}>{outcome}</div>
            </div>
          );
        })}
      </div>
      <FooterCta>{proposal.cta} | info@saturnmax.com</FooterCta>
    </AbsoluteFill>
  );
}

export function RemotionPreviewCard() {
  return <HeroExplainerVideo />;
}
