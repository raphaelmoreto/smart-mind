import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { DicaEconomia, IDicaEconomiaRepository } from '../../domain/interfaces/dica-economia.repository.interface.js';

@Injectable()
export class DicaEconomiaRepository implements IDicaEconomiaRepository {

    constructor(private readonly dataSource: DataSource) {}

    // DICAS DO TIPO PRIMEIRO, DEPOIS AS GERAIS; DENTRO DE CADA GRUPO, POR PRIORIDADE
    async buscarDicas(tipoId: number | null, horasDia: number, consumoKwh: number): Promise<DicaEconomia[]> {
        return this.dataSource.query(
            `SELECT d.texto, p.prioridade
             FROM "Dica_Economia" d
             INNER JOIN "Prioridade" p ON p.id = d.fk_prioridade
             WHERE d.ativo = TRUE
               AND (d."fk_tipoDispositivo" = $1::int OR d."fk_tipoDispositivo" IS NULL)
               AND (d.min_horas_dia   IS NULL OR $2::numeric >= d.min_horas_dia)
               AND (d.min_consumo_kwh IS NULL OR $3::numeric >= d.min_consumo_kwh)
             ORDER BY (d."fk_tipoDispositivo" IS NULL),
                      CASE p.prioridade WHEN 'ALTA' THEN 1 WHEN 'MÉDIA' THEN 2 ELSE 3 END,
                      d.id
             LIMIT 6`,
            [tipoId, horasDia, consumoKwh]
        );
    }
}