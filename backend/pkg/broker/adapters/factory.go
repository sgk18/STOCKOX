package adapters

import "fmt"

// NewBrokerAdapter returns the correct BrokerAdapter for the given broker slug.
// Returns an error if the slug is not recognized.
func NewBrokerAdapter(slug string) (BrokerAdapter, error) {
	switch slug {
	// ── Phase 1: Indian Brokers ────────────────────────────────────────────────
	case "zerodha":
		return NewZerodhaAdapter(), nil
	case "groww":
		return NewGrowwAdapter(), nil
	case "angelone":
		return NewAngelOneAdapter(), nil
	case "upstox":
		return NewUpstoxAdapter(), nil

	// ── Phase 2: Global Brokers ───────────────────────────────────────────────
	case "robinhood":
		return NewRobinhoodAdapter(), nil
	case "ibkr":
		return NewIBKRAdapter(), nil
	case "fidelity":
		return NewFidelityAdapter(), nil
	case "schwab":
		return NewSchwabAdapter(), nil

	default:
		return nil, fmt.Errorf("broker adapter not found for slug: %q", slug)
	}
}

// SupportedBrokers returns catalog metadata for all supported brokers.
func SupportedBrokers() []BrokerInfo {
	return []BrokerInfo{
		// Phase 1
		{Slug: "zerodha", Name: "Zerodha", Phase: 1, Country: "IN", AuthType: "oauth", LogoURL: "https://zerodha.com/static/images/logo.svg", Description: "India's largest stockbroker by active clients. Kite Connect API."},
		{Slug: "groww", Name: "Groww", Phase: 1, Country: "IN", AuthType: "api_token", LogoURL: "https://groww.in/favicon.ico", Description: "India's most popular investment platform for stocks & mutual funds."},
		{Slug: "angelone", Name: "Angel One", Phase: 1, Country: "IN", AuthType: "api_token", LogoURL: "https://angelone.in/favicon.ico", Description: "Full-service broker with Smart API for programmatic access."},
		{Slug: "upstox", Name: "Upstox", Phase: 1, Country: "IN", AuthType: "oauth", LogoURL: "https://upstox.com/favicon.ico", Description: "Discount broker with Upstox API v2 OAuth support."},
		// Phase 2
		{Slug: "robinhood", Name: "Robinhood", Phase: 2, Country: "US", AuthType: "oauth", LogoURL: "", Description: "Commission-free US stock trading app. Coming in Phase 2."},
		{Slug: "ibkr", Name: "Interactive Brokers", Phase: 2, Country: "US", AuthType: "oauth", LogoURL: "", Description: "Professional-grade broker with Client Portal API. Coming in Phase 2."},
		{Slug: "fidelity", Name: "Fidelity", Phase: 2, Country: "US", AuthType: "oauth", LogoURL: "", Description: "Full-service US broker. Coming in Phase 2."},
		{Slug: "schwab", Name: "Charles Schwab", Phase: 2, Country: "US", AuthType: "oauth", LogoURL: "", Description: "US brokerage with official developer API. Coming in Phase 2."},
	}
}

// BrokerInfo is the catalog entry for a broker shown on the connect page.
type BrokerInfo struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Phase       int    `json:"phase"` // 1 = available, 2 = coming soon
	Country     string `json:"country"`
	AuthType    string `json:"auth_type"` // oauth | api_token
	LogoURL     string `json:"logo_url"`
	Description string `json:"description"`
}
