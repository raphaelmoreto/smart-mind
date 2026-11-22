import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FormField, MetricCard, Modal, PageHeading } from "../../components/ui/index.js";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { ambienteService } from "../../services/ambienteService.js";
import "./RoomsPage.css";

const ICONES = ["⌂", "▤", "☾", "▣"];
const emptyRoom = { nome: "", descricao: "" };

// "SALA DE ESTAR" -> "Sala de estar"
const formatarNome = (nome = "") =>
  nome.charAt(0).toLocaleUpperCase("pt-BR") + nome.slice(1).toLocaleLowerCase("pt-BR");

function RoomForm({ room, salvando, erroApi, onCancel, onSubmit }) {
  const [form, setForm] = useState(
    room ? { nome: formatarNome(room.nome), descricao: room.descricao ?? "" } : emptyRoom
  );
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const payload = { nome: form.nome.trim(), descricao: form.descricao.trim() };
    if (!payload.nome) {
      setError("Informe o nome do ambiente.");
      return;
    }
    setError("");
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
            maxLength={100}
            required
          />
        </FormField>
        <FormField label="Descrição (opcional)" htmlFor="room-description" className="full">
          <textarea
            className="energy-textarea"
            id="room-description"
            value={form.descricao}
            onChange={(event) => setForm({ ...form, descricao: event.target.value })}
            placeholder="Como esse ambiente é usado?"
            maxLength={255}
          />
        </FormField>
      </div>
      {(error || erroApi) && <p className="energy-form-error" role="alert">{error || erroApi}</p>}
      <div className="energy-form-actions">
        <button className="energy-button-secondary" type="button" onClick={onCancel} disabled={salvando}>
          Cancelar
        </button>
        <button className="energy-button" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar ambiente"}
        </button>
      </div>
    </form>
  );
}

export default function RoomsPage() {
  const { casaAtual, carregando: carregandoCasa, erro: erroCasa } = useCasaAtual();
  const casaId = casaAtual?.id;

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [versao, setVersao] = useState(0);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // ---------- CARREGA OS AMBIENTES DA CASA ----------
  useEffect(() => {
    if (carregandoCasa || !casaId) return;
    let ignorar = false;

    ambienteService
      .listarPorCasa(casaId)
      .then((lista) => {
        if (ignorar) return;
        setRooms(lista ?? []);
        setError("");
      })
      .catch((e) => {
        if (!ignorar) setError(e.message || "Não foi possível carregar os ambientes.");
      })
      .finally(() => {
        if (!ignorar) setLoading(false);
      });

    return () => {
      ignorar = true;
    };
  }, [carregandoCasa, casaId, versao]);

  // A MENSAGEM DE SUCESSO SOME SOZINHA
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function recarregar() {
    setLoading(true);
    setVersao((v) => v + 1);
  }

  const totalDispositivos = rooms.reduce((soma, room) => soma + room.total_dispositivos, 0);
  const ambientesAtivos = rooms.filter((room) => room.dispositivos_ligados > 0).length;

  async function saveRoom(payload) {
    setSalvando(true);
    setError("");
    try {
      const dados = { ...payload, fk_casa: casaId };
      if (editingRoom?.id) {
        await ambienteService.atualizar(editingRoom.id, dados);
        setNotice("Ambiente atualizado.");
      } else {
        await ambienteService.criar(dados);
        setNotice("Ambiente criado.");
      }
      setEditingRoom(null);
      recarregar();
    } catch (e) {
      setError(e.message || "Não foi possível salvar o ambiente.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmRemoveRoom() {
    if (!roomToDelete) return;
    try {
      await ambienteService.remover(roomToDelete.id);
      setRooms((atual) => atual.filter((item) => item.id !== roomToDelete.id));
      setNotice("Ambiente removido.");
    } catch (e) {
      // A API RECUSA SE AINDA HOUVER DISPOSITIVOS NO AMBIENTE
      setError(e.message || "Não foi possível remover o ambiente.");
    } finally {
      setRoomToDelete(null);
    }
  }

  if (!carregandoCasa && !casaAtual) {
    return (
      <main className="energy-page">
        <PageHeading eyebrow="ORGANIZAÇÃO DA CASA" title="Ambientes" description="Organize seus dispositivos por cômodo." />
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
        eyebrow="ORGANIZAÇÃO DA CASA"
        title="Ambientes"
        description="Organize seus dispositivos por cômodo."
        action={
          <button
            className="energy-button"
            type="button"
            onClick={() => {
              setError("");
              setEditingRoom({ ...emptyRoom });
            }}
          >
            <span aria-hidden="true">+</span> Novo ambiente
          </button>
        }
      />

      <section className="energy-metrics" aria-label="Resumo dos ambientes">
        <MetricCard label="Ambientes cadastrados" value={String(rooms.length).padStart(2, "0")} note="Cômodos organizados" icon="▦" />
        <MetricCard label="Dispositivos vinculados" value={String(totalDispositivos).padStart(2, "0")} note="Distribuídos pela casa" icon="◉" />
        <MetricCard label="Ambientes ativos" value={String(ambientesAtivos).padStart(2, "0")} note="Com ao menos um aparelho ligado" icon="⌂" />
      </section>

      {notice && <div className="energy-feedback" role="status">{notice}</div>}
      {error && !editingRoom && <div className="energy-form-error" role="alert">{error}</div>}

      {loading || carregandoCasa ? (
        <div className="energy-empty">Carregando ambientes…</div>
      ) : rooms.length ? (
        <section className="energy-room-grid" aria-label="Ambientes cadastrados">
          {rooms.map((room, index) => (
            <article className="energy-room-card" key={room.id}>
              <div className="energy-room-icon" aria-hidden="true">{ICONES[index % ICONES.length]}</div>
              <h3>{formatarNome(room.nome)}</h3>
              <p>{room.descricao || "Sem descrição"}</p>

              {room.dispositivos_ligados > 0 && (
                <span className="energy-room-live">
                  <i className="sm-live-dot" /> {room.dispositivos_ligados} ligado(s) ·{" "}
                  {room.potencia_ligada_watts.toLocaleString("pt-BR")} W
                </span>
              )}

              <div className="energy-room-meta">
                <span>
                  {room.total_dispositivos} {room.total_dispositivos === 1 ? "dispositivo" : "dispositivos"}
                </span>
                <div className="energy-inline-actions">
                  <button
                    className="energy-small-action"
                    type="button"
                    aria-label={"Editar " + room.nome}
                    onClick={() => {
                      setError("");
                      setEditingRoom(room);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="energy-small-action danger"
                    type="button"
                    aria-label={"Remover " + room.nome}
                    onClick={() => setRoomToDelete(room)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="energy-empty">Nenhum ambiente cadastrado. Crie o primeiro para organizar seus dispositivos.</div>
      )}

      {editingRoom && (
        <Modal
          title={editingRoom.id ? "Editar ambiente" : "Novo ambiente"}
          description="Cadastre um espaço da sua casa."
          onClose={() => setEditingRoom(null)}
        >
          <RoomForm
            room={editingRoom.id ? editingRoom : null}
            salvando={salvando}
            erroApi={error}
            onCancel={() => setEditingRoom(null)}
            onSubmit={saveRoom}
          />
        </Modal>
      )}

      {roomToDelete && (
        <Modal
          title="Remover ambiente?"
          description={`Tem certeza que deseja remover ${formatarNome(roomToDelete.nome)}?`}
          onClose={() => setRoomToDelete(null)}
          role="alertdialog"
        >
          {roomToDelete.total_dispositivos > 0 && (
            <p className="energy-form-error">
              Este ambiente tem {roomToDelete.total_dispositivos} dispositivo(s). Mova-os para outro ambiente na
              página Dispositivos antes de remover.
            </p>
          )}
          <div className="energy-form-actions">
            <button className="energy-button-secondary" type="button" onClick={() => setRoomToDelete(null)}>
              Cancelar
            </button>
            <button
              className="energy-button-secondary danger"
              type="button"
              onClick={confirmRemoveRoom}
              disabled={roomToDelete.total_dispositivos > 0}
            >
              Remover ambiente
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}