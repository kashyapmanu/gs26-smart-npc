import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext(null);

const MELODY = [
  { f: 220.00, b: 1 }, // A3
  { f: 261.63, b: 1 }, // C4
  { f: 293.66, b: 1 }, // D4
  { f: 329.63, b: 2 }, // E4
  { f: 293.66, b: 1 }, // D4
  { f: 261.63, b: 1 }, // C4
  { f: 220.00, b: 2 }, // A3
  { f: 246.94, b: 2 }, // B3
  
  { f: 220.00, b: 1 }, // A3
  { f: 261.63, b: 1 }, // C4
  { f: 293.66, b: 1 }, // D4
  { f: 329.63, b: 2 }, // E4
  { f: 392.00, b: 1 }, // G4
  { f: 349.23, b: 1 }, // F4
  { f: 329.63, b: 4 }, // E4
  
  { f: 349.23, b: 1 }, // F4
  { f: 349.23, b: 1 }, // F4
  { f: 392.00, b: 1 }, // G4
  { f: 440.00, b: 2 }, // A4
  { f: 392.00, b: 1 }, // G4
  { f: 349.23, b: 1 }, // F4
  { f: 329.63, b: 2 }, // E4
  { f: 293.66, b: 2 }, // D4
  
  { f: 261.63, b: 1 }, // C4
  { f: 220.00, b: 1 }, // A3
  { f: 246.94, b: 1 }, // B3
  { f: 329.63, b: 2 }, // E4
  { f: 246.94, b: 1 }, // B3
  { f: 261.63, b: 1 }, // C4
  { f: 220.00, b: 4 }  // A3
];

const BASS = [
  110.00, 110.00, 110.00, 110.00,
  130.81, 130.81, 146.83, 146.83,
  87.31, 87.31, 87.31, 87.31,
  82.41, 82.41, 82.41, 82.41
];

export function AudioProvider({ children }) {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const bgmIntervalRef = useRef(null);
  const melodyIndexRef = useRef(0);
  const beatTimerRef = useRef(0);

  const initAudio = () => {
    if (audioCtxRef.current) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtxRef.current = new AudioContextClass();
    masterGainRef.current = audioCtxRef.current.createGain();
    masterGainRef.current.gain.value = isMuted ? 0 : 0.22;
    masterGainRef.current.connect(audioCtxRef.current.destination);
  };

  const resumeAudio = () => {
    initAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const nextMute = !prev;
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(
          nextMute ? 0 : 0.22, 
          audioCtxRef.current.currentTime
        );
      }
      return nextMute;
    });
  };

  const playTone = (freq, type, duration, volume = 0.3) => {
    initAudio();
    if (!audioCtxRef.current || isMuted) return;

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(masterGainRef.current);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  // Start background music loop
  const startBgm = () => {
    resumeAudio();
    if (bgmIntervalRef.current) return;

    const tempoMs = 320;
    bgmIntervalRef.current = setInterval(() => {
      if (isMuted || !audioCtxRef.current || audioCtxRef.current.state === 'suspended') return;

      if (beatTimerRef.current === 0) {
        const currentMelody = MELODY[melodyIndexRef.current];
        playTone(currentMelody.f, 'triangle', currentMelody.b * (tempoMs / 1000) * 0.9, 0.2);

        const bassFreq = BASS[Math.floor(melodyIndexRef.current % BASS.length)];
        playTone(bassFreq, 'sine', (tempoMs / 1000) * 1.8, 0.12);

        beatTimerRef.current = currentMelody.b;
      }

      beatTimerRef.current--;
      if (beatTimerRef.current <= 0) {
        melodyIndexRef.current = (melodyIndexRef.current + 1) % MELODY.length;
        beatTimerRef.current = 0;
      }
    }, tempoMs);
  };

  const stopBgm = () => {
    if (bgmIntervalRef.current) {
      clearInterval(bgmIntervalRef.current);
      bgmIntervalRef.current = null;
    }
  };

  // SFX triggers
  const playFootstep = () => {
    initAudio();
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state === 'suspended') return;

    const ctx = audioCtxRef.current;
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;
    filter.Q.value = 1.0;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGainRef.current);

    noise.start();
  };

  const playFireCrackle = () => {
    initAudio();
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state === 'suspended' || Math.random() > 0.08) return;

    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1000 + Math.random() * 3000, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.02, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.01);

    osc.connect(gainNode);
    gainNode.connect(masterGainRef.current);

    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  };

  const playClick = () => {
    playTone(880, 'sine', 0.05, 0.08);
  };

  const playSuccess = () => {
    initAudio();
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state === 'suspended') return;

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gainNode.gain.setValueAtTime(0, now + index * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.18, now + index * 0.08 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);

      osc.connect(gainNode);
      gainNode.connect(masterGainRef.current);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.35);
    });
  };

  const playFailure = () => {
    initAudio();
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state === 'suspended') return;

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const notes = [220.00, 261.63, 311.13, 415.30]; // A minor/diminished

    // Low rumble
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(55.00, now);
    rumbleGain.gain.setValueAtTime(0.25, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    rumble.connect(rumbleGain);
    rumbleGain.connect(masterGainRef.current);
    rumble.start();
    rumble.stop(now + 1.3);

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + index * 0.04);

      gainNode.gain.setValueAtTime(0, now + index * 0.04);
      gainNode.gain.linearRampToValueAtTime(0.1, now + index * 0.04 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.04 + 0.8);

      osc.connect(gainNode);
      gainNode.connect(masterGainRef.current);

      osc.start(now + index * 0.04);
      osc.stop(now + index * 0.04 + 0.9);
    });
  };

  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, []);

  return (
    <AudioContext.Provider value={{
      isMuted,
      toggleMute,
      startBgm,
      stopBgm,
      playClick,
      playFootstep,
      playFireCrackle,
      playSuccess,
      playFailure
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
