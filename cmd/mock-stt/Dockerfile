FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /mock-stt ./cmd/mock-stt

FROM alpine:3.21
COPY --from=builder /mock-stt /mock-stt
EXPOSE 8081
CMD ["/mock-stt"]
