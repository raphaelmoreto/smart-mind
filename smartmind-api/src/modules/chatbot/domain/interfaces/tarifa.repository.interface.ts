export interface TarifaVigente {
    valorKwh: number;
    adicionalKwh: number;
    valorTotalKwh: number;
    bandeira: string;
}

export interface ITarifaRepository {
    buscarTarifaAtual(casaId: number): Promise<number>;
    buscarTarifaVigente(casaId: number): Promise<TarifaVigente>;
}