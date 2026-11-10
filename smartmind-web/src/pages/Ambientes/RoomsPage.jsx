import { useEffect, useState } from "react";
import {
  FormField,
  MetricCard,
  Modal,
  PageHeading,
} from "../../components/energy/EnergyComponents.jsx";
import {
  createAmbiente,
  deleteAmbiente,
  getAmbientes,
  getDispositivos,
  updateAmbiente,
} from "../../services/energyApi.js";
import "./RoomsPage.css";

const emptyRoom = { nome: "", descricao: "" };

function RoomForm({ room, onCancel, onSubmit }) {
  const [form, setForm] = useState(room || emptyRoom);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
    };
    if (!payload.nome || !payload.descricao) {
      setError("Preencha o nome e a descrição do ambiente.");
      return;
    }
    onSubmit(payload);
  }

  return (
    <form onSubmit={submit}>
      <div className="energy-form-grid">
        <FormField label="Nome do ambiente" htmlFor="room-name" className="full">
          <input
            className="energy-input"
            id="room-name"
            value={form.nome}
            onChange={(event) => setForm({ ...form, nome: event.target.value })}
            placeholder="Ex.: Sala de estar"
            required
          />
        </FormField>
        <FormField label="Descrição" htmlFor="room-description" className="full">
          <textarea
            className="energy-textarea"
            id="room-description"
            value={form.descricao}
            onChange={(event) => setForm({ ...form, descricao: event.target.value })}
            placeholder="Como esse ambiente é usado?"
            required
          />
        </FormField>
      </div>
      {error && <p className="energy-form-error" role="alert">{error}</p>}
      <div className="energy-form-actions">
        <button className="energy-button-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="energy-button" type="submit">Salvar ambiente</button>
      </div>
    </form>
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([getAmbientes(), getDispositivos()]).then(([roomData, deviceData]) => {
      setRooms(roomData);
      setDevices(deviceData);
    });
  }, []);

  async function saveRoom(payload) {
    if (editingRoom?.id) {
      const saved = await updateAmbiente(editingRoom.id, payload);
      setRooms((current) => current.map((room) => room.id === saved.id ? saved : room));
      setNotice("Ambiente atualizado.");
    } else {
      const saved = await createAmbiente(payload);
      setRooms((current) => [...current, saved]);
      setNotice("Ambiente criado.");
    }
    setEditingRoom(null);
  }

  async function removeRoom(room) {
    const linkedCount = devices.filter((device) => device.ambienteId === room.id).length;
    if (linkedCount) {
      setNotice("Mova os dispositivos vinculados antes de remover este ambiente.");
      return;
    }
    if (!window.confirm("Remover o ambiente " + room.nome + "?")) return;
    await deleteAmbiente(room.id);
    setRooms((current) => current.filter((item) => item.id !== room.id));
    setNotice("Ambiente removido.");
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="ORGANIZAÇÃO DA CASA"
        title="Ambientes"
        description="Organize seus dispositivos por cômodo."
        action={
          <button className="energy-button" type="button" onClick={() => setEditingRoom({ ...emptyRoom })}>
            <span aria-hidden="true">+</span> Novo ambiente
          </button>
        }
      />

      <section className="energy-metrics" aria-label="Resumo dos ambientes">
        <MetricCard label="Ambientes cadastrados" value={String(rooms.length).padStart(2, "0")} note="Cômodos organizados" icon="▦" />
        <MetricCard label="Dispositivos vinculados" value={String(devices.length).padStart(2, "0")} note="Distribuídos pela casa" icon="◉" />
        <MetricCard label="Ambientes ativos" value={String(rooms.filter((room) => devices.some((device) => device.ambienteId === room.id && device.ativo)).length).padStart(2, "0")} note="Com ao menos um aparelho ligado" icon="⌂" />
      </section>

      {notice && <div className="energy-feedback" role="status">{notice}</div>}

      {rooms.length ? (
        <section className="energy-room-grid" aria-label="Ambientes cadastrados">
          {rooms.map((room, index) => {
            const linkedDevices = devices.filter((device) => device.ambienteId === room.id);
            return (
              <article className="energy-room-card" key={room.id}>
                <div className="energy-room-icon" aria-hidden="true">{["⌂", "▤", "☾", "▣"][index % 4]}</div>
                <h3>{room.nome}</h3>
                <p>{room.descricao}</p>
                <div className="energy-room-meta">
                  <span>{linkedDevices.length} {linkedDevices.length === 1 ? "dispositivo" : "dispositivos"}</span>
                  <div className="energy-inline-actions">
                    <button className="energy-small-action" type="button" aria-label={"Editar " + room.nome} onClick={() => setEditingRoom(room)}>✎</button>
                    <button className="energy-small-action danger" type="button" aria-label={"Remover " + room.nome} onClick={() => removeRoom(room)}>×</button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="energy-empty">Nenhum ambiente cadastrado.</div>
      )}

      {editingRoom && (
        <Modal
          title={editingRoom.id ? "Editar ambiente" : "Novo ambiente"}
          description="Cadastre um espaço da sua casa."
          onClose={() => setEditingRoom(null)}
        >
          <RoomForm
            room={editingRoom.id ? editingRoom : null}
            onCancel={() => setEditingRoom(null)}
            onSubmit={saveRoom}
          />
        </Modal>
      )}
    </main>
  );
}
