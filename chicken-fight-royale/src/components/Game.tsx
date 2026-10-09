'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Target, Volume2 } from 'lucide-react';

const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001';

type GameState = 'LOBBY' | 'ROOM' | 'PLAYING' | 'ENDED';

export default function Game() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [myId, setMyId] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameData, setGameData] = useState<any>({ players: [] });

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setMyId(newSocket.id || '');
    });

    newSocket.on('roomCreated', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setIsHost(true);
      setGameState('ROOM');
    });

    newSocket.on('joinedRoom', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setIsHost(data.isHost);
      setGameState('ROOM');
    });

    newSocket.on('playerJoined', (data) => setPlayers(data.players));
    newSocket.on('playerLeft', (data) => setPlayers(data.players));
    newSocket.on('playersUpdated', (data) => setPlayers(data.players));

    newSocket.on('matchStarted', () => {
      setGameState('PLAYING');
    });

    newSocket.on('gameState', (data) => {
      setGameData(data);
    });

    newSocket.on('error', (err) => {
      alert(err.message);
    });

    return () => { newSocket.disconnect(); };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#7dd3fc'; // Sky blue
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grass floor
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, 300, canvas.width, canvas.height - 300);

      // Draw players
      gameData.players?.forEach((p: any) => {
        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 20, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw chicken body
        ctx.fillStyle = p.id === myId ? '#fef08a' : '#f87171';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(p.x + 5, p.y - 5, 3, 0, Math.PI*2);
        ctx.fill();

        // Beak
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(p.x + 15, p.y - 5);
        ctx.lineTo(p.x + 25, p.y);
        ctx.lineTo(p.x + 15, p.y + 5);
        ctx.fill();

        // Name
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.name} (${p.score})`, p.x, p.y - 30);
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationId);
  }, [gameState, gameData, myId]);

  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'PLAYING' || !socket) return;
    
    const keys = new Set<string>();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      
      let dx = 0, dy = 0;
      if (keys.has('w')) dy -= 1;
      if (keys.has('s')) dy += 1;
      if (keys.has('a')) dx -= 1;
      if (keys.has('d')) dx += 1;
      
      socket.emit('playerInput', { roomCode, input: { dx, dy, isJumping: keys.has(' ') } });

      if (e.key.toLowerCase() === 'shift') {
        socket.emit('playerAction', { roomCode, action: 'dash' });
      }
      if (e.key.toLowerCase() === 'e') {
        socket.emit('playerAction', { roomCode, action: 'scream' });
      }
      if (e.key.toLowerCase() === 'j') {
        socket.emit('playerAction', { roomCode, action: 'peck' });
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      
      let dx = 0, dy = 0;
      if (keys.has('w')) dy -= 1;
      if (keys.has('s')) dy += 1;
      if (keys.has('a')) dx -= 1;
      if (keys.has('d')) dx += 1;
      
      socket.emit('playerInput', { roomCode, input: { dx, dy, isJumping: keys.has(' ') } });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, socket, roomCode]);

  const handleCreateRoom = () => {
    if (!playerName) return alert('Enter a name');
    socket?.emit('createRoom', { playerName });
  };

  const handleJoinRoom = () => {
    if (!playerName) return alert('Enter a name');
    if (!inputRoomCode) return alert('Enter a room code');
    socket?.emit('joinRoom', { roomCode: inputRoomCode, playerName });
  };

  const handleStartGame = () => {
    socket?.emit('startGame', { roomCode });
  };
  
  const handleAction = (action: string) => {
    socket?.emit('playerAction', { roomCode, action });
  };

  if (gameState === 'LOBBY') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-sky-200">
        <h1 className="text-4xl font-black mb-8 text-orange-600 drop-shadow-md">🐔 CHICKEN FIGHT ROYALE</h1>
        
        <div className="bg-white p-8 rounded-xl shadow-xl w-80 flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Your Name (Max 12)" 
            maxLength={12}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="border-2 border-orange-200 p-2 rounded-lg font-bold text-center"
          />
          
          <button 
            onClick={handleCreateRoom}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform active:scale-95"
          >
            CREATE ROOM
          </button>
          
          <div className="flex items-center gap-2 mt-4">
            <hr className="flex-1 border-orange-200" />
            <span className="text-orange-400 font-bold text-sm">OR</span>
            <hr className="flex-1 border-orange-200" />
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="ROOM CODE" 
              maxLength={5}
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
              className="border-2 border-orange-200 p-2 rounded-lg font-bold text-center w-full uppercase"
            />
            <button 
              onClick={handleJoinRoom}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform active:scale-95"
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'ROOM') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-sky-200 p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md flex flex-col gap-6 items-center">
          <h2 className="text-2xl font-black text-orange-600">ROOM CODE: {roomCode}</h2>
          
          <div className="w-full bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px]">
            <h3 className="font-bold text-gray-500 mb-2">PLAYERS ({players.length}/8)</h3>
            <div className="flex flex-col gap-2">
              {players.map((p, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-gray-100">
                  <span className="font-bold text-gray-800">🐔 {p.name} {p.id === myId && '(You)'}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">READY</span>
                </div>
              ))}
            </div>
          </div>
          
          {isHost ? (
            <button 
              onClick={handleStartGame}
              disabled={players.length < 2}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-black py-4 px-4 rounded-xl shadow-lg transition-transform active:scale-95 text-xl"
            >
              {players.length < 2 ? 'WAITING FOR PLAYERS...' : 'START GAME'}
            </button>
          ) : (
            <div className="w-full text-center font-bold text-gray-500 py-4">
              WAITING FOR HOST TO START...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 touch-none overscroll-none overflow-hidden select-none">
      {/* Game Canvas container */}
      <div className="flex-1 relative w-full flex justify-center items-center overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600} 
          className="bg-sky-300 w-full max-w-4xl object-contain max-h-[70vh] rounded-lg shadow-2xl"
        />
        
        {/* Scoreboard overlay */}
        <div className="absolute top-4 left-4 bg-white/80 p-2 rounded-lg shadow font-bold text-sm">
          🏆 SCORES
          {gameData.players?.map((p: any) => (
            <div key={p.id}>{p.name}: {p.score} 🥚</div>
          ))}
        </div>
      </div>

      {/* Mobile Controls Layer */}
      <div className="h-[25vh] bg-gray-800 p-4 flex justify-between items-center w-full max-w-4xl mx-auto rounded-t-3xl relative bottom-0">
        
        {/* Dummy D-pad / Joystick replacement for now */}
        <div className="flex flex-col gap-2 items-center justify-center opacity-70 w-1/3">
           <div className="grid grid-cols-3 gap-2">
              <div/>
              <button 
                className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center active:bg-gray-500 text-white shadow-md"
                onPointerDown={() => socket?.emit('playerInput', { roomCode, input: { dx: 0, dy: -1 } })}
                onPointerUp={() => socket?.emit('playerInput', { roomCode, input: { dx: 0, dy: 0 } })}
              ><ArrowUp size={24} /></button>
              <div/>
              <button 
                className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center active:bg-gray-500 text-white shadow-md"
                onPointerDown={() => socket?.emit('playerInput', { roomCode, input: { dx: -1, dy: 0 } })}
                onPointerUp={() => socket?.emit('playerInput', { roomCode, input: { dx: 0, dy: 0 } })}
              ><ArrowLeft size={24} /></button>
              <button 
                className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center active:bg-gray-500 text-white shadow-md"
                onPointerDown={() => socket?.emit('playerInput', { roomCode, input: { dx: 0, dy: 1 } })}
                onPointerUp={() => socket?.emit('playerInput', { roomCode, input: { dx: 0, dy: 0 } })}
              ><ArrowDown size={24} /></button>
              <button 
                className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center active:bg-gray-500 text-white shadow-md"
                onPointerDown={() => socket?.emit('playerInput', { roomCode, input: { dx: 1, dy: 0 } })}
                onPointerUp={() => socket?.emit('playerInput', { roomCode, input: { dx: 0, dy: 0 } })}
              ><ArrowRight size={24} /></button>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 w-2/3 h-full items-center">
          <button 
            onPointerDown={() => handleAction('peck')}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500 hover:bg-red-400 active:bg-red-600 text-white rounded-full font-black text-xs sm:text-sm shadow-[0_6px_0_#991b1b] active:translate-y-[6px] active:shadow-none transition-all flex flex-col items-center justify-center border-2 border-red-300 select-none"
          >
            <Target size={24} />
            PECK
          </button>
          
          <button 
             onPointerDown={() => handleAction('dash')}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white rounded-full font-black text-xs sm:text-sm shadow-[0_6px_0_#1e3a8a] active:translate-y-[6px] active:shadow-none transition-all flex flex-col items-center justify-center border-2 border-blue-300 select-none"
          >
            <Zap size={24} />
            DASH
          </button>

          <button 
            onPointerDown={() => handleAction('scream')}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500 hover:bg-purple-400 active:bg-purple-600 text-white rounded-full font-black text-xs sm:text-sm shadow-[0_6px_0_#581c87] active:translate-y-[6px] active:shadow-none transition-all flex flex-col items-center justify-center border-2 border-purple-300 select-none"
          >
            <Volume2 size={24} />
            SCREAM
          </button>
        </div>
      </div>
    </div>
  );
}
