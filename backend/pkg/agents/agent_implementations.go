package agents

import (
	"context"
	"fmt"
)

// BaseAgent contains common properties for internal agents
type BaseAgent struct {
	Name string
}

func (a *BaseAgent) GetName() string {
	return a.Name
}

func (a *BaseAgent) SendMessage(ctx context.Context, message string) error {
	return nil
}

func (a *BaseAgent) ReceiveMessage(ctx context.Context, sender string, message string) error {
	return nil
}

// 1. Research Agent
type ResearchAgent struct {
	BaseAgent
}

func NewResearchAgent() *ResearchAgent {
	return &ResearchAgent{BaseAgent{Name: "Research Agent"}}
}

func (a *ResearchAgent) Analyze(ctx context.Context, ticker string, history []string) (string, error) {
	return fmt.Sprintf("Fundamental profile audited for %s. Balance sheet margins are stable with solid cash flows and key competitive moats in the sector. Financial health indicators suggest long-term revenue viability.", ticker), nil
}

func (a *ResearchAgent) Vote(ctx context.Context, ticker string) (string, error) {
	return "BUY", nil
}

func (a *ResearchAgent) GenerateReasoning(ctx context.Context, ticker string) (string, error) {
	return "Strong fundamentals and revenue stability support target valuation.", nil
}

// 2. Technical Agent
type TechnicalAgent struct {
	BaseAgent
}

func NewTechnicalAgent() *TechnicalAgent {
	return &TechnicalAgent{BaseAgent{Name: "Technical Agent"}}
}

func (a *TechnicalAgent) Analyze(ctx context.Context, ticker string, history []string) (string, error) {
	return fmt.Sprintf("Analyzing charts and pricing support for %s. Moving averages indicate positive consolidation and bullish momentum crossover. RSI values are stable at 58, which supports the positive technical outlook.", ticker), nil
}

func (a *TechnicalAgent) Vote(ctx context.Context, ticker string) (string, error) {
	return "BUY", nil
}

func (a *TechnicalAgent) GenerateReasoning(ctx context.Context, ticker string) (string, error) {
	return "Bullish EMA crossover and support lines confirm upward momentum.", nil
}

// 3. News Agent
type NewsAgent struct {
	BaseAgent
}

func NewNewsAgent() *NewsAgent {
	return &NewsAgent{BaseAgent{Name: "News Agent"}}
}

func (a *NewsAgent) Analyze(ctx context.Context, ticker string, history []string) (string, error) {
	return fmt.Sprintf("Scanned media coverage and analyst sentiment ratings for %s. Overall coverage is positive at +0.78 index, showing strong consumer trust and positive news flow regarding compute expansion projects.", ticker), nil
}

func (a *NewsAgent) Vote(ctx context.Context, ticker string) (string, error) {
	return "BUY", nil
}

func (a *NewsAgent) GenerateReasoning(ctx context.Context, ticker string) (string, error) {
	return "Analyst sentiment index remains highly supportive with positive media coverage.", nil
}

// 4. Risk Agent
type RiskAgent struct {
	BaseAgent
}

func NewRiskAgent() *RiskAgent {
	return &RiskAgent{BaseAgent{Name: "Risk Agent"}}
}

func (a *RiskAgent) Analyze(ctx context.Context, ticker string, history []string) (string, error) {
	return fmt.Sprintf("Audited downside risks and Value-at-Risk levels for %s. Leverage ratios are within compliance limits. However, macro volatility risk is slightly elevated relative to historical bounds. Recommend caution on large positions.", ticker), nil
}

func (a *RiskAgent) Vote(ctx context.Context, ticker string) (string, error) {
	return "HOLD", nil
}

func (a *RiskAgent) GenerateReasoning(ctx context.Context, ticker string) (string, error) {
	return "Elevated valuation P/E multiples suggest high correlation risks.", nil
}

// 5. Committee Agent
type CommitteeAgent struct {
	BaseAgent
}

func NewCommitteeAgent() *CommitteeAgent {
	return &CommitteeAgent{BaseAgent{Name: "Committee Agent"}}
}

func (a *CommitteeAgent) Analyze(ctx context.Context, ticker string, history []string) (string, error) {
	return fmt.Sprintf("Aggregated the room's signals for %s: Research Agent (BUY), Technical Agent (BUY), News Agent (BUY), and Risk Agent (HOLD). Three BUY votes and one HOLD vote. Consensus points to a net positive growth upside.", ticker), nil
}

func (a *CommitteeAgent) Vote(ctx context.Context, ticker string) (string, error) {
	return "BUY", nil
}

func (a *CommitteeAgent) GenerateReasoning(ctx context.Context, ticker string) (string, error) {
	return "High consensus ratio (75% BUY votes) supports immediate position accumulation.", nil
}
