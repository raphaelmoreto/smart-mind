import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DispositivoEntity } from '../../domain/entities/dispositivo.entity.js';
import { DispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';

@Injectable()
export class DispositivoRepository implements IDispositivoRepository {
    constructor(
        @InjectRepository(DispositivoEntity)
        private readonly repository: Repository<DispositivoEntity>
    ) {}

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.query(
            `UPDATE "Dispositivo"
             SET "ativo" = false
             WHERE "id" = $1 AND "ativo" = TRUE`,
            [id]
        );
        return result[1] === 1;
    }

    async getAll(): Promise<DispositivoOutputDto[]> {
        return this.repository
            .createQueryBuilder('d')
            .innerJoin('Tipo_Dispositivo', 'td', 'd.fk_tipoDispositivo = td.id')
            .innerJoin('Casa', 'c', 'd.fk_casa = c.id')
            .select([
                'd.id AS id',
                'd.nome AS nome',
                'td.tipo AS tipo',
                'c.nome AS casa',
                'd.dt_cadastro AS dt_cadastro',
                'd.dt_ultima_conexao AS dt_ultima_conexao',
                `CASE WHEN d.ativo = TRUE THEN 'ATIVO' ELSE 'INATIVO' END AS status`
            ])
            .getRawMany<DispositivoOutputDto>();
    }

    async getById(id: number): Promise<DispositivoOutputDto | null> {
        const dispositivo = await this.repository
            .createQueryBuilder('d')
            .innerJoin('Tipo_Dispositivo', 'td', 'd.fk_tipoDispositivo = td.id')
            .innerJoin('Casa', 'c', 'd.fk_casa = c.id')
            .select([
                'd.id AS id',
                'd.nome AS nome',
                'td.tipo AS tipo',
                'c.nome AS casa',
                'd.dt_cadastro AS dt_cadastro',
                'd.dt_ultima_conexao AS dt_ultima_conexao',
                `CASE WHEN d.ativo = TRUE THEN 'ATIVO' ELSE 'INATIVO' END AS status`
            ])
            .where('d.id = :id', { id })
            .getRawOne<DispositivoOutputDto>();
        return dispositivo ?? null;
    }

    async getDispositivoEntity(id: number): Promise<DispositivoEntity | null> {
        const dispositivo = await this.repository
            .createQueryBuilder('d')
            .select(['d.id', 'd.nome', 'd.fk_tipoDispositivo', 'd.fk_casa'])
            .where('d.id = :id', { id })
            .getOne();
        return dispositivo ?? null;
    }

    async insert(entity: DispositivoEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .insert()
            .into(DispositivoEntity)
            .values({
                nome: entity.getNome(),
                fk_tipoDispositivo: entity.getFK_TipoDispositivo(),
                fk_casa: entity.getFK_Casa()
            })
            .orIgnore()
            .execute();
        return result.identifiers[0]?.id !== undefined;
    }

    async update(entity: DispositivoEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .update(DispositivoEntity)
            .set({
                nome: entity.getNome(),
                fk_tipoDispositivo: entity.getFK_TipoDispositivo(),
                fk_casa: entity.getFK_Casa()
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
            .where('d.id = :id', { id })
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
