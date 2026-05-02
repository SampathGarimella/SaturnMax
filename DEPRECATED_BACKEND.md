# Deprecated Backend

The `backend/` FastAPI and MongoDB service is deprecated as of the Firebase-only Phase 1 stabilization work.

Active production architecture:
- Firebase Auth for identity
- Firestore for application data
- Firebase Storage for resumes, offers, onboarding, and consultant documents
- Firestore and Storage Security Rules for authorization

Do not add new product features to `backend/`. Keep it only as historical reference until the Phase 4 cleanup removes the directory. Future privileged server work should use Firebase Cloud Functions or another Firebase-native trusted execution path.
