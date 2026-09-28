# Offline Attribution frontend feature

Owns calls, WhatsApp, CTWA and offline-revenue attribution configuration.

The extraction preserves rule creation, pause/enable, identity-reconciliation tests, CTWA evidence, call/WhatsApp bridges and suggested templates. Mutations distinguish confirmed success, confirmed rejection and unknown network/timeout outcomes; unknown outcomes require an authoritative refresh before retry. The rule builder remains protected as dirty work and uses the shared accessible dialog boundary.
