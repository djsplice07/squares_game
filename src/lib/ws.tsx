'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

interface ChatMsg {
  id: string;
  userName: string;
  message: string;
  createdAt: string;
}

interface WebSocketContextValue {
  messages: ChatMsg[];
  connected: boolean;
  sendMessage: (message: string, userId?: string) => void;
  deleteMessage: (messageId: string, userId?: string) => void;
  squaresVersion: number;
  notifySquaresChanged: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  messages: [],
  connected: false,
  sendMessage: () => {},
  deleteMessage: () => {},
  squaresVersion: 0,
  notifySquaresChanged: () => {},
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const [squaresVersion, setSquaresVersion] = useState(0);

  useEffect(() => {
    function createSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(() => {
          createSocket();
        }, 3000);
      };

      ws.onerror = () => {
        // Let onclose handle reconnection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat:history') {
            setMessages(data.messages);
          } else if (data.type === 'chat:message') {
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === 'chat:delete') {
            setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
          } else if (data.type === 'squares:refresh') {
            setSquaresVersion((v) => v + 1);
          }
        } catch {
          // ignore invalid messages
        }
      };
    }

    createSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback((message: string, userId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat:message', message, userId }));
    }
  }, []);

  const deleteMessage = useCallback((messageId: string, userId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat:delete', messageId, userId }));
    }
  }, []);

  const notifySquaresChanged = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'squares:changed' }));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ messages, connected, sendMessage, deleteMessage, squaresVersion, notifySquaresChanged }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
