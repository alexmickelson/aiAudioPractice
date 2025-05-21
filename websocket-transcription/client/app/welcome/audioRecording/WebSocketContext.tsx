import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface WebSocketContextProps {
  websocket: WebSocket | null;
  connectWebSocket: (url: string) => Promise<WebSocket>;
  disconnectWebSocket: () => void;
  status: string;
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(
  undefined
);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [websocket, setWebSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState("Disconnected");

  const connectWebSocket = async (url: string) => {
    return new Promise<WebSocket>((resolve, reject) => {
      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          setStatus("Connected");
          setWebSocket(ws);
          resolve(ws);
        };

        ws.onclose = () => {
          setStatus("Disconnected");
          setWebSocket(null);
        };

        ws.onerror = () => {
          setStatus("Error connecting to WebSocket.");
          reject(new Error("Error connecting to WebSocket"));
        };
      } catch (error) {
        setStatus("Invalid WebSocket URL. Please check and try again.");
        reject(error);
      }
    });
  };

  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close();
      setWebSocket(null);
    }
  };

  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  return (
    <WebSocketContext.Provider
      value={{ websocket, connectWebSocket, disconnectWebSocket, status }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
