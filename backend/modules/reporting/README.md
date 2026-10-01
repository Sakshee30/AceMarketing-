# Reporting backend module

Owns report execution commands.

The canonical `run-report` command validates tenant and schedule identity, then delegates to the existing report scheduler which creates a delivery record and durable background job.
