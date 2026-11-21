export interface DicaEconomia {
    texto: string;
    prioridade: string;
}

export interface IDicaEconomiaRepository {
    buscarDicas(tipoId: number | null, horasDia: number, consumoKwh: number): Promise<DicaEconomia[]>;
}