package repositories

import (
	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository interface {
	GetByID(id uuid.UUID) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	Create(user *models.User) error
	Update(user *models.User) error
	Delete(id uuid.UUID) error
}

type sqlUserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &sqlUserRepository{db: db}
}

func (r *sqlUserRepository) GetByID(id uuid.UUID) (*models.User, error) {
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

func (r *sqlUserRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.User{}, "id = ?", id).Error
}
