package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type TranscribeRequest struct {
	AudioKey string `json:"audio_key"`
}

type TranscribeResponse struct {
	Text string `json:"text"`
}

var sampleTranscripts = []string{
	"Today we discussed the quarterly results. Revenue increased by 15% compared to last quarter. The team has made significant progress on the new product launch.",
	"The meeting covered three main topics: infrastructure migration to cloud, hiring plans for Q2, and the upcoming product demo scheduled for next month.",
	"Customer feedback has been overwhelmingly positive. We need to focus on improving the onboarding experience and reducing response time for support tickets.",
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())

	e.POST("/transcribe", func(c echo.Context) error {
		var req TranscribeRequest
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
		}

		// Simulate processing time (1-3 seconds)
		time.Sleep(time.Duration(1+rand.Intn(3)) * time.Second)

		transcript := sampleTranscripts[rand.Intn(len(sampleTranscripts))]
		return c.JSON(http.StatusOK, TranscribeResponse{Text: transcript})
	})

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	fmt.Println("Mock STT server starting on :8081")
	e.Logger.Fatal(e.Start(":8081"))
}
