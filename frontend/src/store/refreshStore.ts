/**
 * Store per gestire il refresh dei dati
 */
import { create } from 'zustand';

interface RefreshStore {
    clientiRefreshKey: number;
    triggerClientiRefresh: () => void;
}

export const useRefreshStore = create<RefreshStore>((set) => ({
    clientiRefreshKey: 0,
    triggerClientiRefresh: () => set((state) => ({ 
        clientiRefreshKey: state.clientiRefreshKey + 1 
    })),
}));


