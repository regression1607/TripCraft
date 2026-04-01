import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 20;

export default function useUndoRedo(initialState) {
  const [present, setPresent] = useState(initialState);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [lastAction, setLastAction] = useState(null);

  const applyEdit = useCallback((newState, actionDescription = '') => {
    pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), JSON.parse(JSON.stringify(present))];
    futureRef.current = [];
    setPresent(newState);
    setLastAction(actionDescription);
  }, [present]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [JSON.parse(JSON.stringify(present)), ...futureRef.current];
    setPresent(previous);
    setLastAction(null);
  }, [present]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, JSON.parse(JSON.stringify(present))];
    setPresent(next);
    setLastAction(null);
  }, [present]);

  const reset = useCallback((newState) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(newState);
    setLastAction(null);
  }, []);

  return {
    state: present,
    applyEdit,
    undo,
    redo,
    reset,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    lastAction,
  };
}
