import React from "react";
import { Composition } from "remotion";
import {
  ClientProposalSnippet,
  HeroExplainerVideo,
  LinkedInMarketingVideo,
  RecruitingClip,
} from "./compositions";
import {
  HERO_EXPLAINER_DURATION,
  LINKEDIN_DURATION,
  PROPOSAL_DURATION,
  RECRUITING_DURATION,
  VIDEO_FPS,
} from "./videoData";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="SaturnMaxHeroExplainer"
        component={HeroExplainerVideo}
        durationInFrames={HERO_EXPLAINER_DURATION}
        fps={VIDEO_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SaturnMaxLinkedInDevTeams"
        component={LinkedInMarketingVideo}
        durationInFrames={LINKEDIN_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ variant: "devTeams" }}
      />
      <Composition
        id="SaturnMaxLinkedInAIAutomation"
        component={LinkedInMarketingVideo}
        durationInFrames={LINKEDIN_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ variant: "aiAutomation" }}
      />
      <Composition
        id="SaturnMaxLinkedInConsultants"
        component={LinkedInMarketingVideo}
        durationInFrames={LINKEDIN_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ variant: "consultants" }}
      />
      <Composition
        id="SaturnMaxRecruitingClip"
        component={RecruitingClip}
        durationInFrames={RECRUITING_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="SaturnMaxClientProposalSnippet"
        component={ClientProposalSnippet}
        durationInFrames={PROPOSAL_DURATION}
        fps={VIDEO_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}
