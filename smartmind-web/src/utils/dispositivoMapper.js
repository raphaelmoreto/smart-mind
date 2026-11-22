// ===================== TEXTO =====================

export function normalizarTexto(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // TIRA ACENTOS
    .replace(/[-_]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ===================== API <-> TELA =====================

// API -> TELA
export function daApi(d) {
  return {
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    fk_tipoDispositivo: d.fk_tipoDispositivo,
    fk_ambiente: d.fk_ambiente ?? null,
    ambiente: d.ambiente ?? null,
    potenciaW: Number(d.potencia_watts ?? 0),
    horasUsoDia: Number(d.horas_uso_dia ?? 0),
    ativo: Boolean(d.ligado),
    foto: d.foto_url ?? "",
    arte: getDeviceArt(d.tipo, d.nome),
  };
}

// TELA -> API
export function paraApi(form, casaId) {
  return {
    nome: form.nome.trim(),
    fk_tipoDispositivo: Number(form.fk_tipoDispositivo),
    fk_casa: casaId,
    fk_ambiente: form.fk_ambiente ? Number(form.fk_ambiente) : null, // "" = SEM AMBIENTE
    potencia_watts: Number(form.potenciaW),
    horas_uso_dia: Number(form.horasUsoDia),
    ligado: Boolean(form.ativo),
    foto_url: form.foto?.trim() || undefined,
  };
}

// CONSUMO ESTIMADO (kWh) EM N DIAS
export function kwhMes(device, dias = 30) {
  return (Number(device.potenciaW) * Number(device.horasUsoDia) * dias) / 1000;
}

// ===================== RECONHECIMENTO DE TIPO =====================

// PROCURA O TIPO PELO NOME DIGITADO USANDO O NOME E OS SINÔNIMOS QUE VIERAM DO BANCO.
// O TERMO MAIS LONGO GANHA ("sensor de temperatura" GANHA DE "sensor").
export function reconhecerTipo(nome, tipos = []) {
  const texto = ` ${normalizarTexto(nome)} `;
  let melhor = null;

  for (const tipo of tipos) {
    for (const termo of [tipo.tipo, ...(tipo.sinonimos ?? [])]) {
      const termoNormalizado = normalizarTexto(termo);
      if (!termoNormalizado) continue;

      const encontrou = texto.includes(` ${termoNormalizado} `);
      if (encontrou && (!melhor || termoNormalizado.length > melhor.tamanho)) {
        melhor = { tipo, tamanho: termoNormalizado.length };
      }
    }
  }

  return melhor?.tipo ?? null;
}

// ===================== APARÊNCIA NA HOME =====================

// QUAL DESENHO O CARD DA HOME USA (CLASSES device-art-* DO HomePage.css)
const ARTES = [
  { arte: "air", termos: ["ar condicionado", "aquecedor", "ventilador", "climatizador"] },
  { arte: "coffee", termos: ["cafeteira", "micro ondas", "microondas", "forno"] },
  { arte: "ceiling", termos: ["luz principal", "teto", "plafon", "lustre"] },
];

export function getDeviceArt(tipo = "", nome = "") {
  const texto = normalizarTexto(`${tipo} ${nome}`);
  return ARTES.find(({ termos }) => termos.some((termo) => texto.includes(termo)))?.arte ?? "lamp";
}