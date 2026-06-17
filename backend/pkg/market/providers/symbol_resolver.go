package providers

import (
	"fmt"
	"strings"

	"stockox-backend/database/models"
	"stockox-backend/pkg/market/dto"

	"gorm.io/gorm"
)

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

// ResolveAsset resolves any generic stock/crypto symbol/ticker to its metadata.
func ResolveAsset(db *gorm.DB, symbol string) (*dto.ResolvedAsset, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol cannot be empty")
	}

	// 1. Try to find the asset in stock_metadata
	if db != nil {
		var meta models.StockMetadata
		if err := db.First(&meta, "symbol = ?", symbol).Error; err == nil {
			providerSym := meta.ProviderSymbol
			if providerSym == "" {
				providerSym = meta.Symbol
				if meta.Country == "India" {
					providerSym = meta.Symbol + ".NS"
				}
			}
			return &dto.ResolvedAsset{
				Symbol:         meta.Symbol,
				Exchange:       meta.Exchange,
				ProviderSymbol: providerSym,
				Country:        meta.Country,
				AssetType:      meta.AssetType,
			}, nil
		}
	}

	// 2. Heuristics fallback if not found in db
	resolved := &dto.ResolvedAsset{
		Symbol:         symbol,
		Exchange:       "NASDAQ",
		ProviderSymbol: symbol,
		Country:        "United States",
		AssetType:      "equity",
	}

	// Detect if Indian stock (heuristic: suffix or name pattern)
	if strings.HasSuffix(symbol, ".NS") {
		resolved.Exchange = "NSE"
		resolved.Country = "India"
		resolved.ProviderSymbol = symbol
		resolved.Symbol = strings.TrimSuffix(symbol, ".NS")
	} else if strings.HasSuffix(symbol, ".BO") || strings.HasSuffix(symbol, ".BSE") {
		resolved.Exchange = "BSE"
		resolved.Country = "India"
		resolved.ProviderSymbol = symbol
		resolved.Symbol = strings.TrimSuffix(strings.TrimSuffix(symbol, ".BO"), ".BSE")
	} else {
		// Detect cryptos
		cryptos := map[string]bool{
			"BTC": true, "ETH": true, "SOL": true, "BNB": true, "XRP": true, "DOGE": true, "ADA": true, "AVAX": true, "DOT": true, "SHIB": true,
			"LINK": true, "LTC": true, "BCH": true, "NEAR": true, "MATIC": true, "UNI": true, "ICP": true, "ETC": true, "XLM": true, "FIL": true,
		}
		if cryptos[symbol] || strings.HasSuffix(symbol, "-USD") || strings.HasSuffix(symbol, "USDT") {
			resolved.Exchange = "Crypto Network"
			resolved.Country = "Global"
			resolved.AssetType = "crypto"
			if !strings.HasSuffix(symbol, "-USD") {
				resolved.ProviderSymbol = symbol + "-USD"
			} else {
				resolved.ProviderSymbol = symbol
				resolved.Symbol = strings.TrimSuffix(symbol, "-USD")
			}
		} else {
			// Check if common Indian symbols
			indianEquities := map[string]bool{
				"RELIANCE": true, "TCS": true, "INFY": true, "HDFCBANK": true, "ICICIBANK": true, "SBIN": true, "KOTAKBANK": true, "AXISBANK": true,
				"BHARTIARTL": true, "ITC": true, "LT": true, "TATAMOTORS": true, "MARUTI": true, "SUNPHARMA": true, "ASIANPAINT": true,
				"ULTRACEMCO": true, "BAJFINANCE": true, "POWERGRID": true, "WIPRO": true, "TECHM": true, "PERSISTENT": true, "COFORGE": true,
				"LTIM": true, "BEL": true, "HAL": true, "ADANIENT": true, "ADANIPORTS": true, "APOLLOHOSP": true, "BAJAJ-AUTO": true,
				"BAJAJFINSV": true, "BPCL": true, "CIPLA": true, "COALINDIA": true, "DIVISLAB": true, "DRREDDY": true, "EICHERMOT": true,
				"GRASIM": true, "HCLTECH": true, "HEROMOTOCO": true, "HINDALCO": true, "HINDUNILVR": true, "INDUSINDBK": true, "JSWSTEEL": true,
				"M&M": true, "NESTLEIND": true, "NTPC": true, "ONGC": true, "SBILIFE": true, "TATASTEEL": true, "TITAN": true, "TRENT": true,
				"SHREECEM": true, "UPL": true, "ZOMATO": true, "JIOFIN": true, "GAIL": true, "MAXHEALTH": true, "FEDERALBNK": true,
				"IDFCFIRSTB": true, "YESBANK": true, "PNB": true, "CANBK": true, "BOB": true, "UNIONBANK": true, "LICI": true,
				"HDFCLIFE": true, "GICRE": true, "NIACL": true, "MUTHOOTFIN": true, "RECLTD": true, "PFC": true, "SHRIRAMFIN": true,
				"CHOLAFIN": true, "IOC": true, "HPCL": true, "TATAPOWER": true, "JSWENERGY": true, "ADANIPOWER": true, "DLF": true,
				"GODREJPROP": true, "OBEROIRLTY": true, "PHOENIXLTD": true, "DMART": true, "PAGEIND": true, "PIDILITIND": true,
				"BRITANNIA": true, "COLPAL": true, "DABUR": true, "GODREJCP": true, "MARICO": true, "TATACHEM": true, "SRF": true,
				"CONCOR": true, "INDIGO": true, "IRCTC": true, "POLYCAB": true, "HAVELLS": true, "SIEMENS": true, "ABB": true,
			}
			if indianEquities[symbol] {
				resolved.Exchange = "NSE"
				resolved.Country = "India"
				resolved.ProviderSymbol = symbol + ".NS"
			}
		}
	}

	return resolved, nil
}
