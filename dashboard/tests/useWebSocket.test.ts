/**
 * Tests for the useWebSocket hook.
 * Uses a mock WebSocket implementation.
 */

// Mock WebSocket before imports
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public onopen:    ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror:   ((event: Event) => void) | null = null;
  public onclose:   ((event: CloseEvent) => void) | null = null;
  public readyState: number = MockWebSocket.CONNECTING;
  public url: string;

  constructor(url: string) {
    this.url = url;
    // Simulate open asynchronously
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(_data: string): void {}

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Test helper: push a message from the "server"
  simulateMessage(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

(global as unknown as Record<string, unknown>).WebSocket = MockWebSocket;

import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../src/hooks/useWebSocket';

describe('useWebSocket', () => {
  it('starts with connecting status', () => {
    const { result } = renderHook(() => useWebSocket('esp32_meter_01', 'ws://localhost:8000'));
    expect(result.current.status).toBe('connecting');
  });

  it('transitions to open after connection', async () => {
    const { result } = renderHook(() => useWebSocket('esp32_meter_01', 'ws://localhost:8000'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.status).toBe('open');
  });

  it('parses incoming JSON message', async () => {
    let wsInstance: MockWebSocket | null = null;
    const OrigWS = (global as unknown as Record<string, unknown>).WebSocket;
    (global as unknown as Record<string, unknown>).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        wsInstance = this;
      }
    };

    const { result } = renderHook(() => useWebSocket('esp32_meter_01', 'ws://localhost:8000'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const payload = {
      device_id:   'esp32_meter_01',
      power_w:     123.4,
      irms_a:      0.55,
      vrms_v:      230.0,
      energy_wh:   0.034,
      relay_state: 1,
      updated_at:  '2024-01-01T00:00:00Z',
    };

    act(() => {
      wsInstance?.simulateMessage(JSON.stringify(payload));
    });

    expect(result.current.data?.power_w).toBe(123.4);
    expect(result.current.data?.device_id).toBe('esp32_meter_01');

    (global as unknown as Record<string, unknown>).WebSocket = OrigWS;
  });

  it('ignores malformed JSON', async () => {
    let wsInstance: MockWebSocket | null = null;
    const OrigWS = (global as unknown as Record<string, unknown>).WebSocket;
    (global as unknown as Record<string, unknown>).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        wsInstance = this;
      }
    };

    const { result } = renderHook(() => useWebSocket('esp32_meter_01', 'ws://localhost:8000'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      wsInstance?.simulateMessage('not-valid-json{{{');
    });

    expect(result.current.data).toBeNull();

    (global as unknown as Record<string, unknown>).WebSocket = OrigWS;
  });
});
