import { useCallback, useState } from "react";
import { EnergyThemeContext } from "./EnergyTheme.js";
import AppSidebar from "./AppSidebar.jsx";
import { navigationItems } from "./navigation.js";
import { useLocation } from "react-router";
import "../../pages/Home/HomePage.css";
import "./EnergyLayout.css";
import "./EnergyShared.css";


export default function EnergyLayout({ children }) {
  const location = useLocation();
  const [theme, setTheme] = useState(
    () => localStorage.getItem("smartmind-theme") || "dark",
  );

  const changeTheme = useCallback((value) => {
    const currentTheme = localStorage.getItem("smartmind-theme") || "dark";
    const nextTheme = value || (currentTheme === "dark" ? "light" : "dark");
    setTheme(nextTheme);
    localStorage.setItem("smartmind-theme", nextTheme);
  }, []);

  return (
    <EnergyThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      <main className="sm-app" data-theme={theme}>
        <AppSidebar />

        <section className="sm-main">
          <header className="sm-topbar">
            <div className="sm-breadcrumb">
              SmartMind <span>/</span>{" "}
              <strong>
                {navigationItems.find((item) => item.to === location.pathname)
                  ?.label || "Energia"}
              </strong>
            </div>
            <div className="sm-top-actions">
              <button
                className="sm-theme-button"
                type="button"
                onClick={() => changeTheme()}
                aria-label={
                  theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
                }
              >
                <span className="sm-icon" aria-hidden="true">
                  {theme === "dark" ? "☼" : "☾"}
                </span>
                <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
              </button>
              <div className="sm-mini-avatar">A</div>
            </div>
          </header>
          <div className="sm-content">{children}</div>
        </section>
      </main>
    </EnergyThemeContext.Provider>
  );
}
