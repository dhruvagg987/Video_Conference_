const express = require('express')

var io = require('socket.io')
({
    path: '/io/webrtc'
})

const app = express()
const port = 8080

// app.get('/', (req, res) => res.send('hello world!!'))

app.use(express.static(__dirname + '/build'))
app.get('/',(req, res, next) => {
    res.sendFile(__dirname + '/build/index.html')
})

const server = app.listen(port,()=> console.log('example app listening on port ',port))

io.listen(server)

//default namespace
io.on('connection', socket => {
    console.log('connected')
})

const peers = io.of('/webrtcPeer')

let connectedPeers = new Map()

peers.on('connection', socket => {

    connectedPeers.set(socket.id, socket)

    console.log(socket.id)
    socket.emit('connection-success', {
        success: socket.id,
        peerCount: connectedPeers.size,
     })
    
    const broadcast = () => socket.broadcast.emit('joined-peers', {
        peerCount: connectedPeers.size,
    })
    broadcast()

    const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected',{
        peerCount: connectedPeers.size,
        socketID: socketID
    })

    socket.on('disconnect', () => {
        console.log('disconnected')
        connectedPeers.delete(socket.id)
        disconnectedPeer(socket.id)
    })

    socket.on('onlinePeers', (data) => {
        for(const [socketID, _socket] of connectedPeers.entries()) {
            //don't send to self
            if(socketID !== data.socketID.local){
                console.log('online-peer', data.socketID, socketID)
                socket.emit('online-peer', socketID)
            }
        }
    })

    socket.on('offer', data => {
        for (const [socketID, socket] of connectedPeers.entries()) {
          // don't send to self
          if (socketID === data.socketID.remote) {
            // console.log('Offer', socketID, data.socketID, data.payload.type)
            socket.emit('offer', {
                sdp: data.payload,
                socketID: data.socketID.local
              }
            )
          }
        }
      })
    
      socket.on('answer', (data) => {
        for (const [socketID, socket] of connectedPeers.entries()) {
          if (socketID === data.socketID.remote) {
            console.log('Answer', socketID, data.socketID, data.payload.type)
            socket.emit('answer', {
                sdp: data.payload,
                socketID: data.socketID.local
              }
            )
          }
        }
      })

    // socket.on('offerOrAnswer', (data) => {
    //     //send to other peers if any
    //     for (const [socketID, socket] of connectedPeers.entries()){
    //         //don't send to self
    //         if(socketID !== data.socketID){
    //             console.log(socketID, data.payload.type)
    //             socket.emit('offerOrAnswer', data.payload)
    //         }
    //     }
    // })

    socket.on('candidate', (data) => {
        //send to other peers if any
        for (const [socketID, socket] of connectedPeers.entries()){
            //don't send to self
            if(socketID === data.socketID.remote){
                socket.emit('candidate',{
                    candidate: data.payload,
                    socketID: data.socketID.local
                })
                // console.log(socketID, data.payload)
                // socket.emit('candidate', data.payload)
            }
        }
    })
})