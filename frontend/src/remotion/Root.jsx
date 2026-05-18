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
        id="CompanyHeroExplainer"
        component={HeroExplainerVideo}
        durationInFrames={HERO_EXPLAINER_DURATION}
        fps={VIDEO_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CompanyLinkedInDevTeams"
        component={LinkedInMarketingVideo}
        durationInFrames={LINKEDIN_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ variant: "devTeams" }}
      />
      <Composition
        id="CompanyLinkedInAIAutomation"
        component={LinkedInMarketingVideo}
        durationInFrames={LINKEDIN_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ variant: "aiAutomation" }}
      />
      <Composition
        id="CompanyLinkedInConsultants"
        component={LinkedInMarketingVideo}
        durationInFrames={LINKEDIN_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ variant: "consultants" }}
      />
      <Composition
        id="CompanyRecruitingClip"
        component={RecruitingClip}
        durationInFrames={RECRUITING_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CompanyClientProposalSnippet"
        component={ClientProposalSnippet}
        durationInFrames={PROPOSAL_DURATION}
        fps={VIDEO_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}
