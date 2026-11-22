import { Link, useLocation, useNavigate } from "react-router";
import { authService } from "../../services/authService.js";
import { navigationItems } from "../../config/navigation.js";
import Logo from "../../assets/logo.png";

// "SEVERINO JOAQUIM BARRETO" -> "Severino Barreto"
function nomeCurto(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const escolhidas = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : partes;
  return escolhidas
    .map((parte) => parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1).toLocaleLowerCase("pt-BR"))
    .join(" ");
}

// "SEVERINO JOAQUIM BARRETO" -> "SB"
function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const escolhidas = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : partes;
  return escolhidas.map((parte) => parte.charAt(0)).join("").toLocaleUpperCase("pt-BR") || "?";
}

// "ADMINISTRADOR" -> "Administrador"
function formatarPerfil(role) {
  if (!role) return "Usuário";
  return role.charAt(0).toLocaleUpperCase("pt-BR") + role.slice(1).toLocaleLowerCase("pt-BR");
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const nomeCompleto = currentUser?.nome || "Usuário";

  function sair() {
    authService.logout();
    sessionStorage.removeItem("casaAtualId");
    navigate("/");
  }

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

      {/* ---------- CARTÃO DO USUÁRIO + SAIR ---------- */}
      <div className="sm-sidebar-bottom">
        <div className="sm-profile-card">
          <div className="sm-avatar" aria-hidden="true">
            {iniciais(nomeCompleto)}
          </div>

          <div className="sm-profile-info">
            <strong title={nomeCompleto}>{nomeCurto(nomeCompleto)}</strong>
            <span>{formatarPerfil(currentUser?.role)}</span>
          </div>

          <button
            className="sm-logout-button"
            type="button"
            onClick={sair}
            aria-label="Sair da conta"
            title="Sair"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 17l5-5-5-5M20 12H9M12 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}