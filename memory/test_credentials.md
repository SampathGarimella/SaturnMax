# Saturn Max Technologies — Test Credentials

No real auth is wired yet (Firebase is planned — login UI is a placeholder). The candidate dashboard is driven by the seeded demo candidate below.

## Demo candidate (dashboard data source)

- **Email**: `rahul@email.com`
- **Name**: Rahul Sharma
- **Role label**: Job Candidate
- **Applications seeded**: 4 (AI/ML Engineer · under_review, Senior Full Stack Dev · interview, Cloud DevOps Engineer · pending, Data Engineer · not_shortlisted)
- **Activity seeded**: 5 entries

### How the demo works

1. Open `/login` and click **"Enter demo"** in the dashed blue card → sets `localStorage.saturnmax:session = { email: "rahul@email.com", name: "Rahul Sharma" }` and navigates to `/dashboard`.
2. Or navigate directly to `/dashboard` — the layout will auto-bootstrap the same demo session if none exists, so the dashboard is never empty.

### Direct API tests (no auth)

```bash
API="https://0f73298b-2489-40e1-b9bc-ca67edc62fc8.preview.emergentagent.com"
curl -s "$API/api/health"
curl -s "$API/api/jobs"
curl -s "$API/api/dashboard/rahul@email.com"
```
