FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /mock-llm ./cmd/mock-llm

FROM alpine:3.21
COPY --from=builder /mock-llm /mock-llm
EXPOSE 8082
CMD ["/mock-llm"]
