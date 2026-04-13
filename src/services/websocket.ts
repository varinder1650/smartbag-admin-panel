import type { WsOutgoingMessage } from '@/types/websocket';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 3000;
  private url: string;
  private isAuthenticated = false;
  private isWsAuthenticated = false;
  private messageHandlers: Map<string, Set<(data: Record<string, unknown>) => void>> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  private messageQueue: WsOutgoingMessage[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  get websocket(): WebSocket | null {
    return this.ws;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            // silently ignore
          }
        };

        this.ws.onclose = (event) => {
          this.isWsAuthenticated = false;
          this.notifyConnectionHandlers(false);

          if (event.code !== 1000 && event.code !== 1001 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect()
        .then(() => {
          const token = sessionStorage.getItem('admin_token');
          if (token) {
            this.send({ type: 'authenticate', payload: { token } });
          }
        })
        .catch(() => {
          // silently ignore
        });
    }, this.reconnectDelay);
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      this.ws?.send(JSON.stringify(msg));
    }
  }

  send(message: WsOutgoingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  onMessage<T = Record<string, unknown>>(type: string, handler: (data: T) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    const handlers = this.messageHandlers.get(type)!;
    handlers.add(handler as (data: Record<string, unknown>) => void);
    
    // Return cleanup function
    return () => {
      handlers.delete(handler as (data: Record<string, unknown>) => void);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    };
  }

  private handleMessage(message: Record<string, unknown>) {
    const { type, ...data } = message;
    
    if (type === 'auth_success') {
      this.isAuthenticated = true;
      this.isWsAuthenticated = true;
      if (data.user?.token) {
        sessionStorage.setItem('admin_token', data.user.token);
      }
    }

    if (type === 'error' && data.message?.includes('authentication')) {
      this.isAuthenticated = false;
      this.isWsAuthenticated = false;
    }

    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // silently ignore
        }
      });
    }

    const allHandlers = this.messageHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          // silently ignore
        }
      });
    }
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
  }

  authenticate(email: string, password: string) {
    this.send({
      type: 'authenticate',
      payload: { email, password }
    });
  }

  authenticateWithToken(token: string) {
    this.send({
      type: 'authenticate',
      payload: { token }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isAuth(): boolean {
    return this.isAuthenticated;
  }

  subscribe(channel: string) {
    this.send({
      type: 'subscribe',
      channel: channel
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
      this.isWsAuthenticated = false;
    }
  }
}

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const apiHost = window.location.host.replace(/^admin\./, "admin-api.");
const wsUrl = `${wsProtocol}//${apiHost}/admin/ws`;

export const wsService = new WebSocketService(wsUrl);
export default wsService;
