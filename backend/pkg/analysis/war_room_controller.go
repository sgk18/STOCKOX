package analysis

import (
	"net/http"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/pkg/errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WarRoomController handles the unified War Room session endpoints
type WarRoomController struct {
	db *gorm.DB
}

func NewWarRoomController(db *gorm.DB) *WarRoomController {
	return &WarRoomController{db: db}
}

// WarRoomSessionResponse is the unified payload for the War Room frontend
type WarRoomSessionResponse struct {
	Session  *WarRoomSession  `json:"session"`
	Messages []WarRoomMessage `json:"messages"`
	Votes    *WarRoomVotes    `json:"votes,omitempty"`
	Analysis *WarRoomAnalysis `json:"analysis,omitempty"`
}

type WarRoomSession struct {
	ID              string    `json:"id"`
	Ticker          string    `json:"ticker"`
	CompanyName     string    `json:"company_name"`
	Status          string    `json:"status"`
	ProgressPercent int       `json:"progress_percent"`
	CurrentAgent    string    `json:"current_agent"`
	AgentStatus     string    `json:"agent_status"`
	Recommendation  string    `json:"recommendation,omitempty"`
	ConfidenceScore int       `json:"confidence_score,omitempty"`
	RiskLevel       string    `json:"risk_level,omitempty"`
	Summary         string    `json:"summary,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type WarRoomMessage struct {
	ID              string    `json:"id"`
	AgentName       string    `json:"agent_name"`
	Message         string    `json:"message"`
	MessageType     string    `json:"message_type"`
	ConfidenceScore int       `json:"confidence_score"`
	CreatedAt       time.Time `json:"created_at"`
}

type WarRoomVotes struct {
	ResearchVote  string `json:"research_vote"`
	TechnicalVote string `json:"technical_vote"`
	NewsVote      string `json:"news_vote"`
	RiskVote      string `json:"risk_vote"`
	ValuationVote string `json:"valuation_vote"`
	BuyCount      int    `json:"buy_count"`
	HoldCount     int    `json:"hold_count"`
	SellCount     int    `json:"sell_count"`
}

type WarRoomAnalysis struct {
	ResearchSummary  string  `json:"research_summary"`
	TechnicalSummary string  `json:"technical_summary"`
	NewsSummary      string  `json:"news_summary"`
	RiskSummary      string  `json:"risk_summary"`
	ValuationSummary string  `json:"valuation_summary"`
	TargetPrice      float64 `json:"target_price"`
	BullCase         string  `json:"bull_case"`
	BearCase         string  `json:"bear_case"`
	RiskFactors      string  `json:"risk_factors"`
	InvestmentHorizon string `json:"investment_horizon"`
}

// GetWarRoomSession handles GET /api/v1/war-room/session/:id
// Returns the full session state + agent messages + votes in a single call
func (ctrl *WarRoomController) GetWarRoomSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid session ID format")
		return
	}

	// 1. Load the AnalysisSession
	var session models.AnalysisSession
	if err := ctrl.db.First(&session, "id = ?", sessionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		} else {
			errors.InternalServerError(c, "Failed to load session: "+err.Error())
		}
		return
	}

	// 2. Load AnalysisLog messages for this session (prefer session_id, fallback to ticker)
	var logs []models.AnalysisLog
	if err := ctrl.db.Where("session_id = ?", sessionID).Order("created_at asc").Find(&logs).Error; err != nil || len(logs) == 0 {
		// Fallback: get recent logs for the ticker (for backward compat with older sessions)
		ctrl.db.Where("ticker = ?", session.Ticker).Order("created_at asc").Limit(20).Find(&logs)
	}

	messages := make([]WarRoomMessage, 0, len(logs))
	for _, l := range logs {
		messages = append(messages, WarRoomMessage{
			ID:              l.ID.String(),
			AgentName:       l.AgentName,
			Message:         l.Message,
			MessageType:     l.MessageType,
			ConfidenceScore: l.ConfidenceScore,
			CreatedAt:       l.CreatedAt,
		})
	}

	// 3. Build session payload
	warSession := &WarRoomSession{
		ID:              session.ID.String(),
		Ticker:          session.Ticker,
		CompanyName:     session.CompanyName,
		Status:          session.Status,
		ProgressPercent: session.ProgressPercent,
		CurrentAgent:    session.CurrentAgent,
		AgentStatus:     session.AgentStatus,
		Recommendation:  session.Recommendation,
		ConfidenceScore: session.ConfidenceScore,
		RiskLevel:       session.RiskLevel,
		Summary:         session.Summary,
		CreatedAt:       session.CreatedAt,
		UpdatedAt:       session.UpdatedAt,
	}

	response := &WarRoomSessionResponse{
		Session:  warSession,
		Messages: messages,
	}

	// 4. If completed, enrich with votes + analysis from CommitteeAnalysis
	if session.Status == "completed" {
		var ca models.CommitteeAnalysis
		if err := ctrl.db.Where("ticker = ?", session.Ticker).Order("created_at desc").First(&ca).Error; err == nil {
			// Build votes
			votes := &WarRoomVotes{
				ResearchVote:  ca.ResearchVote,
				TechnicalVote: ca.TechnicalVote,
				NewsVote:      ca.NewsVote,
				RiskVote:      ca.RiskVote,
				ValuationVote: ca.ValuationVote,
			}
			for _, v := range []string{ca.ResearchVote, ca.TechnicalVote, ca.NewsVote, ca.RiskVote, ca.ValuationVote} {
				switch v {
				case "BUY":
					votes.BuyCount++
				case "SELL":
					votes.SellCount++
				default:
					votes.HoldCount++
				}
			}
			response.Votes = votes

			// Look up target price from recommendations table
			targetPrice := 0.0
			var rec models.Recommendation
			if ctrl.db.Where("ticker = ?", session.Ticker).Order("created_at desc").First(&rec).Error == nil {
				targetPrice = rec.TargetPrice
			}

			// Build analysis
			response.Analysis = &WarRoomAnalysis{
				ResearchSummary:   ca.ResearchSummary,
				TechnicalSummary:  ca.TechnicalSummary,
				NewsSummary:       ca.NewsSummary,
				RiskSummary:       ca.RiskSummary,
				ValuationSummary:  ca.ValuationSummary,
				TargetPrice:       targetPrice,
				BullCase:          "Strong fundamentals and positive momentum support upside scenario. Revenue growth and margin expansion expected to continue.",
				BearCase:          "Macro headwinds and elevated valuation multiples could compress price targets if market sentiment shifts.",
				RiskFactors:       "Regulatory environment, macro rate sensitivity, sector rotation risk.",
				InvestmentHorizon: "Medium Term (6-12 months)",
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetWarRoomHistory handles GET /api/v1/war-room/history — recent sessions for the current user
func (ctrl *WarRoomController) GetWarRoomHistory(c *gin.Context) {
	userIDVal, exists := c.Get("UserID")
	if !exists {
		userIDVal = "user_000000000000000000000000001"
	}
	userID, _ := userIDVal.(string)

	var sessions []models.AnalysisSession
	ctrl.db.Where("user_id = ?", userID).Order("created_at desc").Limit(20).Find(&sessions)

	type SessionSummary struct {
		ID              string    `json:"id"`
		Ticker          string    `json:"ticker"`
		CompanyName     string    `json:"company_name"`
		Status          string    `json:"status"`
		Recommendation  string    `json:"recommendation,omitempty"`
		ConfidenceScore int       `json:"confidence_score,omitempty"`
		ProgressPercent int       `json:"progress_percent"`
		CreatedAt       time.Time `json:"created_at"`
	}

	result := make([]SessionSummary, 0, len(sessions))
	for _, s := range sessions {
		result = append(result, SessionSummary{
			ID:              s.ID.String(),
			Ticker:          s.Ticker,
			CompanyName:     s.CompanyName,
			Status:          s.Status,
			Recommendation:  s.Recommendation,
			ConfidenceScore: s.ConfidenceScore,
			ProgressPercent: s.ProgressPercent,
			CreatedAt:       s.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, result)
}
