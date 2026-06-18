package band

import (
	"fmt"
)

type AgentVote struct {
	Agent          string  `json:"agent"`
	Signal         string  `json:"signal"` // BUY, HOLD, SELL
	Confidence     int     `json:"confidence"`
	Weight         float64 `json:"weight"`
	WeightedScore  float64 `json:"weighted_score"`
}

type VoteResult struct {
	Recommendation  string      `json:"recommendation"` // BUY, HOLD, SELL
	WeightedScore   float64     `json:"weighted_score"`
	ConfidenceScore int         `json:"confidence_score"`
	Breakdown       []AgentVote `json:"breakdown"`
}

// ComputeWeightedVote calculates the consensus vote based on agent signals and weights.
func ComputeWeightedVote(votes []AgentVote) VoteResult {
	if len(votes) == 0 {
		return VoteResult{Recommendation: "HOLD", WeightedScore: 0, ConfidenceScore: 50, Breakdown: nil}
	}

	totalScore := 0.0
	totalWeight := 0.0
	totalConfidence := 0.0

	for i, v := range votes {
		var signalVal float64
		switch v.Signal {
		case "BUY":
			signalVal = 1.0
		case "SELL":
			signalVal = -1.0
		default: // HOLD
			signalVal = 0.0
		}

		weightedVal := signalVal * v.Weight
		votes[i].WeightedScore = weightedVal

		totalScore += weightedVal
		totalWeight += v.Weight
		totalConfidence += float64(v.Confidence) * v.Weight
	}

	// Normalize if total weight isn't exactly 1.0 (though it should be)
	var finalScore float64
	if totalWeight > 0 {
		finalScore = totalScore / totalWeight
	}

	var rec string
	if finalScore > 0.25 {
		rec = "BUY"
	} else if finalScore < -0.25 {
		rec = "SELL"
	} else {
		rec = "HOLD"
	}

	finalConfidence := 50
	if totalWeight > 0 {
		finalConfidence = int(totalConfidence / totalWeight)
	}
	if finalConfidence < 0 {
		finalConfidence = 0
	} else if finalConfidence > 100 {
		finalConfidence = 100
	}

	fmt.Printf("[BAND-VOTING] Consensus calculated: Score=%f, Recommendation=%s, Confidence=%d\n", finalScore, rec, finalConfidence)

	return VoteResult{
		Recommendation:  rec,
		WeightedScore:   finalScore,
		ConfidenceScore: finalConfidence,
		Breakdown:       votes,
	}
}
