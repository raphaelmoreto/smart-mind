import {
  mockAmbientes,
  mockCasa,
  mockConsumo,
  mockDispositivos,
  mockPerfil,
} from "../data/energyMock.js";

const pause = () => Promise.resolve();
const copy = (value) => structuredClone(value);
const loadList = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || copy(fallback);
  } catch {
    return copy(fallback);
  }
};
const legacyDeviceIds = new Set([
  "device-01",
  "device-02",
  "device-03",
  "device-04",
  "device-05",
]);
const savedDevices = loadList("smartmind-dispositivos", mockDispositivos);
let dispositivos = savedDevices.some((device) => legacyDeviceIds.has(device.id))
  ? [
      ...mockDispositivos,
      ...savedDevices.filter((device) => !legacyDeviceIds.has(device.id)),
    ]
  : savedDevices;
if (dispositivos !== savedDevices) {
  localStorage.setItem("smartmind-dispositivos", JSON.stringify(dispositivos));
}
let ambientes = loadList("smartmind-ambientes", mockAmbientes);
const defaultConfig = {
  perfil: copy(mockPerfil),
  casa: copy(mockCasa),
  preferencias: {
    idioma: "pt-BR",
    tema: localStorage.getItem("smartmind-theme") || "dark",
    alertaConsumoAlto: true,
  },
};
let configuracoes = (() => {
  try {
    return JSON.parse(localStorage.getItem("smartmind-settings")) || copy(defaultConfig);
  } catch {
    return copy(defaultConfig);
  }
})();

// Stubs com os contratos previstos; substitua o corpo por fetch mantendo rotas e payloads.
export async function getDispositivos() {
  await pause();
  return copy(dispositivos);
}
export async function createDispositivo(payload) {
  await pause();
  const item = { id: crypto.randomUUID(), ...payload };
  dispositivos = [...dispositivos, item];
  localStorage.setItem("smartmind-dispositivos", JSON.stringify(dispositivos));
  return copy(item);
}
export async function updateDispositivo(id, payload) {
  await pause();
  const item = { id, ...payload };
  dispositivos = dispositivos.map((device) => device.id === id ? item : device);
  localStorage.setItem("smartmind-dispositivos", JSON.stringify(dispositivos));
  return copy(item);
}
export async function deleteDispositivo(id) {
  await pause();
  dispositivos = dispositivos.filter((device) => device.id !== id);
  localStorage.setItem("smartmind-dispositivos", JSON.stringify(dispositivos));
  return { id, removido: true };
}

export async function getAmbientes() {
  await pause();
  return copy(ambientes);
}
export async function createAmbiente(payload) {
  await pause();
  const item = { id: crypto.randomUUID(), ...payload };
  ambientes = [...ambientes, item];
  localStorage.setItem("smartmind-ambientes", JSON.stringify(ambientes));
  return copy(item);
}
export async function updateAmbiente(id, payload) {
  await pause();
  const item = { id, ...payload };
  ambientes = ambientes.map((room) => room.id === id ? item : room);
  localStorage.setItem("smartmind-ambientes", JSON.stringify(ambientes));
  return copy(item);
}
export async function deleteAmbiente(id) {
  await pause();
  ambientes = ambientes.filter((room) => room.id !== id);
  localStorage.setItem("smartmind-ambientes", JSON.stringify(ambientes));
  return { id, removido: true };
}

export async function getEnergia() {
  await pause();
  return { ...copy(mockConsumo), tarifa: Number(configuracoes.casa.tarifa), moeda: configuracoes.casa.moeda };
}
export async function getConfiguracoes() {
  await pause();
  return copy(configuracoes);
}
export async function updateConfiguracoes(payload) {
  await pause();
  configuracoes = copy(payload);
  delete configuracoes.perfil.senhaAtual;
  delete configuracoes.perfil.senhaNova;
  localStorage.setItem("smartmind-settings", JSON.stringify(configuracoes));
  localStorage.setItem("smartmind-theme", configuracoes.preferencias.tema);
  return copy(configuracoes);
}
