import {
    ConsumoDispositivoDto,
    ConsumoMensalFechado,
    PeriodoSerie,
    PrevisaoOutputDto,
    TarifaVigenteDto,
} from '../../dto/energia.dto.js';

export interface IEnergiaRepository {
    buscarSerie(casaId: number, periodo: PeriodoSerie): Promise<{ inicio: Date; kwh: number }[]>;
    buscarConsumoMesAtualEAnterior(casaId: number): Promise<{ atual: number; anterior: number }>;
    buscarConsumoPorDispositivoNoMes(casaId: number): Promise<ConsumoDispositivoDto[]>;
    buscarHistoricoMesesFechados(casaId: number, meses: number): Promise<ConsumoMensalFechado[]>;
    buscarTemperaturaMedia(casaId: number, dias: number): Promise<number | null>;
    buscarTarifaVigente(casaId: number): Promise<TarifaVigenteDto>;
    salvarPrevisao(casaId: number, kwh: number, periodoReferencia: string, modelo: string): Promise<Date>;
    buscarUltimaPrevisao(casaId: number): Promise<Omit<PrevisaoOutputDto, 'valor_estimado' | 'tarifa_kwh' | 'bandeira'> | null>;
}