package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type SummarizeRequest struct {
	Text string `json:"text"`
}

type SummarizeResponse struct {
	Summary string `json:"summary"`
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())

	e.POST("/summarize", func(c echo.Context) error {
		var req SummarizeRequest
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
		}

		// Simulate LLM processing time (2-5 seconds)
		time.Sleep(time.Duration(2+rand.Intn(4)) * time.Second)

		runeCount := len([]rune(req.Text))
		summary := fmt.Sprintf("[AI Summary] This transcript contains %d characters. Key points: The discussion covered operational updates, strategic planning, and action items for follow-up. Sentiment: positive. Priority: medium.", runeCount)

		return c.JSON(http.StatusOK, SummarizeResponse{Summary: summary})
	})

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	fmt.Println("Mock LLM server starting on :8082")
	e.Logger.Fatal(e.Start(":8082"))
}
