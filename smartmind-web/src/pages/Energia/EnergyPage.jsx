import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MetricCard, PageHeading } from "../../components/ui/index.js";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { dispositivoService } from "../../services/dispositivoService.js";
import { energiaService } from "../../services/energiaService.js";
import { daApi } from "../../utils/dispositivoMapper.js";
import "./EnergyPage.css";

const PERIODOS = [
  { id: "dia", label: "24 h" },
  { id: "semana", label: "7 dias" },
  { id: "ano", label: "12 meses" },
];

const money = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const kwh = (valor, casas = 1) => valor.toLocaleString("pt-BR", { maximumFractionDigits: casas }) + " kWh";

// "2026-11-01" -> "novembro de 2026"
const nomeDoMes = (data) =>
  new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export default function EnergyPage() {
  const { casaAtual, carregando: carregandoCasa, erro: erroCasa } = useCasaAtual();
  const casaId = casaAtual?.id;

  // ---------- DADOS DO BANCO ----------
  const [devices, setDevices] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [serie, setSerie] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carregandoSerie, setCarregandoSerie] = useState(true);
  const [erro, setErro] = useState("");

  // ---------- SIMULAÇÃO (SÓ NA TELA, NÃO GRAVA NADA) ----------
  const [periodo, setPeriodo] = useState("semana");
  const [tarifaSimulada, setTarifaSimulada] = useState(null);
  const [diasSimulados, setDiasSimulados] = useState(null);
  const [horasSimuladas, setHorasSimuladas] = useState({});

  // ---------- PREVISÃO COM IA ----------
  const [prevendo, setPrevendo] = useState(false);
  const [erroPrevisao, setErroPrevisao] = useState("");

  // DISPOSITIVOS + RESUMO (CONSUMO DO MÊS, TARIFA, ÚLTIMA PREVISÃO)
  useEffect(() => {
    if (carregandoCasa || !casaId) return;
    let ignorar = false;

    Promise.all([dispositivoService.listarPorCasa(casaId), energiaService.buscarResumo(casaId)])
      .then(([lista, dadosResumo]) => {
        if (ignorar) return;
        setDevices((lista ?? []).map(daApi));
        setResumo(dadosResumo);
        setErro("");
      })
      .catch((e) => {
        if (!ignorar) setErro(e.message || "Não foi possível carregar os dados de energia.");
      })
      .finally(() => {
        if (!ignorar) setLoading(false);
      });

    return () => {
      ignorar = true;
    };
  }, [carregandoCasa, casaId]);

  // GRÁFICO: RECARREGA QUANDO TROCA O PERÍODO
  useEffect(() => {
    if (carregandoCasa || !casaId) return;
    let ignorar = false;

    energiaService
      .buscarSerie(casaId, periodo)
      .then((pontos) => {
        if (!ignorar) setSerie(pontos ?? []);
      })
      .catch((e) => {
        if (!ignorar) setErro(e.message || "Não foi possível carregar o gráfico.");
      })
      .finally(() => {
        if (!ignorar) setCarregandoSerie(false);
      });

    return () => {
      ignorar = true;
    };
  }, [carregandoCasa, casaId, periodo]);

  function trocarPeriodo(novo) {
    if (novo === periodo) return;
    setCarregandoSerie(true);
    setPeriodo(novo);
  }

  async function gerarPrevisao() {
    setPrevendo(true);
    setErroPrevisao("");
    try {
      const previsao = await energiaService.prever(casaId);
      setResumo((atual) => ({ ...atual, ultima_previsao: previsao }));
    } catch (e) {
      setErroPrevisao(e.message || "Não foi possível gerar a previsão.");
    } finally {
      setPrevendo(false);
    }
  }

  // ---------- CÁLCULOS ----------
  const tarifaDaCasa = resumo?.tarifa?.valor_total_kwh ?? 0;
  const tarifa = tarifaSimulada ?? tarifaDaCasa;
  const diasNoMes = diasSimulados ?? resumo?.dias_no_mes ?? 30;

  const medidoPorDispositivo = useMemo(
    () => new Map((resumo?.por_dispositivo ?? []).map((item) => [item.dispositivo_id, item.kwh])),
    [resumo],
  );

  const consumo = useMemo(
    () =>
      devices.map((device) => {
        const horas = horasSimuladas[device.id] ?? device.horasUsoDia;
        const kwhMes = (device.potenciaW * horas * diasNoMes) / 1000;
        return {
          ...device,
          horas,
          kwhMes,
          custoMes: kwhMes * tarifa,
          medidoMes: medidoPorDispositivo.get(device.id) ?? 0,
        };
      }),
    [devices, horasSimuladas, diasNoMes, tarifa, medidoPorDispositivo],
  );

  const totalEstimado = consumo.reduce((soma, item) => soma + item.kwhMes, 0);
  const totalMedido = consumo.reduce((soma, item) => soma + item.medidoMes, 0);
  const potenciaAgora = devices.filter((d) => d.ativo).reduce((soma, d) => soma + d.potenciaW, 0);

  const projecao = resumo?.projecao_mes_kwh ?? 0;
  const mesAnterior = resumo?.consumo_mes_anterior_kwh ?? 0;
  const variacao = mesAnterior > 0 ? ((projecao - mesAnterior) / mesAnterior) * 100 : null;

  const maxSerie = Math.max(...serie.map((ponto) => ponto.kwh), 0.01);
  const totalSerie = serie.reduce((soma, ponto) => soma + ponto.kwh, 0);
  const semMedicoes = !carregandoSerie && serie.every((ponto) => ponto.kwh === 0);

  const previsao = resumo?.ultima_previsao;

  if (!carregandoCasa && !casaAtual) {
    return (
      <main className="energy-page">
        <PageHeading eyebrow="EFICIÊNCIA DA CASA" title="Energia" description="Entenda o consumo da casa." />
        <div className="energy-empty">
          {/* SE A API ESTIVER FORA, MOSTRA O ERRO EM VEZ DE DIZER QUE NÃO HÁ CASA */}
          {erroCasa || (
            <>
              Você ainda não tem uma casa cadastrada. <Link to="/configuracoes">Cadastre em Configurações</Link>.
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="EFICIÊNCIA DA CASA"
        title="Energia"
        description="Consumo medido pela casa, previsão com IA e simulação de custos."
      />

      {erro && <div className="energy-form-error" role="alert">{erro}</div>}

      {/* ---------- CARDS ---------- */}
      <section className="energy-metrics" aria-label="Resumo de energia">
        <MetricCard
          label="Consumo medido no mês"
          value={loading ? "…" : kwh(resumo?.consumo_mes_atual_kwh ?? 0)}
          note={`Projeção até o fim do mês: ${kwh(projecao)}`}
          icon="ϟ"
        />
        <MetricCard
          label="Custo projetado"
          value={loading ? "…" : money(projecao * tarifaDaCasa)}
          note={
            variacao === null
              ? `Tarifa de ${money(tarifaDaCasa)}/kWh`
              : `${variacao >= 0 ? "↗" : "↘"} ${Math.abs(variacao).toFixed(0)}% em relação ao mês passado`
          }
          icon="R$"
        />
        <MetricCard
          label="Potência ligada agora"
          value={potenciaAgora.toLocaleString("pt-BR") + " W"}
          note="Soma dos dispositivos ligados"
          icon="◉"
        />
      </section>

      <section className="energy-chart-layout">
        {/* ---------- GRÁFICO COM AS MEDIÇÕES REAIS ---------- */}
        <article className="energy-panel">
          <div className="energy-panel-heading energy-chart-heading">
            <div>
              <h2>Consumo medido</h2>
              <p>Soma das medições da tabela de consumo de todos os aparelhos da casa.</p>
            </div>
            <div className="energy-segmented" role="tablist" aria-label="Período do gráfico">
              {PERIODOS.map((item) => (
                <button
                  key={item.id}
                  className={periodo === item.id ? "selected" : ""}
                  type="button"
                  role="tab"
                  aria-selected={periodo === item.id}
                  onClick={() => trocarPeriodo(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={"energy-chart" + (carregandoSerie ? " is-loading" : "")} aria-label={"Consumo por " + periodo}>
            {serie.map((ponto, index) => (
              <div className="energy-chart-item" key={index} title={`${ponto.rotulo}: ${kwh(ponto.kwh, 2)}`}>
                <div className="energy-chart-track">
                  <div className="energy-chart-bar" style={{ height: Math.max(3, (ponto.kwh / maxSerie) * 100) + "%" }} />
                </div>
                {/* NO GRÁFICO DE 24 h, MOSTRA SÓ 1 RÓTULO A CADA 3 PARA NÃO EMBOLAR */}
                <span className="energy-chart-label">
                  {periodo !== "dia" || index % 3 === 0 ? ponto.rotulo : ""}
                </span>
              </div>
            ))}
          </div>

          {semMedicoes && <p className="energy-chart-empty">Ainda não há medições neste período.</p>}

          <div className="energy-chart-legend">
            <span>
              <i /> Consumo medido
            </span>
            <strong>{kwh(totalSerie, 2)} no período</strong>
          </div>
        </article>

        <div className="energy-side-stack">
          {/* ---------- PREVISÃO COM IA (GRAVA EM "Previsoes") ---------- */}
          <article className="energy-panel energy-calculator">
            <div className="energy-panel-heading">
              <div>
                <h2>Previsão com IA</h2>
                <p>Usa os últimos meses completos de consumo.</p>
              </div>
              <span className="energy-metric-icon">✧</span>
            </div>

            {previsao ? (
              <div className="energy-forecast">
                <span>Fechamento previsto de {nomeDoMes(previsao.periodo_referencia)}</span>
                <strong>{kwh(previsao.consumo_previsto_kwh)}</strong>
                <b>{money(previsao.valor_estimado)}</b>
                <small>
                  Modelo {previsao.modelo || "—"} · gerada em{" "}
                  {new Date(previsao.dt_previsao).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </small>
              </div>
            ) : (
              <p className="energy-forecast-empty">Nenhuma previsão gerada ainda.</p>
            )}

            {erroPrevisao && <p className="energy-form-error" role="alert">{erroPrevisao}</p>}

            <button className="energy-button" type="button" onClick={gerarPrevisao} disabled={prevendo || loading}>
              {prevendo ? "Calculando..." : previsao ? "Gerar nova previsão" : "Gerar previsão"}
            </button>
          </article>

          {/* ---------- SIMULADOR (NÃO GRAVA NADA) ---------- */}
          <article className="energy-panel energy-calculator">
            <div className="energy-panel-heading">
              <div>
                <h2>Simulador de tarifa</h2>
                <p>Mude os valores para simular; nada é gravado.</p>
              </div>
              <span className="energy-metric-icon">⌘</span>
            </div>
            <label className="energy-field">
              Tarifa (R$/kWh)
              <input
                className="energy-input"
                type="number"
                min="0"
                step="0.01"
                value={Number(tarifa.toFixed(5))}
                onChange={(event) => setTarifaSimulada(Math.max(0, Number(event.target.value)))}
              />
            </label>
            <label className="energy-field">
              Dias no mês
              <input
                className="energy-input"
                type="number"
                min="1"
                max="31"
                value={diasNoMes}
                onChange={(event) => setDiasSimulados(Math.min(31, Math.max(1, Number(event.target.value))))}
              />
            </label>
            {(tarifaSimulada !== null || diasSimulados !== null || Object.keys(horasSimuladas).length > 0) && (
              <button
                className="energy-button-secondary"
                type="button"
                onClick={() => {
                  setTarifaSimulada(null);
                  setDiasSimulados(null);
                  setHorasSimuladas({});
                }}
              >
                Voltar aos valores da casa
              </button>
            )}
            <div className="energy-formula">
              <span>Fórmula mensal por aparelho</span>
              <strong>(W × horas/dia × dias) ÷ 1.000</strong>
              <small>
                Tarifa da casa: {money(tarifaDaCasa)}/kWh · bandeira {resumo?.tarifa?.bandeira?.toLowerCase() ?? "—"}
              </small>
            </div>
          </article>
        </div>
      </section>

      {/* ---------- TABELA: ESTIMADO × MEDIDO ---------- */}
      <section className="energy-panel">
        <div className="energy-panel-heading">
          <div>
            <h2>Consumo por dispositivo</h2>
            <p>Estimativa pela potência e horas de uso, comparada com o que foi medido neste mês.</p>
          </div>
        </div>

        {loading ? (
          <div className="energy-empty">Carregando…</div>
        ) : consumo.length === 0 ? (
          <div className="energy-empty">
            Nenhum dispositivo cadastrado. <Link to="/dispositivos">Adicione o primeiro</Link>.
          </div>
        ) : (
          <div className="energy-table-wrap">
            <table className="energy-table">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Potência</th>
                  <th>Horas/dia</th>
                  <th>Estimado/mês</th>
                  <th>Medido no mês</th>
                  <th>Custo estimado</th>
                </tr>
              </thead>
              <tbody>
                {consumo.map((device) => (
                  <tr key={device.id}>
                    <td>
                      {device.nome}
                      {device.ambiente && <small className="energy-table-sub">{device.ambiente}</small>}
                    </td>
                    <td>{device.potenciaW.toLocaleString("pt-BR")} W</td>
                    <td>
                      <input
                        className="energy-input"
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        aria-label={"Horas por dia de " + device.nome}
                        value={device.horas}
                        onChange={(event) =>
                          setHorasSimuladas((atual) => ({
                            ...atual,
                            [device.id]: Math.min(24, Math.max(0, Number(event.target.value))),
                          }))
                        }
                      />
                    </td>
                    <td>{kwh(device.kwhMes, 2)}</td>
                    <td>{kwh(device.medidoMes, 2)}</td>
                    <td>{money(device.custoMes)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="3">Total</th>
                  <th>{kwh(totalEstimado, 2)}</th>
                  <th>{kwh(totalMedido, 2)}</th>
                  <th>{money(totalEstimado * tarifa)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}