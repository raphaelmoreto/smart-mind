import { useState } from "react";
import { Link } from "react-router";
import "./HomePage.css";

const rooms = ["Todos", "Sala", "Quarto", "Cozinha", "Escritório"];
const initialDevices = [
  {
    id: "living",
    name: "Luminária de piso",
    room: "Sala",
    type: "lamp",
    detail: "Luz ambiente",
    on: true,
    level: 72,
  },
  {
    id: "ceiling",
    name: "Luz principal",
    room: "Sala",
    type: "ceiling",
    detail: "Luz quente",
    on: true,
    level: 86,
  },
  {
    id: "air",
    name: "Ar-condicionado",
    room: "Quarto",
    type: "air",
    detail: "Modo silencioso",
    on: false,
    level: 23,
  },
  {
    id: "plant",
    name: "Luz de leitura",
    room: "Quarto",
    type: "lamp",
    detail: "Luz suave",
    on: false,
    level: 48,
  },
  {
    id: "coffee",
    name: "Cafeteira",
    room: "Cozinha",
    type: "coffee",
    detail: "Desligada",
    on: false,
    level: 0,
  },
  {
    id: "desk",
    name: "Luz de mesa",
    room: "Escritório",
    type: "lamp",
    detail: "Luz neutra",
    on: true,
    level: 60,
  },
];

function Icon({ children }) {
  return (
    <span className="sm-icon" aria-hidden="true">
      {children}
    </span>
  );
}

export default function HomePage() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("smartmind-theme") || "dark",
  );
  const [room, setRoom] = useState("Todos");
  const [devices, setDevices] = useState(initialDevices);
  const [temperature, setTemperature] = useState(22);
  const [search, setSearch] = useState("");
  const activeCount = devices.filter((device) => device.on).length;
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Bom dia"
      : now.getHours() < 18
        ? "Boa tarde"
        : "Boa noite";
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const visibleDevices = devices.filter(
    (device) =>
      (room === "Todos" || device.room === room) &&
      device.name.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("smartmind-theme", nextTheme);
  }
  function toggleDevice(id) {
    setDevices((current) =>
      current.map((device) =>
        device.id === id ? { ...device, on: !device.on } : device,
      ),
    );
  }
  function updateLevel(id, value) {
    setDevices((current) =>
      current.map((device) =>
        device.id === id
          ? { ...device, level: Number(value), on: Number(value) > 0 }
          : device,
      ),
    );
  }

  return (
    <main className="sm-app" data-theme={theme}>
      <aside className="sm-sidebar">
        <a className="sm-brand" href="/home" aria-label="SmartMind início">
          <span className="sm-brand-mark">✳</span>
          <span className="sm-brand-name">SmartMind</span>
        </a>
        <div className="sm-side-label">MENU PRINCIPAL</div>
        <nav className="sm-side-nav" aria-label="Navegação principal">
          <a className="sm-nav-link active" href="#inicio">
            <Icon>⌂</Icon>
            <span>Visão geral</span>
          </a>
          <a className="sm-nav-link" href="#dispositivos">
            <Icon>◉</Icon>
            <span>Dispositivos</span>
            <span className="sm-nav-count">{devices.length}</span>
          </a>
          <a className="sm-nav-link" href="#ambientes">
            <Icon>▦</Icon>
            <span>Ambientes</span>
          </a>
          <a className="sm-nav-link" href="#cenas">
            <Icon>✦</Icon>
            <span>Cenas</span>
          </a>
          <a className="sm-nav-link" href="#energia">
            <Icon>ϟ</Icon>
            <span>Energia</span>
          </a>
          <Link className="sm-nav-link" to="/chatbot">
            <Icon>✧</Icon>
            <span>Assistente IA</span>
        </Link>
        </nav>
        <div className="sm-sidebar-bottom">
          <a className="sm-nav-link" href="#configuracoes">
            <Icon>⚙</Icon>
            <span>Configurações</span>
          </a>
          <div className="sm-profile">
            <div className="sm-avatar">A</div>
            <div>
              <strong>Alex Morgan</strong>
              <span>Minha casa</span>
            </div>
          </div>
        </div>
      </aside>
      <section className="sm-main" id="inicio">
        <header className="sm-topbar">
          <div className="sm-breadcrumb">
            Minha casa <span>/</span> <strong>Visão geral</strong>
          </div>
          <div className="sm-top-actions">
            <label className="sm-search">
              <Icon>⌕</Icon>
              <input
                type="search"
                placeholder="Buscar dispositivo..."
                aria-label="Buscar dispositivo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="sm-theme-button"
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
            >
              <Icon>{theme === "dark" ? "☼" : "☾"}</Icon>
              <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
            </button>
            <div className="sm-mini-avatar">A</div>
          </div>
        </header>
        <div className="sm-content">
          <section className="sm-welcome-row">
            <div>
              <div className="sm-eyebrow">
                <span className="sm-live-dot" /> CASA CONECTADA{" "}
                <span className="sm-welcome-date">· {formattedDate}</span>
              </div>
              <h1>
                {greeting}, Alex <span className="sm-wave">✳</span>
              </h1>
              <p>Sua casa está do jeitinho que você gosta.</p>
            </div>
          </section>
          <section className="sm-summary-grid" aria-label="Resumo da casa">
            <article className="sm-summary-card sm-summary-home">
              <div className="sm-summary-top">
                <span className="sm-summary-icon lilac">⌂</span>
                <span className="sm-summary-trend">↗ 12%</span>
              </div>
              <span className="sm-card-label">Sua casa</span>
              <strong className="sm-summary-value">Tudo tranquilo</strong>
              <span className="sm-card-foot">
                <i className="sm-live-dot" /> Sistema funcionando normalmente
              </span>
            </article>
            <article className="sm-summary-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon mint">⌘</span>
                <span className="sm-summary-muted">
                  de {devices.length} dispositivos
                </span>
              </div>
              <span className="sm-card-label">Dispositivos ativos</span>
              <div className="sm-stat-line">
                <strong className="sm-summary-value">{activeCount}</strong>
                <span className="sm-stat-unit">unidades</span>
              </div>
              <div className="sm-meter">
                <span
                  style={{ width: (activeCount / devices.length) * 100 + "%" }}
                />
              </div>
              <span className="sm-card-foot">
                Sua casa está em modo confortável
              </span>
            </article>
            <article className="sm-summary-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon amber">ϟ</span>
                <span className="sm-summary-muted">Hoje</span>
              </div>
              <span className="sm-card-label">Consumo de energia</span>
              <div className="sm-stat-line">
                <strong className="sm-summary-value">4,28</strong>
                <span className="sm-stat-unit">kWh</span>
              </div>
              <div className="sm-spark-bars">
                {[
                  26, 38, 30, 47, 35, 57, 46, 68, 44, 75, 56, 87, 62, 73, 48,
                  65, 40, 56, 35, 46,
                ].map((height, index) => (
                  <i key={index} style={{ height: height + "%" }} />
                ))}
              </div>
              <span className="sm-card-foot">
                12% menos que ontem <b>↘</b>
              </span>
            </article>
            <article className="sm-summary-card sm-weather-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon sky">☼</span>
                <span className="sm-weather-place">⌖ São Paulo</span>
              </div>
              <span className="sm-card-label">Clima lá fora</span>
              <div className="sm-weather-main">
                <strong className="sm-summary-value">27°</strong>
                <span className="sm-weather-sun">☼</span>
              </div>
              <span className="sm-card-foot">
                Ensolarado <span>·</span> Sensação de 29°
              </span>
            </article>
          </section>
          <section className="sm-room-section" id="ambientes">
            <div className="sm-section-heading">
              <div>
                <h2>Ambientes</h2>
                <p>Escolha um ambiente para ver seus dispositivos</p>
              </div>
              <button
                className="sm-text-button"
                type="button"
                onClick={() => setRoom("Todos")}
              >
                Ver todos <span>→</span>
              </button>
            </div>
            <div
              className="sm-room-pills"
              role="tablist"
              aria-label="Filtrar por ambiente"
            >
              {rooms.map((item, index) => (
                <button
                  key={item}
                  role="tab"
                  aria-selected={room === item}
                  className={
                    "sm-room-pill" + (room === item ? " selected" : "")
                  }
                  onClick={() => setRoom(item)}
                  type="button"
                >
                  <span>{["⌂", "▣", "☾", "⌑", "▤"][index]}</span>
                  {item}
                  {item === "Todos" && <small>{devices.length}</small>}
                </button>
              ))}
            </div>
          </section>
          <section className="sm-device-section" id="dispositivos">
            <div className="sm-section-heading sm-devices-heading">
              <div>
                <h2>
                  Seus dispositivos{" "}
                  <span className="sm-heading-count">
                    {visibleDevices.length}
                  </span>
                </h2>
                <p>Gerencie o conforto da sua casa</p>
              </div>
            </div>
            <div className="sm-device-grid">
              {visibleDevices.map((device) => (
                <article
                  className={"sm-device-card" + (device.on ? " is-on" : "")}
                  key={device.id}
                >
                  <div className={"sm-device-visual device-art-" + device.type}>
                    <div className="sm-device-ambient" />
                    <div className="sm-device-drawing">
                      <span>
                        {device.type === "air"
                          ? "❄"
                          : device.type === "coffee"
                            ? "▣"
                            : device.type === "ceiling"
                              ? "◌"
                              : "◉"}
                      </span>
                    </div>
                    <button
                      className={"sm-toggle" + (device.on ? " checked" : "")}
                      type="button"
                      onClick={() => toggleDevice(device.id)}
                      role="switch"
                      aria-checked={device.on}
                      aria-label={
                        (device.on ? "Desligar " : "Ligar ") + device.name
                      }
                    >
                      <i />
                    </button>
                    <span className="sm-device-room-tag">{device.room}</span>
                  </div>
                  <div className="sm-device-info">
                    <div className="sm-device-title">
                      <div>
                        <h3>{device.name}</h3>
                        <span>
                          <i className={device.on ? "sm-live-dot" : ""} />
                          {device.on ? device.detail : "Desligado"}
                        </span>
                      </div>
                    </div>
                    {device.type === "air" ? (
                      <div className="sm-device-control">
                        <button
                          type="button"
                          aria-label="Diminuir temperatura"
                          onClick={() =>
                            setTemperature((value) => Math.max(16, value - 1))
                          }
                        >
                          −
                        </button>
                        <span>
                          {temperature}°<small>C</small>
                        </span>
                        <button
                          type="button"
                          aria-label="Aumentar temperatura"
                          onClick={() =>
                            setTemperature((value) => Math.min(30, value + 1))
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : device.type !== "coffee" ? (
                      <label className="sm-brightness">
                        <span>Intensidade</span>
                        <strong>{device.level}%</strong>
                        <input
                          aria-label={"Intensidade de " + device.name}
                          type="range"
                          min="0"
                          max="100"
                          value={device.level}
                          onChange={(event) =>
                            updateLevel(device.id, event.target.value)
                          }
                        />
                      </label>
                    ) : (
                      <div className="sm-coffee-note">
                        ☼ <span>Pronta para preparar</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {visibleDevices.length === 0 && (
              <div className="sm-empty-state">
                Nenhum dispositivo encontrado neste ambiente.
              </div>
            )}
          </section>
          <footer className="sm-footer">
            <span>
              SmartMind <b>·</b> Sua casa, em harmonia.
            </span>
            <span>
              <i className="sm-live-dot" /> Todos os sistemas operacionais
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}
