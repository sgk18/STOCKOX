package auth

type UserSyncRequest struct {
	Name      string `json:"name" binding:"required"`
	Email     string `json:"email" binding:"required"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
}

type SyncResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
