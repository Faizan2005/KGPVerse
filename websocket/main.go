package main

import (
	"log"
	"net/http"

	"github.com/Faizan2005/KGPVerse/websocket/helpers"
)

func main() {

	http.HandleFunc("/ws", helpers.GetConn)

	log.Printf("Listening for connections")
	err := http.ListenAndServe(":3333", nil)
	helpers.ChkError(err)
}
