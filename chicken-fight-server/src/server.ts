import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game/GameRoom';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for the game
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Store active rooms
const rooms = new Map<string, GameRoom>();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create Room
  socket.on('createRoom', (data: { playerName: string }) => {
    // Generate a short 5-character code
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    socket.join(roomCode);
    
    // Create new room instance
    const newRoom = new GameRoom(roomCode, io);
    newRoom.addPlayer(socket.id, data.playerName, true); // true = isHost
    rooms.set(roomCode, newRoom);
    
    socket.emit('roomCreated', { 
      roomCode, 
      players: newRoom.getPlayersState() 
    });
  });

  // Join Room
  socket.on('joinRoom', (data: { roomCode: string, playerName: string }) => {
    const room = rooms.get(data.roomCode.toUpperCase());
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.getPlayersState().length >= 8) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    if (room.hasStarted) {
      socket.emit('error', { message: 'Match already in progress' });
      return;
    }

    socket.join(room.roomCode);
    room.addPlayer(socket.id, data.playerName, false);
    
    socket.emit('joinedRoom', {
      roomCode: room.roomCode,
      players: room.getPlayersState(),
      isHost: false
    });

    // Notify others
    io.to(room.roomCode).emit('playerJoined', {
      players: room.getPlayersState()
    });
  });

  // Ready State
  socket.on('setReady', (data: { roomCode: string, isReady: boolean }) => {
    const room = rooms.get(data.roomCode);
    if (room) {
      room.setPlayerReady(socket.id, data.isReady);
      io.to(room.roomCode).emit('playersUpdated', {
        players: room.getPlayersState()
      });
    }
  });

  // Start Game
  socket.on('startGame', (data: { roomCode: string }) => {
    const room = rooms.get(data.roomCode);
    if (room && room.isHost(socket.id)) {
      if (room.getPlayersState().length >= 2) {
        room.startGame();
      } else {
        socket.emit('error', { message: 'Need at least 2 players to start' });
      }
    }
  });

  // Player Input (Movement, Dash, Jump)
  socket.on('playerInput', (data: { roomCode: string, input: any }) => {
    const room = rooms.get(data.roomCode);
    if (room) {
      room.processPlayerInput(socket.id, data.input);
    }
  });

  // Player Action (Peck, Scream)
  socket.on('playerAction', (data: { roomCode: string, action: string }) => {
    const room = rooms.get(data.roomCode);
    if (room) {
      room.processPlayerAction(socket.id, data.action);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    rooms.forEach((room, roomCode) => {
      if (room.hasPlayer(socket.id)) {
        room.removePlayer(socket.id);
        
        if (room.isEmpty()) {
          room.stopGame();
          rooms.delete(roomCode);
        } else {
          io.to(roomCode).emit('playerLeft', {
            playerId: socket.id,
            players: room.getPlayersState()
          });
        }
      }
    });
  });
});

app.get('/', (req, res) => {
  res.send('Chicken Fight Royale Server is running!');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
