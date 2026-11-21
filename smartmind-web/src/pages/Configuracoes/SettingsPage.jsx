import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { FormField, Modal, PageHeading, Toggle } from "../../components/energy/EnergyComponents.jsx";
import { useLocalStorageState } from "../../components/energy/useEnergyStorage.js";
import { useEnergyTheme } from "../../components/energy/EnergyTheme.js";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { authService } from "../../services/authService.js";
import { casaService } from "../../services/casaService.js";
import { usuarioService } from "../../services/usuarioService.js";
import "./SettingsPage.css";

const casaVazia = { nome: "", rua: "", numero: "", bairro: "", cidade: "", cep: "" };
const senhasVazias = { atual: "", nova: "", confirmacao: "" };

const formatarCep = (valor) =>
  valor.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useEnergyTheme();
  const { usuario, casaAtual, recarregar } = useCasaAtual();
  const usuarioId = usuario?.id;

  const [perfil, setPerfil] = useState({ nome: "", usuario: "", email: "" });
  const [senhas, setSenhas] = useState(senhasVazias);
  const [casa, setCasa] = useState(casaVazia);
  const [casaOrigem, setCasaOrigem] = useState(null);
  const [tarifa, setTarifa] = useState({ valor_kwh: "", bandeira: "VERDE" });
  const [tarifaOriginal, setTarifaOriginal] = useState(null);
  const [preferencias, setPreferencias] = useLocalStorageState("smartmind-preferencias", {
    idioma: "pt-BR",
    alertaConsumoAlto: true,
  });

  const [mensagem, setMensagem] = useState(null); // { tipo: "ok" | "erro", texto }
  const [salvando, setSalvando] = useState("");   // "perfil" | "senha" | "casa"
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  if (casaAtual && casaAtual !== casaOrigem) {
    setCasaOrigem(casaAtual);
    setCasa({
      nome: casaAtual.nome ?? "",
      rua: casaAtual.rua ?? "",
      numero: casaAtual.numero ?? "",
      bairro: casaAtual.bairro ?? "",
      cidade: casaAtual.cidade ?? "",
      cep: casaAtual.cep?.trim() ?? "",
    });
  }

  // ---------- CARREGA PERFIL ----------
  useEffect(() => {
    if (!usuarioId) return;
    usuarioService
      .buscarPorId(usuarioId)
      .then((dados) => {
        if (dados) setPerfil({ nome: dados.nome ?? "", usuario: dados.usuario ?? "", email: dados.email ?? "" });
      })
      .catch((error) => setMensagem({ tipo: "erro", texto: error.message }));
  }, [usuarioId]);

  // ---------- CARREGA CASA + TARIFA ----------
  useEffect(() => {
    if (!casaAtual) return;
    let ignorar = false;

    casaService
      .buscarTarifa(casaAtual.id)
      .then((dados) => {
        if (ignorar || !dados) return;
        const valor = { valor_kwh: String(dados.valor_kwh), bandeira: dados.bandeira };
        setTarifa(valor);
        setTarifaOriginal(valor);
      })
      .catch(() => {});

    return () => { ignorar = true; };
  }, [casaAtual]);

  // EXECUTA UMA AÇÃO MOSTRANDO "SALVANDO..." E A MENSAGEM DE RESULTADO
  async function executar(secao, acao, textoSucesso) {
    setSalvando(secao);
    setMensagem(null);
    try {
      await acao();
      setMensagem({ tipo: "ok", texto: textoSucesso });
    } catch (error) {
      setMensagem({ tipo: "erro", texto: error.message || "Não foi possível salvar." });
    } finally {
      setSalvando("");
    }
  }

  function salvarPerfil(event) {
    event.preventDefault();
    executar(
      "perfil",
      async () => {
        const dados = { nome: perfil.nome.trim(), usuario: perfil.usuario.trim(), email: perfil.email.trim() };
        await usuarioService.atualizarPerfil(usuarioId, dados);
        // ATUALIZA O NOME QUE APARECE NO MENU LATERAL
        authService.saveSession({ ...usuario, nome: dados.nome.toUpperCase() });
      },
      "Perfil atualizado com sucesso."
    );
  }

  function alterarSenha(event) {
    event.preventDefault();
    if (senhas.nova.length < 6) {
      setMensagem({ tipo: "erro", texto: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (senhas.nova !== senhas.confirmacao) {
      setMensagem({ tipo: "erro", texto: "A nova senha e a confirmação não são iguais." });
      return;
    }
    executar(
      "senha",
      async () => {
        await usuarioService.alterarSenha(usuarioId, { senhaAtual: senhas.atual, senhaNova: senhas.nova });
        setSenhas(senhasVazias);
      },
      "Senha alterada com sucesso."
    );
  }

  function salvarCasa(event) {
    event.preventDefault();
    if (!/^\d{5}-\d{3}$/.test(casa.cep)) {
      setMensagem({ tipo: "erro", texto: "Informe um CEP válido (00000-000)." });
      return;
    }

    executar(
      "casa",
      async () => {
        const dados = { ...casa, fk_usuario: usuarioId };
        let casaId = casaAtual?.id;

        if (casaId) {
          await casaService.atualizar(casaId, dados);
        } else {
          await casaService.cadastrar(dados);
          const lista = await casaService.buscarPorUsuario(usuarioId);
          casaId = lista?.[lista.length - 1]?.id;
        }

        const tarifaMudou =
          !tarifaOriginal ||
          Number(tarifaOriginal.valor_kwh) !== Number(tarifa.valor_kwh) ||
          tarifaOriginal.bandeira !== tarifa.bandeira;

        if (casaId && Number(tarifa.valor_kwh) > 0 && tarifaMudou) {
          await casaService.salvarTarifa(casaId, {
            valor_kwh: Number(tarifa.valor_kwh),
            bandeira: tarifa.bandeira,
          });
        }

        await recarregar();
      },
      "Dados da casa salvos com sucesso."
    );
  }

  async function excluirConta() {
    try {
      await usuarioService.deletar(usuarioId);
      authService.logout();
      sessionStorage.removeItem("casaAtualId");
      navigate("/");
    } catch (error) {
      setConfirmarExclusao(false);
      setMensagem({ tipo: "erro", texto: error.message || "Não foi possível excluir a conta." });
    }
  }

  const atualizarCampo = (setter) => (event) =>
    setter((atual) => ({ ...atual, [event.target.name]: event.target.value }));

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="PREFERÊNCIAS"
        title="Configurações"
        description="Gerencie seu perfil, a segurança da conta, os dados da casa e suas preferências."
      />

      {mensagem && (
        <div
          className={mensagem.tipo === "erro" ? "energy-form-error" : "energy-feedback"}
          role={mensagem.tipo === "erro" ? "alert" : "status"}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="energy-setting-layout">
        {/* ================= PERFIL ================= */}
        <form className="energy-panel energy-setting-card" onSubmit={salvarPerfil}>
          <div className="energy-panel-heading">
            <div>
              <h2>Perfil</h2>
              <p>Seus dados de identificação.</p>
            </div>
            <span className="energy-metric-icon">◎</span>
          </div>
          <div className="energy-form-grid">
            <FormField label="Nome completo" htmlFor="profile-name" className="full">
              <input className="energy-input" id="profile-name" name="nome" value={perfil.nome} onChange={atualizarCampo(setPerfil)} required />
            </FormField>
            <FormField label="Usuário" htmlFor="profile-user">
              <input className="energy-input" id="profile-user" name="usuario" autoComplete="username" value={perfil.usuario} onChange={atualizarCampo(setPerfil)} required />
            </FormField>
            <FormField label="E-mail" htmlFor="profile-email">
              <input className="energy-input" id="profile-email" name="email" type="email" value={perfil.email} onChange={atualizarCampo(setPerfil)} required />
            </FormField>
          </div>
          <div className="energy-form-actions">
            <button className="energy-button" type="submit" disabled={salvando === "perfil"}>
              {salvando === "perfil" ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </form>

        {/* ================= SEGURANÇA ================= */}
        <form className="energy-panel energy-setting-card" onSubmit={alterarSenha}>
          <div className="energy-panel-heading">
            <div>
              <h2>Segurança</h2>
              <p>Altere sua senha de acesso.</p>
            </div>
            <span className="energy-metric-icon">🔒</span>
          </div>
          <div className="energy-form-grid">
            <FormField label="Senha atual" htmlFor="password-current" className="full">
              <input className="energy-input" id="password-current" name="atual" type="password" autoComplete="current-password" value={senhas.atual} onChange={atualizarCampo(setSenhas)} required />
            </FormField>
            <FormField label="Nova senha" htmlFor="password-new">
              <input className="energy-input" id="password-new" name="nova" type="password" autoComplete="new-password" minLength={6} value={senhas.nova} onChange={atualizarCampo(setSenhas)} required />
            </FormField>
            <FormField label="Confirmar nova senha" htmlFor="password-confirm">
              <input className="energy-input" id="password-confirm" name="confirmacao" type="password" autoComplete="new-password" value={senhas.confirmacao} onChange={atualizarCampo(setSenhas)} required />
            </FormField>
          </div>
          <div className="energy-form-actions">
            <button className="energy-button" type="submit" disabled={salvando === "senha"}>
              {salvando === "senha" ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </form>

        {/* ================= MINHA CASA ================= */}
        <form className="energy-panel energy-setting-card" onSubmit={salvarCasa}>
          <div className="energy-panel-heading">
            <div>
              <h2>Minha casa</h2>
              <p>{casaAtual ? "Endereço e tarifa usados nos cálculos." : "Cadastre sua casa para usar o SmartMind."}</p>
            </div>
            <span className="energy-metric-icon">⌂</span>
          </div>
          <div className="energy-form-grid">
            <FormField label="Nome da casa" htmlFor="home-name" className="full">
              <input className="energy-input" id="home-name" name="nome" value={casa.nome} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Rua" htmlFor="home-street" className="full">
              <input className="energy-input" id="home-street" name="rua" value={casa.rua} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Número" htmlFor="home-number">
              <input className="energy-input" id="home-number" name="numero" value={casa.numero} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Bairro" htmlFor="home-district">
              <input className="energy-input" id="home-district" name="bairro" value={casa.bairro} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Cidade" htmlFor="home-city">
              <input className="energy-input" id="home-city" name="cidade" value={casa.cidade} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="CEP" htmlFor="home-cep">
              <input
                className="energy-input"
                id="home-cep"
                name="cep"
                inputMode="numeric"
                placeholder="00000-000"
                value={casa.cep}
                onChange={(event) => setCasa((atual) => ({ ...atual, cep: formatarCep(event.target.value) }))}
                required
              />
            </FormField>
            <FormField label="Tarifa (R$/kWh)" htmlFor="home-tariff">
              <input
                className="energy-input"
                id="home-tariff"
                type="number"
                min="0.01"
                step="0.00001"
                value={tarifa.valor_kwh}
                onChange={(event) => setTarifa((atual) => ({ ...atual, valor_kwh: event.target.value }))}
              />
            </FormField>
            <FormField label="Bandeira tarifária" htmlFor="home-flag">
              <select
                className="energy-select"
                id="home-flag"
                value={tarifa.bandeira}
                onChange={(event) => setTarifa((atual) => ({ ...atual, bandeira: event.target.value }))}
              >
                <option value="VERDE">Verde</option>
                <option value="AMARELA">Amarela</option>
                <option value="VERMELHA">Vermelha</option>
              </select>
            </FormField>
          </div>
          <div className="energy-form-actions">
            <button className="energy-button" type="submit" disabled={salvando === "casa"}>
              {salvando === "casa" ? "Salvando..." : casaAtual ? "Salvar casa" : "Cadastrar casa"}
            </button>
          </div>
        </form>

        {/* ================= PREFERÊNCIAS (LOCAL) ================= */}
        <section className="energy-panel energy-setting-card energy-preferences">
          <div className="energy-panel-heading">
            <div>
              <h2>Preferências</h2>
              <p>Ficam salvas neste navegador.</p>
            </div>
            <span className="energy-metric-icon">⚙</span>
          </div>
          <div className="energy-setting-row">
            <div>
              <strong>Idioma</strong>
              <span>Idioma da interface</span>
            </div>
            <select
              className="energy-select energy-compact-select"
              value={preferencias.idioma}
              onChange={(event) => setPreferencias({ ...preferencias, idioma: event.target.value })}
              aria-label="Idioma"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
          <div className="energy-setting-row">
            <div>
              <strong>Tema</strong>
              <span>Aparência da interface</span>
            </div>
            <select
              className="energy-select energy-compact-select"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              aria-label="Tema"
            >
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
          <div className="energy-setting-row">
            <div>
              <strong>Alerta de consumo alto</strong>
              <span>Notificar quando a casa ultrapassar o limite.</span>
            </div>
            <Toggle
              checked={preferencias.alertaConsumoAlto}
              onChange={(value) => setPreferencias({ ...preferencias, alertaConsumoAlto: value })}
              label="Alerta de consumo alto"
            />
          </div>
        </section>

        {/* ================= ZONA DE PERIGO ================= */}
        <section className="energy-panel energy-setting-card energy-save-card">
          <div>
            <h2>Excluir conta</h2>
            <p>Sua conta será desativada e você sairá do sistema.</p>
          </div>
          <button className="energy-button-secondary danger" type="button" onClick={() => setConfirmarExclusao(true)}>
            Excluir minha conta
          </button>
        </section>
      </div>

      {confirmarExclusao && (
        <Modal
          title="Excluir sua conta?"
          description="Essa ação desativa seu acesso ao SmartMind. Deseja continuar?"
          onClose={() => setConfirmarExclusao(false)}
          role="alertdialog"
        >
          <div className="energy-form-actions">
            <button className="energy-button-secondary" type="button" onClick={() => setConfirmarExclusao(false)}>
              Cancelar
            </button>
            <button className="energy-button-secondary danger" type="button" onClick={excluirConta}>
              Sim, excluir
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}