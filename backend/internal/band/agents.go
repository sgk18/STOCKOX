package band

import (
	"context"
	"fmt"
	"math/rand"
)

type Agent interface {
	Name() string
	Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error)
}

// 1. Research Agent
type ResearchAgent struct{}

func (a *ResearchAgent) Name() string { return "Research Agent" }

func (a *ResearchAgent) Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error) {
	analysis := fmt.Sprintf("Audit complete for %s. Robust revenue growth pipelines and steady operational margins verified. Competitive moat remains strong.", symbol)
	return analysis, "BUY", 88, nil
}

// 2. Technical Agent
type TechnicalAgent struct{}

func (a *TechnicalAgent) Name() string { return "Technical Agent" }

func (a *TechnicalAgent) Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error) {
	analysis := fmt.Sprintf("Auditing price charts for %s. EMA crossover points upward, RSI at 59 index, support thresholds holding robustly.", symbol)
	return analysis, "BUY", 84, nil
}

// 3. News Agent
type NewsAgent struct{}

func (a *NewsAgent) Name() string { return "News Agent" }

func (a *NewsAgent) Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error) {
	analysis := fmt.Sprintf("Scanned analyst ratings and media sentiment for %s. News flow is positive (+0.75 sentiment score) on product roadmap.", symbol)
	return analysis, "BUY", 85, nil
}

// 4. Risk Agent
type RiskAgent struct{}

func (a *RiskAgent) Name() string { return "Risk Agent" }

func (a *RiskAgent) Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error) {
	analysis := fmt.Sprintf("Value-at-Risk modeling and beta audit for %s complete. Leverage thresholds remain low, though macro beta is slightly elevated.", symbol)
	return analysis, "HOLD", 74, nil
}

// 5. Portfolio Agent
type PortfolioAgent struct{}

func (a *PortfolioAgent) Name() string { return "Portfolio Agent" }

func (a *PortfolioAgent) Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error) {
	analysis := fmt.Sprintf("Evaluating portfolio fit and allocation for %s. Position integration offers strong sector diversification with minimal tracking error.", symbol)
	return analysis, "BUY", 81, nil
}

// 6. Committee Agent
type CommitteeAgent struct{}

func (a *CommitteeAgent) Name() string { return "Committee Agent" }

func (a *CommitteeAgent) Analyze(ctx context.Context, symbol string, history []BandMessage) (string, string, int, error) {
	// Synthesize consensus based on previous agent reports in history
	buys, holds, sells := 0, 0, 0
	for _, msg := range history {
		switch msg.Recommendation {
		case "BUY":
			buys++
		case "HOLD":
			holds++
		case "SELL":
			sells++
		}
	}

	verdict := "HOLD"
	confidence := 75
	if buys >= 3 {
		verdict = "BUY"
		confidence = 80 + buys*3
	} else if sells >= 3 {
		verdict = "SELL"
		confidence = 80 + sells*3
	}

	reasoning := fmt.Sprintf("Consensus reached: %s. Vote count: BUY (%d), HOLD (%d), SELL (%d). Supported by strong fundamentals, positive media indices, and favorable portfolio integration metrics.", verdict, buys, holds, sells)

	return reasoning, verdict, confidence, nil
}

// Helper function to return list of all agents in correct sequence
func GetAgents() []Agent {
	return []Agent{
		&ResearchAgent{},
		&TechnicalAgent{},
		&NewsAgent{},
		&RiskAgent{},
		&PortfolioAgent{},
		&CommitteeAgent{},
	}
}

// Helper to simulate upside and target price
func GenerateTargetPrice(symbol string, currentPrice float64, verdict string) float64 {
	var mult float64
	if verdict == "BUY" {
		mult = 1.10 + rand.Float64()*0.10
	} else if verdict == "SELL" {
		mult = 0.85 + rand.Float64()*0.08
	} else {
		mult = 0.98 + rand.Float64()*0.05
	}
	return currentPrice * mult
}
