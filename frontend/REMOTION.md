# Company Remotion Videos

This frontend includes Remotion compositions for reusable Company motion graphics.

## Preview

```bash
cd frontend
yarn remotion:preview
```

## Render MP4s

```bash
cd frontend
yarn remotion:render:all
```

Rendered files are written to `frontend/out/remotion/` and are ignored by Git.

## Composition IDs

- `CompanyHeroExplainer` - 16:9 homepage explainer for the delivery model.
- `CompanyLinkedInDevTeams` - square LinkedIn post for dedicated dev squads.
- `CompanyLinkedInAIAutomation` - square LinkedIn post for AI automation.
- `CompanyLinkedInConsultants` - square LinkedIn post for contract consultants.
- `CompanyRecruitingClip` - vertical recruiting/job clip.
- `CompanyClientProposalSnippet` - 16:9 sales proposal snippet.

Edit copy and sample data in `src/remotion/videoData.js`.
