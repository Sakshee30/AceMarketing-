# Ask Ace frontend feature

Owns the grounded journey and attribution assistant inside the authenticated customer workspace.

The feature preserves starter prompts, live workspace answers, confidence/evidence surfaces, journey timelines and follow-up questions while moving the implementation behind a feature-owned lazy boundary. Conversation and rendered timeline history are bounded to protect long-running browser sessions. Failed assistant requests remain explicit and do not fabricate workspace metrics.
