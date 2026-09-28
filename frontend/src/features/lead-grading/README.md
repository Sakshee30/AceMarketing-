# Lead Grading frontend feature

Owns the customer-facing lead scoring and grading workspace.

The feature preserves current lead selection, explainable score evidence, manual grade override, grade distribution and downstream activation behavior while moving them behind a feature-owned lazy boundary. Reads expose explicit loading/retry states and preserve visible evidence during transient failures. Grade override and activation mutations distinguish confirmed success from timeout/network uncertainty, duplicate submissions are blocked, and large lead/driver collections are bounded in the browser.
