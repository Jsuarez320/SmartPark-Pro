import { create } from "zustand";

interface TurnoState {
  turnoId: number | null;
  setTurnoId: (turnoId: number | null) => void;
}

export const useTurnoStore = create<TurnoState>((set) => ({
  turnoId: null,
  setTurnoId: (turnoId) => set({ turnoId })
}));
