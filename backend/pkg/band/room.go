package band

import (
	"sync"
	"time"
)

type BandRoom struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Ticker    string        `json:"ticker"`
	Agents    []string      `json:"agents"`
	Messages  []BandMessage `json:"messages"`
	CreatedAt time.Time     `json:"created_at"`
}

type RoomRegistry struct {
	mu    sync.RWMutex
	rooms map[string]*BandRoom
}

var GlobalRegistry = &RoomRegistry{
	rooms: make(map[string]*BandRoom),
}

func (r *RoomRegistry) CreateRoom(id, name, ticker string) *BandRoom {
	r.mu.Lock()
	defer r.mu.Unlock()

	room := &BandRoom{
		ID:        id,
		Name:      name,
		Ticker:    ticker,
		Agents:    make([]string, 0),
		Messages:  make([]BandMessage, 0),
		CreatedAt: time.Now(),
	}
	r.rooms[id] = room
	return room
}

func (r *RoomRegistry) GetRoom(id string) (*BandRoom, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	room, exists := r.rooms[id]
	return room, exists
}

func (r *RoomRegistry) DeleteRoom(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.rooms, id)
}

func (r *RoomRegistry) GetRoomByTicker(ticker string) (*BandRoom, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, room := range r.rooms {
		if room.Ticker == ticker {
			return room, true
		}
	}
	return nil, false
}

