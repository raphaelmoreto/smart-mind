import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { FormField, MetricCard, Modal, PageHeading } from "../../components/energy/EnergyComponents.jsx";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { dispositivoService } from "../../services/dispositivo-service.js";
import "./DevicesPage.css";

const TAMANHO_MAXIMO_FOTO = 1.5 * 1024 * 1024; // 1,5 MB

const emptyForm = {
  nome: "",
  foto: "",
  fk_tipoDispositivo: "",
  potenciaW: "",
  horasUsoDia: "4",
  ativo: false,
};

// API -> TELA
function daApi(d) {
  return {
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    fk_tipoDispositivo: d.fk_tipoDispositivo,
    potenciaW: Number(d.potencia_watts ?? 0),
    horasUsoDia: Number(d.horas_uso_dia ?? 0),
    ativo: Boolean(d.ligado),
    foto: d.foto_url ?? "",
  };
}

// TELA -> API
function paraApi(form, casaId) {
  return {
    nome: form.nome.trim(),
    fk_tipoDispositivo: Number(form.fk_tipoDispositivo),
    fk_casa: casaId,
    potencia_watts: Number(form.potenciaW),
    horas_uso_dia: Number(form.horasUsoDia),
    ligado: Boolean(form.ativo),
    foto_url: form.foto?.trim() || undefined,
  };
}

const kwhMes = (device) => (device.potenciaW * device.horasUsoDia * 30) / 1000;

function DeviceForm({ device, tipos, salvando, erroApi, onCancel, onSubmit }) {
  const [form, setForm] = useState(
    device
      ? {
          ...device,
          fk_tipoDispositivo: String(device.fk_tipoDispositivo),
          potenciaW: String(device.potenciaW),
          horasUsoDia: String(device.horasUsoDia),
        }
      : emptyForm
  );
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > TAMANHO_MAXIMO_FOTO) {
      setError("A foto deve ter no máximo 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, foto: reader.result }));
    reader.readAsDataURL(file);
  }

  function submit(event) {
    event.preventDefault();
    const horas = Number(form.horasUsoDia);
    if (!form.nome.trim() || !form.fk_tipoDispositivo || Number(form.potenciaW) <= 0) {
      setError("Preencha nome, tipo e uma potência válida.");
      return;
    }
    if (!Number.isFinite(horas) || horas < 0 || horas > 24) {
      setError("As horas de uso por dia devem estar entre 0 e 24.");
      return;
    }
    setError("");
    onSubmit(form);
  }

  return (
    <form onSubmit={submit}>
      <div className="energy-form-grid">
        <FormField label="Nome do dispositivo" htmlFor="device-name">
          <input className="energy-input" id="device-name" name="nome" value={form.nome} onChange={updateField} placeholder="Ex.: Ar-condicionado do quarto" required />
        </FormField>

        <FormField label="Tipo" htmlFor="device-type">
          <select className="energy-select" id="device-type" name="fk_tipoDispositivo" value={form.fk_tipoDispositivo} onChange={updateField} required>
            <option value="">Selecione o tipo</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>{tipo.tipo}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Potência (W)" htmlFor="device-power">
          <input className="energy-input" id="device-power" name="potenciaW" type="number" min="1" step="0.1" value={form.potenciaW} onChange={updateField} placeholder="Ex.: 1200" required />
        </FormField>

        <FormField label="Uso por dia (horas)" htmlFor="device-hours">
          <input className="energy-input" id="device-hours" name="horasUsoDia" type="number" min="0" max="24" step="0.25" value={form.horasUsoDia} onChange={updateField} required />
        </FormField>

        <FormField label="Foto por URL" htmlFor="device-photo">
          <input
            className="energy-input"
            id="device-photo"
            name="foto"
            type="url"
            value={form.foto.startsWith("data:") ? "" : form.foto}
            onChange={updateField}
            placeholder="https://..."
          />
        </FormField>

        <FormField label="Ou envie uma foto" htmlFor="device-upload">
          <input className="energy-input" id="device-upload" type="file" accept="image/*" onChange={uploadPhoto} />
        </FormField>

        <label className="energy-checkbox-field">
          <input type="checkbox" name="ativo" checked={Boolean(form.ativo)} onChange={updateField} />
          Dispositivo ligado
        </label>
      </div>

      {(error || erroApi) && <p className="energy-form-error" role="alert">{error || erroApi}</p>}

      <div className="energy-form-actions">
        <button className="energy-button-secondary" type="button" onClick={onCancel} disabled={salvando}>Cancelar</button>
        <button className="energy-button" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar dispositivo"}
        </button>
      </div>
    </form>
  );
}

export default function DevicesPage() {
  const { casaAtual, carregando: carregandoCasa } = useCasaAtual();
  const casaId = casaAtual?.id;

  const [devices, setDevices] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [modalDevice, setModalDevice] = useState(null);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const carregar = useCallback(async () => {
    if (!casaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [lista, listaTipos] = await Promise.all([
        dispositivoService.listarPorCasa(casaId),
        dispositivoService.buscarTipos(),
      ]);
      setDevices((lista ?? []).map(daApi));
      setTipos(listaTipos ?? []);
    } catch (e) {
      setError(e.message || "Não foi possível carregar os dispositivos.");
    } finally {
      setLoading(false);
    }
  }, [casaId]);

  useEffect(() => {
    if (!carregandoCasa) carregar();
  }, [carregandoCasa, carregar]);

  // A MENSAGEM DE SUCESSO SOME SOZINHA DEPOIS DE 4 SEGUNDOS
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeDevices = devices.filter((device) => device.ativo);
  const currentPower = activeDevices.reduce((sum, device) => sum + device.potenciaW, 0);
  const consumoMensal = devices.reduce((sum, device) => sum + kwhMes(device), 0);

  async function saveDevice(form) {
    setSalvando(true);
    setError("");
    try {
      const payload = paraApi(form, casaId);
      if (modalDevice?.id) {
        await dispositivoService.atualizar(modalDevice.id, payload);
        setNotice("As alterações do dispositivo foram salvas.");
      } else {
        await dispositivoService.criar(payload);
        setNotice("Dispositivo adicionado com sucesso.");
      }
      setModalDevice(null);
      await carregar();
    } catch (e) {
      setError(e.message || "Não foi possível salvar o dispositivo.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmRemoveDevice() {
    if (!deviceToDelete) return;
    try {
      await dispositivoService.remover(deviceToDelete.id);
      setDevices((current) => current.filter((item) => item.id !== deviceToDelete.id));
      setNotice("Dispositivo removido.");
    } catch (e) {
      setError(e.message || "Não foi possível remover o dispositivo.");
    } finally {
      setDeviceToDelete(null);
    }
  }

  // ATUALIZAÇÃO OTIMISTA: MUDA NA TELA NA HORA E VOLTA SE A API FALHAR
  async function toggleDevice(device) {
    const novoEstado = !device.ativo;
    setDevices((current) => current.map((item) => (item.id === device.id ? { ...item, ativo: novoEstado } : item)));
    try {
      await dispositivoService.alterarEstado(device.id, novoEstado);
    } catch (e) {
      setDevices((current) => current.map((item) => (item.id === device.id ? { ...item, ativo: device.ativo } : item)));
      setError(e.message || "Não foi possível alterar o estado do dispositivo.");
    }
  }

  if (!carregandoCasa && !casaAtual) {
    return (
      <main className="energy-page">
        <PageHeading eyebrow="GERENCIAMENTO DA CASA" title="Dispositivos" description="Acompanhe a potência e o estado dos aparelhos da sua casa." />
        <div className="energy-empty">
          Você ainda não tem uma casa cadastrada. <Link to="/configuracoes">Cadastre em Configurações</Link> para adicionar dispositivos.
        </div>
      </main>
    );
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="GERENCIAMENTO DA CASA"
        title="Dispositivos"
        description={`Aparelhos de ${casaAtual?.nome ?? "sua casa"}.`}
        action={
          <button className="energy-button" type="button" onClick={() => { setError(""); setModalDevice({ ...emptyForm }); }}>
            <span aria-hidden="true">+</span> Adicionar dispositivo
          </button>
        }
      />

      <section className="energy-metrics" aria-label="Resumo dos dispositivos">
        <MetricCard label="Consumo ligado agora" value={currentPower.toLocaleString("pt-BR") + " W"} note="Potência dos aparelhos ligados" icon="ϟ" />
        <MetricCard label="Estimativa mensal" value={consumoMensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " kWh"} note="Potência × horas de uso × 30 dias" icon="▦" />
        <MetricCard label="Dispositivos ligados" value={`${String(activeDevices.length).padStart(2, "0")} / ${String(devices.length).padStart(2, "0")}`} note="Ligue ou desligue pelos cards" icon="◉" />
      </section>

      {notice && <div className="energy-feedback" role="status">{notice}</div>}
      {error && !modalDevice && <div className="energy-form-error" role="alert">{error}</div>}

      {loading || carregandoCasa ? (
        <div className="energy-empty">Carregando dispositivos…</div>
      ) : devices.length ? (
        <section className="energy-device-grid" aria-label="Lista de dispositivos">
          {devices.map((device) => (
            <article className="energy-device-card" key={device.id}>
              <div className="energy-device-photo">
                <span className="energy-device-image-fallback" aria-hidden="true">⌂</span>
                {device.foto && (
                  <img
                    src={device.foto}
                    alt={device.nome}
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                )}
                <span className="energy-device-status">
                  <i className={device.ativo ? "sm-live-dot" : ""} />
                  {device.ativo ? "Ligado" : "Desligado"}
                </span>
              </div>
              <div className="energy-device-card-body">
                <div className="energy-device-title">
                  <div>
                    <h3>{device.nome}</h3>
                    <p>{device.tipo}</p>
                  </div>
                  <strong className="energy-device-power">{device.potenciaW} W</strong>
                </div>
                <div className="energy-device-footer">
                  <span>≈ {kwhMes(device).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh/mês</span>
                  <div className="energy-inline-actions">
                    <button
                      className="energy-small-action"
                      type="button"
                      role="switch"
                      aria-checked={device.ativo}
                      aria-label={(device.ativo ? "Desligar " : "Ligar ") + device.nome}
                      onClick={() => toggleDevice(device)}
                    >
                      {device.ativo ? "●" : "○"}
                    </button>
                    <button className="energy-small-action" type="button" aria-label={"Editar " + device.nome} onClick={() => { setError(""); setModalDevice(device); }}>✎</button>
                    <button className="energy-small-action danger" type="button" aria-label={"Remover " + device.nome} onClick={() => setDeviceToDelete(device)}>×</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="energy-empty">Nenhum dispositivo cadastrado. Adicione o primeiro para começar.</div>
      )}

      {modalDevice && (
        <Modal
          title={modalDevice.id ? "Editar dispositivo" : "Novo dispositivo"}
          description="Potência e horas de uso são usadas para estimar o consumo e responder ao assistente."
          onClose={() => setModalDevice(null)}
        >
          <DeviceForm
            device={modalDevice.id ? modalDevice : null}
            tipos={tipos}
            salvando={salvando}
            erroApi={error}
            onCancel={() => setModalDevice(null)}
            onSubmit={saveDevice}
          />
        </Modal>
      )}

      {deviceToDelete && (
        <Modal
          title="Excluir dispositivo?"
          description={`Tem certeza que deseja remover ${deviceToDelete.nome} da sua casa?`}
          onClose={() => setDeviceToDelete(null)}
          role="alertdialog"
        >
          <div className="energy-form-actions">
            <button className="energy-button-secondary" type="button" onClick={() => setDeviceToDelete(null)}>Cancelar</button>
            <button className="energy-button-secondary danger" type="button" onClick={confirmRemoveDevice}>Excluir dispositivo</button>
          </div>
        </Modal>
      )}
    </main>
  );
}