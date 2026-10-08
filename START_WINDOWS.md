# Start AceMarketing on Windows

Double-click `start.bat`, or run it in a terminal:

```bat
start.bat
```

Open **http://localhost:5173**. Frontend edits update through Vite hot reload; backend edits restart the API through Node watch mode. Keep the window open; Ctrl+C stops the processes launched by it. Node.js 24 LTS with npm is recommended. Dependencies install from the lockfile on first launch and whenever that lockfile or Node version changes. An occupied application port causes a clear error instead of attaching to an unrelated process.

The launcher reads an existing `.env`. With `DATABASE_URL` configured, it applies migrations and starts a worker as well as the API and frontend. Without PostgreSQL, it uses the application's development embedded database; this does not provide durable database data or background integration delivery. This startup does not import the separate 10,000-lead demo dataset.

For the built application:

```bat
start.bat production
```

First configure `.env` using `backend/.env.example`: your PostgreSQL connection, authentication secrets, owner credentials, allowed origins and deployment mode. Production mode builds the frontend, runs migrations and preflight checks, and launches the existing application supervisor. Its default web address is **http://localhost:8080**; `.env` may change the port. Optional ML and other services require the dependencies and credentials for the selected mode.

## Changes and CI/CD

Saving a file updates the **local development application**. GitHub workflows run on committed changes pushed to `main`; they do not observe unsaved files or edits on your PC. Existing `.github/workflows/ci.yml` performs CI checks. The existing release workflow builds and publishes container images on version tags or manual execution; it does not deploy them to a hosting target.

To make pushed changes live on a public URL, configure a hosting target and a deployment workflow that runs after CI succeeds. The target determines deployment credentials, database migrations, health checks and rollback. A server or hosting service has not yet been specified, so automatic public deployment is not configured by this launcher.
