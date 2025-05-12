package helpers

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func ChkError(err error) {
	if err != nil {
		log.Fatalf(err.Error())
	}
}
func GetConn(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	ChkError(err)

	for {
		messageType, p, err := conn.ReadMessage()
		ChkError(err)

		err = conn.WriteMessage(messageType, p)
		ChkError(err)

	}
}
