import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BRAND,
  DELIVERY_STEPS,
  HERO_EXPLAINER_DURATION,
  HERO_METRICS,
  HERO_SCENES,
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
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.blue})`,
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

function DeliveryFlow({ activeIndex = 0, compact = false }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 90,
        top: compact ? 360 : 190,
        width: compact ? 820 : 700,
        display: "grid",
        gridTemplateColumns: compact ? "repeat(5, 1fr)" : "1fr",
        gap: compact ? 14 : 16,
        fontFamily,
      }}
    >
      {DELIVERY_STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={step.label}
            style={{
              borderRadius: 24,
              padding: compact ? 18 : 24,
              background: isActive ? BRAND.navy : "rgba(255,255,255,0.86)",
              border: `1px solid ${isActive ? BRAND.navy : BRAND.line}`,
              boxShadow: isActive
                ? "0 24px 70px rgba(10,25,47,0.22)"
                : "0 14px 40px rgba(15,23,42,0.08)",
              transform: `scale(${isActive ? 1.02 : 0.98})`,
              transition: "transform 180ms linear",
            }}
          >
            <div
              style={{
                color: isActive ? "#93C5FD" : BRAND.blue,
                fontSize: compact ? 15 : 18,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {step.label}
            </div>
            <div
              style={{
                color: isActive ? "#ffffff" : BRAND.ink,
                marginTop: 8,
                fontSize: compact ? 20 : 27,
                fontWeight: 900,
                lineHeight: 1.08,
              }}
            >
              {step.title}
            </div>
            {!compact && (
              <div
                style={{
                  color: isActive ? "rgba(255,255,255,0.72)" : BRAND.muted,
                  marginTop: 10,
                  fontSize: 19,
                  lineHeight: 1.32,
                }}
              >
                {step.copy}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FooterCta({ children = "saturnmax.com | info@saturnmax.com" }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 82,
        right: 82,
        bottom: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: BRAND.muted,
        fontFamily,
        fontSize: 22,
        fontWeight: 700,
      }}
    >
      <span>{children}</span>
      <span style={{ color: BRAND.blue }}>World-class tech teams for US businesses</span>
    </div>
  );
}

export function HeroExplainerVideo() {
  const frame = useCurrentFrame();
  const sceneDuration = HERO_EXPLAINER_DURATION / HERO_SCENES.length;
  const sceneIndex = Math.min(HERO_SCENES.length - 1, Math.floor(frame / sceneDuration));
  const scene = HERO_SCENES[sceneIndex];
  const sceneStart = sceneIndex * sceneDuration;
  const localFrame = frame - sceneStart;
  const progress = appear(localFrame, 4, 24);
  const slide = interpolate(progress, [0, 1], [38, 0]);
  const activeFlowIndex = Math.min(DELIVERY_STEPS.length - 1, Math.floor(frame / 160));

  return (
    <AbsoluteFill>
      <BrandBackdrop />
      <BrandHeader />
      <SceneTitle
        eyebrow={scene.eyebrow}
        headline={scene.headline}
        body={scene.body}
        style={{
          position: "absolute",
          left: 92,
          top: 210,
          opacity: progress,
          transform: `translateY(${slide}px)`,
        }}
      />
      <DeliveryFlow activeIndex={activeFlowIndex} />
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
