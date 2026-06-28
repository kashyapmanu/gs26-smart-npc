import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';

const NPC_METADATA = {
  lilly: { name: "Lilly Baker", title: "Baker's Daughter", emoji: "👩" },
  elric: { name: "Elric", title: "Tavern Keeper", emoji: "🧔" },
  barnaby: { name: "Barnaby", title: "Town Gossip", emoji: "🍺" },
  guinevere: { name: "Lady Guinevere", title: "Cynical Noblewoman", emoji: "🧝" }
};

export default function DialogueModal({ npcId, history, onSend, onClose }) {
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const historyEndRef = useRef(null);
  const { playClick, playSuccess, playFailure } = useAudio();

  const meta = NPC_METADATA[npcId] || { name: npcId, title: "Villager", emoji: "👤" };

  // Scroll to bottom of conversation history
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, typing]);

  // Initial greeting trigger when dialogue first opens
  useEffect(() => {
    if (history.length === 0) {
      setTyping(true);
      onSend("Hello.").then(res => {
        setTyping(false);
        if (res && res.emotion) {
          setCurrentEmotion(res.emotion);
        }
      }).catch(err => {
        console.error(err);
        setTyping(false);
      });
    } else {
      // Find the last assistant message's emotion if history already populated
      const assistantMessages = history.filter(h => h.role === 'assistant');
      if (assistantMessages.length > 0) {
        // Assume default emotion or neutral for now, or read from history if it is preserved
        setCurrentEmotion('neutral');
      }
    }
  }, [npcId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (text === '' || typing) return;

    playClick();
    setInputText('');
    setTyping(true);
    
    onSend(text).then(res => {
      setTyping(false);
      if (res) {
        if (res.emotion) setCurrentEmotion(res.emotion);
        if (res.grantMeal) playSuccess();
      }
    }).catch(err => {
      console.error(err);
      setTyping(false);
    });
  };

  return (
    <div className="dialogue-overlay">
      <div className="dialogue-box">
        {/* NPC Profile Header */}
        <div className="npc-header">
          <div className="npc-avatar-box">
            <span className="npc-emoji">{meta.emoji}</span>
          </div>
          <div className="npc-meta">
            <h3>{meta.name}</h3>
            <p>{meta.title}</p>
          </div>
          <div className="npc-emotion-tag">{currentEmotion}</div>
        </div>

        {/* Dialogue history scrollbox */}
        <div className="dialogue-history">
          {history.map((msg, index) => (
            <div 
              key={index} 
              className={`dialogue-line ${msg.role === 'user' ? 'player' : (msg.role === 'system' ? 'system' : 'npc')}`}
            >
              {msg.content}
            </div>
          ))}

          {typing && (
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={historyEndRef} />
        </div>

        {/* Input response field form */}
        <form className="dialogue-form" onSubmit={handleSubmit}>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={typing}
            placeholder={`Type your response to ${meta.name}...`}
            autoComplete="off"
            maxLength={150}
          />
          <button type="submit" className="send-btn" disabled={typing || inputText.trim() === ''}>
            Send
          </button>
          <button type="button" className="close-btn" onClick={() => { playClick(); onClose(); }} disabled={typing}>
            Close
          </button>
        </form>
      </div>
    </div>
  );
}
