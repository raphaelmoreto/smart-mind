import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ITarifaRepository, TarifaVigente } from '../../domain/interfaces/tarifa.repository.interface.js';

// USADA QUANDO A CASA AINDA NÃO TEM TARIFA CADASTRADA
const TARIFA_PADRAO: TarifaVigente = {
    valorKwh: 0.85,
    adicionalKwh: 0,
    valorTotalKwh: 0.85,
    bandeira: 'VERDE',
};

@Injectable()
export class TarifaRepository implements ITarifaRepository {

    constructor(private readonly dataSource: DataSource) {}

    async buscarTarifaVigente(casaId: number): Promise<TarifaVigente> {
        const result = await this.dataSource.query(
            `SELECT valor_kwh::float AS "valorKwh",
                    COALESCE(valor_adicional_kwh, 0)::float AS "adicionalKwh",
                    bandeira
             FROM "Tarifa_Energia"
             WHERE fk_casa = $1
               AND dt_vigencia <= CURRENT_DATE
             ORDER BY dt_vigencia DESC, id DESC
             LIMIT 1`,
            [casaId]
        );

        if (!result.length) return TARIFA_PADRAO;

        const { valorKwh, adicionalKwh, bandeira } = result[0];
        return {
            valorKwh,
            adicionalKwh,
            bandeira,
            valorTotalKwh: Number((valorKwh + adicionalKwh).toFixed(5)),
        };
    }

    async buscarTarifaAtual(casaId: number): Promise<number> {
        return (await this.buscarTarifaVigente(casaId)).valorTotalKwh;
    }
}