import { useEffect, useState } from "react";
import {
  MetricCard,
  FormField,
  Modal,
  PageHeading,
} from "../../components/energy/EnergyComponents.jsx";
import {
  createDispositivo,
  deleteDispositivo,
  getAmbientes,
  getDispositivos,
  updateDispositivo,
} from "../../services/energyApi.js";
import { getDeviceType } from "../../components/energy/devicePresentation.js";
import "./DevicesPage.css";

const emptyForm = {
  nome: "",
  foto: "",
  ambienteId: "",
  potenciaW: "",
  ativo: true,
};

function DeviceForm({ device, rooms, onCancel, onSubmit }) {
  const [form, setForm] = useState(device || emptyForm);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, foto: reader.result }));
    reader.readAsDataURL(file);
  }

  function submit(event) {
    event.preventDefault();
    if (!form.nome.trim() || !form.ambienteId || Number(form.potenciaW) <= 0) {
      setError("Preencha nome, ambiente e uma potência válida.");
      return;
    }
    onSubmit({
      nome: form.nome.trim(),
      foto: form.foto.trim(),
      ambienteId: form.ambienteId,
      potenciaW: Number(form.potenciaW),
      ativo: Boolean(form.ativo),
      horasUsoDia: Number(form.horasUsoDia || device?.horasUsoDia || 4),
      tipo: device?.tipo || getDeviceType(form.nome),
      detalhe: device?.detalhe || (form.ativo ? "Ligado" : "Desligado"),
      intensidade: Number(device?.intensidade ?? (form.ativo ? 65 : 0)),
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="energy-form-grid">
        <FormField label="Nome do dispositivo" htmlFor="device-name">
          <input
            className="energy-input"
            id="device-name"
            name="nome"
            value={form.nome}
            onChange={updateField}
            placeholder="Ex.: Ar-condicionado"
            required
          />
        </FormField>
        <FormField label="Ambiente" htmlFor="device-room">
          <select
            className="energy-select"
            id="device-room"
            name="ambienteId"
            value={form.ambienteId}
            onChange={updateField}
            required
          >
            <option value="">Selecione um ambiente</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.nome}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Potência (W)" htmlFor="device-power">
          <input
            className="energy-input"
            id="device-power"
            name="potenciaW"
            type="number"
            min="1"
            value={form.potenciaW}
            onChange={updateField}
            placeholder="Ex.: 1200"
            required
          />
        </FormField>
        <FormField label="Foto por URL" htmlFor="device-photo">
          <input
            className="energy-input"
            id="device-photo"
            name="foto"
            type="url"
            value={form.foto}
            onChange={updateField}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Enviar foto" htmlFor="device-upload" className="full">
          <input
            className="energy-input"
            id="device-upload"
            type="file"
            accept="image/*"
            onChange={uploadPhoto}
          />
        </FormField>
        <label className="energy-checkbox-field">
          <input
            type="checkbox"
            name="ativo"
            checked={Boolean(form.ativo)}
            onChange={updateField}
          />
          Dispositivo ligado
        </label>
      </div>
      {error && <p className="energy-form-error" role="alert">{error}</p>}
      <div className="energy-form-actions">
        <button className="energy-button-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="energy-button" type="submit">
          Salvar dispositivo
        </button>
      </div>
    </form>
  );
}

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [modalDevice, setModalDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([getDispositivos(), getAmbientes()]).then(([deviceData, roomData]) => {
      setDevices(deviceData);
      setRooms(roomData);
      setLoading(false);
    });
  }, []);

  const activeDevices = devices.filter((device) => device.ativo);
  const currentPower = activeDevices.reduce((sum, device) => sum + Number(device.potenciaW), 0);
  const roomName = (roomId) => rooms.find((room) => room.id === roomId)?.nome || "Sem ambiente";

  async function saveDevice(payload) {
    if (modalDevice?.id) {
      const saved = await updateDispositivo(modalDevice.id, payload);
      setDevices((current) => current.map((device) => device.id === saved.id ? saved : device));
      setNotice("As alterações do dispositivo foram salvas.");
    } else {
      const saved = await createDispositivo(payload);
      setDevices((current) => [...current, saved]);
      setNotice("Dispositivo adicionado com sucesso.");
    }
    setModalDevice(null);
  }

  async function removeDevice(device) {
    if (!window.confirm("Remover " + device.nome + " da sua casa?")) return;
    await deleteDispositivo(device.id);
    setDevices((current) => current.filter((item) => item.id !== device.id));
    setNotice("Dispositivo removido.");
  }

  async function toggleDevice(device) {
    const payload = { ...device, ativo: !device.ativo };
    await updateDispositivo(device.id, payload);
    setDevices((current) => current.map((item) => item.id === device.id ? payload : item));
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="GERENCIAMENTO DA CASA"
        title="Dispositivos"
        description="Acompanhe a potência e o estado dos aparelhos da sua casa."
        action={
          <button
            className="energy-button"
            type="button"
            onClick={() => setModalDevice({ ...emptyForm })}
          >
            <span aria-hidden="true">+</span> Adicionar dispositivo
          </button>
        }
      />

      <section className="energy-metrics" aria-label="Resumo dos dispositivos">
        <MetricCard label="Consumo ligado agora" value={currentPower.toLocaleString("pt-BR") + " W"} note="Potência nominal dos aparelhos ligados" icon="ϟ" />
        <MetricCard label="Total de dispositivos" value={String(devices.length).padStart(2, "0")} note="Cadastrados na sua casa" icon="▦" />
        <MetricCard label="Dispositivos ligados" value={String(activeDevices.length).padStart(2, "0")} note="Podem ser ligados ou desligados aqui" icon="◉" />
      </section>

      {notice && <div className="energy-feedback" role="status">{notice}</div>}

      {loading ? (
        <div className="energy-empty">Carregando dispositivos…</div>
      ) : devices.length ? (
        <section className="energy-device-grid" aria-label="Lista de dispositivos">
          {devices.map((device) => (
            <article className="energy-device-card" key={device.id}>
              <div className="energy-device-photo">
                <span className="energy-device-image-fallback" aria-hidden="true">⌂</span>
                {device.foto && (<img
                    src={device.foto}
                    alt={device.nome}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />)}
                <span className="energy-device-status">
                  <i className={device.ativo ? "sm-live-dot" : ""} />
                  {device.ativo ? "Ligado" : "Desligado"}
                </span>
              </div>
              <div className="energy-device-card-body">
                <div className="energy-device-title">
                  <div>
                    <h3>{device.nome}</h3>
                    <p>{roomName(device.ambienteId)}</p>
                  </div>
                  <strong className="energy-device-power">{device.potenciaW} W</strong>
                </div>
                <div className="energy-device-footer">
                  <span>{device.ativo ? "Consumo atual" : "Em espera"}</span>
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
                    <button className="energy-small-action" type="button" aria-label={"Editar " + device.nome} onClick={() => setModalDevice(device)}>✎</button>
                    <button className="energy-small-action danger" type="button" aria-label={"Remover " + device.nome} onClick={() => removeDevice(device)}>×</button>
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
          description="Os dados serão enviados no formato esperado pela API."
          onClose={() => setModalDevice(null)}
        >
          <DeviceForm
            device={modalDevice.id ? modalDevice : null}
            rooms={rooms}
            onCancel={() => setModalDevice(null)}
            onSubmit={saveDevice}
          />
        </Modal>
      )}
    </main>
  );
}
