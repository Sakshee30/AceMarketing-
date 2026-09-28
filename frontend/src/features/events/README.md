# Events frontend feature

Owns the customer-facing conversion event manager.

The feature preserves the existing event-rule, template, rule-run and activation workflows while moving them behind a feature-owned lazy boundary. The event builder uses the shared accessible dialog and dirty-work protection. Create/toggle mutations distinguish confirmed success from timeout or network uncertainty before the user retries.
