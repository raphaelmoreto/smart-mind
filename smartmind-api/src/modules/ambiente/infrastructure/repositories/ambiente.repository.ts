import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AmbienteEntity } from '../../domain/entities/ambiente.entity.js';
import { AmbienteOutputDto } from '../../domain/dto/ambiente.dto.js';
import type { IAmbienteRepository } from '../../domain/interfaces/repositories/ambiente.repository.interface.js';

// SELECT REUTILIZADO: AMBIENTE + QUANTOS DISPOSITIVOS TEM, QUANTOS ESTÃO LIGADOS E A POTÊNCIA LIGADA
const SELECT_AMBIENTE = `
    SELECT a.id,
           a.nome,
           a.descricao,
           a.fk_casa,
           COUNT(d.id)::int                                                   AS total_dispositivos,
           COUNT(d.id) FILTER (WHERE d.ligado)::int                           AS dispositivos_ligados,
           COALESCE(SUM(d.potencia_watts) FILTER (WHERE d.ligado), 0)::float AS potencia_ligada_watts
    FROM "Ambiente" a
    LEFT JOIN "Dispositivo" d
           ON d.fk_ambiente = a.id
          AND d.ativo = TRUE
`;

@Injectable()
export class AmbienteRepository implements IAmbienteRepository {
    constructor(
        @InjectRepository(AmbienteEntity)
        private readonly repository: Repository<AmbienteEntity>
    ) {}

    async getAllByCasa(casaId: number): Promise<AmbienteOutputDto[]> {
        return this.repository.query(
            `${SELECT_AMBIENTE}
             WHERE a.fk_casa = $1 AND a.ativo = TRUE
             GROUP BY a.id
             ORDER BY a.nome`,
            [casaId]
        );
    }

    async getById(id: number): Promise<AmbienteOutputDto | null> {
        const result = await this.repository.query(
            `${SELECT_AMBIENTE}
             WHERE a.id = $1 AND a.ativo = TRUE
             GROUP BY a.id`,
            [id]
        );
        return result[0] ?? null;
    }

    async getAmbienteEntity(id: number): Promise<AmbienteEntity | null> {
        const ambiente = await this.repository
            .createQueryBuilder('a')
            .select(['a.id', 'a.nome', 'a.descricao', 'a.fk_casa'])
            .where('a.id = :id AND a.ativo = TRUE', { id })
            .getOne();
        return ambiente ?? null;
    }

    async insert(entity: AmbienteEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .insert()
            .into('Ambiente')
            .values({
                nome: entity.getNome(),
                descricao: entity.getDescricao(),
                fk_casa: entity.getFK_Casa()
            })
            .execute();
        return result.identifiers[0]?.id !== undefined;
    }

    async update(entity: AmbienteEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .update('Ambiente')
            .set({
                nome: entity.getNome(),
                descricao: entity.getDescricao(),
                fk_casa: entity.getFK_Casa()
            })
            .where('id = :id', { id: entity.getId() })
            .execute();
        return result.affected === 1;
    }

    // EXCLUSÃO LÓGICA, IGUAL ÀS OUTRAS TABELAS
    async delete(id: number): Promise<boolean> {
        const result = await this.repository.query(
            `UPDATE "Ambiente"
             SET ativo = FALSE,
                 dt_exclusao = CURRENT_TIMESTAMP
             WHERE id = $1 AND ativo = TRUE`,
            [id]
        );
        return result[1] === 1;
    }

    async contarDispositivos(id: number): Promise<number> {
        const result = await this.repository.query(
            `SELECT COUNT(*)::int AS total
             FROM "Dispositivo"
             WHERE fk_ambiente = $1 AND ativo = TRUE`,
            [id]
        );
        return result[0]?.total ?? 0;
    }

    async verificarSeCasaExiste(casaId: number): Promise<boolean> {
        const result = await this.repository.query(
            `SELECT 1 FROM "Casa" WHERE id = $1 AND ativo = TRUE`,
            [casaId]
        );
        return result.length > 0;
    }

    // NÃO DEIXA DOIS AMBIENTES COM O MESMO NOME NA MESMA CASA
    async verificarNomeDuplicado(casaId: number, nome: string, ignorarId?: number): Promise<boolean> {
        const result = await this.repository.query(
            `SELECT 1
             FROM "Ambiente"
             WHERE fk_casa = $1
               AND UPPER(TRIM(nome)) = UPPER(TRIM($2))
               AND ativo = TRUE
               AND id <> COALESCE($3::int, 0)`,
            [casaId, nome, ignorarId ?? null]
        );
        return result.length > 0;
    }
}