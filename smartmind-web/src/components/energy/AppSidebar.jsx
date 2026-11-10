import { Link, useLocation } from "react-router";
import { navigationItems } from "./navigation.js";

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="sm-sidebar">
      <Link className="sm-brand" to="/home" aria-label="SmartMind início">
        <span className="sm-brand-mark">✳</span>
        <span className="sm-brand-name">SmartMind</span>
      </Link>
      <div className="sm-side-label">MENU PRINCIPAL</div>
      <nav className="sm-side-nav" aria-label="Navegação principal">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.to;

          return (
            <Link
              className={"sm-nav-link" + (isActive ? " active" : "")}
              to={item.to}
              key={item.to}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="sm-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sm-sidebar-bottom">
        <div className="sm-profile">
          <div className="sm-avatar">A</div>
          <div>
            <strong>Alex Morgan</strong>
            <span>Minha casa</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
