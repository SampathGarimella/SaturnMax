# SaturnMax Remotion Videos

This frontend includes Remotion compositions for reusable SaturnMax motion graphics.

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

- `SaturnMaxHeroExplainer` - 16:9 homepage explainer for the delivery model.
- `SaturnMaxLinkedInDevTeams` - square LinkedIn post for dedicated dev squads.
- `SaturnMaxLinkedInAIAutomation` - square LinkedIn post for AI automation.
- `SaturnMaxLinkedInConsultants` - square LinkedIn post for contract consultants.
- `SaturnMaxRecruitingClip` - vertical recruiting/job clip.
- `SaturnMaxClientProposalSnippet` - 16:9 sales proposal snippet.

Edit copy and sample data in `src/remotion/videoData.js`.
