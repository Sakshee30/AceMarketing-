# Grouped Performance frontend feature

Owns the customer-facing grouped conversion, revenue, cost-basis and contribution workspace.

The feature preserves current dimension switching, conversion-event contract, grouped evidence, explicit operator-entered cost basis and contribution/margin calculations while moving them behind a feature-owned lazy boundary. Dimension reads are sequence-guarded, transient failures preserve visible evidence, dirty cost drafts participate in customer-work protection, save mutations distinguish confirmed success from timeout/network uncertainty, and large group tables are bounded in browser rendering.
