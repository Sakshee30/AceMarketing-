# Platform Control Center frontend

This is the separate privileged frontend composition required by the architecture standard.

Current phase is intentionally **read-only**. The application exposes all required control-center page ownership boundaries and an isolated deployment/CSP/session surface, but it does not fabricate operational state and does not expose write controls before the backend control API implements privileged authorization, impact analysis, approval, orchestration, verification, idempotency and recovery contracts.

The customer app and public website do not import this application. Customer local-storage tokens and workspace identifiers are not read here.
