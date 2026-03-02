.PHONY: up down build test lint

up:
	docker compose up -d

down:
	docker compose down

build:
	go build -o bin/api ./cmd/api
	go build -o bin/stt-worker ./cmd/stt-worker
	go build -o bin/llm-worker ./cmd/llm-worker

test:
	go test ./... -v -race

lint:
	golangci-lint run ./...
