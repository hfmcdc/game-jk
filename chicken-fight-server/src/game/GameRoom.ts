import { Server } from 'socket.io';
import { Player } from './Player';

export class GameRoom {
  roomCode: string;
  io: Server;
  players: Map<string, Player>;
  hasStarted: boolean;
  gameInterval: NodeJS.Timeout | null = null;
  lastTick: number = 0;

  constructor(roomCode: string, io: Server) {
    this.roomCode = roomCode;
    this.io = io;
    this.players = new Map();
    this.hasStarted = false;
  }

  addPlayer(id: string, name: string, isHost: boolean) {
    this.players.set(id, new Player(id, name, isHost));
  }

  removePlayer(id: string) {
    this.players.delete(id);
    
    // If host left, assign new host
    if (this.players.size > 0 && !Array.from(this.players.values()).some(p => p.isHost)) {
      const firstPlayer = this.players.values().next().value;
      if (firstPlayer) {
        firstPlayer.isHost = true;
      }
    }
  }

  hasPlayer(id: string) {
    return this.players.has(id);
  }

  isHost(id: string) {
    const p = this.players.get(id);
    return p ? p.isHost : false;
  }

  setPlayerReady(id: string, isReady: boolean) {
    const p = this.players.get(id);
    if (p) p.isReady = isReady;
  }

  getPlayersState() {
    return Array.from(this.players.values()).map(p => p.getState());
  }

  isEmpty() {
    return this.players.size === 0;
  }

  startGame() {
    this.hasStarted = true;
    this.lastTick = Date.now();
    
    // Broadcast match start
    this.io.to(this.roomCode).emit('matchStarted');

    // 60 FPS tick
    this.gameInterval = setInterval(() => this.tick(), 1000 / 60);
  }

  stopGame() {
    this.hasStarted = false;
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  processPlayerInput(id: string, input: any) {
    const p = this.players.get(id);
    if (p) {
      p.applyInput(input);
    }
  }

  processPlayerAction(id: string, action: string) {
    const p = this.players.get(id);
    if (!p) return;

    const now = Date.now();
    if (action === 'peck') {
      if (now - p.lastPeckTime > 500) {
        p.lastPeckTime = now;
        this.io.to(this.roomCode).emit('actionEvent', { type: 'peck', playerId: id });
        // TODO: collision logic
      }
    } else if (action === 'scream') {
      if (now - p.lastScreamTime > 5000) {
        p.lastScreamTime = now;
        this.io.to(this.roomCode).emit('actionEvent', { type: 'scream', playerId: id });
        
        // Scream knockback logic
        this.players.forEach((otherP, otherId) => {
          if (id !== otherId) {
            const dx = otherP.x - p.x;
            const dy = otherP.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 150) {
              const force = (150 - dist) / 5;
              otherP.vx += (dx / dist) * force * 50;
              otherP.vy += (dy / dist) * force * 50;
            }
          }
        });
      }
    } else if (action === 'dash') {
      if (now - p.lastDashTime > 3000) {
        p.lastDashTime = now;
        this.io.to(this.roomCode).emit('actionEvent', { type: 'dash', playerId: id });
        
        // Apply dash force based on current velocity or a default direction
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (speed > 0.1) {
          p.vx += (p.vx/speed) * 1000;
          p.vy += (p.vy/speed) * 1000;
        } else {
          p.vx += 1000; // default right dash if standing still
        }
      }
    }
  }

  tick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // Update players
    this.players.forEach(p => p.update(dt));

    // Send state
    this.io.to(this.roomCode).emit('gameState', {
      players: this.getPlayersState()
    });
  }
}
