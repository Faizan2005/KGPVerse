package helpers

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	ID   string
	Conn *websocket.Conn
}

type Player struct {
	ID        string  `json:"id"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Direction string  `json:"direction"`
}

type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

var (
	clients   = make(map[*Client]bool)
	players   = make(map[string]Player)
	broadcast = make(chan Message)
	mutex     sync.Mutex
)

func ChkError(err error) {
	if err != nil {
		log.Fatalf(err.Error())
	}
}

// Add BroadcastMessages function to handle message broadcasting
func BroadcastMessages() {
	for {
		msg := <-broadcast
		mutex.Lock()
		for client := range clients {
			err := client.Conn.WriteJSON(msg)
			if err != nil {
				log.Printf("Error broadcasting to client %s: %v", client.ID, err)
				client.Conn.Close()
				delete(clients, client)
			}
		}
		mutex.Unlock()
	}
}

// Update HandleWebSocket with better logging
func HandleWebSocket(client *Client) {
	defer func() {
		mutex.Lock()
		delete(clients, client)
		delete(players, client.ID)
		mutex.Unlock()
		client.Conn.Close()

		log.Printf("Player %s disconnected. Total players: %d", client.ID, len(players))
		broadcast <- Message{
			Event: "player_left",
			Data:  map[string]string{"id": client.ID},
		}
	}()

	// Add new player
	mutex.Lock()
	clients[client] = true
	players[client.ID] = Player{
		ID:        client.ID,
		X:         0,
		Y:         0,
		Direction: "idle",
	}
	mutex.Unlock()

	log.Printf("New player %s joined. Total players: %d", client.ID, len(players))

	// Send current players to new client
	currentMsg := Message{
		Event: "current_players",
		Data: map[string]interface{}{
			"players": players,
			"myId":    client.ID,
		},
	}
	err := client.Conn.WriteJSON(currentMsg)
	if err != nil {
		log.Printf("Error sending current players to %s: %v", client.ID, err)
		return
	}

	// Notify others about new player
	broadcast <- Message{
		Event: "player_joined",
		Data:  players[client.ID],
	}

	// Handle incoming messages
	for {
		var msg Message
		err := client.Conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading from client %s: %v", client.ID, err)
			break
		}

		if msg.Event == "player_moved" {
			if data, ok := msg.Data.(map[string]interface{}); ok {
				mutex.Lock()
				players[client.ID] = Player{
					ID:        client.ID,
					X:         data["x"].(float64),
					Y:         data["y"].(float64),
					Direction: data["direction"].(string),
				}
				mutex.Unlock()

				broadcast <- Message{
					Event: "player_moved",
					Data:  players[client.ID],
				}
			}
		}
	}
}

func GetConn(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	ChkError(err)

	client := &Client{
		ID:   conn.RemoteAddr().String(),
		Conn: conn,
	}

	log.Println("New Client connected")
	go HandleWebSocket(client)
}
