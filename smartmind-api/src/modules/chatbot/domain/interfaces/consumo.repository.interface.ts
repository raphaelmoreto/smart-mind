export interface ConsumoMensal {
    mes: string;        // 'YYYY-MM'
    total_kwh: number;
}

export interface IConsumoRepository {
    salvarConsumo(dispositivoId: number, consumoKwh: number): Promise<void>;
    buscarHistoricoMensal(casaId: number, meses: number): Promise<ConsumoMensal[]>;
    buscarTemperaturaMedia(casaId: number, dias: number): Promise<number | null>;
}