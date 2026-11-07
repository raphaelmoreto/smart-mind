export interface IConsumoRepository {
    salvarConsumo(casaId: string, dispositivoId: string, consumoKwh: number, custo: number): Promise<void>;
}