
const express = require('express')

var io = require('socket.io')
({
  path: '/io/webrtc'
})

const app = express()
const port = 3000
// const port = 3001

const rooms = {}

// app.get('/', (req, res) => res.send('Hello World!!!!!'))

//https://expressjs.com/en/guide/writing-middleware.html

app.use(express.static(__dirname + '/build'))
app.get('/', (req, res, next) => { //default room
    res.send('Hello World!!!!!')
})


// app.get('/:room', (req, res, next) => {
//   res.sendFile(__dirname + '/build/index.html')
// })

const server = app.listen(port, () => console.log(`Server listening on port ${port}!`))

io.listen(server)

// default namespace
io.on('connection', socket => {
  console.log('connected')
})

// https://www.tutorialspoint.com/socket.io/socket.io_namespaces.htm
const peers = io.of('/webrtcPeer')

// keep a reference of all socket connections
let connectedPeers = new Map()

peers.on('connection', socket => {
  console.log("===================================================");
  
  const room = socket.handshake.query.room.toLocaleLowerCase().trim()
  console.log("Room :", room);

  rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket)

  console.log("In connection ::",socket.id)

  socket.emit('connection-success', { success: socket.id })

  connectedPeers.set(socket.id, socket)

  console.log("connected socket  :", rooms);
    
  const connectedUser = ( )=>{
    const _connectedPeers = rooms[room];

    for (const [_socketID, socket] of _connectedPeers.entries()) {

        socket.emit('peer-not-connected', rooms[room].size);
    }

  }

  socket.on('disconnect', () => {
    console.log('disconnected', socket.id)
    
    rooms[room].delete(socket.id)
    connectedPeers.delete(socket.id)

  console.log("connected socket  :", rooms);
  console.log("connected socketSize  :", rooms[room].size);
  disconnectedPeer(socket.id)
  connectedUser()
  
  if(rooms[room].size == 0) {
    delete rooms[room];
  }

  })

  const disconnectedPeer = (socketID) => {
    const _connectedPeers = rooms[room]
    for (const [_socketID, socket] of _connectedPeers.entries()) {

      if (_socketID !== socketID) {

        socket.emit('peer-disconnected', {
          // peerCount: rooms[room].size,
          socketID
        })
      }
    }
  }



  // socket.on('offerOrAnswer', (data) => {
  //   // console.log('In offerOrAnswer ::', data.socketID)

  //   const _connectedPeers = rooms[room]

  //   console.log("peer connected ::", _connectedPeers.size)

  //   if(_connectedPeers.size < 2){
  //         connectedUser();
  //   } else {
  //   // send to the other peer(s) if any
  //   for (const [socketID, socket] of _connectedPeers.entries()) {
  //     // don't send to self
  //     if (socketID !== data.socketID) {
  //       console.log("send offerOrAnswer ::",socketID, data.payload.type)
  //       socket.emit('offerOrAnswer', data.payload)
  //     }
  //   }
  // }
  // })

  socket.on('offer', (data) => {
    // console.log('In offerOrAnswer ::', data.socketID)

    const _connectedPeers = rooms[room]

    console.log("peer connected ::", _connectedPeers.size)

    if(_connectedPeers.size < 2){
          connectedUser();
    } else {
    // send to the other peer(s) if any
    for (const [socketID, socket] of _connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID) {
        console.log("send offer ::",socketID, data.payload.type)
        socket.emit('offer', data.payload)
      }
    }
  }
  })

  socket.on('answer', (data) => {
    // console.log('In offerOrAnswer ::', data.socketID)

    const _connectedPeers = rooms[room]

    console.log("peer connected ::", _connectedPeers.size)

    if(_connectedPeers.size < 2){
          connectedUser();
    } else {
    // send to the other peer(s) if any
    for (const [socketID, socket] of _connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID) {
        console.log("send answer ::",socketID, data.payload.type)
        socket.emit('answer', data.payload)
      }
    }
  }
  })

  socket.on('candidate', (data) => {
    // send candidate to the other peer(s) if any
    // console.log('In candidate ::', data.socketID)
    const _connectedPeers = rooms[room]


    for (const [socketID, socket] of _connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID) {
        // console.log("send candidate ::",socketID, data.payload)
        socket.emit('candidate', data.payload)
      }
    }
  })

})