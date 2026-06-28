import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

export default function NoticeBoardModal({ isOpen, onClose, generateGossipBoard }) {
  const [rumors, setRumors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { playClick } = useAudio();

  useEffect(() => {
    let active = true;
    if (isOpen) {
      setLoading(true);
      setRumors([]);
      generateGossipBoard().then(data => {
        if (active) {
          setRumors(data);
          setLoading(false);
        }
      }).catch(err => {
        console.error(err);
        if (active) setLoading(false);
      });
    }
    return () => { active = false; };
  }, [isOpen, generateGossipBoard]);

  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <dialog open className="board-bg" onClick={(e) => e.stopPropagation()}>
        <h2 className="board-header">📜 Oakhaven Town Notice</h2>
        <p className="board-desc">The latest local flyers, decrees, and whispered rumors circulating the town square.</p>

        {loading ? (
          <div className="board-loading">
            <div className="spinner"></div>
            <p>Hearing the latest rumors...</p>
          </div>
        ) : (
          <div className="board-flyers">
            {rumors.length > 0 ? (
              rumors.map((item, index) => (
                <div key={index} className="flyer-card">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))
            ) : (
              <p style={{ color: '#ef4444', textAlign: 'center', width: '100%' }}>
                Failed to load board notices.
              </p>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ border: 'none', paddingTop: 0 }}>
          <button type="button" className="primary-btn" onClick={() => { playClick(); onClose(); }}>
            Close Notice Board
          </button>
        </div>
      </dialog>
    </div>
  );
}
