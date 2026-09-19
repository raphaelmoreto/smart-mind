import { DATABASE_POOL } from '../../../core/database/database.constants.js';
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { UsuarioEntity } from '../../domain/entities/usuario.entity.js';
import { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';

/*
• @Injectable() - INDICA QUE A CLASSE PODE SER GERENCIADA PELO SISTEMA DE DEPENDENCY INJECTION DO NESTJS;

• @Inject() - INDICA QUAL PROPRIEDADE/PARÂMETRO QUEREMOS COMO DEPENDÊNCIA 
*/

@Injectable()
export class UsuarioRepository implements IUsuarioRepository {

    constructor (
        @Inject(DATABASE_POOL)
        private readonly pool: Pool
    )
    { }

    async delete(id: number): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    getAll(): Promise<UsuarioEntity[]> {
        throw new Error('Method not implemented.');
    }

    getById(id: number): Promise<UsuarioEntity | null> {
        throw new Error('Method not implemented.');
    }

    async insert(entity: UsuarioEntity): Promise<boolean> {

        /*O "ON CONFLICT DO NOTHING" ESTÁ DIZENDO PARA O BANCO: "FAÇA INSERT. SE HOUVER CONFLITO COM UMA UNIQUE, NÃO INSIRA"*/
        const query =
        `   
            INSERT INTO Usuario (nome, usuario, email, senha, dt_cadastro, fk_perfil)
                         VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
        `;

        const values = [
            entity.getNome(),
            entity.getUsuario(),
            entity.getEmail(),
            entity.getSenha(),
            entity.getDtCadastro(),
            entity.getFK_Perfil()
        ];

        const teste = await this.pool.query(query, values)
        console.log(teste.rowCount);

        // return (await this.pool.query(query, values)).rowCount === 1;
        return teste.rowCount === 1;
    }

    update(entity: UsuarioEntity): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

}
