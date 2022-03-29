const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
// Below, express does it anyway. Refactoring to use Socket.io
const server = http.createServer(app);

const io = socketio(server);

const port = process.env.PORT || 3000;
// Get path for public folder directory
const publicDirectoryPath = path.join(__dirname, '../public');

// Express static middleware to serve up with publicDirectoryPath
app.use(express.static(publicDirectoryPath));

// server (emit) -> client (receive)
// client (emit) -> server (receive)

io.on('connection', (socket) => {
  console.log('New WebSocket connection.');

  socket.on('join', ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    // join a room - built-in Socket.io ability
    socket.join(user.room);

    socket.emit('message', generateMessage('Admin', "Welcome To Idan's Chat!"));

    // sends to everyone in the room except for the new user
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined the chat!`));

    // Sends a list of updated users to room when a user joins
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();

    // socket.emit, io.emit, socket.broadcast.emit - Public
    // io.to.emit, socket.broadcast.to.emit - Functions for current room
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed!');
    }

    // (server -> all clients in room)
    io.to(user.room).emit('message', generateMessage(user.username, message));

    callback('Delievered!');
  });

  socket.on('sendLocation', (coords, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));

      // Sends a list of updated users to room when a user leaves
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log('Server is up on port ' + port);
});
