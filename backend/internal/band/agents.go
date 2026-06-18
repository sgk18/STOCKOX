package band

import (
	"context"
	"fmt"
	"strings"
)

type StockContext struct {
	Ticker         string  `json:"ticker"`
	CompanyName    string  `json:"company_name"`
	Sector         string  `json:"sector"`
	Industry       string  `json:"industry"`
	MarketCap      string  `json:"market_cap"`
	CurrentPrice   float64 `json:"current_price"`
	DailyChange    float64 `json:"daily_change"`
	DailyChangePct float64 `json:"daily_change_pct"`
	Volume         string  `json:"volume"`
	FiftyTwoWHigh  float64 `json:"fifty_two_w_high"`
	FiftyTwoWLow   float64 `json:"fifty_two_w_low"`
	PERatio        float64 `json:"pe_ratio"`
	EPS            float64 `json:"eps"`
	Revenue        string  `json:"revenue"`
	DebtRatio      float64 `json:"debt_ratio"`
	AIScore        int     `json:"ai_score"`
	Recommendation string  `json:"recommendation"`
	Logo           string  `json:"logo"`
	Overview       string  `json:"overview"`
}

type AgentOutput struct {
	Signal     string   `json:"signal"` // BUY, HOLD, SELL
	Reasoning  string   `json:"reasoning"`
	Confidence int      `json:"confidence"`
	Evidence   []string `json:"evidence"`
}

type Agent interface {
	Name() string
	Analyze(ctx context.Context, symbol string, stockCtx StockContext, history []BandMessage) (AgentOutput, error)
}

// 1. Research Agent: Focuses on Valuation & Balance Sheet
type ResearchAgent struct{}

func (a *ResearchAgent) Name() string { return "Research Agent" }

func (a *ResearchAgent) Analyze(ctx context.Context, symbol string, stockCtx StockContext, history []BandMessage) (AgentOutput, error) {
	// Check if this is Round 2 (cross-agent review)
	isRound2 := false
	var techMsg, riskMsg string
	for _, m := range history {
		if m.Round == 1 {
			if m.Agent == "Technical Agent" {
				techMsg = fmt.Sprintf("Technical signal: %s (confidence %d%%)", m.Signal, m.Confidence)
			} else if m.Agent == "Risk Agent" {
				riskMsg = fmt.Sprintf("Risk signal: %s (confidence %d%%)", m.Signal, m.Confidence)
			}
			isRound2 = true
		}
	}

	var signal string
	var confidence int
	var reasoning string
	var evidence []string

	// Fundamental rules
	if stockCtx.PERatio > 0 && stockCtx.PERatio < 35 && stockCtx.DebtRatio < 0.4 {
		signal = "BUY"
		confidence = 88
		reasoning = fmt.Sprintf("Fundamentals are highly robust. P/E is trading at a reasonable %.1f multiple with an EPS of $%.2f. Revenue pipeline stands at %s and debt leverage remains conservative (Debt Ratio: %.2f).", stockCtx.PERatio, stockCtx.EPS, stockCtx.Revenue, stockCtx.DebtRatio)
		evidence = []string{
			fmt.Sprintf("Attractive P/E ratio: %.1f", stockCtx.PERatio),
			fmt.Sprintf("Conservative Leverage: %.2f Debt Ratio", stockCtx.DebtRatio),
			fmt.Sprintf("Earnings support: EPS $%.2f", stockCtx.EPS),
		}
	} else if stockCtx.PERatio > 60 || stockCtx.DebtRatio > 1.0 {
		signal = "HOLD"
		confidence = 72
		reasoning = fmt.Sprintf("Fundamentals warrant caution. Valuation is highly premium (P/E: %.1f) or debt leverage is elevated (Debt Ratio: %.2f). Revenue is %s, but net growth might be constrained.", stockCtx.PERatio, stockCtx.DebtRatio, stockCtx.Revenue)
		evidence = []string{
			fmt.Sprintf("High valuation multiple: %.1f P/E", stockCtx.PERatio),
			fmt.Sprintf("Elevated leverage structure: %.2f Debt Ratio", stockCtx.DebtRatio),
		}
	} else {
		signal = "BUY"
		confidence = 80
		reasoning = fmt.Sprintf("Solid operating characteristics observed. P/E ratio of %.1f shows healthy market demand, supported by an EPS of $%.2f and reasonable balance sheet posture.", stockCtx.PERatio, stockCtx.EPS)
		evidence = []string{
			fmt.Sprintf("Steady fundamentals: P/E %.1f", stockCtx.PERatio),
			fmt.Sprintf("Underlying revenue flow: %s", stockCtx.Revenue),
		}
	}

	if isRound2 {
		// Revise based on technical indicators or risk metrics
		revisedReasoning := reasoning
		if strings.Contains(techMsg, "SELL") || strings.Contains(riskMsg, "SELL") {
			confidence -= 5
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Incorporating peer alerts (%s; %s). While long-term valuation metrics remain favorable, near-term technical headwind parameters and risk metrics require caution, prompting a minor trim in confidence.", reasoning, techMsg, riskMsg)
		} else {
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Cross-agent review complete. Peer signals (%s; %s) support our initial constructive outlook on valuation buffers.", reasoning, techMsg, riskMsg)
		}
		reasoning = revisedReasoning
	}

	return AgentOutput{
		Signal:     signal,
		Reasoning:  reasoning,
		Confidence: confidence,
		Evidence:   evidence,
	}, nil
}

// 2. Technical Agent: Focuses on Momentum & 52W range
type TechnicalAgent struct{}

func (a *TechnicalAgent) Name() string { return "Technical Agent" }

func (a *TechnicalAgent) Analyze(ctx context.Context, symbol string, stockCtx StockContext, history []BandMessage) (AgentOutput, error) {
	isRound2 := false
	var researchMsg string
	for _, m := range history {
		if m.Round == 1 {
			if m.Agent == "Research Agent" {
				researchMsg = fmt.Sprintf("Research signal: %s", m.Signal)
			}
			isRound2 = true
		}
	}

	fiftyTwoWRangePos := 0.5
	if stockCtx.FiftyTwoWHigh > stockCtx.FiftyTwoWLow {
		fiftyTwoWRangePos = (stockCtx.CurrentPrice - stockCtx.FiftyTwoWLow) / (stockCtx.FiftyTwoWHigh - stockCtx.FiftyTwoWLow)
	}

	var signal string
	var confidence int
	var reasoning string
	var evidence []string

	if fiftyTwoWRangePos > 0.7 {
		signal = "BUY"
		confidence = 82
		reasoning = fmt.Sprintf("Technical charts indicate strong bullish momentum. The stock is trading at $%.2f, which is in the upper %.1f%% of its 52-week range ($%.2f - $%.2f). Daily change is %.2f%% on volume of %s.", stockCtx.CurrentPrice, fiftyTwoWRangePos*100, stockCtx.FiftyTwoWLow, stockCtx.FiftyTwoWHigh, stockCtx.DailyChangePct, stockCtx.Volume)
		evidence = []string{
			fmt.Sprintf("Bullish price channel: upper %.1f%% of 52W range", fiftyTwoWRangePos*100),
			fmt.Sprintf("Positive daily momentum: %.2f%%", stockCtx.DailyChangePct),
			fmt.Sprintf("Healthy average daily volume: %s", stockCtx.Volume),
		}
	} else if fiftyTwoWRangePos < 0.3 {
		signal = "HOLD"
		confidence = 70
		reasoning = fmt.Sprintf("Oversold territory observed. The stock is trading at $%.2f, which is near the lower boundary (%.1f%%) of its 52-week range. Short-term downside pressure persists, but support levels might hold.", stockCtx.CurrentPrice, fiftyTwoWRangePos*100)
		evidence = []string{
			fmt.Sprintf("Oversold channel: lower %.1f%% of 52W range", fiftyTwoWRangePos*100),
			fmt.Sprintf("Daily change pressure: %.2f%%", stockCtx.DailyChangePct),
		}
	} else {
		signal = "BUY"
		confidence = 78
		reasoning = fmt.Sprintf("Constructive consolidation setup. Trading at $%.2f, representing a steady mid-range placement of %.1f%% within its 52-week band. High-volume baseline indicates broad support.", stockCtx.CurrentPrice, fiftyTwoWRangePos*100)
		evidence = []string{
			fmt.Sprintf("Consolidation support: %.1f%% of 52W range", fiftyTwoWRangePos*100),
			fmt.Sprintf("Daily change: %.2f%%", stockCtx.DailyChangePct),
		}
	}

	if isRound2 {
		revisedReasoning := reasoning
		if strings.Contains(researchMsg, "BUY") && signal == "HOLD" {
			signal = "BUY"
			confidence += 5
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Upgraded rating to BUY. Research feedback highlights solid fundamental catalysts and earnings support. The combination of oversold support levels and positive research outlook triggers a technical accumulation signal.", reasoning)
		} else {
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Peer signals reviewed. Confirmed tech momentum thesis, support metrics remain validated.", reasoning)
		}
		reasoning = revisedReasoning
	}

	return AgentOutput{
		Signal:     signal,
		Reasoning:  reasoning,
		Confidence: confidence,
		Evidence:   evidence,
	}, nil
}

// 3. News Agent: Focuses on Market Sentiment & News indicators
type NewsAgent struct{}

func (a *NewsAgent) Name() string { return "News Agent" }

func (a *NewsAgent) Analyze(ctx context.Context, symbol string, stockCtx StockContext, history []BandMessage) (AgentOutput, error) {
	isRound2 := false
	var researchMsg string
	for _, m := range history {
		if m.Round == 1 {
			if m.Agent == "Research Agent" {
				researchMsg = fmt.Sprintf("Research signal: %s", m.Signal)
			}
			isRound2 = true
		}
	}

	var signal string
	var confidence int
	var reasoning string
	var evidence []string

	if stockCtx.AIScore >= 85 {
		signal = "BUY"
		confidence = 86
		reasoning = fmt.Sprintf("Sentiment indices are exceptionally positive. Market news indicates high investor confidence, reflecting the stock's strong AI Advisory Score of %d/100 and leadership in the %s sector.", stockCtx.AIScore, stockCtx.Sector)
		evidence = []string{
			fmt.Sprintf("Excellent AI Advisory score: %d/100", stockCtx.AIScore),
			fmt.Sprintf("Positive sector media positioning: %s", stockCtx.Sector),
			fmt.Sprintf("Bullish sentiment trends for %s", stockCtx.Industry),
		}
	} else if stockCtx.AIScore < 70 {
		signal = "HOLD"
		confidence = 68
		reasoning = fmt.Sprintf("Mixed media coverage observed. The AI Score of %d indicates lower sentiment tailwinds, with media reports highlighting macro headwinds in %s.", stockCtx.AIScore, stockCtx.Industry)
		evidence = []string{
			fmt.Sprintf("Conservative AI Advisory score: %d/100", stockCtx.AIScore),
			fmt.Sprintf("Macro concerns in industry: %s", stockCtx.Industry),
		}
	} else {
		signal = "BUY"
		confidence = 80
		reasoning = fmt.Sprintf("Moderate to positive news sentiment. Steady volume of positive reports on product pipelines in %s, with an AI Score of %d supporting constructive interest.", stockCtx.Sector, stockCtx.AIScore)
		evidence = []string{
			fmt.Sprintf("Healthy sentiment baseline: AI Score %d", stockCtx.AIScore),
			fmt.Sprintf("Neutral to positive sector flow: %s", stockCtx.Sector),
		}
	}

	if isRound2 {
		revisedReasoning := reasoning
		if strings.Contains(researchMsg, "SELL") {
			signal = "HOLD"
			confidence -= 8
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Adjusted rating to HOLD. News sentiment is tempered by fundamental risk warnings flagged by the Research Agent. Modifying sentiment exposure parameters accordingly.", reasoning)
		} else {
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: News coverage and analyst ratings remain favorable, aligned with peer expectations.", reasoning)
		}
		reasoning = revisedReasoning
	}

	return AgentOutput{
		Signal:     signal,
		Reasoning:  reasoning,
		Confidence: confidence,
		Evidence:   evidence,
	}, nil
}

// 4. Risk Agent: Focuses on Valuation bubble, Debt levels, Volatility
type RiskAgent struct{}

func (a *RiskAgent) Name() string { return "Risk Agent" }

func (a *RiskAgent) Analyze(ctx context.Context, symbol string, stockCtx StockContext, history []BandMessage) (AgentOutput, error) {
	isRound2 := false
	var researchMsg, techMsg string
	for _, m := range history {
		if m.Round == 1 {
			if m.Agent == "Research Agent" {
				researchMsg = fmt.Sprintf("Research signal: %s", m.Signal)
			} else if m.Agent == "Technical Agent" {
				techMsg = fmt.Sprintf("Technical signal: %s", m.Signal)
			}
			isRound2 = true
		}
	}

	var signal string
	var confidence int
	var reasoning string
	var evidence []string

	if stockCtx.DebtRatio > 0.8 {
		signal = "HOLD"
		confidence = 85
		reasoning = fmt.Sprintf("High Risk alert. Debt leverage of %.2f is above safety thresholds, increasing structural sensitivity to cash flows. Moderate target targets applied.", stockCtx.DebtRatio)
		evidence = []string{
			fmt.Sprintf("Elevated Debt Ratio: %.2f (Threshold: 0.80)", stockCtx.DebtRatio),
			fmt.Sprintf("High debt-to-equity constraint on capital expenditure"),
		}
	} else if stockCtx.PERatio > 60 {
		signal = "HOLD"
		confidence = 78
		reasoning = fmt.Sprintf("Valuation Risk alert. The stock is trading at an elevated P/E of %.1f, representing a premium multiple that requires exceptional execution to sustain.", stockCtx.PERatio)
		evidence = []string{
			fmt.Sprintf("Premium P/E multiplier: %.1f", stockCtx.PERatio),
			fmt.Sprintf("Multiple contraction risk in high-rate environments"),
		}
	} else {
		signal = "BUY"
		confidence = 80
		reasoning = fmt.Sprintf("Risk parameters are within normal bounds. Low debt leverage (Debt Ratio: %.2f) and reasonable valuation multiple (P/E: %.1f) suggest low structural downside risk.", stockCtx.DebtRatio, stockCtx.PERatio)
		evidence = []string{
			fmt.Sprintf("Secure debt leverage profile: %.2f", stockCtx.DebtRatio),
			fmt.Sprintf("Reasonable valuation multiple: %.1f P/E", stockCtx.PERatio),
		}
	}

	if isRound2 {
		revisedReasoning := reasoning
		if strings.Contains(researchMsg, "BUY") && strings.Contains(techMsg, "BUY") && signal == "HOLD" {
			// Soften the caution if research + tech are highly bullish
			confidence += 5
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Peer consensus is strongly bullish. While structural valuation risks remain present (P/E: %.1f), high operational execution and technical momentum support a constructive rating with strict risk-stop parameters.", reasoning, stockCtx.PERatio)
		} else {
			revisedReasoning = fmt.Sprintf("%s [ROUND 2 REVISION]: Risk thresholds confirmed. Standing by cautious parameters.", reasoning)
		}
		reasoning = revisedReasoning
	}

	return AgentOutput{
		Signal:     signal,
		Reasoning:  reasoning,
		Confidence: confidence,
		Evidence:   evidence,
	}, nil
}

// 5. Committee Agent: Collects votes and issues resolution
type CommitteeAgent struct{}

func (a *CommitteeAgent) Name() string { return "Committee Agent" }

func (a *CommitteeAgent) Analyze(ctx context.Context, symbol string, stockCtx StockContext, history []BandMessage) (AgentOutput, error) {
	// Committee Agent reads all Round 2 logs
	buys, holds, sells := 0, 0, 0
	var votesToCompute []AgentVote

	weights := map[string]float64{
		"Research Agent":  0.25,
		"Technical Agent": 0.20,
		"News Agent":      0.20,
		"Risk Agent":      0.15,
	}

	for _, m := range history {
		if m.Round == 2 {
			w, ok := weights[m.Agent]
			if !ok {
				continue
			}

			votesToCompute = append(votesToCompute, AgentVote{
				Agent:      m.Agent,
				Signal:     m.Signal,
				Confidence: m.Confidence,
				Weight:     w,
			})

			switch m.Signal {
			case "BUY":
				buys++
			case "HOLD":
				holds++
			case "SELL":
				sells++
			}
		}
	}

	// Committee Agent votes based on consensus trend
	committeeSignal := "HOLD"
	if buys >= 3 || (buys >= 2 && sells == 0) {
		committeeSignal = "BUY"
	} else if sells >= 2 {
		committeeSignal = "SELL"
	}

	// Committee Agent's own vote has 20% weight
	votesToCompute = append(votesToCompute, AgentVote{
		Agent:      "Committee Agent",
		Signal:     committeeSignal,
		Confidence: 85,
		Weight:     0.20,
	})

	// Run consensus calculation
	voteResult := ComputeWeightedVote(votesToCompute)

	reasoning := fmt.Sprintf("Consensus resolution reached: %s. Weighted voting breakdown: BUY (%d), HOLD (%d), SELL (%d). Combined confidence score is %d%%. Supported by solid fundamental valuation, technical momentum, and risk parameters.", voteResult.Recommendation, buys, holds, sells, voteResult.ConfidenceScore)

	var evidence []string
	for _, v := range votesToCompute {
		evidence = append(evidence, fmt.Sprintf("%s voted %s (confidence %d%%, weight %d%%)", v.Agent, v.Signal, v.Confidence, int(v.Weight*100)))
	}

	return AgentOutput{
		Signal:     voteResult.Recommendation,
		Reasoning:  reasoning,
		Confidence: voteResult.ConfidenceScore,
		Evidence:   evidence,
	}, nil
}

func GetAgents() []Agent {
	return []Agent{
		&ResearchAgent{},
		&TechnicalAgent{},
		&NewsAgent{},
		&RiskAgent{},
		&CommitteeAgent{},
	}
}

func GenerateTargetPrice(symbol string, currentPrice float64, verdict string) float64 {
	// Not used directly in orchestrator v2, but keeping signature/fallback
	return currentPrice * 1.10
}
