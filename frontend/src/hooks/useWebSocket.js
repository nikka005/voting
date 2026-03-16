import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

/**
 * Generic WebSocket hook for real-time updates
 */
export default function useWebSocket(path = '/ws/votes') {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!WS_URL) return;

    const wsPath = `${WS_URL}${path}`;

    try {
      wsRef.current = new WebSocket(wsPath);

      wsRef.current.onopen = () => {
        console.log(`WebSocket connected to ${path}`);
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log(`WebSocket disconnected from ${path}`);
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [path]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { lastMessage, isConnected, sendMessage };
}

/**
 * Hook for real-time vote updates via WebSocket
 */
export function useVoteUpdates(contestantId = null) {
  const [lastVoteUpdate, setLastVoteUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!WS_URL) return;

    const wsPath = contestantId 
      ? `${WS_URL}/ws/contestant/${contestantId}`
      : `${WS_URL}/ws/votes`;

    try {
      wsRef.current = new WebSocket(wsPath);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'vote_update') {
            setLastVoteUpdate(data);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [contestantId]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { lastVoteUpdate, isConnected };
}

/**
 * Hook for real-time leaderboard updates
 */
export function useLeaderboardUpdates() {
  const [updates, setUpdates] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!WS_URL) return;

    const wsPath = `${WS_URL}/ws/leaderboard`;

    try {
      wsRef.current = new WebSocket(wsPath);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'vote_update') {
            setUpdates(prev => [data, ...prev.slice(0, 19)]);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            window.location.reload();
          }
        }, 3000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { updates, isConnected };
}
