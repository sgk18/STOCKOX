package cache

import (
	"fmt"
	"time"
)

const (
	TTLQuote             = 60 * time.Second
	TTLProfile           = 24 * time.Hour
	TTLChart             = 30 * time.Minute
	TTLMetrics           = 6 * time.Hour
	TTLNews              = 15 * time.Minute
	TTLSearch            = 30 * time.Minute
	TTLDashboard         = 60 * time.Second
	TTLPortfolio         = 60 * time.Second
	TTLWatchlist         = 5 * time.Minute
	TTLCommitteeAnalysis = 1 * time.Hour
)

func KeyQuote(symbol string) string {
	return fmt.Sprintf("quote:%s", symbol)
}

func KeyProfile(symbol string) string {
	return fmt.Sprintf("profile:%s", symbol)
}

func KeyChart(symbol, timeframe string) string {
	return fmt.Sprintf("chart:%s:%s", symbol, timeframe)
}

func KeyMetrics(symbol string) string {
	return fmt.Sprintf("metrics:%s", symbol)
}

func KeyNews(symbol string) string {
	return fmt.Sprintf("news:%s", symbol)
}

func KeySearch(query string) string {
	return fmt.Sprintf("search:%s", query)
}

func KeyDashboard(userID string) string {
	return fmt.Sprintf("dashboard:%s", userID)
}

func KeyPortfolio(userID string) string {
	return fmt.Sprintf("portfolio:%s", userID)
}

func KeyWatchlist(userID string) string {
	return fmt.Sprintf("watchlist:%s", userID)
}

func KeyAnalysis(symbol string) string {
	return fmt.Sprintf("analysis:%s", symbol)
}
