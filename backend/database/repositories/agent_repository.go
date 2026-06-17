package repositories

import (
	"gorm.io/gorm"
)

type AgentRepository interface {
	// Compatibility placeholder for deprecated agent table queries
}

type sqlAgentRepository struct {
	db *gorm.DB
}

func NewAgentRepository(db *gorm.DB) AgentRepository {
	return &sqlAgentRepository{db: db}
}
