package repositories

import (
	"stockox-backend/database/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserRepository interface {
	GetByID(id string) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	Create(user *models.User) error
	Update(user *models.User) error
	UpdateID(oldID, newID string) error
	Delete(id string) error
	Upsert(user *models.User) error
}

type sqlUserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &sqlUserRepository{db: db}
}

func (r *sqlUserRepository) GetByID(id string) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *sqlUserRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "email = ?", email).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *sqlUserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *sqlUserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *sqlUserRepository) Delete(id string) error {
	return r.db.Delete(&models.User{}, "id = ?", id).Error
}

func (r *sqlUserRepository) UpdateID(oldID, newID string) error {
	return r.db.Model(&models.User{}).Where("id = ?", oldID).Update("id", newID).Error
}

func (r *sqlUserRepository) Upsert(user *models.User) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		UpdateAll: true,
	}).Create(user).Error
}

