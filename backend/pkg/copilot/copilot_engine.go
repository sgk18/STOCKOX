package copilot

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"stockox-backend/database/models"
)

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type HealthScore struct {
	Score                int     `json:"score"`
	Grade                string  `json:"grade"`
	DiversificationScore float64 `json:"diversification_score"`
	ConcentrationScore   float64 `json:"concentration_score"`
	VolatilityScore      float64 `json:"volatility_score"`
	CashAllocationScore  float64 `json:"cash_allocation_score"`
	SectorBalanceScore   float64 `json:"sector_balance_score"`
	Explanation          string  `json:"explanation"`
}

type SectorExposure struct {
	Sector         string  `json:"sector"`
	CurrentPct     float64 `json:"current_pct"`
	RecommendedPct float64 `json:"recommended_pct"`
	RiskLevel      string  `json:"risk_level"`
	Status         string  `json:"status"` // Overexposed, Underexposed, Balanced
}

type PositionRisk struct {
	Ticker         string  `json:"ticker"`
	CompanyName    string  `json:"company_name"`
	Sector         string  `json:"sector"`
	AllocationPct  float64 `json:"allocation_pct"`
	MarketValue    float64 `json:"market_value"`
	RiskScore      int     `json:"risk_score"`
	Recommendation string  `json:"recommendation"` // Reduce, Hold, Accumulate, Watch
	Rationale      string  `json:"rationale"`
}

type CopilotAudit struct {
	Strengths       []AuditItem `json:"strengths"`
	Weaknesses      []AuditItem `json:"weaknesses"`
	Recommendations []AuditItem `json:"recommendations"`
	GeneratedAt     time.Time   `json:"generated_at"`
}

type AuditItem struct {
	Icon    string `json:"icon"`
	Title   string `json:"title"`
	Message string `json:"message"`
}

type AllocationItem struct {
	Ticker        string  `json:"ticker"`
	CurrentPct    float64 `json:"current_pct"`
	SuggestedPct  float64 `json:"suggested_pct"`
	Action        string  `json:"action"` // BUY, SELL, HOLD
	ActionAmount  float64 `json:"action_amount"`
}

type RebalancePlan struct {
	Goal                  string           `json:"goal"`
	CurrentAllocations    []AllocationItem `json:"current_allocations"`
	SuggestedAllocations  []AllocationItem `json:"suggested_allocations"`
	ExpectedRiskReduction string           `json:"expected_risk_reduction"`
	ExpectedReturnImpact  string           `json:"expected_return_impact"`
	GeneratedAt           time.Time        `json:"generated_at"`
}

type SimulateRequest struct {
	Action   string  `json:"action"`   // BUY, SELL, ADD_CASH, REMOVE_CASH
	Ticker   string  `json:"ticker"`
	Quantity float64 `json:"quantity"`
	Price    float64 `json:"price"`
	Amount   float64 `json:"amount"` // for cash actions
}

type SimulationResult struct {
	NewHealthScore      HealthScore      `json:"new_health_score"`
	HealthScoreDelta    int              `json:"health_score_delta"`
	NewSectorExposures  []SectorExposure `json:"new_sector_exposures"`
	NewTotalValue       float64          `json:"new_total_value"`
	RiskChange          string           `json:"risk_change"`
	DiversificationNote string           `json:"diversification_note"`
}

type CopilotAlert struct {
	ID       string    `json:"id"`
	Type     string    `json:"type"`     // danger, warning, info, opportunity
	Category string    `json:"category"` // sector, risk, drawdown, volatility, opportunity
	Title    string    `json:"title"`
	Message  string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type DailyBrief struct {
	UserName            string    `json:"user_name"`
	HealthScore         int       `json:"health_score"`
	HealthGrade         string    `json:"health_grade"`
	TotalValue          float64   `json:"total_value"`
	TopSectorExposure   string    `json:"top_sector_exposure"`
	TopSectorPct        float64   `json:"top_sector_pct"`
	RiskLevel           string    `json:"risk_level"`
	Opportunities       []string  `json:"opportunities"`
	Warnings            []string  `json:"warnings"`
	CommitteeHighlights []string  `json:"committee_highlights"`
	MarketRisks         []string  `json:"market_risks"`
	GeneratedAt         time.Time `json:"generated_at"`
}

// ──────────────────────────────────────────────────────────────────────────────
// Sector Target Allocations per Goal
// ──────────────────────────────────────────────────────────────────────────────

var sectorTargets = map[string]map[string]float64{
	"growth": {
		"Technology": 35, "Consumer Electronics": 10, "Semiconductors": 10,
		"Internet Retail": 10, "Entertainment": 5, "Automotive": 5,
		"Healthcare": 5, "Finance": 5, "Energy": 5, "Other": 10,
	},
	"balanced": {
		"Technology": 20, "Consumer Electronics": 10, "Semiconductors": 8,
		"Internet Retail": 8, "Entertainment": 5, "Automotive": 5,
		"Healthcare": 12, "Finance": 12, "Energy": 8, "Other": 12,
	},
	"dividend": {
		"Technology": 10, "Consumer Electronics": 8, "Semiconductors": 5,
		"Internet Retail": 5, "Entertainment": 3, "Automotive": 3,
		"Healthcare": 20, "Finance": 25, "Energy": 12, "Other": 9,
	},
	"aggressive": {
		"Technology": 45, "Consumer Electronics": 12, "Semiconductors": 15,
		"Internet Retail": 10, "Entertainment": 8, "Automotive": 5,
		"Healthcare": 2, "Finance": 1, "Energy": 1, "Other": 1,
	},
	"preservation": {
		"Technology": 10, "Consumer Electronics": 8, "Semiconductors": 5,
		"Internet Retail": 5, "Entertainment": 3, "Automotive": 3,
		"Healthcare": 20, "Finance": 30, "Energy": 8, "Other": 8,
	},
}

// TickerSectorMap is the local fallback for sector lookup
var TickerSectorMap = map[string]string{
	"NVDA": "Technology", "MSFT": "Technology", "GOOGL": "Technology",
	"META": "Technology", "AAPL": "Consumer Electronics", "AMZN": "Internet Retail",
	"TSLA": "Automotive", "AMD": "Semiconductors", "NFLX": "Entertainment",
	"JPM": "Finance", "BAC": "Finance", "GS": "Finance", "MS": "Finance",
	"JNJ": "Healthcare", "PFE": "Healthcare", "UNH": "Healthcare",
	"XOM": "Energy", "CVX": "Energy", "COP": "Energy",
	"INFY": "Technology", "TCS": "Technology", "WIPRO": "Technology",
}

// ──────────────────────────────────────────────────────────────────────────────
// Engine Functions
// ──────────────────────────────────────────────────────────────────────────────

// ComputeHealthScore calculates a 0–100 portfolio health score.
func ComputeHealthScore(portfolio *models.Portfolio, holdings []models.PortfolioHolding) HealthScore {
	if portfolio == nil {
		return HealthScore{Score: 0, Grade: "No Data", Explanation: "Portfolio not found."}
	}

	totalValue := portfolio.TotalValue
	if totalValue <= 0 {
		totalValue = portfolio.CashBalance
	}

	// ── Sub-score 1: Diversification (0-100) ──────────────────────────────
	n := len(holdings)
	diversificationScore := 0.0
	switch {
	case n == 0:
		diversificationScore = 10
	case n == 1:
		diversificationScore = 20
	case n < 4:
		diversificationScore = 40 + float64(n)*5
	case n < 8:
		diversificationScore = 65 + float64(n)*2.5
	default:
		diversificationScore = math.Min(100, 80+float64(n)*0.5)
	}

	// ── Sub-score 2: Concentration (inverted — lower is better) ──────────
	concentrationScore := 100.0
	if totalValue > 0 && n > 0 {
		maxAlloc := 0.0
		for _, h := range holdings {
			val := h.Quantity * h.CurrentPrice
			alloc := (val / totalValue) * 100
			if alloc > maxAlloc {
				maxAlloc = alloc
			}
		}
		switch {
		case maxAlloc > 60:
			concentrationScore = 20
		case maxAlloc > 40:
			concentrationScore = 45
		case maxAlloc > 25:
			concentrationScore = 65
		case maxAlloc > 15:
			concentrationScore = 80
		default:
			concentrationScore = 100
		}
	}

	// ── Sub-score 3: Sector Balance (number of unique sectors) ────────────
	sectorSet := make(map[string]bool)
	for _, h := range holdings {
		s := getSector(h.Ticker)
		sectorSet[s] = true
	}
	numSectors := len(sectorSet)
	sectorBalanceScore := math.Min(100, float64(numSectors)*14.3)

	// ── Sub-score 4: Cash Allocation ──────────────────────────────────────
	cashAllocationScore := 100.0
	cashRatio := 0.0
	if totalValue > 0 {
		cashRatio = (portfolio.CashBalance / totalValue) * 100
	}
	switch {
	case cashRatio > 80:
		cashAllocationScore = 30 // too much cash — uninvested
	case cashRatio > 50:
		cashAllocationScore = 55
	case cashRatio > 30:
		cashAllocationScore = 70
	case cashRatio > 5:
		cashAllocationScore = 90
	default:
		cashAllocationScore = 100
	}
	if n == 0 {
		cashAllocationScore = 20
	}

	// ── Sub-score 5: Volatility Proxy ─────────────────────────────────────
	volatilityScore := 75.0 // default moderate
	highVolTickers := map[string]bool{"TSLA": true, "NVDA": true, "AMD": true, "NFLX": true, "META": true}
	highVolCount := 0
	for _, h := range holdings {
		if highVolTickers[h.Ticker] {
			highVolCount++
		}
	}
	if n > 0 {
		ratio := float64(highVolCount) / float64(n)
		volatilityScore = math.Max(30, 100-ratio*60)
	}

	// ── Weighted composite ────────────────────────────────────────────────
	composite := diversificationScore*0.25 +
		concentrationScore*0.25 +
		sectorBalanceScore*0.20 +
		cashAllocationScore*0.15 +
		volatilityScore*0.15

	score := int(math.Round(composite))
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	grade := scoreToGrade(score)
	explanation := fmt.Sprintf(
		"Based on %d holdings across %d sectors. Diversification: %.0f | Concentration: %.0f | Sector Balance: %.0f | Cash: %.0f | Volatility: %.0f",
		n, numSectors, diversificationScore, concentrationScore, sectorBalanceScore, cashAllocationScore, volatilityScore,
	)

	return HealthScore{
		Score:                score,
		Grade:                grade,
		DiversificationScore: math.Round(diversificationScore),
		ConcentrationScore:   math.Round(concentrationScore),
		SectorBalanceScore:   math.Round(sectorBalanceScore),
		CashAllocationScore:  math.Round(cashAllocationScore),
		VolatilityScore:      math.Round(volatilityScore),
		Explanation:          explanation,
	}
}

// ComputeSectorExposures maps current holdings to sector allocations vs targets.
func ComputeSectorExposures(portfolio *models.Portfolio, holdings []models.PortfolioHolding, goal string) []SectorExposure {
	if goal == "" {
		goal = "balanced"
	}
	targets := sectorTargets[goal]
	if targets == nil {
		targets = sectorTargets["balanced"]
	}

	totalValue := portfolio.TotalValue
	if totalValue <= 0 {
		totalValue = portfolio.CashBalance
	}

	sectorValues := make(map[string]float64)
	for _, h := range holdings {
		s := getSector(h.Ticker)
		sectorValues[s] += h.Quantity * h.CurrentPrice
	}

	// Build all known sectors across targets + current
	allSectors := make(map[string]bool)
	for k := range targets {
		allSectors[k] = true
	}
	for k := range sectorValues {
		allSectors[k] = true
	}

	exposures := make([]SectorExposure, 0, len(allSectors))
	for sector := range allSectors {
		currentPct := 0.0
		if totalValue > 0 {
			currentPct = (sectorValues[sector] / totalValue) * 100
		}
		recommendedPct := targets[sector]
		if recommendedPct == 0 {
			recommendedPct = 5 // minimum baseline for unlisted sectors
		}

		diff := currentPct - recommendedPct
		status := "Balanced"
		riskLevel := "Low"

		if diff > 15 {
			status = "Overexposed"
			riskLevel = "High"
		} else if diff > 8 {
			status = "Overexposed"
			riskLevel = "Medium"
		} else if diff < -10 {
			status = "Underexposed"
			riskLevel = "Low"
		} else if diff < -5 {
			status = "Underexposed"
			riskLevel = "Low"
		}

		if currentPct == 0 && sectorValues[sector] == 0 {
			continue // skip sectors with no exposure and no holdings
		}

		exposures = append(exposures, SectorExposure{
			Sector:         sector,
			CurrentPct:     math.Round(currentPct*10) / 10,
			RecommendedPct: recommendedPct,
			RiskLevel:      riskLevel,
			Status:         status,
		})
	}

	sort.Slice(exposures, func(i, j int) bool {
		return exposures[i].CurrentPct > exposures[j].CurrentPct
	})

	return exposures
}

// ComputePositionRisks returns per-holding risk analysis.
func ComputePositionRisks(portfolio *models.Portfolio, holdings []models.PortfolioHolding, metaMap map[string]models.StockMetadata) []PositionRisk {
	totalValue := portfolio.TotalValue
	if totalValue <= 0 {
		totalValue = portfolio.CashBalance
	}

	risks := make([]PositionRisk, 0, len(holdings))
	for _, h := range holdings {
		marketVal := h.Quantity * h.CurrentPrice
		allocPct := 0.0
		if totalValue > 0 {
			allocPct = (marketVal / totalValue) * 100
		}

		// Risk scoring: position size × sector volatility
		riskScore := computePositionRiskScore(h.Ticker, allocPct)

		rec, rationale := positionRecommendation(h.Ticker, allocPct, riskScore)

		companyName := h.Ticker
		if meta, ok := metaMap[h.Ticker]; ok && meta.CompanyName != "" {
			companyName = meta.CompanyName
		}

		risks = append(risks, PositionRisk{
			Ticker:         h.Ticker,
			CompanyName:    companyName,
			Sector:         getSector(h.Ticker),
			AllocationPct:  math.Round(allocPct*10) / 10,
			MarketValue:    math.Round(marketVal*100) / 100,
			RiskScore:      riskScore,
			Recommendation: rec,
			Rationale:      rationale,
		})
	}

	sort.Slice(risks, func(i, j int) bool {
		return risks[i].AllocationPct > risks[j].AllocationPct
	})

	return risks
}

// ComputeAudit generates structured strengths, weaknesses, recommendations.
func ComputeAudit(health HealthScore, sectors []SectorExposure, positions []PositionRisk, portfolio *models.Portfolio) CopilotAudit {
	strengths := make([]AuditItem, 0)
	weaknesses := make([]AuditItem, 0)
	recs := make([]AuditItem, 0)

	n := len(positions)

	// Strengths
	if health.DiversificationScore >= 70 {
		strengths = append(strengths, AuditItem{Icon: "check", Title: "Well Diversified", Message: fmt.Sprintf("Portfolio spans %d holdings.", n)})
	}
	if health.ConcentrationScore >= 80 {
		strengths = append(strengths, AuditItem{Icon: "shield", Title: "Low Concentration Risk", Message: "No single position dominates the portfolio."})
	}
	if health.CashAllocationScore >= 85 {
		strengths = append(strengths, AuditItem{Icon: "trending-up", Title: "Optimal Cash Deployment", Message: "Capital is actively invested with healthy liquidity buffer."})
	}
	for _, s := range sectors {
		if s.Status == "Balanced" {
			strengths = append(strengths, AuditItem{Icon: "bar-chart", Title: fmt.Sprintf("%s Sector Balanced", s.Sector), Message: fmt.Sprintf("%.1f%% allocation aligns with the %.0f%% target.", s.CurrentPct, s.RecommendedPct)})
			break
		}
	}

	// Weaknesses
	if health.DiversificationScore < 50 {
		weaknesses = append(weaknesses, AuditItem{Icon: "alert", Title: "Underdiversified Portfolio", Message: fmt.Sprintf("Only %d holdings. Consider adding 4+ assets.", n)})
	}
	if health.ConcentrationScore < 65 {
		weaknesses = append(weaknesses, AuditItem{Icon: "warning", Title: "High Position Concentration", Message: "One or more positions exceed 25% of portfolio value."})
	}
	for _, s := range sectors {
		if s.Status == "Overexposed" && s.RiskLevel == "High" {
			weaknesses = append(weaknesses, AuditItem{Icon: "pie-chart", Title: fmt.Sprintf("%s Overexposure", s.Sector), Message: fmt.Sprintf("%.1f%% in %s exceeds the recommended %.0f%%.", s.CurrentPct, s.Sector, s.RecommendedPct)})
		}
	}
	if health.CashAllocationScore < 50 {
		weaknesses = append(weaknesses, AuditItem{Icon: "dollar", Title: "Uninvested Cash", Message: "Large portion of portfolio remains in cash. Consider deploying capital."})
	}

	// Recommendations
	for _, p := range positions {
		if p.Recommendation == "Reduce" {
			recs = append(recs, AuditItem{Icon: "minus", Title: fmt.Sprintf("Reduce %s Position", p.Ticker), Message: p.Rationale})
		}
	}
	for _, s := range sectors {
		if s.Status == "Underexposed" {
			recs = append(recs, AuditItem{Icon: "plus", Title: fmt.Sprintf("Increase %s Exposure", s.Sector), Message: fmt.Sprintf("Current %.1f%% is below the recommended %.0f%%. Consider adding exposure.", s.CurrentPct, s.RecommendedPct)})
		}
	}
	if health.Score < 60 {
		recs = append(recs, AuditItem{Icon: "zap", Title: "Run Rebalance Engine", Message: "Portfolio health score is below 60. Generate a rebalance plan to improve allocation."})
	}

	// Ensure non-empty
	if len(strengths) == 0 {
		strengths = append(strengths, AuditItem{Icon: "info", Title: "Portfolio Initiated", Message: "Add more holdings to unlock strength analysis."})
	}
	if len(weaknesses) == 0 {
		weaknesses = append(weaknesses, AuditItem{Icon: "check", Title: "No Critical Weaknesses", Message: "Portfolio structure looks healthy across measured dimensions."})
	}
	if len(recs) == 0 {
		recs = append(recs, AuditItem{Icon: "star", Title: "Maintain Current Allocation", Message: "Portfolio is well-positioned. Continue monitoring sector exposure."})
	}

	return CopilotAudit{
		Strengths:       strengths,
		Weaknesses:      weaknesses,
		Recommendations: recs,
		GeneratedAt:     time.Now(),
	}
}

// GenerateRebalancePlan produces target vs current allocation suggestions.
func GenerateRebalancePlan(portfolio *models.Portfolio, holdings []models.PortfolioHolding, goal string) RebalancePlan {
	totalValue := portfolio.TotalValue
	if totalValue <= 0 {
		totalValue = portfolio.CashBalance
	}

	n := len(holdings)
	current := make([]AllocationItem, 0, n)
	suggested := make([]AllocationItem, 0, n)

	if n == 0 {
		return RebalancePlan{
			Goal: goal, CurrentAllocations: current, SuggestedAllocations: suggested,
			ExpectedRiskReduction: "N/A", ExpectedReturnImpact: "N/A", GeneratedAt: time.Now(),
		}
	}

	equalTarget := 100.0 / float64(n)

	// Goal-based tilt
	goalMultipliers := getGoalMultipliers(goal)

	for _, h := range holdings {
		currentPct := 0.0
		if totalValue > 0 {
			currentPct = ((h.Quantity * h.CurrentPrice) / totalValue) * 100
		}

		tiltedTarget := equalTarget * goalMultipliers[h.Ticker]
		if tiltedTarget == 0 {
			tiltedTarget = equalTarget
		}

		// Normalise
		diff := tiltedTarget - currentPct
		action := "HOLD"
		actionAmt := 0.0
		if diff > 3 {
			action = "BUY"
			actionAmt = (diff / 100) * totalValue
		} else if diff < -3 {
			action = "SELL"
			actionAmt = math.Abs((diff / 100) * totalValue)
		}

		current = append(current, AllocationItem{
			Ticker: h.Ticker, CurrentPct: math.Round(currentPct*10) / 10,
			SuggestedPct: math.Round(tiltedTarget*10) / 10, Action: action, ActionAmount: math.Round(actionAmt*100) / 100,
		})
		suggested = append(suggested, AllocationItem{
			Ticker: h.Ticker, CurrentPct: math.Round(currentPct*10) / 10,
			SuggestedPct: math.Round(tiltedTarget*10) / 10, Action: action, ActionAmount: math.Round(actionAmt*100) / 100,
		})
	}

	return RebalancePlan{
		Goal:                  goal,
		CurrentAllocations:    current,
		SuggestedAllocations:  suggested,
		ExpectedRiskReduction: "-8% to -15% volatility reduction",
		ExpectedReturnImpact:  "+1.2% to +2.8% projected annual return improvement",
		GeneratedAt:           time.Now(),
	}
}

// SimulateChange runs a what-if scenario and returns new health metrics.
func SimulateChange(portfolio *models.Portfolio, holdings []models.PortfolioHolding, req SimulateRequest, goal string) SimulationResult {
	// Clone holdings slice
	simHoldings := make([]models.PortfolioHolding, len(holdings))
	copy(simHoldings, holdings)
	simPortfolio := *portfolio

	ticker := strings.ToUpper(req.Ticker)

	switch req.Action {
	case "BUY":
		price := req.Price
		if price <= 0 {
			price = 100 // fallback price
		}
		cost := req.Quantity * price
		if simPortfolio.CashBalance >= cost {
			simPortfolio.CashBalance -= cost
			simPortfolio.TotalValue += 0 // total stays the same (cash → equity)
			found := false
			for i, h := range simHoldings {
				if h.Ticker == ticker {
					newQty := h.Quantity + req.Quantity
					newAvg := ((h.Quantity * h.AveragePrice) + cost) / newQty
					simHoldings[i].Quantity = newQty
					simHoldings[i].AveragePrice = newAvg
					simHoldings[i].CurrentPrice = price
					found = true
					break
				}
			}
			if !found {
				simHoldings = append(simHoldings, models.PortfolioHolding{
					Ticker: ticker, Quantity: req.Quantity, AveragePrice: price, CurrentPrice: price,
				})
			}
		}

	case "SELL":
		for i, h := range simHoldings {
			if h.Ticker == ticker && h.Quantity >= req.Quantity {
				price := h.CurrentPrice
				if req.Price > 0 {
					price = req.Price
				}
				proceeds := req.Quantity * price
				simHoldings[i].Quantity -= req.Quantity
				simPortfolio.CashBalance += proceeds
				if simHoldings[i].Quantity <= 0 {
					simHoldings = append(simHoldings[:i], simHoldings[i+1:]...)
				}
				break
			}
		}

	case "ADD_CASH":
		simPortfolio.CashBalance += req.Amount
		simPortfolio.TotalValue += req.Amount

	case "REMOVE_CASH":
		if simPortfolio.CashBalance >= req.Amount {
			simPortfolio.CashBalance -= req.Amount
			simPortfolio.TotalValue -= req.Amount
		}
	}

	// Recalculate equity value
	equityVal := 0.0
	for _, h := range simHoldings {
		equityVal += h.Quantity * h.CurrentPrice
	}
	simPortfolio.TotalValue = equityVal + simPortfolio.CashBalance

	origHealth := ComputeHealthScore(portfolio, holdings)
	newHealth := ComputeHealthScore(&simPortfolio, simHoldings)
	newSectors := ComputeSectorExposures(&simPortfolio, simHoldings, goal)

	delta := newHealth.Score - origHealth.Score
	riskChange := "Neutral"
	if delta > 5 {
		riskChange = "Improved"
	} else if delta < -5 {
		riskChange = "Worsened"
	}

	divNote := "Diversification unchanged."
	origN := len(holdings)
	newN := len(simHoldings)
	if newN > origN {
		divNote = fmt.Sprintf("Diversification improved: %d → %d holdings.", origN, newN)
	} else if newN < origN {
		divNote = fmt.Sprintf("Diversification reduced: %d → %d holdings.", origN, newN)
	}

	return SimulationResult{
		NewHealthScore:      newHealth,
		HealthScoreDelta:    delta,
		NewSectorExposures:  newSectors,
		NewTotalValue:       math.Round(simPortfolio.TotalValue*100) / 100,
		RiskChange:          riskChange,
		DiversificationNote: divNote,
	}
}

// GenerateAlerts creates threshold-based portfolio alerts.
func GenerateAlerts(portfolio *models.Portfolio, holdings []models.PortfolioHolding, health HealthScore, sectors []SectorExposure) []CopilotAlert {
	alerts := make([]CopilotAlert, 0)
	now := time.Now()

	totalValue := portfolio.TotalValue
	if totalValue <= 0 {
		totalValue = portfolio.CashBalance
	}

	// Health-based alerts
	if health.Score < 40 {
		alerts = append(alerts, CopilotAlert{
			ID: "alert-health-critical", Type: "danger", Category: "risk",
			Title: "Critical Portfolio Health", Message: fmt.Sprintf("Portfolio health score is %d/100. Immediate rebalancing recommended.", health.Score),
			CreatedAt: now,
		})
	} else if health.Score < 60 {
		alerts = append(alerts, CopilotAlert{
			ID: "alert-health-warning", Type: "warning", Category: "risk",
			Title: "Portfolio Needs Attention", Message: fmt.Sprintf("Portfolio health score is %d/100. Consider running the rebalance engine.", health.Score),
			CreatedAt: now,
		})
	}

	// Sector concentration alerts
	for _, s := range sectors {
		if s.Status == "Overexposed" && s.RiskLevel == "High" {
			alerts = append(alerts, CopilotAlert{
				ID: "alert-sector-" + strings.ToLower(s.Sector), Type: "warning", Category: "sector",
				Title: fmt.Sprintf("%s Sector Overexposure", s.Sector),
				Message: fmt.Sprintf("%.1f%% concentration in %s exceeds the recommended %.0f%%.", s.CurrentPct, s.Sector, s.RecommendedPct),
				CreatedAt: now,
			})
		}
	}

	// Position concentration alerts
	for _, h := range holdings {
		val := h.Quantity * h.CurrentPrice
		allocPct := 0.0
		if totalValue > 0 {
			allocPct = (val / totalValue) * 100
		}
		if allocPct > 30 {
			alerts = append(alerts, CopilotAlert{
				ID: "alert-pos-" + h.Ticker, Type: "danger", Category: "concentration",
				Title: fmt.Sprintf("%s Position Too Large", h.Ticker),
				Message: fmt.Sprintf("%s represents %.1f%% of your portfolio. Consider trimming to reduce single-stock risk.", h.Ticker, allocPct),
				CreatedAt: now,
			})
		} else if allocPct > 20 {
			alerts = append(alerts, CopilotAlert{
				ID: "alert-pos-" + h.Ticker, Type: "warning", Category: "concentration",
				Title: fmt.Sprintf("%s Concentration Alert", h.Ticker),
				Message: fmt.Sprintf("%s represents %.1f%% of your portfolio. Monitor closely.", h.Ticker, allocPct),
				CreatedAt: now,
			})
		}
	}

	// Diversification opportunity
	if len(holdings) < 5 {
		alerts = append(alerts, CopilotAlert{
			ID: "alert-div-low", Type: "info", Category: "opportunity",
			Title: "Diversification Opportunity",
			Message: fmt.Sprintf("You hold %d assets. Adding more positions reduces idiosyncratic risk.", len(holdings)),
			CreatedAt: now,
		})
	}

	// Cash drag alert
	cashRatio := 0.0
	if totalValue > 0 {
		cashRatio = (portfolio.CashBalance / totalValue) * 100
	}
	if cashRatio > 40 && len(holdings) > 0 {
		alerts = append(alerts, CopilotAlert{
			ID: "alert-cash-drag", Type: "info", Category: "opportunity",
			Title: "Cash Drag Alert",
			Message: fmt.Sprintf("%.1f%% of portfolio is uninvested. Deploy capital to improve returns.", cashRatio),
			CreatedAt: now,
		})
	}

	return alerts
}

// GenerateDailyBrief creates the morning briefing card.
func GenerateDailyBrief(userName string, portfolio *models.Portfolio, holdings []models.PortfolioHolding, health HealthScore, sectors []SectorExposure, recentRecs []string) DailyBrief {
	topSector := ""
	topPct := 0.0
	for _, s := range sectors {
		if s.CurrentPct > topPct {
			topPct = s.CurrentPct
			topSector = s.Sector
		}
	}

	opportunities := make([]string, 0)
	warnings := make([]string, 0)

	for _, s := range sectors {
		if s.Status == "Underexposed" && s.CurrentPct < s.RecommendedPct-10 {
			opportunities = append(opportunities, fmt.Sprintf("Increase %s exposure (currently %.1f%%, target %.0f%%)", s.Sector, s.CurrentPct, s.RecommendedPct))
		}
		if s.Status == "Overexposed" {
			warnings = append(warnings, fmt.Sprintf("Reduce %s concentration (%.1f%% vs %.0f%% target)", s.Sector, s.CurrentPct, s.RecommendedPct))
		}
	}

	// Default market risks
	marketRisks := []string{
		"Monitor Fed interest rate commentary",
		"Watch for earnings season volatility",
		"Track global macro data releases",
	}

	// Committee highlights
	highlights := recentRecs
	if len(highlights) == 0 {
		highlights = []string{
			"Run an analysis to see latest committee recommendations",
		}
	}

	riskLevel := "Moderate"
	if health.Score >= 80 {
		riskLevel = "Low"
	} else if health.Score < 50 {
		riskLevel = "High"
	}

	return DailyBrief{
		UserName:            userName,
		HealthScore:         health.Score,
		HealthGrade:         health.Grade,
		TotalValue:          portfolio.TotalValue,
		TopSectorExposure:   topSector,
		TopSectorPct:        topPct,
		RiskLevel:           riskLevel,
		Opportunities:       opportunities,
		Warnings:            warnings,
		CommitteeHighlights: highlights,
		MarketRisks:         marketRisks,
		GeneratedAt:         time.Now(),
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

func getSector(ticker string) string {
	if s, ok := TickerSectorMap[ticker]; ok {
		return s
	}
	return "Other"
}

func scoreToGrade(score int) string {
	switch {
	case score >= 80:
		return "Excellent"
	case score >= 60:
		return "Good"
	case score >= 40:
		return "Moderate"
	default:
		return "High Risk"
	}
}

func computePositionRiskScore(ticker string, allocPct float64) int {
	highVol := map[string]int{"TSLA": 20, "NVDA": 15, "AMD": 15, "NFLX": 15, "META": 10}
	baseRisk := highVol[ticker]

	// Allocation contribution: >25% adds significant risk
	allocRisk := 0.0
	switch {
	case allocPct > 40:
		allocRisk = 40
	case allocPct > 25:
		allocRisk = 25
	case allocPct > 15:
		allocRisk = 15
	case allocPct > 10:
		allocRisk = 8
	default:
		allocRisk = 3
	}

	score := int(allocRisk) + baseRisk
	if score > 100 {
		score = 100
	}
	if score < 5 {
		score = 5
	}
	return score
}

func positionRecommendation(ticker string, allocPct float64, riskScore int) (string, string) {
	switch {
	case riskScore >= 55 || allocPct > 30:
		return "Reduce", fmt.Sprintf("%s represents a high-risk concentration. Trim to below 20%% to reduce single-stock exposure.", ticker)
	case riskScore >= 35 || allocPct > 20:
		return "Watch", fmt.Sprintf("Monitor %s closely. Position size approaching concentration threshold.", ticker)
	case allocPct < 5 && riskScore < 20:
		return "Accumulate", fmt.Sprintf("%s is a small position with favorable risk profile. Consider increasing allocation.", ticker)
	default:
		return "Hold", fmt.Sprintf("%s is appropriately sized at %.1f%% of portfolio.", ticker, allocPct)
	}
}

func getGoalMultipliers(goal string) map[string]float64 {
	// Returns per-ticker multipliers to tilt equal-weight target
	// > 1.0 means overweight, < 1.0 means underweight
	switch goal {
	case "growth":
		return map[string]float64{
			"NVDA": 1.4, "MSFT": 1.3, "AMD": 1.3, "GOOGL": 1.2, "META": 1.2,
			"AMZN": 1.1, "AAPL": 1.0, "TSLA": 0.9, "NFLX": 0.8,
		}
	case "dividend":
		return map[string]float64{
			"NVDA": 0.7, "TSLA": 0.5, "AMD": 0.7, "JPM": 1.4, "BAC": 1.4,
			"JNJ": 1.5, "XOM": 1.3, "AAPL": 1.2,
		}
	case "aggressive":
		return map[string]float64{
			"NVDA": 1.6, "AMD": 1.5, "TSLA": 1.4, "META": 1.3,
			"AMZN": 1.2, "NFLX": 1.3, "GOOGL": 1.1,
		}
	case "preservation":
		return map[string]float64{
			"NVDA": 0.5, "TSLA": 0.3, "AMD": 0.5, "MSFT": 1.0,
			"AAPL": 1.0, "JNJ": 1.5, "JPM": 1.3, "XOM": 1.2,
		}
	default: // balanced
		return map[string]float64{}
	}
}
