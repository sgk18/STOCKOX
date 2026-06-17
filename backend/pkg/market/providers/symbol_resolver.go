package providers

import "strings"

// ResolveProviderSymbol converts generic tickers to provider-compatible symbols
func ResolveProviderSymbol(ticker string, providerName string) string {
	usStocks := map[string]bool{
		"AAPL": true, "NVDA": true, "TSLA": true, "MSFT": true, "AMD": true, "GOOGL": true, "META": true, "AMZN": true,
	}
	crypto := map[string]bool{
		"BTC-USD": true, "ETH-USD": true, "BTC": true, "ETH": true,
	}

	if usStocks[ticker] || crypto[ticker] {
		return ticker
	}

	// For Indian Stocks, handle provider specific formatting
	if !strings.Contains(ticker, ":") && !strings.Contains(ticker, ".") {
		if providerName == "finnhub" {
			// Finnhub format for Indian stocks is .NS (NSE) or .BO (BSE)
			return ticker + ".NS"
		} else if providerName == "alphavantage" {
			return ticker + ".BSE"
		}
	}

	return ticker
}
