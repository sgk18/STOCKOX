package controller

import (
	"net/http"
	"strings"

	"stockox-backend/internal/market/service"
	"stockox-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type MarketController struct {
	srv *service.MarketService
}

func NewMarketController(srv *service.MarketService) *MarketController {
	return &MarketController{
		srv: srv,
	}
}

// SearchStocks queries search suggestions
func (ctrl *MarketController) SearchStocks(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	results, err := ctrl.srv.SearchStocks(q)
	if err != nil {
		errors.InternalServerError(c, "Failed to execute provider search: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetStockDetails returns company profile merged with price quotes
func (ctrl *MarketController) GetStockDetails(c *gin.Context) {
	ticker := strings.ToUpper(strings.TrimSpace(c.Param("ticker")))
	if ticker == "" {
		errors.BadRequestError(c, "Ticker parameter is required")
		return
	}

	profile, err := ctrl.srv.GetCompanyProfile(ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve company profile: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, profile)
}

// GetMetrics returns detailed P/E, EPS ratios
func (ctrl *MarketController) GetMetrics(c *gin.Context) {
	ticker := strings.ToUpper(strings.TrimSpace(c.Param("ticker")))
	if ticker == "" {
		errors.BadRequestError(c, "Ticker parameter is required")
		return
	}

	metrics, err := ctrl.srv.GetFinancialMetrics(ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve financial metrics: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GetHistory returns OHLC historical series for Lightweight charts
func (ctrl *MarketController) GetHistory(c *gin.Context) {
	ticker := strings.ToUpper(strings.TrimSpace(c.Param("ticker")))
	if ticker == "" {
		errors.BadRequestError(c, "Ticker parameter is required")
		return
	}

	resolution := strings.TrimSpace(c.Query("resolution"))
	if resolution == "" {
		resolution = "D" // Daily default
	}

	candles, err := ctrl.srv.GetHistoricalCandles(ticker, resolution)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve historical price data: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, candles)
}

// GetNews returns recent ticker news articles
func (ctrl *MarketController) GetNews(c *gin.Context) {
	ticker := strings.ToUpper(strings.TrimSpace(c.Param("ticker")))
	if ticker == "" {
		errors.BadRequestError(c, "Ticker parameter is required")
		return
	}

	news, err := ctrl.srv.GetCompanyNews(ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve ticker news: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, news)
}
