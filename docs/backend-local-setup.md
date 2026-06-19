# Backend and App Local Setup

This project now has a Spring Boot backend in `backend-spring/`, a Vite React frontend in `src/`, and PostgreSQL for household state.

## What You Need

- Java 21
- Maven, or the system `mvn` command
- Node.js and npm
- Docker Desktop or another Docker runtime
- PostgreSQL via `docker-compose.yml`

## Environment File

Yes, we should use a `.env` file for local configuration and secrets.

Create it from the example:

```bash
cp .env.example .env
```

For local development, these values match `docker-compose.yml`:

```bash
PORT=8787
DATABASE_URL=jdbc:postgresql://localhost:54329/supermarket
DATABASE_USERNAME=supermarket
DATABASE_PASSWORD=supermarket
JWT_SECRET=change-me-to-a-long-random-secret-at-least-32-characters
COOKIE_SECURE=false
FRONTEND_DIST=../dist
IMPORT_LEGACY_STATE=false
LEGACY_STATE_FILE=../data/supermarket-state.json
```

Use a real random `JWT_SECRET` before testing on any shared network. Keep `.env` uncommitted.

## Database Setup

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Check that it is healthy:

```bash
docker compose ps
```

The local database is:

```text
Host: localhost
Port: 54329
Database: supermarket
Username: supermarket
Password: supermarket
```

Flyway runs automatically when the Spring backend starts, so there is no manual schema command.

To reset local database state, stop the container and delete the named volume:

```bash
docker compose down -v
docker compose up -d postgres
```

## Run Backend Only

From the project root:

cd backend-spring
mvn spring-boot:run
```

The backend runs at:

```text
http://localhost:8787
```

Health check:

```bash
curl http://localhost:8787/actuator/health
```

## Run the App in Development

Use this while building features. It runs Spring on port `8787` and Vite on port `5173` or the next free Vite port.

Terminal 1:

```bash
docker compose up -d postgres
```

Terminal 2:

npm run dev:all
```

Open the frontend:

```text
http://localhost:5173
```

Vite proxies `/api/**` to:

```text
http://127.0.0.1:8787
```

## Run as One Built App

Use this to test the same-origin mode where Spring serves the Vite `dist/` build and the API.

```bash
docker compose up -d postgres
npm run build
npm start
```

Open:

```text
https://localhost:8787
```

In this mode, Spring serves:

- `/` and frontend routes from `dist/`
- `/api/**` from the backend
- `/actuator/health` for health

If certificate files exist under `certs/`, Spring serves HTTPS automatically. It prefers:

1. `certs/tailscale-dev.pem` with `certs/tailscale-dev-key.pem`
2. `certs/local-dev.pem` with `certs/local-dev-key.pem`

When the Tailscale certificate is present, open the app from another device with the Tailscale hostname, for example:

```text
https://desktop-de1g0tf.tail0276cd.ts.net:8787
```

Set `TAILSCALE_HOST` in `.env` if your Tailscale DNS name is different; Spring logs that URL on startup.

If no local certificate pair exists, Spring falls back to plain HTTP on the same port.

## First Legacy Import

To import the old JSON file into a default household once:

```bash
IMPORT_LEGACY_STATE=true npm start
```

Watch the backend logs. It prints the generated invite code once.

After import, set this back to false in `.env`:

```bash
IMPORT_LEGACY_STATE=false
```

## Google OAuth

For Google login, create OAuth credentials in Google Cloud and set:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

In Google Cloud, configure the OAuth 2.0 Web application client with these local values:

Authorized JavaScript origins:

```text
http://localhost:8787
http://localhost:5173
https://localhost:8787
https://desktop-de1g0tf.tail0276cd.ts.net:8787
```

Authorized redirect URIs:

```text
http://localhost:8787/login/oauth2/code/google
https://localhost:8787/login/oauth2/code/google
https://desktop-de1g0tf.tail0276cd.ts.net:8787/login/oauth2/code/google
```

If testing through Vite, Google still returns to Spring on port `8787`, and Spring redirects to:

```text
/auth/callback
```

## Local Auth Flow

For no-login household access:

1. Create or import a household.
2. Copy the household invite code from the create/import response or logs.
3. Join from another browser/device using the invite code.
4. The backend sets an HttpOnly refresh cookie and returns a one-hour access token.

## Useful Commands

Backend compile:

```bash
cd backend-spring
mvn -DskipTests test-compile
```

Backend tests:

```bash
cd backend-spring
mvn test
```

Frontend build:

```bash
npm run build
```

Stop the database:

```bash
docker compose down
```

## Troubleshooting

If the backend cannot connect to PostgreSQL, check:

- Docker is running.
- `docker compose ps` shows `supermarket-postgres` as healthy.
- `.env` uses port `54329`, not `5432`.

If login refresh does not persist:

- Local development should use `COOKIE_SECURE=false`.
- Production HTTPS should use `COOKIE_SECURE=true`.

If frontend API calls fail in dev:

- Confirm Spring is running at `http://127.0.0.1:8787`.
- Confirm Vite is running and using the proxy in `vite.config.js`.

If Google OAuth fails:

- Confirm the Google redirect URI is exactly `http://localhost:8787/login/oauth2/code/google`.
- Confirm client id and secret are exported into the shell that starts Spring.
