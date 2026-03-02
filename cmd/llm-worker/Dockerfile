FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /llm-worker ./cmd/llm-worker

FROM alpine:3.21
COPY --from=builder /llm-worker /llm-worker
CMD ["/llm-worker"]
