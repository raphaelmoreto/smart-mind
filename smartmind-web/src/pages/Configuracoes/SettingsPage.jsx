import { useEffect, useState } from "react";
import { FormField, PageHeading, Toggle } from "../../components/energy/EnergyComponents.jsx";
import { useLocalStorageState } from "../../components/energy/useEnergyStorage.js";
import { useEnergyTheme } from "../../components/energy/EnergyTheme.js";
import {
  getConfiguracoes,
  updateConfiguracoes,
} from "../../services/energyApi.js";
import "./SettingsPage.css";

export default function SettingsPage() {
  const { theme, setTheme } = useEnergyTheme();
  const [settings, setSettings] = useLocalStorageState("smartmind-settings", {
    perfil: { nome: "", email: "" },
    casa: { nome: "", endereco: "", tarifa: 0.92, moeda: "BRL" },
    preferencias: { idioma: "pt-BR", tema: theme, alertaConsumoAlto: true },
  });
  const [passwords, setPasswords] = useState({
    atual: "",
    nova: "",
    confirmacao: "",
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getConfiguracoes().then((data) => {
      setSettings(data);
      setTheme(data.preferencias.tema);
    });
  }, [setSettings, setTheme]);

  function updateGroup(group, key, value) {
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setFeedback("");
    setError("");
    if (!settings.perfil.nome.trim()) {
      setError("Informe o nome do perfil.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.perfil.email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (passwords.nova && !passwords.atual) {
      setError("Informe a senha atual para definir uma nova senha.");
      return;
    }
    if (passwords.nova !== passwords.confirmacao) {
      setError("A nova senha e a confirmação não são iguais.");
      return;
    }

    const payload = {
      perfil: {
        nome: settings.perfil.nome.trim(),
        email: settings.perfil.email.trim(),
        senhaAtual: passwords.atual || undefined,
        senhaNova: passwords.nova || undefined,
      },
      casa: {
        nome: settings.casa.nome.trim(),
        endereco: settings.casa.endereco.trim(),
        tarifa: Number(settings.casa.tarifa),
        moeda: settings.casa.moeda,
      },
      preferencias: {
        ...settings.preferencias,
        tema: theme,
      },
    };

    const saved = await updateConfiguracoes(payload);
    setSettings(saved);
    setPasswords({ atual: "", nova: "", confirmacao: "" });
    setFeedback("Configurações salvas com sucesso.");
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="PREFERÊNCIAS"
        title="Configurações"
        description="Gerencie seu perfil, os dados da casa e suas preferências."
      />

      <form onSubmit={saveSettings}>
        <div className="energy-setting-layout">
          <section className="energy-panel energy-setting-card">
            <div className="energy-panel-heading">
              <div>
                <h2>Perfil</h2>
                <p>Informações de acesso e segurança.</p>
              </div>
              <span className="energy-metric-icon">◎</span>
            </div>
            <div className="energy-form-grid">
              <FormField label="Nome" htmlFor="profile-name" className="full">
                <input
                  className="energy-input"
                  id="profile-name"
                  value={settings.perfil.nome}
                  onChange={(event) => updateGroup("perfil", "nome", event.target.value)}
                  required
                />
              </FormField>
              <FormField label="E-mail" htmlFor="profile-email" className="full">
                <input
                  className="energy-input"
                  id="profile-email"
                  type="email"
                  value={settings.perfil.email}
                  onChange={(event) => updateGroup("perfil", "email", event.target.value)}
                  required
                />
              </FormField>
              <FormField label="Senha atual" htmlFor="password-current" className="full">
                <input className="energy-input" id="password-current" type="password" autoComplete="current-password" value={passwords.atual} onChange={(event) => setPasswords({ ...passwords, atual: event.target.value })} />
              </FormField>
              <FormField label="Nova senha" htmlFor="password-new">
                <input className="energy-input" id="password-new" type="password" autoComplete="new-password" value={passwords.nova} onChange={(event) => setPasswords({ ...passwords, nova: event.target.value })} />
              </FormField>
              <FormField label="Confirmar nova senha" htmlFor="password-confirm">
                <input className="energy-input" id="password-confirm" type="password" autoComplete="new-password" value={passwords.confirmacao} onChange={(event) => setPasswords({ ...passwords, confirmacao: event.target.value })} />
              </FormField>
            </div>
          </section>

          <section className="energy-panel energy-setting-card">
            <div className="energy-panel-heading">
              <div>
                <h2>Minha casa</h2>
                <p>Dados usados para estimar o custo de energia.</p>
              </div>
              <span className="energy-metric-icon">⌂</span>
            </div>
            <div className="energy-form-grid">
              <FormField label="Nome da casa" htmlFor="home-name" className="full">
                <input
                  className="energy-input"
                  id="home-name"
                  value={settings.casa.nome}
                  onChange={(event) => updateGroup("casa", "nome", event.target.value)}
                  required
                />
              </FormField>
              <FormField label="Endereço / cidade" htmlFor="home-address" className="full">
                <input
                  className="energy-input"
                  id="home-address"
                  value={settings.casa.endereco}
                  onChange={(event) => updateGroup("casa", "endereco", event.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tarifa (R$/kWh)" htmlFor="home-tariff">
                <input
                  className="energy-input"
                  id="home-tariff"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.casa.tarifa}
                  onChange={(event) => updateGroup("casa", "tarifa", Math.max(0, Number(event.target.value)))}
                />
              </FormField>
              <FormField label="Moeda" htmlFor="home-currency">
                <select className="energy-select" id="home-currency" value={settings.casa.moeda} onChange={(event) => updateGroup("casa", "moeda", event.target.value)}>
                  <option value="BRL">Real brasileiro (BRL)</option>
                  <option value="USD">Dólar americano (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </FormField>
            </div>
          </section>

          <section className="energy-panel energy-setting-card energy-preferences">
            <div className="energy-panel-heading">
              <div>
                <h2>Preferências</h2>
                <p>Personalize como o SmartMind funciona.</p>
              </div>
              <span className="energy-metric-icon">⚙</span>
            </div>
            <div className="energy-setting-row">
              <div>
                <strong>Idioma</strong>
                <span>Idioma da interface</span>
              </div>
              <select className="energy-select energy-compact-select" value={settings.preferencias.idioma} onChange={(event) => updateGroup("preferencias", "idioma", event.target.value)} aria-label="Idioma">
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
                onChange={(event) => {
                  setTheme(event.target.value);
                  updateGroup("preferencias", "tema", event.target.value);
                }}
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
                checked={settings.preferencias.alertaConsumoAlto}
                onChange={(value) => updateGroup("preferencias", "alertaConsumoAlto", value)}
                label="Alerta de consumo alto"
              />
            </div>
          </section>

          <section className="energy-panel energy-setting-card energy-save-card">
            <div>
              <h2>Pronto para salvar?</h2>
              <p>As preferências ficam armazenadas neste navegador enquanto a API não está conectada.</p>
            </div>
            <button className="energy-button" type="submit">Salvar configurações</button>
          </section>
        </div>

        {error && <div className="energy-form-error" role="alert">{error}</div>}
        {feedback && <div className="energy-feedback" role="status">{feedback}</div>}
      </form>
    </main>
  );
}
