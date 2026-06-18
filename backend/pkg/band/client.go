package band

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type BandClient struct {
	APIKey  string
	BaseURL string
	Mock    bool
}

func NewBandClient(apiKey, baseURL string) *BandClient {
	mock := apiKey == "" || baseURL == "" || apiKey == "dev_band_key" || strings.Contains(baseURL, "dev.band.exchange")
	if mock {
		log.Println("[BAND-CLIENT] APIKey or BaseURL not configured for live network. Initializing in high-fidelity mock/simulation mode.")
	} else {
		log.Printf("[BAND-CLIENT] Initialized live Band client (BaseURL: %s)", baseURL)
	}
	return &BandClient{
		APIKey:  apiKey,
		BaseURL: baseURL,
		Mock:    mock,
	}
}

func (c *BandClient) CreateRoom(name, ticker string) (string, error) {
	if c.Mock {
		roomID := uuid.New().String()
		GlobalRegistry.CreateRoom(roomID, name, ticker)
		log.Printf("[BAND-MOCK] Created room: ID=%s Name=%s Ticker=%s", roomID, name, ticker)
		return roomID, nil
	}

	url := fmt.Sprintf("%s/api/rooms", c.BaseURL)
	payload := map[string]string{
		"name":   name,
		"ticker": ticker,
	}
	data, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[BAND-WARN] Live API request failed: %v. Falling back to mock room creation.", err)
		roomID := uuid.New().String()
		GlobalRegistry.CreateRoom(roomID, name, ticker)
		return roomID, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		log.Printf("[BAND-WARN] Live API returned status %d. Falling back to mock room creation.", resp.StatusCode)
		roomID := uuid.New().String()
		GlobalRegistry.CreateRoom(roomID, name, ticker)
		return roomID, nil
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		roomID := uuid.New().String()
		GlobalRegistry.CreateRoom(roomID, name, ticker)
		return roomID, nil
	}

	GlobalRegistry.CreateRoom(result.ID, name, ticker)
	return result.ID, nil
}

func (c *BandClient) InviteAgent(roomID string, agentName string) error {
	if c.Mock {
		if room, exists := GlobalRegistry.GetRoom(roomID); exists {
			room.Agents = append(room.Agents, agentName)
			log.Printf("[BAND-MOCK] Room %s invited agent: %s", roomID, agentName)
		}
		return nil
	}

	url := fmt.Sprintf("%s/api/rooms/%s/invite", c.BaseURL, roomID)
	payload := map[string]string{
		"agent_name": agentName,
	}
	data, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[BAND-WARN] Invite agent live call failed: %v. Simulating locally.", err)
		return nil
	}
	defer resp.Body.Close()

	if room, exists := GlobalRegistry.GetRoom(roomID); exists {
		room.Agents = append(room.Agents, agentName)
	}
	return nil
}

func (c *BandClient) SendMessage(roomID string, msg *BandMessage) error {
	if c.Mock {
		if room, exists := GlobalRegistry.GetRoom(roomID); exists {
			room.Messages = append(room.Messages, *msg)
			log.Printf("[BAND-MOCK] Room %s message from %s: %s (recommendation: %s, confidence: %d)",
				roomID, msg.Agent, msg.Analysis, msg.Recommendation, msg.Confidence)
		}
		return nil
	}

	url := fmt.Sprintf("%s/api/rooms/%s/messages", c.BaseURL, roomID)
	data, _ := json.Marshal(msg)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[BAND-WARN] Send message live call failed: %v. Simulating locally.", err)
		if room, exists := GlobalRegistry.GetRoom(roomID); exists {
			room.Messages = append(room.Messages, *msg)
		}
		return nil
	}
	defer resp.Body.Close()

	if room, exists := GlobalRegistry.GetRoom(roomID); exists {
		room.Messages = append(room.Messages, *msg)
	}
	return nil
}

func (c *BandClient) GetMessages(roomID string) ([]BandMessage, error) {
	if c.Mock {
		if room, exists := GlobalRegistry.GetRoom(roomID); exists {
			return room.Messages, nil
		}
		return []BandMessage{}, nil
	}

	url := fmt.Sprintf("%s/api/rooms/%s/messages", c.BaseURL, roomID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[BAND-WARN] Get messages live call failed: %v. Returning local copies.", err)
		if room, exists := GlobalRegistry.GetRoom(roomID); exists {
			return room.Messages, nil
		}
		return []BandMessage{}, nil
	}
	defer resp.Body.Close()

	var msgs []BandMessage
	if err := json.NewDecoder(resp.Body).Decode(&msgs); err != nil {
		if room, exists := GlobalRegistry.GetRoom(roomID); exists {
			return room.Messages, nil
		}
		return []BandMessage{}, nil
	}

	return msgs, nil
}
