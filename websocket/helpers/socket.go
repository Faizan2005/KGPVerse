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

type Client struct {
	id   string
	conn *websocket.Conn
}

var clients []Client

func ChkError(err error) {
	if err != nil {
		log.Fatalf(err.Error())
	}
}

func readLoop(c *websocket.Conn) {

	defer c.Close()
	for {
		messageType, message, err := c.NextReader()
		if err != nil {
			c.Close()
			break
		}
		msgbytes := make([]byte, 1024)
		n, err := message.Read(msgbytes)
		ChkError(err)

		err = c.WriteMessage(messageType, msgbytes[:n])
		ChkError(err)
	}
	log.Printf("Client disconnected")
}
func GetConn(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	ChkError(err)

	log.Println("New Client connected")
	go readLoop(conn)
}
