package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	log.Println("--- START INFRASTRUCTURE AUDIT TEST ---")
	
	// Load .env.local
	err := godotenv.Load(".env.local")
	if err != nil {
		log.Println("godotenv.Load error (continuing with process env):", err)
	}

	// 1. DATABASE CHECK
	dbURL := os.Getenv("DATABASE_URL")
	log.Printf("DATABASE_URL length: %d", len(dbURL))
	
	if dbURL != "" {
		db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err != nil {
			log.Printf("GORM Open error: %v", err)
		} else {
			log.Println("GORM Open: SUCCESS")
			sqlDB, err := db.DB()
			if err != nil {
				log.Printf("db.DB() error: %v", err)
			} else {
				err = sqlDB.Ping()
				if err != nil {
					log.Printf("DB Ping error: %v", err)
				} else {
					log.Println("DB Ping: SUCCESS")
					var result int
					err = db.Raw("SELECT 1").Scan(&result).Error
					if err != nil {
						log.Printf("SELECT 1 query error: %v", err)
					} else {
						log.Printf("SELECT 1 query: SUCCESS (result=%d)", result)
					}
				}
			}
		}
	} else {
		log.Println("DATABASE_URL is empty!")
	}

	// 2. REDIS/VALKEY CHECK
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")
	redisPassword := os.Getenv("REDIS_PASSWORD")
	valkeyURL := os.Getenv("VALKEY_URL")
	log.Printf("REDIS_HOST='%s', REDIS_PORT='%s', VALKEY_URL='%s'", redisHost, redisPort, valkeyURL)

	addr := ""
	if redisHost != "" && redisPort != "" {
		addr = redisHost + ":" + redisPort
	} else if valkeyURL != "" {
		addr = valkeyURL // parsed
	}

	if addr != "" {
		rdb := redis.NewClient(&redis.Options{
			Addr:     addr,
			Password: redisPassword,
			DB:       0,
		})
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		pong, err := rdb.Ping(ctx).Result()
		if err != nil {
			log.Printf("Valkey Ping error: %v", err)
		} else {
			log.Printf("Valkey Ping: SUCCESS (pong='%s')", pong)
		}
	} else {
		log.Println("No Redis/Valkey host/port or URL configured!")
	}
	
	log.Println("--- END INFRASTRUCTURE AUDIT TEST ---")
}
