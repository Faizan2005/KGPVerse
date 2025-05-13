package main

import (
	"log"
	"net/http"

	"github.com/Faizan2005/KGPVerse/websocket/helpers"
)

func main() {
	// Start broadcast handler
	go helpers.BroadcastMessages()

	http.HandleFunc("/ws", helpers.GetConn)

	log.Printf("WebSocket server started on :3333")
	err := http.ListenAndServe(":3333", nil)
	helpers.ChkError(err)
}
