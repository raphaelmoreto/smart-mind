import { createContext, useContext } from "react";

export const EnergyThemeContext = createContext(null);

export function useEnergyTheme() {
  return useContext(EnergyThemeContext);
}
