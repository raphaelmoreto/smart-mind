const deviceTypes = [
  { type: "air", terms: ["ar-condicionado", "aquecedor"] },
  { type: "coffee", terms: ["cafeteira", "café"] },
  { type: "ceiling", terms: ["luz principal", "teto", "plafon"] },
];

export function getDeviceType(name = "") {
  const normalizedName = name.toLocaleLowerCase("pt-BR");
  return (
    deviceTypes.find(({ terms }) =>
      terms.some((term) => normalizedName.includes(term)),
    )?.type || "lamp"
  );
}

export function toHomeDevice(device, rooms) {
  return {
    ...device,
    name: device.nome,
    room: rooms.find((room) => room.id === device.ambienteId)?.nome || "Sem ambiente",
    type: device.tipo || getDeviceType(device.nome),
    detail: device.detalhe || (device.ativo ? "Ligado" : "Desligado"),
    on: Boolean(device.ativo),
    level: Number(device.intensidade ?? (device.ativo ? 65 : 0)),
  };
}
