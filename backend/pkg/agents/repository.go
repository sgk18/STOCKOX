package agents

import (
	"time"

	"gorm.io/gorm"
)

type AgentRepository interface {
	GetActivities(limit int) ([]AgentActivity, error)
	GetStatuses() ([]AgentStatus, error)
	LogActivity(agentName, activityType, message, status string) (*AgentActivity, error)
	UpdateStatus(agentName, status string) error
}

type sqlAgentRepository struct {
	db *gorm.DB
}

func NewAgentRepository(db *gorm.DB) AgentRepository {
	return &sqlAgentRepository{db: db}
}

func (r *sqlAgentRepository) GetActivities(limit int) ([]AgentActivity, error) {
	var activities []AgentActivity
	err := r.db.Order("created_at desc").Limit(limit).Find(&activities).Error
	if err != nil {
		return nil, err
	}
	return activities, nil
}

func (r *sqlAgentRepository) GetStatuses() ([]AgentStatus, error) {
	var statuses []AgentStatus
	err := r.db.Find(&statuses).Error
	if err != nil {
		return nil, err
	}
	return statuses, nil
}

func (r *sqlAgentRepository) LogActivity(agentName, activityType, message, status string) (*AgentActivity, error) {
	activity := AgentActivity{
		AgentName:    agentName,
		ActivityType: activityType,
		Message:      message,
		Status:       status,
		CreatedAt:    time.Now(),
	}
	err := r.db.Create(&activity).Error
	if err != nil {
		return nil, err
	}
	return &activity, nil
}

func (r *sqlAgentRepository) UpdateStatus(agentName, status string) error {
	return r.db.Model(&AgentStatus{}).
		Where("agent_name = ?", agentName).
		Update("status", status).Error
}
