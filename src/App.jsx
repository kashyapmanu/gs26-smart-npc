import React, { useState, useEffect, useCallback } from 'react';
import TitleScreen from './components/TitleScreen';
import HUD from './components/HUD';
import GameViewport from './components/GameViewport';
import DialogueModal from './components/DialogueModal';
import NoticeBoardModal from './components/NoticeBoardModal';
import GatewayModal from './components/GatewayModal';
import { useNPC } from './hooks/useNPC';
import { useAudio } from './context/AudioContext';

export default function App() {
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem('gs26_smart_npc_api_key') || 
    import.meta.env.VITE_MESH_API_KEY || 
    ''
  );
  const [model, setModel] = useState(() => 
    localStorage.getItem('gs26_smart_npc_model') || 
    import.meta.env.VITE_MESH_MODEL || 
    'google/gemini-2.5-flash'
  );
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedClass, setSelectedClass] = useState('wizard');
  const [activeLocation, setActiveLocation] = useState('town_square');
  
  const [fireActive, setFireActive] = useState(true);
  const [lillyRescued, setLillyRescued] = useState(false);
  const [houseBurnedDown, setHouseBurnedDown] = useState(false);
  const [fireSecondsLeft, setFireSecondsLeft] = useState(60);
  
  const [playerGold, setPlayerGold] = useState(15);
  const [reputation, setReputation] = useState(0);
  const [hasMeal, setHasMeal] = useState(false);
  const [hasPaidForMeal, setHasPaidForMeal] = useState(false);

  // Overlays
  const [activeDialogueNpc, setActiveDialogueNpc] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);

  const { isMuted, toggleMute, playFailure, stopBgm } = useAudio();

  // Custom NPC hook
  const {
    dialogHistories,
    generateResponse,
    generateGossipBoard,
    clearHistories,
    clearNpcHistory
  } = useNPC({
    apiKey,
    model,
    reputation,
    setReputation,
    playerGold,
    setPlayerGold,
    hasMeal,
    setHasMeal,
    setHasPaidForMeal,
    fireActive,
    lillyRescued
  });

  // Handle Class selections
  const handleSelectClass = useCallback((classId) => {
    setSelectedClass(classId);
    if (classId === 'knight') {
      setPlayerGold(20);
      setReputation(15);
    } else if (classId === 'rogue') {
      setPlayerGold(35);
      setReputation(-20);
    } else { // wizard
      setPlayerGold(15);
      setReputation(0);
    }
  }, []);

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('gs26_smart_npc_api_key', key);
  };

  const saveModel = (modelName) => {
    setModel(modelName);
    localStorage.setItem('gs26_smart_npc_model', modelName);
  };

  const resetGame = useCallback(() => {
    setGameStarted(false);
    setActiveLocation('town_square');
    setFireActive(true);
    setLillyRescued(false);
    setHouseBurnedDown(false);
    setFireSecondsLeft(60);
    setHasMeal(false);
    setHasPaidForMeal(false);
    setActiveDialogueNpc(null);
    clearHistories();
    stopBgm();
    // Re-initialize based on selectedClass
    handleSelectClass(selectedClass);
  }, [selectedClass, clearHistories, stopBgm, handleSelectClass]);

  // Game frozen condition
  const isGameFrozen = settingsOpen || boardOpen || activeDialogueNpc !== null;

  // Timer Tick effect
  useEffect(() => {
    if (!gameStarted || !fireActive || isGameFrozen || activeLocation !== 'town_square') return;

    const timer = setInterval(() => {
      setFireSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFireActive(false);
          setHouseBurnedDown(true);
          setReputation(r => Math.max(-100, r - 35));
          playFailure();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, fireActive, isGameFrozen, activeLocation, playFailure]);

  // Adjacency interaction handler
  const handleInteract = (obj) => {
    if (obj.type === 'npc') {
      clearNpcHistory(obj.id);
      setActiveDialogueNpc(obj.id);
    } else if (obj.type === 'board') {
      setBoardOpen(true);
    } else if (obj.type === 'fire') {
      // Lilly Rescued! Trigger dialogue automatically
      clearNpcHistory('lilly');
      setActiveDialogueNpc('lilly');
    }
  };

  return (
    <div id="desk-wrapper">
      <div id="app">
        {/* Header Title */}
        <header className="game-header">
          <h1>Echoes of the Hearth</h1>
          <p className="subtitle">A Smart NPC Gossip Network</p>
        </header>

        {/* HUD Stats */}
        {gameStarted && (
          <HUD
            activeLocation={activeLocation}
            gold={playerGold}
            reputation={reputation}
            fireActive={fireActive}
            fireSecondsLeft={fireSecondsLeft}
            hasMeal={hasMeal}
            hasPaidForMeal={hasPaidForMeal}
            onOpenSettings={() => setSettingsOpen(true)}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        )}

        {/* Game Area Container */}
        <div className="game-container-frame">
          <div className="corner tl" />
          <div className="corner tr" />
          <div className="corner bl" />
          <div className="corner br" />

          <div className="game-viewport">
            {/* Title Screen Overlay */}
            {!gameStarted && (
              <TitleScreen
                onStart={() => setGameStarted(true)}
                selectedClass={selectedClass}
                onSelectClass={handleSelectClass}
              />
            )}

            {/* Game Grid Viewport */}
            {gameStarted && (
              <GameViewport
                activeLocation={activeLocation}
                setActiveLocation={setActiveLocation}
                fireActive={fireActive}
                setFireActive={setFireActive}
                lillyRescued={lillyRescued}
                setLillyRescued={setLillyRescued}
                houseBurnedDown={houseBurnedDown}
                setHouseBurnedDown={setHouseBurnedDown}
                reputation={reputation}
                setReputation={setReputation}
                gameFrozen={isGameFrozen}
                onInteract={handleInteract}
                selectedClass={selectedClass}
              />
            )}

            {/* Active Dialogue Overlay */}
            {activeDialogueNpc && (
              <DialogueModal
                npcId={activeDialogueNpc}
                history={dialogHistories[activeDialogueNpc] || []}
                onSend={(text) => generateResponse(activeDialogueNpc, text)}
                onClose={() => setActiveDialogueNpc(null)}
              />
            )}

            {/* Active Notice Board Overlay */}
            <NoticeBoardModal
              isOpen={boardOpen}
              onClose={() => setBoardOpen(false)}
              generateGossipBoard={generateGossipBoard}
            />

            {/* Active Settings Configuration Overlay */}
            <GatewayModal
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              apiKey={apiKey}
              saveApiKey={saveApiKey}
              model={model}
              saveModel={saveModel}
              onReset={resetGame}
            />
          </div>
        </div>

        {/* Instructions Footer */}
        <footer className="game-footer">
          <p>
            Controls: <span className="key-inline">W</span>
            <span className="key-inline">A</span>
            <span className="key-inline">S</span>
            <span className="key-inline">D</span> / Arrow keys to Walk. 
            Stand near characters, building doors, or notice board and press <span className="key-inline">E</span> to interact.
          </p>
        </footer>
      </div>
    </div>
  );
}
