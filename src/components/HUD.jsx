import React from 'react';
import { useAudio } from '../context/AudioContext';

function getReputationLabel(rep) {
  if (rep <= -60) return `Despised (${rep})`;
  if (rep < -20) return `Distrusted (${rep})`;
  if (rep <= 20) return `Neutral (${rep})`;
  if (rep < 60) return `Respected (${rep})`;
  return `Heroic (${rep})`;
}

export default function HUD({ 
  activeLocation, 
  gold, 
  reputation, 
  fireActive, 
  fireSecondsLeft, 
  hasMeal, 
  hasPaidForMeal, 
  onOpenSettings,
  isMuted,
  toggleMute
}) {
  const { playClick } = useAudio();

  const reputationPercentage = ((reputation + 100) / 200) * 100;

  const handleAudioToggle = () => {
    playClick();
    toggleMute();
  };

  const handleOpenGateway = () => {
    playClick();
    onOpenSettings();
  };

  return (
    <div className="hud-bar">
      {/* Location Badge */}
      <div className="hud-scroll" id="hudLocation">
        <span className="label">Location</span>
        <span className="value">
          {activeLocation === 'town_square' ? 'Town Square' : "Elric's Tavern"}
        </span>
      </div>
      
      {/* Gold Chest Badge */}
      <div className="hud-scroll" id="hudGold">
        <span className="label">Gold Chest</span>
        <span className="value">{gold}g</span>
      </div>

      {/* Reputation Badge */}
      <div className="hud-scroll" id="hudReputation">
        <span className="label">Reputation</span>
        <span className="value">{getReputationLabel(reputation)}</span>
        <div className="rep-bar-container">
          <div className="rep-bar" style={{ width: `${reputationPercentage}%` }} />
        </div>
      </div>

      {/* Flashing Danger Fire Rescue Scroll */}
      {fireActive && activeLocation === 'town_square' && (
        <div className={`hud-scroll danger-singe`}>
          <span className="label">Fire Rescue</span>
          <span className="value">{fireSecondsLeft}s</span>
        </div>
      )}

      {/* Stomach State Badge */}
      <div className="hud-scroll" id="hudMeal">
        <span className="label">Stomach</span>
        <span className="value" style={{ 
          color: hasMeal 
            ? (hasPaidForMeal ? '#38bdf8' : '#10b981') 
            : '#94a3b8' 
        }}>
          {hasMeal ? (hasPaidForMeal ? 'Full (Paid)' : 'Full (Free!)') : 'Empty'}
        </span>
      </div>

      {/* Action Controls */}
      <div className="hud-controls">
        <button className="glass-btn" onClick={handleAudioToggle}>
          {isMuted ? "🔇 Audio: Off" : "🔊 Audio: On"}
        </button>
        <button className="glass-btn" onClick={handleOpenGateway}>
          ⚙️ Gateway
        </button>
      </div>
    </div>
  );
}
