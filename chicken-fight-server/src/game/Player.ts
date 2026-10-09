export class Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  
  // Game state
  x: number;
  y: number;
  vx: number;
  vy: number;
  score: number;
  
  // Cooldowns
  lastPeckTime: number = 0;
  lastDashTime: number = 0;
  lastScreamTime: number = 0;

  constructor(id: string, name: string, isHost: boolean) {
    this.id = id;
    this.name = name;
    this.isHost = isHost;
    this.isReady = isHost; // Host is always ready implicitly, or can toggle
    
    // Default spawn
    this.x = 400 + (Math.random() * 200 - 100);
    this.y = 300 + (Math.random() * 200 - 100);
    this.vx = 0;
    this.vy = 0;
    this.score = 0;
  }

  update(dt: number) {
    // Simple friction
    this.vx *= 0.9;
    this.vy *= 0.9;
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds checking (assuming 800x600 arena for now)
    if (this.x < 0) { this.x = 0; this.vx *= -1; }
    if (this.x > 800) { this.x = 800; this.vx *= -1; }
    if (this.y < 0) { this.y = 0; this.vy *= -1; }
    if (this.y > 600) { this.y = 600; this.vy *= -1; }
  }

  applyInput(input: { dx: number, dy: number, isJumping: boolean }) {
    const SPEED = 20;
    this.vx += input.dx * SPEED;
    this.vy += input.dy * SPEED;
  }

  getState() {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isReady: this.isReady,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      score: this.score
    };
  }
}
