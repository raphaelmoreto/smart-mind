import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CasaEntity } from '../../domain/entities/casa.entity.js';
import { CasaOutputDto } from '../../domain/dto/casa.dto.js';
import { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.interface.js';

@Injectable()
export class CasaRepository implements ICasaRepository {

    constructor (
        @InjectRepository(CasaEntity)
        private readonly repository: Repository<CasaEntity>
    ) {}

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.query(
            `
            UPDATE "Casa"
            SET "ativo" = false,
                "dt_exclusao" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            AND "ativo" = TRUE
            `,
            [id]
        );

        return result[1] === 1;
    }

    async getAll(): Promise<CasaOutputDto[]> {
        return await this.repository
            .createQueryBuilder('c')
            .innerJoin(
                'Usuario',
                'u',
                'c.fk_usuario = u.id'
            )
            .select([
                'c.id AS id',
                'c.nome AS nome',
                'c.rua AS rua',
                'c.bairro AS bairro',
                'c.cidade AS cidade',
                'c.numero AS numero',
                'c.cep AS cep',
                'u.nome AS proprietario',
                `
                CASE
                    WHEN c.ativo = TRUE THEN 'ATIVO'
                    ELSE 'INATIVO'
                END AS status
                `
            ])
            .getRawMany<CasaOutputDto>();
    }

    async getById(id: number): Promise<CasaOutputDto | null> {
        const casa = await this.repository
            .createQueryBuilder('c')
            .innerJoin(
                'Usuario',
                'u',
                'c.fk_usuario = u.id'
            )
            .select([
                'c.id AS id',
                'c.nome AS nome',
                'c.rua AS rua',
                'c.bairro AS bairro',
                'c.cidade AS cidade',
                'c.numero AS numero',
                'c.cep AS cep',
                'u.nome AS proprietario',
                `
                CASE
                    WHEN c.ativo = TRUE THEN 'ATIVO'
                    ELSE 'INATIVO'
                END AS status
                `
            ])
            .where('c.id = :id', { id })
            .getRawOne<CasaOutputDto>();

        return casa ?? null;
    }

    async getCasaEntity(id: number): Promise<CasaEntity | null> {
        const casa = await this.repository
            .createQueryBuilder('c')
            .select([
                'c.id',
                'c.nome',
                'c.rua',
                'c.bairro',
                'c.cidade',
                'c.numero',
                'c.cep',
                'c.fk_usuario'
            ])
            .where('c.id = :id', { id })
            .getOne();

        return casa ?? null;
    }

    async insert(entity: CasaEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .insert()
            .into("Casa")
            .values({
                nome: entity.getNome(),
                rua: entity.getRua(),
                bairro: entity.getBairro(),
                cidade: entity.getCidade(),
                numero: entity.getNumero(),
                cep: entity.getCep(),
                fk_usuario: entity.getFK_Usuario()
            })
            .orIgnore()
            .execute();

        return result.identifiers[0]?.id !== undefined;
    }

    async update(entity: CasaEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .update("Casa")
            .set({
                nome: entity.getNome(),
                rua: entity.getRua(),
                bairro: entity.getBairro(),
                cidade: entity.getCidade(),
                numero: entity.getNumero(),
                cep: entity.getCep(),
                fk_usuario: entity.getFK_Usuario()
            })
            .where('id = :id', { id: entity.getId() })
            .execute();

        return result.affected === 1;
    }

    async verificarSeCasaExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from(CasaEntity, 'c')
            .where('c.id = :id', { id })
            .getRawOne();
            
        return !!result;
    }
}