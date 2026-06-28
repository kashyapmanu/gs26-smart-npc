import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

const CLASSES = [
  {
    id: 'wizard',
    icon: '🧙‍♂️',
    name: 'Wizard',
    stats: '🪙 15g | 🏆 Neutral (0)',
    desc: 'A travelling scholar. Well-balanced starting reputation.'
  },
  {
    id: 'knight',
    icon: '🛡️',
    name: 'Knight',
    stats: '🪙 20g | 🏆 Respected (+15)',
    desc: 'A champion of the realm. The townsfolk start out trusting you.'
  },
  {
    id: 'rogue',
    icon: '🗡️',
    name: 'Rogue',
    stats: '🪙 35g | 🏆 Distrusted (-20)',
    desc: 'A shadow agent. Rich in coin, but highly suspected by default.'
  }
];

export default function TitleScreen({ onStart, selectedClass, onSelectClass }) {
  const [embers, setEmbers] = useState([]);
  const { playClick, playSuccess, startBgm } = useAudio();

  // Generate background embers particles
  useEffect(() => {
    const list = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        size: Math.random() * 5 + 3,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: Math.random() * 4 + 4,
        drift: (Math.random() - 0.5) * 80
      });
    }
    setEmbers(list);
  }, []);

  const handleCardSelect = (classId) => {
    playClick();
    onSelectClass(classId);
  };

  const handleEnterGame = () => {
    playSuccess();
    startBgm();
    onStart();
  };

  return (
    <div className="title-screen-overlay">
      {/* Drifting Embers Particles */}
      <div className="embers-container">
        {embers.map(ember => (
          <div
            key={ember.id}
            className="ember"
            style={{
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              left: `${ember.left}%`,
              animationDelay: `${ember.delay}s`,
              animationDuration: `${ember.duration}s`,
              '--drift': `${ember.drift}px`
            }}
          />
        ))}
      </div>

      <div className="title-content-box">
        <h2 className="title-logo">Echoes of the Hearth</h2>
        <p className="intro-lore">
          A local fire is burning in the square. Lilly Baker is trapped. Your choices, cowardice, or heroism will be dynamically spread by the villagers via word-of-mouth.
        </p>
        
        <h3 className="selector-heading">Choose Your Character Class</h3>
        
        <div className="class-selector">
          {CLASSES.map(item => (
            <div 
              key={item.id} 
              className={`class-card ${selectedClass === item.id ? 'selected' : ''}`}
              onClick={() => handleCardSelect(item.id)}
            >
              <span className="class-icon">{item.icon}</span>
              <h4>{item.name}</h4>
              <p className="class-stats">{item.stats}</p>
              <p className="class-desc">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="tutorial-instructions">
          Controls: <span className="key-inline">W</span>
          <span className="key-inline">A</span>
          <span className="key-inline">S</span>
          <span className="key-inline">D</span> to Walk. 
          Stand near interactive objects or NPCs, then press <span className="key-inline">E</span> to interact.
        </div>

        <button className="primary-btn-large" onClick={handleEnterGame}>
          Enter Oakhaven
        </button>
      </div>
    </div>
  );
}
