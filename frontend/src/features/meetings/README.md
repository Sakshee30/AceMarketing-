# Meetings frontend feature

Owns persisted consultations, voice-scheduler runs, calendar connection, rescheduling and reminders.

The feature preserves the existing Meetings workflow behind a feature-owned lazy boundary. Read failures preserve already-loaded meetings and scheduler evidence. Scheduling, voice scheduling, reminders and rescheduling distinguish authoritative confirmation from timeout/network ambiguity. Builders use the shared accessible dialog and dirty-work protection, while list rendering stays bounded for large workspaces.
