export const mockAmbientes = [
  { id: "sala", nome: "Sala de estar", descricao: "Conforto e entretenimento" },
  { id: "cozinha", nome: "Cozinha", descricao: "Preparo das refeições" },
  { id: "quarto", nome: "Quarto principal", descricao: "Descanso e leitura" },
  { id: "escritorio", nome: "Escritório", descricao: "Trabalho e estudos" },
];

export const mockDispositivos = [
  {
    id: "living",
    nome: "Luminária de piso",
    foto: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    ambienteId: "sala",
    potenciaW: 60,
    ativo: true,
    horasUsoDia: 5,
    tipo: "lamp",
    detalhe: "Luz ambiente",
    intensidade: 72,
  },
  {
    id: "ceiling",
    nome: "Luz principal",
    foto: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    ambienteId: "sala",
    potenciaW: 80,
    ativo: true,
    horasUsoDia: 6,
    tipo: "ceiling",
    detalhe: "Luz quente",
    intensidade: 86,
  },
  {
    id: "air",
    nome: "Ar-condicionado",
    foto: "https://images.unsplash.com/photo-1631545806609-5e6d7b7b4a5a?auto=format&fit=crop&w=900&q=85",
    ambienteId: "quarto",
    potenciaW: 1200,
    ativo: false,
    horasUsoDia: 5,
    tipo: "air",
    detalhe: "Modo silencioso",
    intensidade: 23,
  },
  {
    id: "plant",
    nome: "Luz de leitura",
    foto: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    ambienteId: "quarto",
    potenciaW: 18,
    ativo: false,
    horasUsoDia: 4,
    tipo: "lamp",
    detalhe: "Luz suave",
    intensidade: 48,
  },
  {
    id: "coffee",
    nome: "Cafeteira",
    foto: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85",
    ambienteId: "cozinha",
    potenciaW: 900,
    ativo: false,
    horasUsoDia: 4,
    tipo: "coffee",
    detalhe: "Ligada",
    intensidade: 0,
  },
  {
    id: "desk",
    nome: "Luz de mesa",
    foto: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    ambienteId: "escritorio",
    potenciaW: 40,
    ativo: true,
    horasUsoDia: 8,
    tipo: "lamp",
    detalhe: "Luz neutra",
    intensidade: 60,
  },
];

export const mockCasa = {
  nome: "Casa Morgan",
  endereco: "Rua das Acácias, 120 · São Paulo, SP",
  tarifa: 0.92,
  moeda: "BRL",
};

export const mockPerfil = {
  nome: "Alex Morgan",
  email: "alex.morgan@email.com",
};

export const mockConsumo = {
  tarifa: mockCasa.tarifa,
  diasNoMes: 30,
  consumoDiarioPorHora: [0.44, 0.4, 0.38, 0.36, 0.42, 0.6, 0.82, 0.95, 0.8, 0.66, 0.72, 0.9, 0.84, 0.78, 0.76, 0.82, 0.95, 1.1, 1.3, 1.2, 1.05, 0.86, 0.66, 0.52],
};
