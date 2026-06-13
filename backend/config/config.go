package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server struct {
		Port string
		Env  string
		Name string
	}
	Database struct {
		Host          string
		Port          string
		User          string
		Password      string
		Name          string
		SSLMode       string
		DropOnStartup bool
	}
	Redis struct {
		Host     string
		Port     string
		Password string
	}
	JWT struct {
		Secret     string
		Expiration string
	}
	Band struct {
		APIKey  string
		BaseURL string
	}
	AI struct {
		AIMLAPIKey        string
		FeatherlessAPIKey string
	}
	FrontendURL string
}

// LoadConfig reads configuration parameters from environmental variables
func LoadConfig() *Config {
	// Load environment variables from files if present (in order of precedence: local overrides, then dev)
	_ = godotenv.Load(".env.local")
	if err := godotenv.Load(".env.development"); err != nil {
		if err := godotenv.Load(); err != nil {
			log.Println("[CONFIG-INFO] No .env.local, .env.development or .env files found. Relying on system environment.")
		}
	}

	cfg := &Config{}

	// Server
	cfg.Server.Port = getEnv("PORT", "8080")
	cfg.Server.Env = getEnv("APP_ENV", "development")
	cfg.Server.Name = getEnv("APP_NAME", "stockox")

	// Database
	cfg.Database.Host = getEnv("DB_HOST", "localhost")
	cfg.Database.Port = getEnv("DB_PORT", "5432")
	cfg.Database.User = getEnv("DB_USER", "postgres")
	cfg.Database.Password = getEnv("DB_PASSWORD", "root")
	cfg.Database.Name = getEnv("DB_NAME", "stockox")
	cfg.Database.SSLMode = getEnv("DB_SSLMODE", "disable")
	cfg.Database.DropOnStartup = getEnv("DB_DROP_ON_STARTUP", "false") == "true"

	// Redis
	cfg.Redis.Host = getEnv("REDIS_HOST", "localhost")
	cfg.Redis.Port = getEnv("REDIS_PORT", "6379")
	cfg.Redis.Password = getEnv("REDIS_PASSWORD", "")

	// JWT
	cfg.JWT.Secret = getEnv("JWT_SECRET", "stockox_terminal_secret_key_change_me")
	cfg.JWT.Expiration = getEnv("JWT_EXPIRATION", "24h")

	// Band
	cfg.Band.APIKey = getEnv("BAND_API_KEY", "")
	cfg.Band.BaseURL = getEnv("BAND_BASE_URL", "")

	// AI APIs
	cfg.AI.AIMLAPIKey = getEnv("AIML_API_KEY", "")
	cfg.AI.FeatherlessAPIKey = getEnv("FEATHERLESS_API_KEY", "")

	// Frontend
	cfg.FrontendURL = getEnv("FRONTEND_URL", "http://localhost:3000")

	return cfg
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		c.Database.Host, c.Database.User, c.Database.Password, c.Database.Name, c.Database.Port, c.Database.SSLMode)
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val, ok := os.LookupEnv(key); ok {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
