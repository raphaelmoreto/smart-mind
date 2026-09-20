import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { UsuarioEntity } from '../../domain/entities/usuario.entity.js';
import { UsuarioOutputDto } from '../../domain/dto/usuario.dto.js';

/*
• @Injectable() - INDICA QUE A CLASSE PODE SER GERENCIADA PELO SISTEMA DE DEPENDENCY INJECTION DO NESTJS;

• @Inject() - INDICA QUAL PROPRIEDADE/PARÂMETRO QUEREMOS COMO DEPENDÊNCIA

• @InjectRepository(UsuarioEntity) - INDICA QUAL ENTIDADE PERTENCE A ESSE REPOSITORIO
*/

@Injectable()
export class UsuarioRepository implements IUsuarioRepository {

    constructor (
        @InjectRepository(UsuarioEntity)
        private readonly repository: Repository<UsuarioEntity>
    )
    { }

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.query(
            `
            UPDATE "Usuario"
            SET "ativo" = false,
                "dt_exclusao" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            AND "ativo" = TRUE
            `,
            [id]
        );

        return result[1] === 1;
    }

    async getAll(): Promise<UsuarioOutputDto[]> {
        return await this.repository
            .createQueryBuilder('u')
            .innerJoin(
                'Perfil_Usuario',
                'pu',
                'u.fk_perfil = pu.id'
            )
            .select([
                'u.id AS id',
                'u.nome AS nome',
                'u.usuario AS usuario',
                'u.email AS email',
                'pu.tipo AS perfil',
                `
                    CASE
                        WHEN u.ativo = TRUE THEN 'ATIVO'
                        ELSE 'INATIVO'
                    END AS status
                `
            ])
            .getRawMany<UsuarioOutputDto>();
    }

    async getById(id: number): Promise<UsuarioOutputDto | null> {
        const usuario = await this.repository
            .createQueryBuilder('u')
            .innerJoin(
                'Perfil_Usuario',
                'pu',
                'u.fk_perfil = pu.id'
            )
            .select([
                'u.id AS id',
                'u.nome AS nome',
                'u.usuario AS usuario',
                'u.email AS email',
                'pu.tipo AS perfil',
                `
                    CASE
                        WHEN u.ativo = TRUE THEN 'ATIVO'
                        ELSE 'INATIVO'
                    END AS status
                `
            ])
            .where('u.id = :id', { id })
            .getRawOne<UsuarioOutputDto>();

        return usuario ?? null;
    }

    async getUsuarioEntity(id: number): Promise<UsuarioEntity | null> {
        const usuario = await this.repository
            .createQueryBuilder('u')
            .select([
                'u.id',
                'u.nome',
                'u.usuario',
                'u.email',
                'u.senha',
                'u.fk_perfil'
            ])
            .where('u.id = :id', { id })
            .getOne();

        return usuario ?? null;
    }

    async insert(entity: UsuarioEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .insert()
            .into("Usuario")
            .values({
                nome: entity.getNome(),
                usuario: entity.getUsuario(),
                email: entity.getEmail(),
                senha: entity.getSenha(),
                fk_perfil: entity.getFK_Perfil()
            })
            .orIgnore()
            .execute();

        return result.identifiers[0]?.id !== undefined;
    }

    async update(entity: UsuarioEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .update("Usuario")
            .set({
                nome: entity.getNome(),
                usuario: entity.getUsuario(),
                email: entity.getEmail(),
                senha: entity.getSenha(),
                fk_perfil: entity.getFK_Perfil()
            })
            .where('id = :id', { id: entity.getId() })
            .execute();

        console.log("atualização",result);
        return result.affected === 1;
    }

    async verificarSePerfilUsuarioExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from('Perfil_Usuario', 'pu')
            .where('pu.id = :id', { id })
            .getRawOne();

        return !!result;
    }

    async verificarSeUsuarioExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from(UsuarioEntity, 'u')
            .where('u.id = :id', { id })
            .getRawOne();

        return !!result;
    }

    async verificarUsuarioDuplicado(id: number, usuario: string, email: string): Promise<boolean> {
        const usuarioExistente = await this.repository
        .createQueryBuilder("u")
        .where("(u.usuario = :usuario OR u.email = :email)")
        .andWhere("u.id <> :id")
        .setParameters({
            usuario,
            email,
            id
        })
        .getOne();

        return !!usuarioExistente;
    }
}
