import React, { createContext, useContext, useRef, useCallback } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const wsRef = useRef(null);
  const listenersRef = useRef({});

  const connect = useCallback((examId, onMessage) => {
    const token = localStorage.getItem('accessToken');
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws'}?token=${token}`;

    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', exam_id: examId }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessage(msg);
      } catch { /* ignore */ }
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return (
    <SocketContext.Provider value={{ connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
