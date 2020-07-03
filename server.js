const express = require('express')

var io = require('socket.io')
({
    path:'/webrtc'
})

const app = express()
const port = 8080

// app.get('/', (req, res) => res.send('hello world!!'))
app.use(express.static(__dirname + '/build'))
app.get('/',(req, res, next)=> {
    res.sendFile(__dirname + '/build/index.html')
})

const server = app.listen(port,()=> console.log('example app listening on port ',port))

io.listen(server)

const peers = io.of('/webrtcPeer')

let connectedPeers = new Map()

peers.on('connection', socket => {
    console.log(socket.id)
    socket.emit('connection-success', { success: socket.id })
    connectedPeers.set(socket.id, socket)

    socket.on('disconnect', () => {
        console.log('disconnected')
        connectedPeers.delete(socket.id)
    })

    socket.on('offerOrAnswer', (data) => {
        //send to other peers if any
        for (const [socketID, socket] of connectedPeers.entries()){
            //don't send to self
            if(socketID !== data.socketID){
                console.log(socketID, data.payload.type)
                socket.emit('offerOrAnswer', data.payload)
            }
        }
    })

    socket.on('candidate', (data) => {
        //send to other peers if any
        for (const [socketID, socket] of connectedPeers.entries()){
            //don't send to self
            if(socketID !== data.socketID){
                console.log(socketID, data.payload)
                socket.emit('candidate', data.payload)
            }
        }
    })
})