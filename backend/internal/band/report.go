package band

import (
	"fmt"
	"math"
	"strings"
)

type FinalReport struct {
	ExecutiveSummary   string     `json:"executive_summary"`
	ResearchFindings   string     `json:"research_findings"`
	TechnicalFindings  string     `json:"technical_findings"`
	NewsFindings       string     `json:"news_findings"`
	RiskFindings       string     `json:"risk_findings"`
	CommitteeDecision  string     `json:"committee_decision"`
	BullCase           string     `json:"bull_case"`
	BearCase           string     `json:"bear_case"`
	InvestmentHorizon  string     `json:"investment_horizon"`
	InvestmentVerdict  string     `json:"investment_verdict"`
	TargetPrice        float64    `json:"target_price"`
	UpsidePct          float64    `json:"upside_pct"`
	VoteResult         VoteResult `json:"vote_result"`
}

func GenerateFinalReport(ticker string, stockCtx StockContext, messages []BandMessage, voteResult VoteResult) FinalReport {
	// Extract latest messages for each agent
	var r1Research, r2Research, r1Tech, r2Tech, r1News, r2News, r1Risk, r2Risk string
	for _, m := range messages {
		if m.Round == 1 {
			switch m.Agent {
			case "Research Agent":
				r1Research = m.Analysis
			case "Technical Agent":
				r1Tech = m.Analysis
			case "News Agent":
				r1News = m.Analysis
			case "Risk Agent":
				r1Risk = m.Analysis
			}
		} else if m.Round == 2 {
			switch m.Agent {
			case "Research Agent":
				r2Research = m.Analysis
			case "Technical Agent":
				r2Tech = m.Analysis
			case "News Agent":
				r2News = m.Analysis
			case "Risk Agent":
				r2Risk = m.Analysis
			}
		}
	}

	researchFinal := r2Research
	if researchFinal == "" {
		researchFinal = r1Research
	}
	techFinal := r2Tech
	if techFinal == "" {
		techFinal = r1Tech
	}
	newsFinal := r2News
	if newsFinal == "" {
		newsFinal = r1News
	}
	riskFinal := r2Risk
	if riskFinal == "" {
		riskFinal = r1Risk
	}

	// 1. Calculate Target Price dynamically
	targetPrice := stockCtx.CurrentPrice
	upsidePct := 0.0

	// PE-based + momentum adjustment
	peFactor := 1.0
	if stockCtx.PERatio > 0 {
		if stockCtx.PERatio < 30 {
			peFactor = 1.15 // undervalued multiplier
		} else if stockCtx.PERatio > 60 {
			peFactor = 0.95 // overvalued headwind
		}
	}

	momentumFactor := 1.0
	if stockCtx.FiftyTwoWHigh > stockCtx.FiftyTwoWLow {
		fiftyTwoWRangePos := (stockCtx.CurrentPrice - stockCtx.FiftyTwoWLow) / (stockCtx.FiftyTwoWHigh - stockCtx.FiftyTwoWLow)
		if fiftyTwoWRangePos > 0.75 {
			momentumFactor = 1.08 // strong momentum
		} else if fiftyTwoWRangePos < 0.25 {
			momentumFactor = 0.92 // weak momentum
		}
	}

	aiScoreAdjustment := 1.0 + (float64(stockCtx.AIScore-75) / 200.0) // ranges from ~0.85 to ~1.10

	switch voteResult.Recommendation {
	case "BUY":
		targetPrice = stockCtx.CurrentPrice * 1.12 * peFactor * momentumFactor * aiScoreAdjustment
		if targetPrice < stockCtx.CurrentPrice {
			// Ensure target is above current price for a BUY
			targetPrice = stockCtx.CurrentPrice * 1.10
		}
	case "SELL":
		targetPrice = stockCtx.CurrentPrice * 0.85 * peFactor * momentumFactor * aiScoreAdjustment
		if targetPrice > stockCtx.CurrentPrice {
			// Ensure target is below current price for a SELL
			targetPrice = stockCtx.CurrentPrice * 0.90
		}
	default: // HOLD
		targetPrice = stockCtx.CurrentPrice * 1.01 * peFactor * momentumFactor
	}

	// Clean up decimal points
	targetPrice = math.Round(targetPrice*100) / 100
	if stockCtx.CurrentPrice > 0 {
		upsidePct = ((targetPrice - stockCtx.CurrentPrice) / stockCtx.CurrentPrice) * 100
		upsidePct = math.Round(upsidePct*100) / 100
	}

	// 2. Draft cases based on metrics
	var bullPoints, bearPoints []string

	if stockCtx.PERatio < 35 {
		bullPoints = append(bullPoints, fmt.Sprintf("Attractive valuation profile with a P/E of %.1f, representing a reasonable multiple compared to historical peers.", stockCtx.PERatio))
	} else {
		bearPoints = append(bearPoints, fmt.Sprintf("Premium valuation at P/E %.1f leaves narrow margin for error if growth rates slow down.", stockCtx.PERatio))
	}

	if stockCtx.DebtRatio < 0.35 {
		bullPoints = append(bullPoints, fmt.Sprintf("Rock-solid balance sheet with low leverage (Debt Ratio: %.2f), offering excellent capitalization and protection against macro shocks.", stockCtx.DebtRatio))
	} else {
		bearPoints = append(bearPoints, fmt.Sprintf("Elevated financial leverage (Debt Ratio: %.2f) limits strategic flexibility and poses higher interest rate sensitivity.", stockCtx.DebtRatio))
	}

	if stockCtx.AIScore >= 85 {
		bullPoints = append(bullPoints, fmt.Sprintf("High overall advisory score (%d/100) reflecting dominant market share in its primary sectors and strong operational efficiency.", stockCtx.AIScore))
	} else {
		bearPoints = append(bearPoints, fmt.Sprintf("Sub-optimal advisory score (%d/100) points to underlying market pressures or near-term industry headwind struggles.", stockCtx.AIScore))
	}

	if stockCtx.DailyChangePct > 1.5 {
		bullPoints = append(bullPoints, fmt.Sprintf("Positive technical breakout momentum backed by high relative daily trading volume (%s).", stockCtx.Volume))
	} else if stockCtx.DailyChangePct < -1.5 {
		bearPoints = append(bearPoints, fmt.Sprintf("Recent selling pressure shows short-term bearish flow; volume stands at %s.", stockCtx.Volume))
	}

	// Fallbacks if lists are empty
	if len(bullPoints) == 0 {
		bullPoints = append(bullPoints, "Strategic position in a key industry sector provides structural long-term support.", "Favorable long-term demand curve for core products.")
	}
	if len(bearPoints) == 0 {
		bearPoints = append(bearPoints, "Macro headwinds and potential consumer spending slowdown could depress sales.", "Increasing competitive density in core operating sectors.")
	}

	bullCaseStr := strings.Join(bullPoints, " ")
	bearCaseStr := strings.Join(bearPoints, " ")

	// 3. Draft Executive Summary
	execSummary := fmt.Sprintf(
		"The Stockox Multi-Agent Committee has completed its 3-round collaborative debate regarding %s (%s). Under a weighted voting framework, the agents generated a consensus decision of %s with a confidence rating of %d%%. Fundamental metrics highlight a debt ratio of %.2f and P/E ratio of %.1f, with a 52-week price range of $%.2f - $%.2f. Technical analysis tracks near-term price activity near $%.2f. Based on these inputs, our model sets a 12-month target price of $%.2f, representing an estimated return of %.2f%% from current levels.",
		stockCtx.CompanyName, ticker, voteResult.Recommendation, voteResult.ConfidenceScore, stockCtx.DebtRatio, stockCtx.PERatio, stockCtx.FiftyTwoWLow, stockCtx.FiftyTwoWHigh, stockCtx.CurrentPrice, targetPrice, upsidePct,
	)

	investmentHorizon := "Medium Term (6-12 months)"
	if voteResult.Recommendation == "BUY" && stockCtx.DebtRatio < 0.25 {
		investmentHorizon = "Long Term (12-24 months) Core Allocation"
	} else if voteResult.Recommendation == "SELL" {
		investmentHorizon = "Tactical Horizon (Immediate exit or hedging)"
	}

	verdictStr := fmt.Sprintf("The committee resolves to issue a %s rating for %s. The primary driver is the alignment of %s findings with the prevailing risk constraints, yielding a robust consensus score.", voteResult.Recommendation, ticker, strings.ToLower(voteResult.Recommendation))

	return FinalReport{
		ExecutiveSummary:   execSummary,
		ResearchFindings:   researchFinal,
		TechnicalFindings:  techFinal,
		NewsFindings:       newsFinal,
		RiskFindings:       riskFinal,
		CommitteeDecision:  verdictStr,
		BullCase:           bullCaseStr,
		BearCase:           bearCaseStr,
		InvestmentHorizon:  investmentHorizon,
		InvestmentVerdict:  verdictStr,
		TargetPrice:        targetPrice,
		UpsidePct:          upsidePct,
		VoteResult:         voteResult,
	}
}
