import { useEffect, useMemo, useState } from "react";
import {
  MetricCard,
  PageHeading,
} from "../../components/energy/EnergyComponents.jsx";
import { getDispositivos, getEnergia } from "../../services/energyApi.js";
import "./EnergyPage.css";

const dailyShape = [0.52, 0.48, 0.46, 0.44, 0.48, 0.62, 0.8, 0.92, 0.84, 0.72, 0.75, 0.91, 0.86, 0.8, 0.79, 0.86, 1, 1.13, 1.3, 1.22, 1.08, 0.9, 0.72, 0.6];
const weeklyShape = [0.92, 1, 1.04, 1.02, 1.08, 1.2, 1.12];
const monthlyShape = [0.88, 0.92, 0.96, 1, 1.02, 1.08, 1.04, 0.98, 1.06, 1.1, 1.04, 0.92];

function buildSeries(period, totalKwh, daysInMonth) {
  let labels;
  let weights;
  let total;
  if (period === "day") {
    labels = Array.from({ length: 24 }, (_, index) => (index % 3 === 0 ? String(index).padStart(2, "0") + "h" : ""));
    weights = dailyShape;
    total = totalKwh / daysInMonth;
  } else if (period === "week") {
    labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    weights = weeklyShape;
    total = totalKwh / daysInMonth * 7;
  } else {
    labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    weights = monthlyShape;
    total = totalKwh;
  }
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  return labels.map((label, index) => ({
    label,
    value: total * weights[index] / weightTotal,
  }));
}

const money = (amount, currency) =>
  amount.toLocaleString("pt-BR", { style: "currency", currency });

export default function EnergyPage() {
  const [devices, setDevices] = useState([]);
  const [tariff, setTariff] = useState(0.92);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [currency, setCurrency] = useState("BRL");
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    Promise.all([getDispositivos(), getEnergia()]).then(([deviceData, energyData]) => {
      setDevices(deviceData);
      setTariff(energyData.tarifa);
      setDaysInMonth(energyData.diasNoMes);
      setCurrency(energyData.moeda || "BRL");
    });
  }, []);

  const consumption = useMemo(
    () =>
      devices.map((device) => {
        const kwhMonth = Number(device.potenciaW) * Number(device.horasUsoDia) * daysInMonth / 1000;
        return {
          ...device,
          kwhMonth,
          costMonth: kwhMonth * tariff,
        };
      }),
    [devices, daysInMonth, tariff],
  );
  const totalKwh = consumption.reduce((sum, item) => sum + item.kwhMonth, 0);
  const currentPower = devices
    .filter((device) => device.ativo)
    .reduce((sum, device) => sum + Number(device.potenciaW), 0);
  const totalCost = totalKwh * tariff;
  const series = useMemo(
    () => buildSeries(period, totalKwh, daysInMonth),
    [period, totalKwh, daysInMonth],
  );
  const maxValue = Math.max(...series.map((item) => item.value), 0.01);

  function updateHours(deviceId, value) {
    setDevices((current) =>
      current.map((device) =>
        device.id === deviceId
          ? { ...device, horasUsoDia: Number(value) }
          : device,
      ),
    );
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="EFICIÊNCIA DA CASA"
        title="Energia"
        description="Entenda o consumo da casa e simule seus custos mensais."
      />

      <section className="energy-metrics" aria-label="Resumo de energia">
        <MetricCard label="Consumo estimado" value={totalKwh.toFixed(1).replace(".", ",") + " kWh"} note="Projeção mensal da casa" icon="ϟ" />
        <MetricCard label="Potência ligada agora" value={currentPower.toLocaleString("pt-BR") + " W"} note="Soma dos dispositivos ligados" icon="◉" />
        <MetricCard label="Custo estimado" value={money(totalCost, currency)} note={"Tarifa de " + money(tariff, currency) + " por kWh"} icon="R$" />
      </section>

      <section className="energy-chart-layout">
        <article className="energy-panel">
          <div className="energy-panel-heading energy-chart-heading">
            <div>
              <h2>Consumo ao longo do tempo</h2>
              <p>Estimativa calculada com base nos dispositivos e horas de uso.</p>
            </div>
            <div className="energy-segmented" role="tablist" aria-label="Período do gráfico">
              {[
                { id: "day", label: "Dia" },
                { id: "week", label: "Semana" },
                { id: "month", label: "Mês" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={period === item.id ? "selected" : ""}
                  type="button"
                  role="tab"
                  aria-selected={period === item.id}
                  onClick={() => setPeriod(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="energy-chart" aria-label={"Estimativa de consumo por " + period}>
            {series.map((item, index) => (
              <div className="energy-chart-item" key={index} title={item.value.toFixed(2) + " kWh"}>
                <div className="energy-chart-track">
                  <div
                    className="energy-chart-bar"
                    style={{ height: Math.max(3, item.value / maxValue * 100) + "%" }}
                  />
                </div>
                <span className="energy-chart-label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="energy-chart-legend">
            <span><i /> Consumo estimado</span>
            <strong>{totalKwh.toFixed(1).replace(".", ",")} kWh/mês</strong>
          </div>
        </article>

        <article className="energy-panel energy-calculator">
          <div className="energy-panel-heading">
            <div>
              <h2>Simulador de tarifa</h2>
              <p>Altere os valores para atualizar os cálculos.</p>
            </div>
            <span className="energy-metric-icon">⌘</span>
          </div>
          <label className="energy-field">
            Tarifa (R$/kWh)
            <input className="energy-input" type="number" min="0" step="0.01" value={tariff} onChange={(event) => setTariff(Math.max(0, Number(event.target.value)))} />
          </label>
          <label className="energy-field">
            Dias no mês
            <input className="energy-input" type="number" min="1" max="31" value={daysInMonth} onChange={(event) => setDaysInMonth(Math.min(31, Math.max(1, Number(event.target.value))))} />
          </label>
          <div className="energy-formula">
            <span>Fórmula mensal por aparelho</span>
            <strong>(W × horas/dia × dias) ÷ 1.000</strong>
            <small>O custo é o consumo em kWh multiplicado pela tarifa.</small>
          </div>
        </article>
      </section>

      <section className="energy-panel">
        <div className="energy-panel-heading">
          <div>
            <h2>Consumo por dispositivo</h2>
            <p>Ajuste as horas diárias para simular seu consumo e custo.</p>
          </div>
        </div>
        <div className="energy-table-wrap">
          <table className="energy-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Potência</th>
                <th>Horas/dia</th>
                <th>Consumo/mês</th>
                <th>Custo/mês</th>
              </tr>
            </thead>
            <tbody>
              {consumption.map((device) => (
                <tr key={device.id}>
                  <td>{device.nome}</td>
                  <td>{device.potenciaW} W</td>
                  <td>
                    <input
                      className="energy-input"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      aria-label={"Horas por dia de " + device.nome}
                      value={device.horasUsoDia}
                      onChange={(event) => updateHours(device.id, Math.min(24, Math.max(0, Number(event.target.value))))}
                    />
                  </td>
                  <td>{device.kwhMonth.toFixed(2).replace(".", ",")} kWh</td>
                  <td>{money(device.costMonth, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan="3">Total estimado</th>
                <th>{totalKwh.toFixed(2).replace(".", ",")} kWh</th>
                <th>{money(totalCost, currency)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </main>
  );
}
