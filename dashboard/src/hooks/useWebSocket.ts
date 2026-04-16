/**
 * useWebSocket – custom React hook for sub-200ms live updates.
 * Maintains a WebSocket connection with automatic reconnection.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type WSStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface LiveState {
  device_id:   string;
  irms_a:      number;
  vrms_v:      number;
  power_w:     number;
  energy_wh:   number;
  relay_state: number;
  updated_at:  string;
  error?:      string;
}

interface UseWebSocketReturn {
  data:       LiveState | null;
  status:     WSStatus;
  disconnect: () => void;
}

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECTS      = 10;

export function useWebSocket(
  deviceId: string,
  baseUrl: string = window.location.origin.replace(/^http/, 'ws'),
): UseWebSocketReturn {
  const [data,   setData]   = useState<LiveState | null>(null);
  const [status, setStatus] = useState<WSStatus>('connecting');

  const wsRef         = useRef<WebSocket | null>(null);
  const reconnects    = useRef(0);
  const unmounted     = useRef(false);
  const retryTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (unmounted.current) return;
    setStatus('connecting');

    const url = `${baseUrl}/ws/${deviceId}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnects.current = 0;
      setStatus('open');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as LiveState;
        setData(parsed);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      if (unmounted.current) return;
      setStatus('closed');
      if (reconnects.current < MAX_RECONNECTS) {
        reconnects.current += 1;
        retryTimeout.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }, [deviceId, baseUrl]);

  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    unmounted.current = true;
    if (retryTimeout.current) clearTimeout(retryTimeout.current);
    wsRef.current?.close();
    setStatus('closed');
  }, []);

  return { data, status, disconnect };
}
