package analysis

import (
	"net/http"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/agents"
	"stockox-backend/pkg/errors"
	"stockox-backend/pkg/eventbus"
	"stockox-backend/pkg/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommitteeController struct {
	db       *gorm.DB
	roomRepo repositories.AgentRoomRepository
	collabCe *agents.CollaborationEngine
}

func NewCommitteeController(
	db *gorm.DB,
	roomRepo repositories.AgentRoomRepository,
	wsHub *websocket.Hub,
) *CommitteeController {
	return &CommitteeController{
		db:       db,
		roomRepo: roomRepo,
		collabCe: agents.NewCollaborationEngine(db, roomRepo, wsHub),
	}
}

// POST /api/v1/committee/start
func (ctrl *CommitteeController) StartRoom(c *gin.Context) {
	var req struct {
		Ticker string `json:"ticker" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Ticker is required in request body")
		return
	}

	ticker := strings.ToUpper(req.Ticker)

	room := &models.AgentRoom{
		ID:        uuid.New(),
		Ticker:    ticker,
		Status:    "created",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := ctrl.roomRepo.CreateRoom(room); err != nil {
		errors.InternalServerError(c, "Failed to create agent room: "+err.Error())
		return
	}

	// Run collaboration in background goroutine to prevent HTTP timeout
	go ctrl.collabCe.RunRoom(room.ID, ticker)

	c.JSON(http.StatusCreated, room)
}

// GET /api/v1/committee/recent
func (ctrl *CommitteeController) GetRecentRooms(c *gin.Context) {
	rooms, err := ctrl.roomRepo.GetRecentRooms(5)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve recent agent rooms: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, rooms)
}

// GET /api/v1/committee/:id
func (ctrl *CommitteeController) GetRoom(c *gin.Context) {
	idStr := c.Param("id")
	roomID, err := uuid.Parse(idStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid room ID format")
		return
	}

	room, err := ctrl.roomRepo.GetRoomByID(roomID)
	if err != nil {
		errors.BadRequestError(c, "Room not found: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, room)
}

// GET /api/v1/committee/:id/messages
func (ctrl *CommitteeController) GetMessages(c *gin.Context) {
	idStr := c.Param("id")
	roomID, err := uuid.Parse(idStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid room ID format")
		return
	}

	messages, err := ctrl.roomRepo.GetConversationsByRoomID(roomID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve messages: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, messages)
}

// POST /api/v1/committee/:id/message
func (ctrl *CommitteeController) PostMessage(c *gin.Context) {
	idStr := c.Param("id")
	roomID, err := uuid.Parse(idStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid room ID format")
		return
	}

	var req struct {
		AgentName   string `json:"agent_name" binding:"required"`
		Message     string `json:"message" binding:"required"`
		MessageType string `json:"message_type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "agent_name, message, and message_type are required")
		return
	}

	conv := &models.AgentConversation{
		ID:          uuid.New(),
		RoomID:      roomID,
		AgentName:   req.AgentName,
		Message:     req.Message,
		MessageType: req.MessageType,
		CreatedAt:   time.Now(),
	}

	if err := ctrl.roomRepo.AddConversation(conv); err != nil {
		errors.InternalServerError(c, "Failed to record message: "+err.Error())
		return
	}

	// Broadcast via WebSocket using eventbus
	bus := eventbus.GetBus()
	payload := map[string]interface{}{
		"room_id":      roomID.String(),
		"agent_name":   req.AgentName,
		"message":      req.Message,
		"message_type": req.MessageType,
		"timestamp":    time.Now(),
	}
	event := eventbus.NewEvent("agent_message", payload)
	bus.Publish("agent_events", event)

	c.JSON(http.StatusCreated, conv)
}

// GET /api/v1/committee/:id/decision
func (ctrl *CommitteeController) GetDecision(c *gin.Context) {
	idStr := c.Param("id")
	roomID, err := uuid.Parse(idStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid room ID format")
		return
	}

	room, err := ctrl.roomRepo.GetRoomByID(roomID)
	if err != nil {
		errors.BadRequestError(c, "Room not found: "+err.Error())
		return
	}

	messages, err := ctrl.roomRepo.GetConversationsByRoomID(roomID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve conversations: "+err.Error())
		return
	}

	var decisionMessage *models.AgentConversation
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].MessageType == "decision" && strings.Contains(messages[i].Message, "Consensus reached") {
			decisionMessage = &messages[i]
			break
		}
	}

	if decisionMessage == nil {
		c.JSON(http.StatusOK, gin.H{
			"room_id":   roomID,
			"ticker":    room.Ticker,
			"status":    room.Status,
			"consensus": "PENDING",
			"message":   "Consensus not reached yet",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"room_id":   roomID,
		"ticker":    room.Ticker,
		"status":    room.Status,
		"consensus": "BUY", // Mock/Simulated consensus resolved
		"message":   decisionMessage.Message,
		"timestamp": decisionMessage.CreatedAt,
	})
}
