import React, { useEffect, useState, useRef } from 'react';
import { useAudio } from '../context/AudioContext';

const MAP_COLS = 20;
const MAP_ROWS = 12;

export default function GameViewport({
  activeLocation,
  setActiveLocation,
  fireActive,
  setFireActive,
  lillyRescued,
  setLillyRescued,
  houseBurnedDown,
  setHouseBurnedDown,
  reputation,
  setReputation,
  gameFrozen,
  onInteract,
  selectedClass
}) {
  // Player grid coordinates
  const [playerCol, setPlayerCol] = useState(10);
  const [playerRow, setPlayerRow] = useState(9);
  const [playerDir, setPlayerDir] = useState('down');
  const [isMoving, setIsMoving] = useState(false);
  const [ambientTick, setAmbientTick] = useState(0);

  const { playFootstep, playFireCrackle } = useAudio();
  
  // Prevent keyboard scrolling
  useEffect(() => {
    const handleScrollPrevent = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleScrollPrevent);
    return () => window.removeEventListener('keydown', handleScrollPrevent);
  }, []);

  // Ambient loop for crackle pops & sprite bob ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setAmbientTick(t => t + 1);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeLocation === 'town_square' && fireActive && !gameFrozen) {
      // Play occasional crackle pop
      playFireCrackle();
    }
  }, [ambientTick, activeLocation, fireActive, gameFrozen, playFireCrackle]);

  // NPCs list with their current coordinates
  const getNPCs = () => {
    if (activeLocation === 'town_square') {
      const list = [];
      // Lilly is either inside the burning window or standing outside
      if (fireActive) {
        list.push({ id: 'lilly', col: 14, row: 4, emoji: '👩', name: 'Lilly Baker', title: 'Baker\'s Daughter', trapped: true });
      } else if (lillyRescued) {
        list.push({ id: 'lilly', col: 12, row: 8, emoji: '👩', name: 'Lilly Baker', title: 'Baker\'s Daughter', trapped: false });
      }
      return list;
    } else if (activeLocation === 'tavern') {
      return [
        { id: 'elric', col: 10, row: 2, emoji: '🧔', name: 'Elric', title: 'Tavern Keeper' },
        { id: 'barnaby', col: 5, row: 8, emoji: '🍺', name: 'Barnaby', title: 'Town Gossip' },
        { id: 'guinevere', col: 16, row: 6, emoji: '🧝', name: 'Lady Guinevere', title: 'Cynical Noble' }
      ];
    }
    return [];
  };

  // Helper check for tile types
  const getTileType = (col, row) => {
    // Borders are trees/walls
    if (row === 0 || row === MAP_ROWS - 1 || col === 0 || col === MAP_COLS - 1) {
      return activeLocation === 'town_square' ? 'tree' : 'wall';
    }

    if (activeLocation === 'town_square') {
      // Tavern Building: row 2-4, col 1-5
      if (col >= 1 && col <= 5 && row >= 2 && row <= 4) {
        if (row === 2) return 'building-roof';
        return 'building-wood';
      }
      // Tavern Door
      if (col === 3 && row === 5) return 'door';

      // Bakery Building: row 2-4, col 12-17
      if (col >= 12 && col <= 17 && row >= 2 && row <= 4) {
        if (houseBurnedDown) return 'building-burned';
        if (row === 2) return 'building-roof';
        return 'building-wood';
      }
      // Bakery Door / Trapped Spot
      if (col === 15 && row === 5) {
        return houseBurnedDown ? 'building-burned' : 'door';
      }

      // Fountain: row 5-6, col 9-10
      if (col >= 9 && col <= 10 && row >= 5 && row <= 6) {
        return 'fountain';
      }

      // Noticeboard
      if (col === 8 && row === 8) {
        return 'noticeboard';
      }

      // Path Layout
      if (
        (row === 5 && col >= 6 && col <= 11) ||
        (row === 6 || row === 7) ||
        (row === 8 && col >= 6 && col <= 11) ||
        (row === 9 && col >= 7 && col <= 10)
      ) {
        return 'path';
      }

      return 'grass';
    } else {
      // Inside Tavern
      // Hearth (Fireplace) row 1-2, col 18
      if (col === 18 && (row === 1 || row === 2)) return 'hearth';

      // Bar counter: row 3, col 2-14
      if (col >= 2 && col <= 14 && row === 3) return 'bar';

      // Bar stools: row 4, col 3-13 (alternate)
      if (col >= 3 && col <= 13 && col % 2 === 1 && row === 4) return 'stool';

      // Tables: Left (row 7-8, col 2-3), Middle (row 7-8, col 9-10), Right (row 7-8, col 16-17)
      if (
        ((col === 2 || col === 3) && (row === 7 || row === 8)) ||
        ((col === 9 || col === 10) && (row === 7 || row === 8)) ||
        ((col === 16 || col === 17) && (row === 7 || row === 8))
      ) {
        return 'table';
      }

      // Rug Exit: row 10, col 10
      if (col === 10 && row === 10) return 'door';

      return 'floor';
    }
  };

  // Walkable check
  const isCellWalkable = (col, row) => {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;

    const tile = getTileType(col, row);
    
    // Impassable elements
    if ([
      'tree', 'wall', 'building-wood', 'building-roof', 'building-burned', 
      'fountain', 'noticeboard', 'bar', 'stool', 'table', 'hearth'
    ].includes(tile)) {
      return false;
    }

    // NPC collision
    const npcs = getNPCs();
    for (const n of npcs) {
      if (n.col === col && n.row === row) return false;
    }

    return true;
  };

  // Dialogue interactive checking
  const checkAdjacency = (pCol, pRow, tCol, tRow) => {
    const dCol = Math.abs(pCol - tCol);
    const dRow = Math.abs(pRow - tRow);
    return (dCol === 1 && dRow === 0) || (dCol === 0 && dRow === 1);
  };

  const getNearbyInteractive = () => {
    if (activeLocation === 'town_square') {
      // Tavern Door
      if (checkAdjacency(playerCol, playerRow, 3, 5)) {
        return { id: 'tavern_door', type: 'door', name: 'Enter Tavern (Press E)', label: 'Tavern' };
      }
      // Notice Board
      if (checkAdjacency(playerCol, playerRow, 8, 8)) {
        return { id: 'bulletin_board', type: 'board', name: 'Bulletin Board (Press E)', label: 'Notice Board' };
      }
      // Lilly Trapped (rescue trigger)
      if (fireActive && checkAdjacency(playerCol, playerRow, 15, 5)) {
        return { id: 'burning_building', type: 'fire', name: 'Rescue Lilly! (Press E)', label: 'Rescue' };
      }
      // Lilly Rescued standing in square
      if (!fireActive && lillyRescued && checkAdjacency(playerCol, playerRow, 12, 8)) {
        return { id: 'lilly', type: 'npc', name: 'Talk to Lilly (Press E)', label: 'Lilly Baker' };
      }
    } else if (activeLocation === 'tavern') {
      // Tavern Exit (Rug)
      if (checkAdjacency(playerCol, playerRow, 10, 10)) {
        return { id: 'tavern_exit', type: 'door', name: 'Leave Tavern (Press E)', label: 'Exit' };
      }
      // Elric (behind bar counter)
      if (checkAdjacency(playerCol, playerRow, 10, 2)) {
        return { id: 'elric', type: 'npc', name: 'Talk to Elric (Press E)', label: 'Elric' };
      }
      // Barnaby
      if (checkAdjacency(playerCol, playerRow, 5, 8)) {
        return { id: 'barnaby', type: 'npc', name: 'Talk to Barnaby (Press E)', label: 'Barnaby' };
      }
      // Guinevere
      if (checkAdjacency(playerCol, playerRow, 16, 6)) {
        return { id: 'guinevere', type: 'npc', name: 'Talk to Guinevere (Press E)', label: 'Guinevere' };
      }
    }
    return null;
  };

  const nearbyInteractive = getNearbyInteractive();

  // Keyboard navigation handler
  useEffect(() => {
    if (gameFrozen) return;

    const handleKeyDown = (e) => {
      let dCol = 0;
      let dRow = 0;
      let newDir = playerDir;

      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          dRow = -1;
          newDir = 'up';
          break;
        case 's':
        case 'arrowdown':
          dRow = 1;
          newDir = 'down';
          break;
        case 'a':
        case 'arrowleft':
          dCol = -1;
          newDir = 'left';
          break;
        case 'd':
        case 'arrowright':
          dCol = 1;
          newDir = 'right';
          break;
        case 'e':
          if (nearbyInteractive) {
            e.preventDefault();
            handleInteraction(nearbyInteractive);
          }
          return;
        default:
          return;
      }

      setPlayerDir(newDir);
      const nextCol = playerCol + dCol;
      const nextRow = playerRow + dRow;

      if (isCellWalkable(nextCol, nextRow)) {
        playFootstep();
        setPlayerCol(nextCol);
        setPlayerRow(nextRow);
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerCol, playerRow, playerDir, gameFrozen, nearbyInteractive, activeLocation, fireActive, lillyRescued]);

  const handleInteraction = (obj) => {
    onInteract(obj);

    if (obj.type === 'door') {
      if (obj.id === 'tavern_door') {
        if (fireActive) {
          setFireActive(false);
          setHouseBurnedDown(true);
          setReputation(prev => Math.max(-100, prev - 40));
        }
        setActiveLocation('tavern');
        setPlayerCol(10);
        setPlayerRow(9);
      } else if (obj.id === 'tavern_exit') {
        setActiveLocation('town_square');
        setPlayerCol(3);
        setPlayerRow(6);
      }
    } else if (obj.type === 'fire') {
      setFireActive(false);
      setLillyRescued(true);
      setReputation(prev => Math.min(100, prev + 45));
    }
  };

  // Draw Map Grid cells
  const gridCells = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      gridCells.push({ col: c, row: r, type: getTileType(c, r) });
    }
  }

  const getPlayerClassEmoji = () => {
    if (selectedClass === 'wizard') return '🧙‍♂️';
    if (selectedClass === 'knight') return '🛡️';
    return '🗡️';
  };

  return (
    <div className="grid-viewport-container">
      {/* 1. Map Tiles Layer */}
      {gridCells.map((cell, idx) => (
        <div 
          key={idx} 
          className={`grid-tile tile-${cell.type}`}
        />
      ))}

      {/* 2. Embers / Smoke particles layer on top of bakery */}
      {activeLocation === 'town_square' && fireActive && (
        <>
          <div className="tile-fire-overlay" style={{ left: '71.5%', top: '35%' }}>🔥</div>
          <div className="tile-fire-overlay" style={{ left: '76.5%', top: '32%' }}>🔥</div>
          <div className="tile-fire-overlay" style={{ left: '81.5%', top: '34%' }}>🔥</div>
          <div className="tile-fire-overlay" style={{ left: '76.5%', top: '22%', fontSize: '1.4rem' }}>💨</div>
        </>
      )}

      {/* 3. NPCs Layer */}
      {getNPCs().map(npc => (
        <div
          key={npc.id}
          className="sprite-element"
          style={{
            left: `calc(${npc.col} * 100% / ${MAP_COLS})`,
            top: `calc(${npc.row} * 100% / ${MAP_ROWS})`,
            zIndex: 10
          }}
        >
          <div className="sprite-character">{npc.emoji}</div>
          <div className="sprite-glow" style={{ boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }} />
        </div>
      ))}

      {/* 4. Player Sprite Layer */}
      <div
        className={`sprite-element ${isMoving ? 'moving' : ''}`}
        style={{
          left: `calc(${playerCol} * 100% / ${MAP_COLS})`,
          top: `calc(${playerRow} * 100% / ${MAP_ROWS})`,
          zIndex: 12
        }}
      >
        <div className="sprite-character">{getPlayerClassEmoji()}</div>
        <div className="sprite-glow" style={{ boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)' }} />
      </div>

      {/* 5. Interactive adjacency tooltip overlay */}
      {nearbyInteractive && !gameFrozen && (
        <div 
          className="interactive-tooltip"
          style={{
            left: `calc((${playerCol} + 0.5) * 100% / ${MAP_COLS})`,
            top: `calc((${playerRow} - 0.2) * 100% / ${MAP_ROWS})`
          }}
        >
          {nearbyInteractive.name}
        </div>
      )}
    </div>
  );
}
