/**
 * Sight Project – Frontend API Client
 * 
 * This helper provides a clean, typed interface for the frontend to communicate
 * with the FastAPI backend. It abstracts away `fetch` calls, handles JSON parsing,
 * and forms a single source of truth for backend communication, ensuring that
 * even if the UI components change, data retrieval remains consistent.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface DeviceListResponse {
  devices: string[];
}

export interface LiveStateResponse {
  device_id: string;
  irms_a: number;
  vrms_v: number;
  power_w: number;
  energy_wh: number;
  relay_state: number;
  updated_at: string;
  error?: string;
}

export interface HistoryDataPoint {
  time: string;
  power_w: number;
  irms_a: number;
  vrms_v: number;
  energy_wh: number;
  relay: number;
}

export interface HistoryResponse {
  device_id: string;
  range: string;
  data: HistoryDataPoint[];
}

export interface SetRelayResponse {
  device_id: string;
  relay: boolean;
  status: string;
}

export interface EsgSummaryResponse {
  range: string;
  total_energy_kwh: number;
  total_co2_kg: number;
  saved_co2_kg: number;
  intensity_factor: number;
}

export interface WeatherConfig {
  city: string;
  lat: number;
  lon: number;
}

export class SightAPI {
  /**
   * Helper to execute fetch requests and parse JSON.
   */
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error(`SightAPI error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Check if the API is online.
   */
  static async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  /**
   * Get a list of all known device IDs.
   */
  static async getDevices(): Promise<DeviceListResponse> {
    return this.request('/devices');
  }

  /**
   * Get the absolute latest state of a specific device.
   * Note: For sub-second updates, prefer the useWebSocket hook.
   */
  static async getLiveState(deviceId: string): Promise<LiveStateResponse> {
    return this.request(`/devices/${deviceId}/live`);
  }

  /**
   * Get historical telemetry data for a device.
   * @param deviceId The ID of the device.
   * @param range InfluxDB range string (e.g., "-1h", "-7d"). Defaults to "-1h".
   */
  static async getHistory(deviceId: string, range: string = '-1h'): Promise<HistoryResponse> {
    return this.request(`/devices/${deviceId}/history?range=${encodeURIComponent(range)}`);
  }

  /**
   * Send a command to toggle the physical relay on the edge device.
   * @param deviceId The ID of the device.
   * @param relayState Boolean (true = ON, false = OFF)
   */
  static async setRelay(deviceId: string, relayState: boolean): Promise<SetRelayResponse> {
    return this.request(`/devices/${deviceId}/relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ relay: relayState }),
    });
  }

  /**
   * Get the ESG Carbon Footprint summary across the facility.
   * @param range InfluxDB range string (e.g., "-30d", "-1y"). Defaults to "-30d".
   */
  static async getEsgSummary(range: string = '-30d'): Promise<EsgSummaryResponse> {
    return this.request(`/esg/summary?range=${encodeURIComponent(range)}`);
  }

  /**
   * Get the current weather forecast location config.
   */
  static async getWeatherConfig(): Promise<WeatherConfig> {
    return this.request('/weather/config');
  }

  /**
   * Set the weather forecast location config.
   */
  static async setWeatherConfig(config: WeatherConfig): Promise<{status: string, config: WeatherConfig}> {
    return this.request('/weather/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
  }
}
