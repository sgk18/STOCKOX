# Multi-stage Docker build for Go Backend Service

# Stage 1: Build binary
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git for potential dependencies fetch
RUN apk add --no-cache git

# Copy dependency manifests
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server cmd/server/main.go

# Stage 2: Minimal runtime image
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

# Copy compiled binary from builder
COPY --from=builder /app/server .

# Copy env files templates
COPY .env.production .env

EXPOSE 8080

CMD ["./server"]
