package config

import "github.com/caarlos0/env/v11"

type Config struct {
	PostgresDSN string `env:"POSTGRES_DSN" envDefault:"postgres://app:devpassword@localhost:5432/aiplatform?sslmode=disable"`
	RedisAddr   string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	RabbitMQURL string `env:"RABBITMQ_URL" envDefault:"amqp://app:devpassword@localhost:5672/"`
	STTEndpoint string `env:"STT_ENDPOINT" envDefault:"http://localhost:8081"`
	LLMEndpoint string `env:"LLM_ENDPOINT" envDefault:"http://localhost:8082"`
	APIPort     string `env:"API_PORT" envDefault:"8080"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
