// Compatibility surface retained for branch history.
// Activation proposals are the single authoritative recommendation-review lifecycle.
export {
  attachActivationProposalReviewerJob as attachRecommendationReviewJob,
  markActivationProposalReviewerBlocked as markRecommendationReviewBlocked,
  recordActivationProposalReviewerFailure as recordRecommendationReviewFailure,
  recordActivationProposalReviewerResult as recordRecommendationReviewResult
} from './ai-activation-proposals.mjs'
