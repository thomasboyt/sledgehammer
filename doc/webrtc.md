i'm trying to build a lil 1:n network, so i think my ideal flow is something like

```
* host connects to the lobby server w websocket, registering with a secret that will allow clients to establish connection. the secret is manually sent to clients (it's like a password, or a room code)
* client connects to the lobby with the secret
* lobby server lets host know a client is connected, and the host app creates a Peer object with a signal message
* the host app sends the signal message back to the lobby server, which then sends it back to the client (this is where having a proper req-response system would make things way easier!!)
* the client creates its signal data using the host's and then sends _that_ back all the way through the lobby
* the host receives the client's signal data and finally instantiates the webrtc connection
```



* host creates a room, with a room code (ABCD)
* host establishes a websocket connection with the signaling server
* guest initiates a peer connection, passes room code and SDP offer to server
* server passes onto host, who creates a peer connection using the offer
* the host's SDP answer is then passed to the server, which passes back to the guest
* guest passes signal into peer connection and connection is established, hopefully