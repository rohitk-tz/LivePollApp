/**
 * Frontend configuration
 * Centralized configuration for API endpoints and WebSocket connections
 */

const config = {
  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
  },
  
  // WebSocket configuration
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'http://localhost:3000',
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  },
  
  // App configuration
  app: {
    name: 'Live Poll App',
    version: '1.0.0',
  },
};

export default config;
