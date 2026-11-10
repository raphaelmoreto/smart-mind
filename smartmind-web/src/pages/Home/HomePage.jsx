import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toHomeDevice } from "../../components/energy/devicePresentation.js";
import { getAmbientes, getDispositivos, updateDispositivo } from "../../services/energyApi.js";
import "./HomePage.css";

const roomIcons = ["▣", "☾", "⌑", "▤"];

export default function HomePage() {
  const [room, setRoom] = useState("Todos");
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [temperature, setTemperature] = useState(22);
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
    (device) => room === "Todos" || device.room === room,
  );
  const roomOptions = [
    { nome: "Todos", icone: "⌂" },
    ...rooms.map((item, index) => ({
      nome: item.nome,
      icone: roomIcons[index % roomIcons.length],
    })),
  ];

  useEffect(() => {
    Promise.all([getDispositivos(), getAmbientes()]).then(
      ([deviceData, roomData]) => {
        setRooms(roomData);
        setDevices(deviceData.map((device) => toHomeDevice(device, roomData)));
      },
    );
  }, []);

  async function updateDevice(id, changes) {
    const device = devices.find((item) => item.id === id);
    if (!device) return;

    const payload = {
      id: device.id,
      nome: device.name,
      foto: device.foto || "",
      ambienteId: device.ambienteId,
      potenciaW: Number(device.potenciaW || 0),
      ativo: changes.ativo ?? device.on,
      horasUsoDia: Number(device.horasUsoDia || 4),
      tipo: device.type,
      detalhe: device.detail,
      intensidade: changes.intensidade ?? device.level,
    };
    const saved = await updateDispositivo(id, payload);
    setDevices((current) =>
      current.map((item) => item.id === id ? toHomeDevice(saved, rooms) : item),
    );
  }

  function toggleDevice(id) {
    const device = devices.find((item) => item.id === id);
    if (device) updateDevice(id, { ativo: !device.on });
  }

  function updateLevel(id, value) {
    const level = Number(value);
    updateDevice(id, { intensidade: level, ativo: level > 0 });
  }

  return (
    <>
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
            style={{
              width: (activeCount / Math.max(devices.length, 1)) * 100 + "%",
            }}
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
        <Link
          className="sm-text-button"
          to="/ambientes"
          onClick={() => setRoom("Todos")}
        >
          Ver todos <span>→</span>
        </Link>
      </div>
      <div
        className="sm-room-pills"
        role="tablist"
        aria-label="Filtrar por ambiente"
      >
        {roomOptions.map(({ nome, icone }) => (
          <button
            key={nome}
            role="tab"
            aria-selected={room === nome}
            className={
              "sm-room-pill" + (room === nome ? " selected" : "")
            }
            onClick={() => setRoom(nome)}
            type="button"
          >
            <span>{icone}</span>
            {nome}
            {nome === "Todos" && <small>{devices.length}</small>}
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
              {device.foto && (
                <img
                  className="sm-device-photo-image"
                  src={device.foto}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="sm-device-ambient" />
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
                  <span className="sm-device-power-label">
                    {device.potenciaW} W
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
    </>
  );
}
