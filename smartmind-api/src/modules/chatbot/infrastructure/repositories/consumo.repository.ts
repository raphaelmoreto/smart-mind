import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ConsumoMensal, IConsumoRepository } from '../../domain/interfaces/consumo.repository.interface.js';

@Injectable()
export class ConsumoRepository implements IConsumoRepository {

    constructor(private readonly dataSource: DataSource) {}

    async salvarConsumo(dispositivoId: number, consumoKwh: number): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO "Consumo" (consumo, fk_dispositivo) VALUES ($1, $2)`,
            [consumoKwh, dispositivoId]
        );
    }

    // SOMA DO CONSUMO DE TODOS OS DISPOSITIVOS DA CASA, AGRUPADO POR MÊS (INCLUI O MÊS ATUAL)
    async buscarHistoricoMensal(casaId: number, meses: number): Promise<ConsumoMensal[]> {
        return this.dataSource.query(
            `SELECT TO_CHAR(date_trunc('month', c.dt_medicao), 'YYYY-MM') AS mes,
                    SUM(c.consumo)::float AS total_kwh
             FROM "Consumo" c
             INNER JOIN "Dispositivo" d ON d.id = c.fk_dispositivo
             WHERE d.fk_casa = $1
               AND c.dt_medicao >= date_trunc('month', CURRENT_DATE) - (($2::int - 1) * INTERVAL '1 month')
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
               AND dt_medicao >= CURRENT_DATE - ($2::int * INTERVAL '1 day')`,
            [casaId, dias]
        );
        return result[0]?.media ?? null;
    }
}