FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /mock-stt ./cmd/mock-stt

FROM alpine:3.19
COPY --from=builder /mock-stt /mock-stt
EXPOSE 8081
CMD ["/mock-stt"]
