# Feedback frontend feature

Owns customer feedback collection, theme analysis, journey context and routing into governed follow-up workflows.

The feature preserves the existing Feedback Agent workflow while moving it behind a feature-owned lazy boundary. Reads preserve already-loaded responses if refresh fails. Recording feedback, requesting feedback and routing insights distinguish confirmed backend outcomes from timeout/network ambiguity. Mutation forms and journey details use the shared accessible dialog boundary, and open feedback drafts participate in dirty-work protection.
