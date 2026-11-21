import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { dispositivoService } from "../../services/dispositivoService.js";
import { daApi, kwhMes } from "../../utils/dispositivoMapper.js";
import "./HomePage.css";

const ICONES_FILTRO = ["▣", "☾", "⌑", "▤"];

const numero = (valor, casas = 1) =>
  valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });

export default function HomePage() {
  const { usuario, casaAtual, carregando: carregandoCasa } = useCasaAtual();
  const casaId = casaAtual?.id;

  const [filtro, setFiltro] = useState("Todos");
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [temperature, setTemperature] = useState(22); // SÓ VISUAL: NÃO EXISTE COLUNA NO BANCO

  // ---------- CARREGA OS DISPOSITIVOS DA CASA ----------
  useEffect(() => {
    if (carregandoCasa || !casaId) return;
    let ignorar = false;

    dispositivoService
      .listarPorCasa(casaId)
      .then((lista) => {
        if (!ignorar) setDevices((lista ?? []).map(daApi));
      })
      .catch((error) => {
        if (!ignorar) setErro(error.message || "Não foi possível carregar os dispositivos.");
      })
      .finally(() => {
        if (!ignorar) setLoading(false);
      });

    return () => {
      ignorar = true;
    };
  }, [carregandoCasa, casaId]);

  // ---------- SAUDAÇÃO ----------
  const displayName = usuario?.nome?.trim();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  // ---------- NÚMEROS DO RESUMO (TODOS CALCULADOS) ----------
  const ativos = devices.filter((device) => device.ativo);
  const potenciaAgora = ativos.reduce((soma, device) => soma + device.potenciaW, 0);
  const consumoDiario = devices.reduce((soma, device) => soma + kwhMes(device, 1), 0);
  const maiorConsumo = Math.max(0, ...devices.map((device) => kwhMes(device)));

  // ---------- FILTRO POR TIPO (VEM DOS PRÓPRIOS DISPOSITIVOS) ----------
  const filtros = useMemo(() => {
    const tipos = [...new Set(devices.map((device) => device.tipo).filter(Boolean))].sort();
    return [
      { nome: "Todos", icone: "⌂" },
      ...tipos.map((tipo, index) => ({ nome: tipo, icone: ICONES_FILTRO[index % ICONES_FILTRO.length] })),
    ];
  }, [devices]);

  const visibleDevices = devices.filter((device) => filtro === "Todos" || device.tipo === filtro);

  // ---------- LIGAR / DESLIGAR (OTIMISTA) ----------
  async function toggleDevice(device) {
    const novoEstado = !device.ativo;
    setDevices((atual) => atual.map((item) => (item.id === device.id ? { ...item, ativo: novoEstado } : item)));

    try {
      await dispositivoService.alterarEstado(device.id, novoEstado);
    } catch (error) {
      setDevices((atual) => atual.map((item) => (item.id === device.id ? { ...item, ativo: device.ativo } : item)));
      setErro(error.message || "Não foi possível alterar o estado do dispositivo.");
    }
  }

  const semCasa = !carregandoCasa && !casaAtual;

  return (
    <>
      <section className="sm-welcome-row">
        <div>
          <div className="sm-eyebrow">
            <span className="sm-live-dot" /> CASA CONECTADA{" "}
            <span className="sm-welcome-date">· {formattedDate}</span>
          </div>
          <h1>
            {displayName ? `${greeting}, ${displayName}` : greeting} <span className="sm-wave">✳</span>
          </h1>
          <p>{casaAtual ? `Acompanhe ${casaAtual.nome.toLowerCase()} em tempo real.` : "Sua casa, em harmonia."}</p>
        </div>
      </section>

      {semCasa ? (
        <div className="sm-empty-state">
          Você ainda não tem uma casa cadastrada. <Link to="/configuracoes">Cadastre em Configurações</Link> para começar.
        </div>
      ) : (
        <>
          <section className="sm-summary-grid" aria-label="Resumo da casa">
            {/* ---------- CASA ---------- */}
            <article className="sm-summary-card sm-summary-home">
              <div className="sm-summary-top">
                <span className="sm-summary-icon lilac">⌂</span>
              </div>
              <span className="sm-card-label">Sua casa</span>
              <strong className="sm-summary-value">{casaAtual?.nome ?? "Carregando…"}</strong>
              <span className="sm-card-foot">
                <i className="sm-live-dot" /> {casaAtual?.cidade ?? "Sistema funcionando normalmente"}
              </span>
            </article>

            {/* ---------- DISPOSITIVOS ATIVOS ---------- */}
            <article className="sm-summary-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon mint">⌘</span>
                <span className="sm-summary-muted">de {devices.length} dispositivos</span>
              </div>
              <span className="sm-card-label">Dispositivos ligados</span>
              <div className="sm-stat-line">
                <strong className="sm-summary-value">{ativos.length}</strong>
                <span className="sm-stat-unit">unidades</span>
              </div>
              <div className="sm-meter">
                <span style={{ width: (ativos.length / Math.max(devices.length, 1)) * 100 + "%" }} />
              </div>
              <span className="sm-card-foot">Ligue e desligue pelos cards abaixo</span>
            </article>

            {/* ---------- CONSUMO ESTIMADO ---------- */}
            <article className="sm-summary-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon amber">ϟ</span>
                <span className="sm-summary-muted">Por dia</span>
              </div>
              <span className="sm-card-label">Consumo estimado</span>
              <div className="sm-stat-line">
                <strong className="sm-summary-value">{numero(consumoDiario, 2)}</strong>
                <span className="sm-stat-unit">kWh</span>
              </div>
              {/* UMA BARRA POR APARELHO, PROPORCIONAL AO CONSUMO */}
              <div className="sm-spark-bars" aria-hidden="true">
                {devices.slice(0, 20).map((device) => (
                  <i
                    key={device.id}
                    title={device.nome}
                    style={{ height: Math.max(6, maiorConsumo ? (kwhMes(device) / maiorConsumo) * 100 : 0) + "%" }}
                  />
                ))}
              </div>
              <span className="sm-card-foot">Potência × horas de uso de cada aparelho</span>
            </article>

            {/* ---------- POTÊNCIA AGORA ---------- */}
            <article className="sm-summary-card sm-weather-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon sky">◉</span>
                <span className="sm-weather-place">Agora</span>
              </div>
              <span className="sm-card-label">Potência ligada</span>
              <div className="sm-weather-main">
                <strong className="sm-summary-value">{numero(potenciaAgora, 0)}</strong>
                <span className="sm-stat-unit">W</span>
              </div>
              <span className="sm-card-foot">Soma dos aparelhos ligados</span>
            </article>
          </section>

          {/* ---------- FILTRO POR TIPO ---------- */}
          <section className="sm-room-section" id="tipos">
            <div className="sm-section-heading">
              <div>
                <h2>Tipos de aparelho</h2>
                <p>Escolha um tipo para filtrar seus dispositivos</p>
              </div>
              <Link className="sm-text-button" to="/dispositivos">
                Gerenciar <span>→</span>
              </Link>
            </div>
            <div className="sm-room-pills" role="tablist" aria-label="Filtrar por tipo">
              {filtros.map(({ nome, icone }) => (
                <button
                  key={nome}
                  role="tab"
                  aria-selected={filtro === nome}
                  className={"sm-room-pill" + (filtro === nome ? " selected" : "")}
                  onClick={() => setFiltro(nome)}
                  type="button"
                >
                  <span>{icone}</span>
                  {nome}
                  {nome === "Todos" && <small>{devices.length}</small>}
                </button>
              ))}
            </div>
          </section>

          {/* ---------- CARDS ---------- */}
          <section className="sm-device-section" id="dispositivos">
            <div className="sm-section-heading sm-devices-heading">
              <div>
                <h2>
                  Seus dispositivos <span className="sm-heading-count">{visibleDevices.length}</span>
                </h2>
                <p>Gerencie o conforto da sua casa</p>
              </div>
            </div>

            {erro && <div className="sm-empty-state" role="alert">{erro}</div>}

            {loading || carregandoCasa ? (
              <div className="sm-empty-state">Carregando dispositivos…</div>
            ) : (
              <>
                <div className="sm-device-grid">
                  {visibleDevices.map((device) => (
                    <article className={"sm-device-card" + (device.ativo ? " is-on" : "")} key={device.id}>
                      <div className={"sm-device-visual device-art-" + device.arte}>
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
                          className={"sm-toggle" + (device.ativo ? " checked" : "")}
                          type="button"
                          onClick={() => toggleDevice(device)}
                          role="switch"
                          aria-checked={device.ativo}
                          aria-label={(device.ativo ? "Desligar " : "Ligar ") + device.nome}
                        >
                          <i />
                        </button>
                        <span className="sm-device-room-tag">{device.tipo}</span>
                      </div>

                      <div className="sm-device-info">
                        <div className="sm-device-title">
                          <div>
                            <h3>{device.nome}</h3>
                            <span>
                              <i className={device.ativo ? "sm-live-dot" : ""} />
                              {device.ativo ? "Ligado" : "Desligado"}
                            </span>
                            <span className="sm-device-power-label">{numero(device.potenciaW, 0)} W</span>
                          </div>
                        </div>

                        {device.arte === "air" ? (
                          <div className="sm-device-control">
                            <button
                              type="button"
                              aria-label="Diminuir temperatura"
                              onClick={() => setTemperature((valor) => Math.max(16, valor - 1))}
                            >
                              −
                            </button>
                            <span>
                              {temperature}°<small>C</small>
                            </span>
                            <button
                              type="button"
                              aria-label="Aumentar temperatura"
                              onClick={() => setTemperature((valor) => Math.min(30, valor + 1))}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="sm-coffee-note">
                            ϟ <span>≈ {numero(kwhMes(device))} kWh/mês · {numero(device.horasUsoDia)} h/dia</span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {visibleDevices.length === 0 && (
                  <div className="sm-empty-state">
                    {devices.length === 0 ? (
                      <>Nenhum dispositivo cadastrado. <Link to="/dispositivos">Adicione o primeiro</Link>.</>
                    ) : (
                      "Nenhum dispositivo desse tipo."
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

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