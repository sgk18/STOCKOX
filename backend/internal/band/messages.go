package band

import "time"

type BandMessage struct {
	Agent          string    `json:"agent"`
	Symbol         string    `json:"symbol"`
	Analysis       string    `json:"analysis"`
	Recommendation string    `json:"recommendation"`
	Confidence     int       `json:"confidence"`
	Timestamp      time.Time `json:"timestamp"`
}
