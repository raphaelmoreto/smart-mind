import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { IEnergiaRepository } from '../../domain/interfaces/repositories/energia.repository.interface.js';
import {
    ConsumoDispositivoDto,
    ConsumoMensalFechado,
    PeriodoSerie,
    PrevisaoOutputDto,
    TarifaVigenteDto,
} from '../../domain/dto/energia.dto.js';

// COMO CADA PERÍODO DO GRÁFICO É MONTADO
// (VALORES FIXOS DO CÓDIGO, NUNCA VINDOS DO USUÁRIO: SEM RISCO DE SQL INJECTION)
const CONFIG_SERIE: Record<PeriodoSerie, { truncar: string; quantidade: number; passo: string }> = {
    dia:    { truncar: 'hour',  quantidade: 24, passo: '1 hour'  },  // ÚLTIMAS 24 HORAS
    semana: { truncar: 'day',   quantidade: 7,  passo: '1 day'   },  // ÚLTIMOS 7 DIAS
    ano:    { truncar: 'month', quantidade: 12, passo: '1 month' },  // ÚLTIMOS 12 MESES
};

const TARIFA_PADRAO: TarifaVigenteDto = {
    valor_kwh: 0.85,
    valor_adicional_kwh: 0,
    valor_total_kwh: 0.85,
    bandeira: 'VERDE',
};

@Injectable()
export class EnergiaRepository implements IEnergiaRepository {

    constructor(private readonly dataSource: DataSource) {}

    // generate_series CRIA TODOS OS "BALDES" (HORAS/DIAS/MESES), ENTÃO PERÍODOS SEM MEDIÇÃO VOLTAM COM 0
    async buscarSerie(casaId: number, periodo: PeriodoSerie): Promise<{ inicio: Date; kwh: number }[]> {
        const { truncar, quantidade, passo } = CONFIG_SERIE[periodo];

        return this.dataSource.query(
            `WITH faixa AS (
                 SELECT generate_series(
                     date_trunc($2::text, LOCALTIMESTAMP) - ($3::int - 1) * $4::interval,
                     date_trunc($2::text, LOCALTIMESTAMP),
                     $4::interval
                 ) AS inicio
             )
             SELECT f.inicio,
                    COALESCE(SUM(c.consumo), 0)::float AS kwh
             FROM faixa f
             LEFT JOIN "Consumo" c
                    ON c.dt_medicao >= f.inicio
                   AND c.dt_medicao <  f.inicio + $4::interval
                   AND c.fk_dispositivo IN (SELECT d.id FROM "Dispositivo" d WHERE d.fk_casa = $1)
             GROUP BY f.inicio
             ORDER BY f.inicio`,
            [casaId, truncar, quantidade, passo]
        );
    }

    async buscarConsumoMesAtualEAnterior(casaId: number): Promise<{ atual: number; anterior: number }> {
        const result = await this.dataSource.query(
            `SELECT
                 COALESCE(SUM(c.consumo) FILTER (
                     WHERE c.dt_medicao >= date_trunc('month', LOCALTIMESTAMP)
                 ), 0)::float AS atual,
                 COALESCE(SUM(c.consumo) FILTER (
                     WHERE c.dt_medicao <  date_trunc('month', LOCALTIMESTAMP)
                 ), 0)::float AS anterior
             FROM "Consumo" c
             INNER JOIN "Dispositivo" d ON d.id = c.fk_dispositivo
             WHERE d.fk_casa = $1
               AND c.dt_medicao >= date_trunc('month', LOCALTIMESTAMP) - INTERVAL '1 month'`,
            [casaId]
        );
        return { atual: result[0]?.atual ?? 0, anterior: result[0]?.anterior ?? 0 };
    }

    async buscarConsumoPorDispositivoNoMes(casaId: number): Promise<ConsumoDispositivoDto[]> {
        return this.dataSource.query(
            `SELECT d.id AS dispositivo_id,
                    COALESCE(SUM(c.consumo), 0)::float AS kwh
             FROM "Dispositivo" d
             LEFT JOIN "Consumo" c
                    ON c.fk_dispositivo = d.id
                   AND c.dt_medicao >= date_trunc('month', LOCALTIMESTAMP)
             WHERE d.fk_casa = $1 AND d.ativo = TRUE
             GROUP BY d.id`,
            [casaId]
        );
    }

    // SÓ MESES FECHADOS: O MÊS ATUAL (INCOMPLETO) FICA DE FORA
    async buscarHistoricoMesesFechados(casaId: number, meses: number): Promise<ConsumoMensalFechado[]> {
        return this.dataSource.query(
            `SELECT TO_CHAR(date_trunc('month', c.dt_medicao), 'YYYY-MM') AS mes,
                    SUM(c.consumo)::float AS total_kwh
             FROM "Consumo" c
             INNER JOIN "Dispositivo" d ON d.id = c.fk_dispositivo
             WHERE d.fk_casa = $1
               AND c.dt_medicao >= date_trunc('month', LOCALTIMESTAMP) - ($2::int * INTERVAL '1 month')
               AND c.dt_medicao <  date_trunc('month', LOCALTIMESTAMP)
             GROUP BY 1
             ORDER BY 1`,
            [casaId, meses]
        );
    }

    async buscarTemperaturaMedia(casaId: number, dias: number): Promise<number | null> {
        const result = await this.dataSource.query(
            `SELECT AVG(temperatura)::float AS media
             FROM "Temperatura"
             WHERE fk_casa = $1
               AND dt_medicao >= LOCALTIMESTAMP - ($2::int * INTERVAL '1 day')`,
            [casaId, dias]
        );
        return result[0]?.media ?? null;
    }

    async buscarTarifaVigente(casaId: number): Promise<TarifaVigenteDto> {
        const result = await this.dataSource.query(
            `SELECT valor_kwh::float AS valor_kwh,
                    COALESCE(valor_adicional_kwh, 0)::float AS valor_adicional_kwh,
                    bandeira
             FROM "Tarifa_Energia"
             WHERE fk_casa = $1 AND dt_vigencia <= CURRENT_DATE
             ORDER BY dt_vigencia DESC, id DESC
             LIMIT 1`,
            [casaId]
        );

        if (!result.length) return TARIFA_PADRAO;

        const tarifa = result[0];
        return {
            ...tarifa,
            valor_total_kwh: Number((tarifa.valor_kwh + tarifa.valor_adicional_kwh).toFixed(5)),
        };
    }

    async salvarPrevisao(casaId: number, kwh: number, periodoReferencia: string, modelo: string): Promise<Date> {
        const result = await this.dataSource.query(
            `INSERT INTO "Previsoes" (valor_previsto, periodo_referencia, modelo, fk_casa)
             VALUES ($1, $2::date, $3, $4)
             RETURNING dt_previsao`,
            [kwh, periodoReferencia, modelo, casaId]
        );
        return result[0].dt_previsao;
    }

    async buscarUltimaPrevisao(casaId: number): Promise<Omit<PrevisaoOutputDto, 'valor_estimado' | 'tarifa_kwh' | 'bandeira'> | null> {
        const result = await this.dataSource.query(
            `SELECT valor_previsto::float AS consumo_previsto_kwh,
                    TO_CHAR(periodo_referencia, 'YYYY-MM-DD') AS periodo_referencia,
                    COALESCE(modelo, '') AS modelo,
                    dt_previsao
             FROM "Previsoes"
             WHERE fk_casa = $1
             ORDER BY dt_previsao DESC, id DESC
             LIMIT 1`,
            [casaId]
        );
        return result[0] ?? null;
    }
}