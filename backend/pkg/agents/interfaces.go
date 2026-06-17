package agents

import "context"

type Agent interface {
	Analyze(ctx context.Context, ticker string, history []string) (string, error)
	SendMessage(ctx context.Context, message string) error
	ReceiveMessage(ctx context.Context, sender string, message string) error
	Vote(ctx context.Context, ticker string) (string, error) // BUY, HOLD, SELL
	GenerateReasoning(ctx context.Context, ticker string) (string, error)
	GetName() string
}
