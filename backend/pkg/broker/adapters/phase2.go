package adapters

import (
	"fmt"
	"time"
)

// RobinhoodAdapter — Phase 2 placeholder.
// Robinhood does not have an official public API.
// When available, implement using the unofficial API or a future official SDK.
type RobinhoodAdapter struct{}

func NewRobinhoodAdapter() *RobinhoodAdapter { return &RobinhoodAdapter{} }

func (r *RobinhoodAdapter) Slug() string { return "robinhood" }
func (r *RobinhoodAdapter) Name() string { return "Robinhood" }
func (r *RobinhoodAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	return nil, fmt.Errorf("robinhood: integration coming in Phase 2")
}
func (r *RobinhoodAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	return nil, fmt.Errorf("robinhood: integration coming in Phase 2")
}
func (r *RobinhoodAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	return nil, fmt.Errorf("robinhood: integration coming in Phase 2")
}
func (r *RobinhoodAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	return nil, fmt.Errorf("robinhood: integration coming in Phase 2")
}

// IBKRAdapter — Phase 2 placeholder.
// Interactive Brokers Client Portal API / Trader Workstation API.
type IBKRAdapter struct{}

func NewIBKRAdapter() *IBKRAdapter { return &IBKRAdapter{} }

func (i *IBKRAdapter) Slug() string { return "ibkr" }
func (i *IBKRAdapter) Name() string { return "Interactive Brokers" }
func (i *IBKRAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	return nil, fmt.Errorf("ibkr: integration coming in Phase 2")
}
func (i *IBKRAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	return nil, fmt.Errorf("ibkr: integration coming in Phase 2")
}
func (i *IBKRAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	return nil, fmt.Errorf("ibkr: integration coming in Phase 2")
}
func (i *IBKRAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	return nil, fmt.Errorf("ibkr: integration coming in Phase 2")
}

// FidelityAdapter — Phase 2 placeholder.
type FidelityAdapter struct{}

func NewFidelityAdapter() *FidelityAdapter { return &FidelityAdapter{} }

func (f *FidelityAdapter) Slug() string { return "fidelity" }
func (f *FidelityAdapter) Name() string { return "Fidelity" }
func (f *FidelityAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	return nil, fmt.Errorf("fidelity: integration coming in Phase 2")
}
func (f *FidelityAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	return nil, fmt.Errorf("fidelity: integration coming in Phase 2")
}
func (f *FidelityAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	return nil, fmt.Errorf("fidelity: integration coming in Phase 2")
}
func (f *FidelityAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	return nil, fmt.Errorf("fidelity: integration coming in Phase 2")
}

// SchwabAdapter — Phase 2 placeholder.
// Charles Schwab Developer API: https://developer.schwab.com/
type SchwabAdapter struct{}

func NewSchwabAdapter() *SchwabAdapter { return &SchwabAdapter{} }

func (s *SchwabAdapter) Slug() string { return "schwab" }
func (s *SchwabAdapter) Name() string { return "Charles Schwab" }
func (s *SchwabAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	return nil, fmt.Errorf("schwab: integration coming in Phase 2")
}
func (s *SchwabAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	return nil, fmt.Errorf("schwab: integration coming in Phase 2")
}
func (s *SchwabAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	return nil, fmt.Errorf("schwab: integration coming in Phase 2")
}
func (s *SchwabAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	return nil, fmt.Errorf("schwab: integration coming in Phase 2")
}
