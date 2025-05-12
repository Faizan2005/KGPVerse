package main

import (
	"log"
	"net/http"

	"github.com/Faizan2005/KGPVerse/websocket/helpers"
)

func main() {

	http.HandleFunc("/ws", helpers.GetConn)
	err := http.ListenAndServe(":3333", nil)

	helpers.ChkError(err)
	log.Printf("Listening for connections")
}
