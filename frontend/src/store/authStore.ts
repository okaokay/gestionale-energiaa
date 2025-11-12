/**
 * Store Zustand per gestione autenticazione
 */

import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    nome: string;
    cognome: string;
    ruolo: 'super_admin' | 'admin' | 'operatore' | 'visualizzatore' | 'agent';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    logout: () => void;
    checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    
    setUser: (user) => set({ user, isAuthenticated: true }),
    
    setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token, isAuthenticated: true });
    },
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
    },
    
    checkAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({ token, user, isAuthenticated: true, isLoading: false });
            } catch (error) {
                set({ isLoading: false });
            }
        } else {
            set({ isLoading: false });
        }
    },
}));

