import { useState, useEffect, useRef } from 'react';

const MORSE_PATTERN = '.-. ..- .--. .--.'; // R U P P in morse code
const DOT_THRESHOLD = 300; // ms - gaps less than this = dot
const DASH_THRESHOLD = 600; // ms - gaps between dot and dash threshold = dash
const LETTER_THRESHOLD = 1000; // ms - gaps longer than this = new letter
const PATTERN_TIMEOUT = 2000; // ms - wait time after last click to evaluate
const EASTER_EGG_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEasterEgg() {
  const [isActive, setIsActive] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const clickTimestamps = useRef<number[]>([]);
  const patternTimeout = useRef<NodeJS.Timeout | null>(null);
  const deactivateTimeout = useRef<NodeJS.Timeout | null>(null);
  const hintTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('rupp-easter-egg');
    if (stored) {
      const { expiresAt } = JSON.parse(stored);
      if (Date.now() < expiresAt) {
        setIsActive(true);
        const remaining = expiresAt - Date.now();
        deactivateTimeout.current = setTimeout(deactivate, remaining);
      } else {
        localStorage.removeItem('rupp-easter-egg');
      }
    }
  }, []);

  const deactivate = () => {
    setIsActive(false);
    localStorage.removeItem('rupp-easter-egg');
    if (deactivateTimeout.current) {
      clearTimeout(deactivateTimeout.current);
    }
  };

  const activate = () => {
    setIsActive(true);
    const expiresAt = Date.now() + EASTER_EGG_DURATION;
    localStorage.setItem('rupp-easter-egg', JSON.stringify({ expiresAt }));
    
    // Auto-deactivate after 5 minutes
    deactivateTimeout.current = setTimeout(deactivate, EASTER_EGG_DURATION);

    // Show confetti or celebration animation
    console.log('🎓 RUPP Easter Egg Activated! 🎓');
  };

  const convertToMorse = (timestamps: number[]) => {
    if (timestamps.length < 2) return '';

    const letters: string[] = [];
    let currentLetter: string[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i - 1];
      
      if (gap < DOT_THRESHOLD) {
        // Quick tap = dot
        currentLetter.push('.');
      } else if (gap < DASH_THRESHOLD) {
        // Medium gap = dash
        currentLetter.push('-');
      } else {
        // Long gap = new letter
        if (currentLetter.length > 0) {
          letters.push(currentLetter.join(''));
          currentLetter = [];
        }
      }
    }

    // Add the last letter
    if (currentLetter.length > 0) {
      letters.push(currentLetter.join(''));
    }

    const result = letters.join(' ');
    console.log('Morse pattern detected:', result, '| Target:', MORSE_PATTERN);
    return result;
  };

  const handleClick = () => {
    if (isActive) return; // Already activated

    const now = Date.now();
    clickTimestamps.current.push(now);

    // Clear existing timeout
    if (patternTimeout.current) {
      clearTimeout(patternTimeout.current);
    }

    // Set timeout to check pattern after user stops clicking
    patternTimeout.current = setTimeout(() => {
      const pattern = convertToMorse(clickTimestamps.current);
      
      if (pattern === MORSE_PATTERN) {
        activate();
        setShowHint(false);
      } else if (clickTimestamps.current.length >= 12) {
        // Show hint if they've tried a lot
        setShowHint(true);
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(() => setShowHint(false), 4000);
      }
      
      // Reset
      clickTimestamps.current = [];
    }, PATTERN_TIMEOUT);
  };

  return { isActive, handleClick, showHint };
}
