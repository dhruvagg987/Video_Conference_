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