package database

import (
	"log"
	"time"

	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedStockUniverse(db *gorm.DB) error {
	var count int64
	db.Model(&models.StockMetadata{}).Count(&count)
	if count > 0 {
		log.Printf("[DB-SEED] stock_metadata table already populated (count: %d). Skipping seeding.", count)
		return nil
	}

	log.Println("[DB-SEED] Seeding searchable market universe assets...")

	var assets []models.StockMetadata
	seenSymbols := make(map[string]bool)

	// 1. Curated Indian Stocks (Target: 100)
	indianEquities := []struct {
		Symbol, Name, Sector, Industry string
		MarketCap                     int64
	}{
		{"RELIANCE", "Reliance Industries Ltd.", "Energy & Conglomerate", "Oil & Gas / Retail / Telecom", 18500000000000},
		{"TCS", "Tata Consultancy Services Ltd.", "Technology", "IT Services & Consulting", 13800000000000},
		{"INFY", "Infosys Ltd.", "Technology", "IT Services & Consulting", 6800000000000},
		{"HDFCBANK", "HDFC Bank Ltd.", "Financial Services", "Banking", 12500000000000},
		{"ICICIBANK", "ICICI Bank Ltd.", "Financial Services", "Banking", 8200000000000},
		{"SBIN", "State Bank of India", "Financial Services", "Banking", 7400000000000},
		{"KOTAKBANK", "Kotak Mahindra Bank Ltd.", "Financial Services", "Banking", 3500000000000},
		{"AXISBANK", "Axis Bank Ltd.", "Financial Services", "Banking", 3300000000000},
		{"BHARTIARTL", "Bharti Airtel Ltd.", "Telecommunications", "Mobile Telecom Services", 6500000000000},
		{"ITC", "ITC Ltd.", "FMCG", "Tobacco / Hotels / Paper", 5400000000000},
		{"LT", "Larsen & Toubro Ltd.", "Industrial & Infrastructure", "Heavy Engineering / Construction", 4700000000000},
		{"TATAMOTORS", "Tata Motors Ltd.", "Automotive", "Commercial & Passenger Vehicles", 3600000000000},
		{"MARUTI", "Maruti Suzuki India Ltd.", "Automotive", "Passenger Cars", 3800000000000},
		{"SUNPHARMA", "Sun Pharmaceutical Industries Ltd.", "Healthcare", "Pharmaceuticals", 3500000000000},
		{"ASIANPAINT", "Asian Paints Ltd.", "Consumer Goods", "Paints & Home Decor", 2800000000000},
		{"ULTRACEMCO", "UltraTech Cement Ltd.", "Basic Materials", "Cement & Building Materials", 3100000000000},
		{"BAJFINANCE", "Bajaj Finance Ltd.", "Financial Services", "Non-Banking Financial Co.", 4400000000000},
		{"POWERGRID", "Power Grid Corp. of India Ltd.", "Utilities", "Power Transmission", 2900000000000},
		{"WIPRO", "Wipro Ltd.", "Technology", "IT Services & Consulting", 2600000000000},
		{"TECHM", "Tech Mahindra Ltd.", "Technology", "IT Services & Consulting", 1400000000000},
		{"PERSISTENT", "Persistent Systems Ltd.", "Technology", "Software Products & Services", 650000000000},
		{"COFORGE", "Coforge Ltd.", "Technology", "IT Services & Consulting", 480000000000},
		{"LTIM", "LTIMindtree Ltd.", "Technology", "IT Services & Consulting", 1700000000000},
		{"BEL", "Bharat Electronics Ltd.", "Defense & Industrials", "Aerospace & Defense", 1600000000000},
		{"HAL", "Hindustan Aeronautics Ltd.", "Defense & Industrials", "Aerospace & Defense", 2200000000000},
		{"ADANIENT", "Adani Enterprises Ltd.", "Conglomerate", "Diversified Holding", 3400000000000},
		{"ADANIPORTS", "Adani Ports & Special Economic Zone Ltd.", "Industrial & Infrastructure", "Marine Port Operations", 2800000000000},
		{"APOLLOHOSP", "Apollo Hospitals Enterprise Ltd.", "Healthcare", "Hospitals & Clinics", 950000000000},
		{"BAJAJ-AUTO", "Bajaj Auto Ltd.", "Automotive", "Two & Three Wheelers", 2700000000000},
		{"BAJAJFINSV", "Bajaj Finserv Ltd.", "Financial Services", "Diversified Financials", 2500000000000},
		{"BPCL", "Bharat Petroleum Corp. Ltd.", "Energy", "Oil Refining & Marketing", 1300000000000},
		{"CIPLA", "Cipla Ltd.", "Healthcare", "Pharmaceuticals", 1200000000000},
		{"COALINDIA", "Coal India Ltd.", "Energy & Basic Materials", "Coal Mining", 2800000000000},
		{"DIVISLAB", "Divi's Laboratories Ltd.", "Healthcare", "Active Pharmaceutical Ingredients", 1100000000000},
		{"DRREDDY", "Dr. Reddy's Laboratories Ltd.", "Healthcare", "Pharmaceuticals", 980000000000},
		{"EICHERMOT", "Eicher Motors Ltd.", "Automotive", "Motorcycles & Trucks", 1200000000000},
		{"GRASIM", "Grasim Industries Ltd.", "Basic Materials", "Chemicals & Textiles", 1500000000000},
		{"HCLTECH", "HCL Technologies Ltd.", "Technology", "IT Services & Consulting", 3700000000000},
		{"HEROMOTOCO", "Hero MotoCorp Ltd.", "Automotive", "Two Wheelers", 920000000000},
		{"HINDALCO", "Hindalco Industries Ltd.", "Basic Materials", "Aluminum & Copper Mining", 1400000000000},
		{"HINDUNILVR", "Hindustan Unilever Ltd.", "FMCG", "Home & Personal Care", 5800000000000},
		{"INDUSINDBK", "IndusInd Bank Ltd.", "Financial Services", "Banking", 1100000000000},
		{"JSWSTEEL", "JSW Steel Ltd.", "Basic Materials", "Steel Production", 2100000000000},
		{"M&M", "Mahindra & Mahindra Ltd.", "Automotive", "SUVs & Tractors", 3100000000000},
		{"NESTLEIND", "Nestle India Ltd.", "FMCG", "Processed Food", 2400000000000},
		{"NTPC", "NTPC Ltd.", "Utilities", "Power Generation", 3600000000000},
		{"ONGC", "Oil & Natural Gas Corp. Ltd.", "Energy", "Oil & Gas Exploration", 3400000000000},
		{"SBILIFE", "SBI Life Insurance Co. Ltd.", "Financial Services", "Life Insurance", 1400000000000},
		{"TATASTEEL", "Tata Steel Ltd.", "Basic Materials", "Steel Production", 1900000000000},
		{"TITAN", "Titan Company Ltd.", "Consumer Goods", "Jewellery & Watches", 3100000000000},
		{"TRENT", "Trent Ltd.", "Consumer Goods", "Retail Chains", 1800000000000},
		{"SHREECEM", "Shree Cement Ltd.", "Basic Materials", "Cement", 920000000000},
		{"UPL", "UPL Ltd.", "Basic Materials", "Agrochemicals", 380000000000},
		{"ZOMATO", "Zomato Ltd.", "Technology & Services", "Food Delivery & Hyperlocal", 1600000000000},
		{"JIOFIN", "Jio Financial Services Ltd.", "Financial Services", "NBFC & Asset Management", 2200000000000},
		{"GAIL", "GAIL (India) Ltd.", "Utilities", "Gas Transmission", 1200000000000},
		{"MAXHEALTH", "Max Healthcare Institute Ltd.", "Healthcare", "Hospitals", 780000000000},
		{"FEDERALBNK", "The Federal Bank Ltd.", "Financial Services", "Banking", 350000000000},
		{"IDFCFIRSTB", "IDFC First Bank Ltd.", "Financial Services", "Banking", 580000000000},
		{"YESBANK", "Yes Bank Ltd.", "Financial Services", "Banking", 720000000000},
		{"PNB", "Punjab National Bank", "Financial Services", "Banking", 1300000000000},
		{"CANBK", "Canara Bank", "Financial Services", "Banking", 1100000000000},
		{"BOB", "Bank of Baroda", "Financial Services", "Banking", 1350000000000},
		{"UNIONBANK", "Union Bank of India", "Financial Services", "Banking", 880000000000},
		{"LICI", "Life Insurance Corp. of India", "Financial Services", "Life Insurance", 6200000000000},
		{"HDFCLIFE", "HDFC Life Insurance Co. Ltd.", "Financial Services", "Life Insurance", 1350000000000},
		{"GICRE", "General Insurance Corp. of India", "Financial Services", "Reinsurance", 720000000000},
		{"NIACL", "The New India Assurance Co. Ltd.", "Financial Services", "General Insurance", 450000000000},
		{"MUTHOOTFIN", "Muthoot Finance Ltd.", "Financial Services", "Gold Loans", 650000000000},
		{"RECLTD", "REC Ltd.", "Financial Services", "Power Sector Finance", 1200000000000},
		{"PFC", "Power Finance Corp. Ltd.", "Financial Services", "Power Sector Finance", 1350000000000},
		{"SHRIRAMFIN", "Shriram Finance Ltd.", "Financial Services", "Asset Finance", 980000000000},
		{"CHOLAFIN", "Cholamandalam Investment & Finance", "Financial Services", "Vehicle Finance", 1100000000000},
		{"IOC", "Indian Oil Corp. Ltd.", "Energy", "Oil Refining & Marketing", 2300000000000},
		{"HPCL", "Hindustan Petroleum Corp. Ltd.", "Energy", "Oil Refining & Marketing", 680000000000},
		{"TATAPOWER", "Tata Power Co. Ltd.", "Utilities", "Power Generation & Dist.", 1400000000000},
		{"JSWENERGY", "JSW Energy Ltd.", "Utilities", "Power Generation", 980000000000},
		{"ADANIPOWER", "Adani Power Ltd.", "Utilities", "Thermal Power", 2200000000000},
		{"DLF", "DLF Ltd.", "Real Estate", "Residential & Commercial", 2100000000000},
		{"GODREJPROP", "Godrej Properties Ltd.", "Real Estate", "Residential Real Estate", 650000000000},
		{"OBEROIRLTY", "Oberoi Realty Ltd.", "Real Estate", "Luxury Housing", 520000000000},
		{"PHOENIXLTD", "The Phoenix Mills Ltd.", "Real Estate", "Retail Malls", 640000000000},
		{"TRENT", "Trent Ltd.", "Retail", "Lifestyle Retail Services", 1850000000000},
		{"DMART", "Avenue Supermarts Ltd. (DMart)", "Retail", "Grocery Supermarkets", 2900000000000},
		{"PAGEIND", "Page Industries Ltd. (Jockey)", "Consumer Goods", "Apparel & Textiles", 420000000000},
		{"PIDILITIND", "Pidilite Industries Ltd.", "Basic Materials", "Adhesives & Sealants", 1300000000000},
		{"BRITANNIA", "Britannia Industries Ltd.", "FMCG", "Bakery Products", 1250000000000},
		{"COLPAL", "Colgate-Palmolive (India) Ltd.", "FMCG", "Oral & Personal Care", 780000000000},
		{"DABUR", "Dabur India Ltd.", "FMCG", "Ayurvedic & Healthcare", 980000000000},
		{"GODREJCP", "Godrej Consumer Products Ltd.", "FMCG", "Home & Personal Care", 1100000000000},
		{"MARICO", "Marico Ltd.", "FMCG", "Consumer Edible Oils", 720000000000},
		{"TATACHEM", "Tata Chemicals Ltd.", "Basic Materials", "Industrial Chemicals", 29000000000},
		{"SRF", "SRF Ltd.", "Basic Materials", "Diversified Chemicals", 640000000000},
		{"CONCOR", "Container Corp. of India Ltd.", "Services & Logistics", "Rail Cargo Logistics", 680000000000},
		{"INDIGO", "InterGlobe Aviation Ltd. (IndiGo)", "Services & Transportation", "Passenger Aviation", 1350000000000},
		{"IRCTC", "Indian Railway Catering & Tourism", "Services & Hospitality", "Railway Ticketing & Catering", 720000000000},
		{"POLYCAB", "Polycab India Ltd.", "Industrials", "Wires & Electrical Cables", 950000000000},
		{"HAVELLS", "Havells India Ltd.", "Industrials", "Electrical Appliances Services", 980000000000},
		{"SIEMENS", "Siemens Ltd.", "Industrials & Technology", "Heavy Electrical Engineering", 2200000000000},
		{"ABB", "ABB India Ltd.", "Industrials & Technology", "Power Grid Automation Services", 1850000000000},
	}

	for _, ie := range indianEquities {
		if seenSymbols[ie.Symbol] {
			continue
		}
		seenSymbols[ie.Symbol] = true
		assets = append(assets, models.StockMetadata{
			ID:          uuid.New().String(),
			Symbol:      ie.Symbol,
			CompanyName: ie.Name,
			Exchange:    "NSE",
			Country:     "India",
			AssetType:   "equity",
			Sector:      ie.Sector,
			Industry:    ie.Industry,
			Currency:    "INR",
			MarketCap:   ie.MarketCap,
			LogoURL:     "https://logo.clearbit.com/nseindia.com",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		})
	}

	// 2. Curated US Stocks (Target: 100)
	usEquities := []struct {
		Symbol, Name, Sector, Industry string
		MarketCap                     int64
	}{
		{"AAPL", "Apple Inc.", "Technology", "Consumer Electronics", 3280000000000},
		{"NVDA", "NVIDIA Corporation", "Semiconductors", "AI Infrastructure & Hardware", 3180000000000},
		{"MSFT", "Microsoft Corporation", "Technology", "Infrastructure Software & Cloud", 3220000000000},
		{"GOOGL", "Alphabet Inc.", "Technology", "Internet Search & Digital Ads", 2150000000000},
		{"AMZN", "Amazon.com, Inc.", "Consumer Discretionary", "E-Commerce & Cloud Computing", 1950000000000},
		{"META", "Meta Platforms, Inc.", "Communication Services", "Social Networks & Digital Ads", 1280000000000},
		{"TSLA", "Tesla, Inc.", "Automotive", "Electric Vehicles & Clean Energy", 580000000000},
		{"NFLX", "Netflix, Inc.", "Communication Services", "Entertainment Streaming", 280000000000},
		{"AMD", "Advanced Micro Devices, Inc.", "Semiconductors", "Computer Microprocessors", 260000000000},
		{"INTC", "Intel Corporation", "Semiconductors", "Integrated Processor Services", 135000000000},
		{"PLTR", "Palantir Technologies Inc.", "Technology", "AI & Big Data Analytics", 72000000000},
		{"UBER", "Uber Technologies, Inc.", "Technology & Services", "Ride Hailing & Logistics", 145000000000},
		{"SNOW", "Snowflake Inc.", "Technology", "Data Cloud Warehousing", 45000000000},
		{"CRM", "Salesforce, Inc.", "Technology", "Customer Relationship Management", 240000000000},
		{"ORCL", "Oracle Corporation", "Technology", "Enterprise Database Software", 380000000000},
		{"ADBE", "Adobe Inc.", "Technology", "Creative Design Software", 220000000000},
		{"BAC", "Bank of America Corporation", "Financial Services", "Banking & Investment", 310000000000},
		{"JPM", "JPMorgan Chase & Co.", "Financial Services", "Commercial & Retail Banking", 580000000000},
		{"DIS", "The Walt Disney Company", "Communication Services", "Media & Theme Parks", 185000000000},
		{"KO", "The Coca-Cola Company", "FMCG", "Soft Drinks & Beverage", 270000000000},
		{"PEP", "PepsiCo, Inc.", "FMCG", "Snacks & Beverages", 230000000000},
		{"JNJ", "Johnson & Johnson", "Healthcare", "Pharmaceuticals & Cons. Goods", 380000000000},
		{"PG", "The Procter & Gamble Company", "FMCG", "Consumer Health & Hygiene", 400000000000},
		{"XOM", "Exxon Mobil Corporation", "Energy", "Oil & Gas Production", 520000000000},
		{"CVX", "Chevron Corporation", "Energy", "Oil & Gas Refining", 290000000000},
		{"V", "Visa Inc.", "Financial Services", "Payment Card Processing", 540000000000},
		{"MA", "Mastercard Incorporated", "Financial Services", "Payment Transaction Networks", 420000000000},
		{"WMT", "Walmart Inc.", "Consumer Staples", "Supermarket Retail Services", 530000000000},
		{"HD", "The Home Depot, Inc.", "Consumer Discretionary", "Home Improvement Retail", 360000000000},
		{"LLY", "Eli Lilly and Company", "Healthcare", "Pharmaceuticals & Biotech", 760000000000},
		{"MRK", "Merck & Co., Inc.", "Healthcare", "Pharmaceuticals", 310000000000},
		{"ABBV", "AbbVie Inc.", "Healthcare", "Pharmaceuticals & Immunology", 320000000000},
		{"PFE", "Pfizer Inc.", "Healthcare", "Vaccines & Pharmaceuticals", 160000000000},
		{"COST", "Costco Wholesale Corporation", "Consumer Staples", "Warehouse Retail Clubs", 360000000000},
		{"MCD", "McDonald's Corporation", "Consumer Discretionary", "Fast Food Restaurant Chain", 195000000000},
		{"NKE", "NIKE, Inc.", "Consumer Discretionary", "Athletic Footwear & Apparel", 145000000000},
		{"SBUX", "Starbucks Corporation", "Consumer Discretionary", "Coffee Houses & Roasteries", 92000000000},
		{"IBM", "International Business Machines", "Technology", "Enterprise Systems & Hybrid Cloud", 175000000000},
		{"QCOM", "QUALCOMM Incorporated", "Semiconductors", "Mobile Chipsets & Telecommunications", 215000000000},
		{"CSCO", "Cisco Systems, Inc.", "Technology", "Networking Hardware & Software", 198000000000},
		{"AVGO", "Broadcom Inc.", "Semiconductors", "Wired & Wireless Broadbands", 780000000000},
		{"TXN", "Texas Instruments Incorporated", "Semiconductors", "Analog & Embedded Processing", 185000000000},
		{"MU", "Micron Technology, Inc.", "Semiconductors", "DRAM & NAND Flash Storage", 130000000000},
		{"LRCX", "Lam Research Corporation", "Semiconductors", "Wafer Fabrication Equipment", 115000000000},
		{"ASML", "ASML Holding N.V.", "Semiconductors", "Photolithography Machines", 390000000000},
		{"CAT", "Caterpillar Inc.", "Industrials", "Construction & Mining Machinery", 185000000000},
		{"DE", "Deere & Company", "Industrials", "Agriculture & Forestry Equipment", 110000000000},
		{"GE", "General Electric Company", "Industrials", "Aviation Turbines & Power Systems", 178000000000},
		{"HON", "Honeywell International Inc.", "Industrials", "Aerospace & Building Systems", 132000000000},
		{"RTX", "RTX Corporation", "Defense & Aerospace", "Missile Defense & Jet Engines", 145000000000},
		{"LMT", "Lockheed Martin Corporation", "Defense & Aerospace", "Tactical Aircraft & Systems", 118000000000},
		{"UPS", "United Parcel Service, Inc.", "Services", "Global Package Delivery", 125000000000},
		{"FDX", "FedEx Corporation", "Services", "Air & Ground Freight Logistics", 68000000000},
		{"UNH", "UnitedHealth Group Inc.", "Healthcare", "Managed Healthcare Services", 460000000000},
		{"CVS", "CVS Health Corporation", "Healthcare", "Pharmacy & Medical Clinics", 82000000000},
		{"ABNB", "Airbnb, Inc.", "Services", "Vacation Rental Bookings", 92000000000},
		{"BKNG", "Booking Holdings Inc.", "Services", "Travel Reservation Networks", 128000000000},
		{"T", "AT&T Inc.", "Telecommunications", "Broadband & Mobile Networks", 135000000000},
		{"VZ", "Verizon Communications Inc.", "Telecommunications", "Broadband & Mobile Networks", 168000000000},
		{"TMUS", "T-Mobile US, Inc.", "Telecommunications", "Mobile Network Services", 210000000000},
		{"WFC", "Wells Fargo & Company", "Financial Services", "Retail Banking & Mortgage", 210000000000},
		{"GS", "The Goldman Sachs Group, Inc.", "Financial Services", "Investment Bank & Securities", 148000000000},
		{"MS", "Morgan Stanley", "Financial Services", "Wealth & Asset Management", 152000000000},
		{"SCHW", "The Charles Schwab Corporation", "Financial Services", "Securities Brokerage Services", 135000000000},
		{"AXP", "American Express Company", "Financial Services", "Consumer Credit Cards", 172000000000},
		{"BLK", "BlackRock, Inc.", "Financial Services", "Investment Management", 118000000000},
		{"SPGI", "S&P Global Inc.", "Services", "Financial Indexes & Ratings", 135000000000},
		{"ADP", "Automatic Data Processing, Inc.", "Services", "Payroll & HR Management Services", 108000000000},
		{"NOW", "ServiceNow, Inc.", "Technology", "Enterprise Workflow Automation", 165000000000},
		{"PANW", "Palo Alto Networks, Inc.", "Technology", "Enterprise Cybersecurity Systems", 92000000000},
		{"FTNT", "Fortinet, Inc.", "Technology", "Network Cybersecurity Devices", 52000000000},
		{"CRWD", "CrowdStrike Holdings, Inc.", "Technology", "Cloud Endpoint Protection", 68000000000},
		{"DDOG", "Datadog, Inc.", "Technology", "Cloud Application Monitoring", 38000000000},
		{"TEAM", "Atlassian Corporation", "Technology", "Collaborative Work Management", 42000000000},
		{"NET", "Cloudflare, Inc.", "Technology", "Content Delivery Network", 29000000000},
		{"OKTA", "Okta, Inc.", "Technology", "Cloud Identity Management", 18000000000},
		{"WDAY", "Workday, Inc.", "Technology", "Cloud HR & Finance Apps", 68000000000},
		{"MDB", "MongoDB, Inc.", "Technology", "NoSQL Database Systems", 24000000000},
		{"ESTC", "Elastic N.V.", "Technology", "Enterprise Search & Logging", 12000000000},
		{"VEEV", "Veeva Systems Inc.", "Technology", "Cloud Software for Life Sciences", 32000000000},
		{"ADSK", "Autodesk, Inc.", "Technology", "CAD & 3D Engineering Software", 54000000000},
		{"ANSS", "Ansys, Inc.", "Technology", "Physics Simulation Software", 29000000000},
		{"SNPS", "Synopsys, Inc.", "Technology", "Silicon Design Software", 82000000000},
		{"CDNS", "Cadence Design Systems, Inc.", "Technology", "Silicon Design Automation", 78000000000},
		{"INTU", "Intuit Inc.", "Technology", "Small Business Accounting Software", 175000000000},
		{"PAYX", "Paychex, Inc.", "Services", "HR & Payroll Processing", 45000000000},
		{"GILD", "Gilead Sciences, Inc.", "Healthcare", "Antiviral Therapeutics", 92000000000},
		{"REGN", "Regeneron Pharmaceuticals, Inc.", "Healthcare", "Monoclonal Antibody Drugs", 98000000000},
		{"AMGN", "Amgen Inc.", "Healthcare", "Biotechnology & Therapeutics", 145000000000},
		{"BIIB", "Biogen Inc.", "Healthcare", "Neurological Therapeutics", 31000000000},
		{"VRTX", "Vertex Pharmaceuticals Inc.", "Healthcare", "Cystic Fibrosis Treatment", 112000000000},
		{"ISRG", "Intuitive Surgical, Inc.", "Healthcare", "Robotic Assisted Surgery Services", 142000000000},
		{"SYK", "Stryker Corporation", "Healthcare", "Medical Implants & Equipment", 132000000000},
		{"TMO", "Thermo Fisher Scientific Inc.", "Healthcare", "Laboratory & Analytical Systems", 225000000000},
		{"A", "Agilent Technologies, Inc.", "Healthcare", "Analytical Instruments", 42000000000},
		{"ILMN", "Illumina, Inc.", "Healthcare", "Genetic Sequencing Equipment", 21000000000},
		{"DXCM", "DexCom, Inc.", "Healthcare", "Continuous Glucose Monitors", 48000000000},
		{"MDT", "Medtronic plc", "Healthcare", "Cardio & Insulin Implants", 115000000000},
		{"BSX", "Boston Scientific Corporation", "Healthcare", "Interventional Cardiology Devices", 98000000000},
		{"EW", "Edwards Lifesciences Corporation", "Healthcare", "Heart Valve Replacements", 52000000000},
	}

	for _, ue := range usEquities {
		if seenSymbols[ue.Symbol] {
			continue
		}
		seenSymbols[ue.Symbol] = true
		assets = append(assets, models.StockMetadata{
			ID:          uuid.New().String(),
			Symbol:      ue.Symbol,
			CompanyName: ue.Name,
			Exchange:    "NASDAQ", // Set default NASDAQ for simplicity
			Country:     "United States",
			AssetType:   "equity",
			Sector:      ue.Sector,
			Industry:    ue.Industry,
			Currency:    "USD",
			MarketCap:   ue.MarketCap,
			LogoURL:     "https://logo.clearbit.com/nasdaq.com",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		})
	}

	// 3. Curated ETFs (Target: 20)
	etfs := []struct {
		Symbol, Name, Issuer string
		MarketCap           int64
	}{
		{"SPY", "SPDR S&P 500 ETF Trust", "State Street Global Advisors", 512000000000},
		{"QQQ", "Invesco QQQ Trust", "Invesco", 240000000000},
		{"VTI", "Vanguard Total Stock Market ETF", "Vanguard", 380000000000},
		{"VOO", "Vanguard S&P 500 ETF", "Vanguard", 420000000000},
		{"DIA", "SPDR Dow Jones Industrial Average ETF Trust", "State Street Global Advisors", 32000000000},
		{"ARKK", "ARK Innovation ETF", "ARK Invest", 8200000000},
		{"IWM", "iShares Russell 2000 ETF", "BlackRock", 62000000000},
		{"VEA", "Vanguard FTSE Developed Markets ETF", "Vanguard", 125000000000},
		{"VWO", "Vanguard FTSE Emerging Markets ETF", "Vanguard", 82000000000},
		{"LQD", "iShares iBoxx $ Investment Grade Corporate Bond ETF", "BlackRock", 38000000000},
		{"HYG", "iShares iBoxx $ High Yield Corporate Bond ETF", "BlackRock", 18000000000},
		{"GLD", "SPDR Gold Shares", "State Street Global Advisors", 68000000000},
		{"IAU", "iShares Gold Trust", "BlackRock", 29000000000},
		{"SLV", "iShares Silver Trust", "BlackRock", 12000000000},
		{"USO", "United States Oil Fund LP", "USCF", 1600000000},
		{"UNG", "United States Natural Gas Fund LP", "USCF", 320000000},
		{"DBC", "Invesco DB Commodity Index Tracking Fund", "Invesco", 1800000000},
		{"VNQ", "Vanguard Real Estate ETF", "Vanguard", 32000000000},
		{"SCHD", "Schwab U.S. Dividend Equity ETF", "Charles Schwab", 54000000000},
		{"XLF", "Financial Select Sector SPDR Fund", "State Street Global Advisors", 42000000000},
	}

	for _, etf := range etfs {
		if seenSymbols[etf.Symbol] {
			continue
		}
		seenSymbols[etf.Symbol] = true
		assets = append(assets, models.StockMetadata{
			ID:          uuid.New().String(),
			Symbol:      etf.Symbol,
			CompanyName: etf.Name,
			Exchange:    "NYSE Arca",
			Country:     "United States",
			AssetType:   "etf",
			Sector:      "Investment Funds",
			Industry:    "Exchange Traded Fund (ETF)",
			Currency:    "USD",
			MarketCap:   etf.MarketCap,
			LogoURL:     "https://logo.clearbit.com/stateformat.com",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		})
	}

	// 4. Curated Crypto Assets (Target: 20)
	cryptos := []struct {
		Symbol, Name string
		MarketCap    int64
	}{
		{"BTC", "Bitcoin", 1300000000000},
		{"ETH", "Ethereum", 420000000000},
		{"SOL", "Solana", 72000000000},
		{"BNB", "Binance Coin", 88000000000},
		{"XRP", "Ripple XRP", 29000000000},
		{"DOGE", "Dogecoin", 19000000000},
		{"ADA", "Cardano", 15000000000},
		{"AVAX", "Avalanche", 12000000000},
		{"DOT", "Polkadot", 8500000000},
		{"SHIB", "Shiba Inu", 11000000000},
		{"LINK", "Chainlink", 9200000000},
		{"LTC", "Litecoin", 5800000000},
		{"BCH", "Bitcoin Cash", 8800000000},
		{"NEAR", "Near Protocol", 5400000000},
		{"MATIC", "Polygon MATIC", 6500000000},
		{"UNI", "Uniswap", 5100000000},
		{"ICP", "Internet Computer", 4200000000},
		{"ETC", "Ethereum Classic", 3800000000},
		{"XLM", "Stellar Lumens", 3200000000},
		{"FIL", "Filecoin", 2800000000},
	}

	for _, cr := range cryptos {
		if seenSymbols[cr.Symbol] {
			continue
		}
		seenSymbols[cr.Symbol] = true
		assets = append(assets, models.StockMetadata{
			ID:          uuid.New().String(),
			Symbol:      cr.Symbol,
			CompanyName: cr.Name,
			Exchange:    "Crypto Network",
			Country:     "Global",
			AssetType:   "crypto",
			Sector:      "Decentralized Assets",
			Industry:    "Cryptocurrency Token",
			Currency:    "USD",
			MarketCap:   cr.MarketCap,
			LogoURL:     "https://logo.clearbit.com/bitcoin.org",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		})
	}

	// 5. Curated Indices (Target: 10)
	indices := []struct {
		Symbol, Name, Region string
	}{
		{"NIFTY50", "NIFTY 50", "India"},
		{"BANKNIFTY", "NIFTY Bank", "India"},
		{"SENSEX", "BSE SENSEX", "India"},
		{"NIFTYIT", "NIFTY IT Index", "India"},
		{"NIFTYAUTO", "NIFTY Auto Index", "India"},
		{"NASDAQ", "NASDAQ Composite Index", "United States"},
		{"SP500", "S&P 500 Index", "United States"},
		{"DOWJONES", "Dow Jones Industrial Average", "United States"},
		{"NIFTYPHARMA", "NIFTY Pharma Index", "India"},
		{"NIFTYMETAL", "NIFTY Metal Index", "India"},
	}

	for _, idx := range indices {
		if seenSymbols[idx.Symbol] {
			continue
		}
		seenSymbols[idx.Symbol] = true
		assets = append(assets, models.StockMetadata{
			ID:          uuid.New().String(),
			Symbol:      idx.Symbol,
			CompanyName: idx.Name,
			Exchange:    "Indices Board",
			Country:     idx.Region,
			AssetType:   "index",
			Sector:      "Economic Indices",
			Industry:    "Market Benchmark Portfolio",
			Currency:    "USD", // Default indices currency standard
			MarketCap:   0,
			LogoURL:     "https://logo.clearbit.com/spglobal.com",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		})
	}

	// Batch Insert all 250 assets
	if err := db.CreateInBatches(&assets, 50).Error; err != nil {
		return err
	}

	log.Printf("[DB-SEED] Searchable asset universe successfully seeded with %d assets.", len(assets))
	return nil
}
