import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DispositivoEntity } from '../../domain/entities/dispositivo.entity.js';
import { DispositivoOutputDto, TipoDispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';

@Injectable()
export class DispositivoRepository implements IDispositivoRepository {
    constructor(
        @InjectRepository(DispositivoEntity)
        private readonly repository: Repository<DispositivoEntity>
    ) {}

    // SELECT REUTILIZADO POR getAll, getAllByCasa E getById
    private queryBase() {
        return this.repository
            .createQueryBuilder('d')
            .innerJoin('Tipo_Dispositivo', 'td', 'd.fk_tipoDispositivo = td.id')
            .innerJoin('Casa', 'c', 'd.fk_casa = c.id')
            .select([
                'd.id AS id',
                'd.nome AS nome',
                'd.fk_tipoDispositivo AS "fk_tipoDispositivo"',
                'td.tipo AS tipo',
                'd.fk_casa AS fk_casa',
                'c.nome AS casa',
                'CAST(d.potencia_watts AS FLOAT) AS potencia_watts',
                'CAST(d.horas_uso_dia AS FLOAT) AS horas_uso_dia',
                'd.ligado AS ligado',
                'd.foto_url AS foto_url',
                'd.dt_cadastro AS dt_cadastro',
                'd.dt_ultima_conexao AS dt_ultima_conexao',
                `CASE WHEN d.ativo = TRUE THEN 'ATIVO' ELSE 'INATIVO' END AS status`
            ]);
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.query(
            `UPDATE "Dispositivo"
             SET "ativo" = FALSE,
                 "dt_exclusao" = CURRENT_TIMESTAMP
             WHERE "id" = $1 AND "ativo" = TRUE`,
            [id]
        );
        return result[1] === 1;
    }

    async getAll(): Promise<DispositivoOutputDto[]> {
        return this.queryBase()
            .orderBy('d.nome', 'ASC')
            .getRawMany<DispositivoOutputDto>();
    }

    async getAllByCasa(casaId: number): Promise<DispositivoOutputDto[]> {
        return this.queryBase()
            .where('d.fk_casa = :casaId', { casaId })
            .andWhere('d.ativo = TRUE')
            .orderBy('d.nome', 'ASC')
            .getRawMany<DispositivoOutputDto>();
    }

    async getById(id: number): Promise<DispositivoOutputDto | null> {
        const dispositivo = await this.queryBase()
            .where('d.id = :id', { id })
            .getRawOne<DispositivoOutputDto>();
        return dispositivo ?? null;
    }

    async getTipos(): Promise<TipoDispositivoOutputDto[]> {
        return this.repository.query(
            `SELECT id,
                    tipo,
                    sinonimos,
                    potencia_media_watts::float AS potencia_media_watts,
                    horas_uso_tipicas::float    AS horas_uso_tipicas,
                    fica_em_standby
             FROM "Tipo_Dispositivo"
             ORDER BY tipo`
        );
    }

    async alterarEstado(id: number, ligado: boolean): Promise<boolean> {
        const result = await this.repository.query(
            `UPDATE "Dispositivo"
             SET "ligado" = $2,
                 "dt_ultima_conexao" = CURRENT_TIMESTAMP
             WHERE "id" = $1 AND "ativo" = TRUE`,
            [id, ligado]
        );
        return result[1] === 1;
    }

    async getDispositivoEntity(id: number): Promise<DispositivoEntity | null> {
        const dispositivo = await this.repository
            .createQueryBuilder('d')
            .select([
                'd.id', 'd.nome', 'd.fk_tipoDispositivo', 'd.fk_casa',
                'd.potencia_watts', 'd.horas_uso_dia', 'd.ligado', 'd.foto_url'
            ])
            .where('d.id = :id AND d.ativo = TRUE', { id })
            .getOne();
        return dispositivo ?? null;
    }

    async insert(entity: DispositivoEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .insert()
            .into('Dispositivo')
            .values({
                nome: entity.getNome(),
                fk_tipoDispositivo: entity.getFK_TipoDispositivo(),
                fk_casa: entity.getFK_Casa(),
                potencia_watts: entity.getPotenciaWatts(),
                horas_uso_dia: entity.getHorasUsoDia(),
                ligado: entity.getLigado(),
                foto_url: entity.getFotoUrl()
            })
            .orIgnore()
            .execute();
        return result.identifiers[0]?.id !== undefined;
    }

    async update(entity: DispositivoEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .update('Dispositivo')
            .set({
                nome: entity.getNome(),
                fk_tipoDispositivo: entity.getFK_TipoDispositivo(),
                fk_casa: entity.getFK_Casa(),
                potencia_watts: entity.getPotenciaWatts(),
                horas_uso_dia: entity.getHorasUsoDia(),
                ligado: entity.getLigado(),
                foto_url: entity.getFotoUrl()
            })
            .where('id = :id', { id: entity.getId() })
            .execute();
        return result.affected === 1;
    }

    async verificarSeDispositivoExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from(DispositivoEntity, 'd')
            .where('d.id = :id AND d.ativo = TRUE', { id })
            .getRawOne();
        return !!result;
    }

    async verificarSeCasaExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from('Casa', 'c')
            .where('c.id = :id AND c.ativo = TRUE', { id })
            .getRawOne();
        return !!result;
    }

    async verificarSeTipoDispositivoExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from('Tipo_Dispositivo', 'td')
            .where('td.id = :id', { id })
            .getRawOne();
        return !!result;
    }
}