# Deploying SaturnMax To GitHub Pages

The React frontend deploys to GitHub Pages and uses Firebase for Auth, Firestore, Storage, and Cloud Functions.

Production URL: `https://saturnmax.com`

## GitHub Pages Setup

1. Repo -> Settings -> Pages.
2. Set **Build and deployment -> Source** to **GitHub Actions**.
3. Set **Custom domain** to `saturnmax.com`.
4. Enable **Enforce HTTPS** after DNS passes.

The deployed build includes `frontend/public/CNAME`, so GitHub Pages should publish the custom domain automatically.

## DNS

Use GitHub Pages A records:

```txt
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Optional `www` CNAME:

```txt
www -> SampathGarimella.github.io
```

## GitHub Actions Secrets

Add these repository secrets:

| Secret name | Value |
|---|---|
| `REACT_APP_FIREBASE_API_KEY` | Firebase web app config |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase web app config |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase web app config |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app config |
| `REACT_APP_FIREBASE_APP_ID` | Firebase web app config |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | Firebase web app config, optional |

Firebase web config is safe to expose publicly. Security is enforced by Firestore and Storage rules.

Do not set or depend on `REACT_APP_BACKEND_URL`; the FastAPI/Mongo path is deprecated.

## Firebase Deploy

After security or functions changes:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:submitLead,functions:manageLead,functions:manageJob,functions:updateHiringWorkflow,functions:resolveReviewDecision,functions:sendPortalPasswordSetup,functions:convertCandidateToConsultant,functions:createManualConsultantInvite,functions:adminUpsertPortalUser,functions:adminDeactivatePortalUser,firestore:rules,firestore:indexes,storage
```

## Frontend Deploy

Push to `main`, then re-run the GitHub Actions workflow if needed:

[Deploy frontend to GitHub Pages](https://github.com/SampathGarimella/SaturnMax/actions/workflows/deploy.yml)

## Verify

```bash
curl -I https://saturnmax.com
curl https://saturnmax.com/CNAME
```

Open these routes:
- `https://saturnmax.com/login`
- `https://saturnmax.com/dashboard`
- `https://saturnmax.com/consultant-login`
- `https://saturnmax.com/employee-login`
- `https://saturnmax.com/admin-dashboard`

## Common Issues

| Symptom | Fix |
|---|---|
| GitHub default page appears | Confirm Pages source is GitHub Actions and `frontend/public/CNAME` contains `saturnmax.com`. |
| HTTPS toggle is disabled | Wait for DNS verification, then enable Enforce HTTPS. |
| Firebase sign-in says unauthorized domain | Add `saturnmax.com` in Firebase Authentication -> Settings -> Authorized domains. |
| Consultant/admin actions fail | Deploy the Cloud Functions and Firestore/Storage rules listed above. |
| Candidate cannot apply | Verify their email first; application writes require verified Firebase email. |
