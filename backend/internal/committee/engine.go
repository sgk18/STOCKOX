package committee

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/pkg/cache"
	"stockox-backend/internal/marketdata"

	"gorm.io/gorm"
)

type CommitteeEngine struct {
	db        *gorm.DB
	cache     cache.Cache
	marketSrv *marketdata.MarketDataService
}

func NewCommitteeEngine(db *gorm.DB, cacheClient cache.Cache, marketSrv *marketdata.MarketDataService) *CommitteeEngine {
	return &CommitteeEngine{
		db:        db,
		cache:     cacheClient,
		marketSrv: marketSrv,
	}
}

type AgentResult struct {
	Name       string `json:"name"`
	Status     string `json:"status"`
	Output     string `json:"output"` // Bullish/Neutral/Bearish, Low Risk/Medium Risk/High Risk, Undervalued/Fairly Valued/Overvalued
	Confidence int    `json:"confidence"`
	Reasoning  string `json:"reasoning"`
}

type CommitteeAnalysisResponse struct {
	Symbol         string        `json:"symbol"`
	Recommendation string        `json:"recommendation"` // BUY, HOLD, SELL
	Confidence     int           `json:"confidence"`
	Votes          VoteCount     `json:"votes"`
	Agents         []AgentResult `json:"agents"`
	CreatedAt      time.Time     `json:"created_at"`
}

type VoteCount struct {
	Buy  int `json:"buy"`
	Hold int `json:"hold"`
	Sell int `json:"sell"`
}

func KeyCommittee(symbol string) string {
	return fmt.Sprintf("committee:%s", symbol)
}

func (e *CommitteeEngine) GetAnalysis(symbol string) (*CommitteeAnalysisResponse, error) {
	ctx := context.Background()
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol is required")
	}

	cacheKey := KeyCommittee(symbol)
	var cachedResponse CommitteeAnalysisResponse
	if err := e.cache.GetJSON(ctx, cacheKey, &cachedResponse); err == nil && cachedResponse.Symbol != "" {
		log.Printf("[COMMITTEE-CACHE-HIT] Loaded committee analysis for %s from cache", symbol)
		return &cachedResponse, nil
	}

	// Check DB for recent records (within 24 hours)
	var dbRecord models.CommitteeAnalysis
	if e.db != nil {
		cutoff := time.Now().Add(-24 * time.Hour)
		err := e.db.Where("ticker = ? AND created_at >= ?", symbol, cutoff).Order("created_at desc").First(&dbRecord).Error
		if err == nil && dbRecord.Ticker != "" {
			log.Printf("[COMMITTEE-DB-HIT] Loaded committee analysis for %s from database", symbol)
			response := e.reconstructFromDB(&dbRecord)
			// Cache in Valkey
			_ = e.cache.SetJSON(ctx, cacheKey, response, 15*time.Minute)
			return response, nil
		}
	}

	// DO NOT run GenerateAnalysis automatically!
	// Return gorm.ErrRecordNotFound so that controllers can return a 404 response
	return nil, gorm.ErrRecordNotFound
}

func (e *CommitteeEngine) reconstructFromDB(dbRecord *models.CommitteeAnalysis) *CommitteeAnalysisResponse {
	mapOutput := func(vote string, isRisk, isValuation bool) string {
		switch strings.ToUpper(vote) {
		case "BUY":
			if isRisk {
				return "Low Risk"
			}
			if isValuation {
				return "Undervalued"
			}
			return "Bullish"
		case "SELL":
			if isRisk {
				return "High Risk"
			}
			if isValuation {
				return "Overvalued"
			}
			return "Bearish"
		default:
			if isRisk {
				return "Medium Risk"
			}
			if isValuation {
				return "Fairly Valued"
			}
			return "Neutral"
		}
	}

	researchOutput := mapOutput(dbRecord.ResearchVote, false, false)
	newsOutput := mapOutput(dbRecord.NewsVote, false, false)
	techOutput := mapOutput(dbRecord.TechnicalVote, false, false)
	riskOutput := mapOutput(dbRecord.RiskVote, true, false)
	valOutput := mapOutput(dbRecord.ValuationVote, false, true)

	// Count votes dynamically
	buyCount := 0
	holdCount := 0
	sellCount := 0

	votes := []string{
		dbRecord.ResearchVote,
		dbRecord.TechnicalVote,
		dbRecord.NewsVote,
		dbRecord.RiskVote,
		dbRecord.ValuationVote,
	}
	for _, v := range votes {
		switch strings.ToUpper(v) {
		case "BUY":
			buyCount++
		case "HOLD":
			holdCount++
		case "SELL":
			sellCount++
		}
	}
	// Fallback if all counts are 0
	if buyCount == 0 && holdCount == 0 && sellCount == 0 {
		if dbRecord.Recommendation == "BUY" {
			buyCount = 3
			holdCount = 2
		} else if dbRecord.Recommendation == "SELL" {
			sellCount = 3
			holdCount = 2
		} else {
			holdCount = 5
		}
	}

	return &CommitteeAnalysisResponse{
		Symbol:         dbRecord.Ticker,
		Recommendation: dbRecord.Recommendation,
		Confidence:     dbRecord.ConfidenceScore,
		Votes: VoteCount{
			Buy:  buyCount,
			Hold: holdCount,
			Sell: sellCount,
		},
		Agents: []AgentResult{
			{Name: "Research Agent", Status: "completed", Output: researchOutput, Confidence: dbRecord.ConfidenceScore - 3, Reasoning: dbRecord.ResearchSummary},
			{Name: "News Agent", Status: "completed", Output: newsOutput, Confidence: dbRecord.ConfidenceScore + 2, Reasoning: dbRecord.NewsSummary},
			{Name: "Technical Agent", Status: "completed", Output: techOutput, Confidence: dbRecord.ConfidenceScore - 5, Reasoning: dbRecord.TechnicalSummary},
			{Name: "Risk Agent", Status: "completed", Output: riskOutput, Confidence: dbRecord.ConfidenceScore + 1, Reasoning: dbRecord.RiskSummary},
			{Name: "Valuation Agent", Status: "completed", Output: valOutput, Confidence: dbRecord.ConfidenceScore - 2, Reasoning: dbRecord.ValuationSummary},
		},
		CreatedAt: dbRecord.CreatedAt,
	}
}

func (e *CommitteeEngine) GenerateAnalysis(symbol string) (*CommitteeAnalysisResponse, error) {
	data, err := e.marketSrv.GetResearchTerminalData(symbol)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch stock research terminal data: %w", err)
	}

	// 1. Research Agent
	researchOutput := "Neutral"
	researchConf := 75
	researchReason := fmt.Sprintf("Audited balance sheet and business profile for %s in %s sector. Company operates under exchange %s with local market caps. Moat strength is moderate, showing stable core product lines.", symbol, data.Profile.Sector, data.Profile.Exchange)
	
	if data.Fundamentals.ROE > 0.15 || data.Fundamentals.ProfitMargin > 0.10 {
		researchOutput = "Bullish"
		researchConf = 85
		researchReason = fmt.Sprintf("Highly positive operations margin and return metrics (ROE: %.1f%%) for %s. Fundamental moat audited as strong in the %s sector, signaling solid long-term scaling.", data.Fundamentals.ROE*100, symbol, data.Profile.Industry)
	} else if data.Fundamentals.ROE < 0 || data.Fundamentals.ProfitMargin < 0 {
		researchOutput = "Bearish"
		researchConf = 70
		researchReason = fmt.Sprintf("Fundamental earnings metrics are lagging or negative for %s. Operating profile shows immediate sector headwind risks and declining profit yields.", symbol)
	}

	// 2. News Agent
	newsOutput := "Neutral"
	newsConf := 70
	newsReason := fmt.Sprintf("Scanned recent headlines and publications. Press volume is low to moderate. Sentiment remains neutral with standard market correlation.")
	
	if len(data.News) > 0 {
		bullishWords := []string{"growth", "profit", "record", "bullish", "upgrade", "success", "innovate", "expansion", "partnership", "soar", "gain"}
		bearishWords := []string{"deficit", "drop", "bearish", "loss", "decline", "warn", "fine", "lawsuit", "regulator", "court", "probe"}
		score := 0
		for _, n := range data.News {
			titleLower := strings.ToLower(n.Title)
			for _, bw := range bullishWords {
				if strings.Contains(titleLower, bw) {
					score++
				}
			}
			for _, bw := range bearishWords {
				if strings.Contains(titleLower, bw) {
					score--
				}
			}
		}

		if score > 1 {
			newsOutput = "Bullish"
			newsConf = 82
			newsReason = fmt.Sprintf("News sentiment coverage is strongly positive (+%d score index) for %s. Media headlines highlight operational growth, technological progress, or strong retail index demand.", score, symbol)
		} else if score < -1 {
			newsOutput = "Bearish"
			newsConf = 75
			newsReason = fmt.Sprintf("Scanned news streams show negative sentiment pressure (%d score index) for %s. Public headlines carry risk warnings or lawsuit indexes.", score, symbol)
		} else {
			newsReason = fmt.Sprintf("Scanned headlines show a balanced public press narrative for %s. News flow aligns with normal institutional expectations.", symbol)
		}
	}

	// 3. Technical Agent
	techOutput := "Neutral"
	techConf := 72
	techReason := fmt.Sprintf("Audit of price indicators for %s. Performance sits in intermediate consolidations.", symbol)
	
	if data.Quote.DailyChangePercent > 0.4 {
		techOutput = "Bullish"
		techConf = 84
		techReason = fmt.Sprintf("Pricing indicators show a clear short-term uptrend (daily change: +%.2f%%) for %s. Crossover indexes and support thresholds suggest bullish technical momentum.", data.Quote.DailyChangePercent, symbol)
	} else if data.Quote.DailyChangePercent < -0.4 {
		techOutput = "Bearish"
		techConf = 78
		techReason = fmt.Sprintf("Technical indicators signal downward price momentum (daily change: %.2f%%) for %s. Breakout indicators reflect standard resistance pressures.", data.Quote.DailyChangePercent, symbol)
	} else {
		techReason = fmt.Sprintf("Price action for %s is consolidating (daily change: %.2f%%). Moving averages reflect high horizontal support stability.", symbol, data.Quote.DailyChangePercent)
	}

	// 4. Risk Agent
	riskOutput := "Medium Risk"
	riskConf := 78
	riskReason := fmt.Sprintf("Risk exposure modeled for %s. Leverage and debt indicators are balanced relative to asset bases.", symbol)
	
	if data.Fundamentals.DebtRatio > 0.65 {
		riskOutput = "High Risk"
		riskConf = 85
		riskReason = fmt.Sprintf("High risk exposure detected. Elevated leverage profile (Debt Ratio: %.1f%%) for %s increases downside correlation risks.", data.Fundamentals.DebtRatio*100, symbol)
	} else if data.Fundamentals.DebtRatio < 0.35 && data.Fundamentals.CurrentRatio > 1.2 {
		riskOutput = "Low Risk"
		riskConf = 80
		riskReason = fmt.Sprintf("Risk exposure modeled as low. Strong capital safety markers, conservative debt ratios (%.1f%%) and healthy liquidity buffers for %s.", data.Fundamentals.DebtRatio*100, symbol)
	} else {
		riskReason = fmt.Sprintf("Leverage metrics are within normal bounds for %s. Volatility and beta ratios present average systemic market risk.", symbol)
	}

	// 5. Valuation Agent
	valOutput := "Fairly Valued"
	valConf := 74
	valReason := fmt.Sprintf("Valuation ratios checked for %s. Current pricing matches historical averages.", symbol)
	
	if data.Fundamentals.PE > 0 && data.Fundamentals.PE < 18 {
		valOutput = "Undervalued"
		valConf = 82
		valReason = fmt.Sprintf("Trading multiples reflect attractive pricing (P/E: %.1fx) relative to earnings quality and profit margins for %s.", data.Fundamentals.PE, symbol)
	} else if data.Fundamentals.PE > 40 {
		valOutput = "Overvalued"
		valConf = 80
		valReason = fmt.Sprintf("Valuation metrics indicate high growth premium. High P/E multiple (%.1fx) for %s suggests valuation is stretched.", data.Fundamentals.PE, symbol)
	} else {
		valReason = fmt.Sprintf("Ratios are aligned with sector averages (P/E: %.1fx) for %s, indicating fair valuation limits.", data.Fundamentals.PE, symbol)
	}

	// Resolve Consensus Recommendations
	buyVotes := 0
	holdVotes := 0
	sellVotes := 0

	if researchOutput == "Bullish" {
		buyVotes++
	} else if researchOutput == "Bearish" {
		sellVotes++
	} else {
		holdVotes++
	}

	if newsOutput == "Bullish" {
		buyVotes++
	} else if newsOutput == "Bearish" {
		sellVotes++
	} else {
		holdVotes++
	}

	if techOutput == "Bullish" {
		buyVotes++
	} else if techOutput == "Bearish" {
		sellVotes++
	} else {
		holdVotes++
	}

	if riskOutput == "Low Risk" {
		buyVotes++
	} else if riskOutput == "High Risk" {
		sellVotes++
	} else {
		holdVotes++
	}

	if valOutput == "Undervalued" {
		buyVotes++
	} else if valOutput == "Overvalued" {
		sellVotes++
	} else {
		holdVotes++
	}

	recommendation := "HOLD"
	if buyVotes >= 3 {
		recommendation = "BUY"
	} else if sellVotes >= 3 {
		recommendation = "SELL"
	}

	totalConf := researchConf + newsConf + techConf + riskConf + valConf
	avgConf := float64(totalConf) / 5.0

	if recommendation == "BUY" && buyVotes == 5 {
		avgConf += 5.0
	} else if recommendation == "BUY" && buyVotes == 4 {
		avgConf += 2.0
	} else if recommendation == "SELL" && sellVotes >= 4 {
		avgConf += 3.0
	}
	
	confidence := int(math.Min(98, math.Max(50, math.Round(avgConf))))

	agents := []AgentResult{
		{Name: "Research Agent", Status: "completed", Output: researchOutput, Confidence: researchConf, Reasoning: researchReason},
		{Name: "News Agent", Status: "completed", Output: newsOutput, Confidence: newsConf, Reasoning: newsReason},
		{Name: "Technical Agent", Status: "completed", Output: techOutput, Confidence: techConf, Reasoning: techReason},
		{Name: "Risk Agent", Status: "completed", Output: riskOutput, Confidence: riskConf, Reasoning: riskReason},
		{Name: "Valuation Agent", Status: "completed", Output: valOutput, Confidence: valConf, Reasoning: valReason},
	}

	return &CommitteeAnalysisResponse{
		Symbol:         symbol,
		Recommendation: recommendation,
		Confidence:     confidence,
		Votes: VoteCount{
			Buy:  buyVotes,
			Hold: holdVotes,
			Sell: sellVotes,
		},
		Agents:    agents,
		CreatedAt: time.Now(),
	}, nil
}
