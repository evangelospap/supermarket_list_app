# Supermarket Household Backend

Spring Boot backend for household-scoped supermarket lists.

For the complete local database, `.env`, backend, and full-app runbook, see
[`../docs/backend-local-setup.md`](../docs/backend-local-setup.md).

## Local Run

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Build the React app once so Spring can serve `dist/`:

```bash
npm run build
```

Run Spring:

```bash
cd backend-spring
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home mvn spring-boot:run
```

The backend listens on `http://localhost:8787`.

## Legacy Import

To import the old `data/supermarket-state.json` into a default household:

```bash
IMPORT_LEGACY_STATE=true mvn spring-boot:run
```

The generated invite code is logged once at startup.

## Google OAuth

Configure Google OAuth with standard Spring properties, for example:

```bash
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=...
```

The OAuth success redirect is `/auth/callback`.
