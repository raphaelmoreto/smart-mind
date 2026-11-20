import { Link, useLocation } from "react-router";
import { authService } from "../../services/authService.js";
import { navigationItems } from "./navigation.js";
import Logo from "../../assets/logo.png";

export default function AppSidebar() {
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const displayName = currentUser?.nome || "Usuário";

  return (
    <aside className="sm-sidebar">
      <Link className="sm-brand" to="/home" aria-label="SmartMind início">
        <img className="sm-brand-mark" src={Logo} alt="Logo da aplicação" />
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
          <div className="sm-avatar" aria-hidden="true">
            {displayName.charAt(0).toLocaleUpperCase("pt-BR")}
          </div>
          <div>
            <strong>{displayName}</strong>
            <span>Minha casa</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
