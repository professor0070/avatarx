import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    const socketInstance = io(API_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: {
        userId: user.id,
      },
      query: {
        userId: user.id
      }
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log(`🟢 Real-time Socket Connected successfully with ID: [${socketInstance.id}]`);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log(`🔴 Socket Disconnected: [${socketInstance.id}]`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
