import { Injectable } from '@nestjs/common';
import { IAuthRepository } from '../../domain/interfaces/repositories/auth.repository.interface.js';
import { LoginInputDto, LoginOutputDto } from '../../domain/dto/login.dto.js';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthRepository implements IAuthRepository {

    constructor (
            private readonly dataSource: DataSource 
        ) { }

    async validarLogin(login: LoginInputDto): Promise<LoginOutputDto | null> {
        const usuario: LoginOutputDto[] = await this.dataSource.query(
            `
            SELECT
                u.id
                ,u.nome
                ,pu.tipo AS "role"
            FROM "Usuario" AS u
            INNER JOIN "Perfil_Usuario" AS pu
                ON u.fk_perfil = pu.id
            WHERE u.usuario = $1
                AND u.senha = $2
                AND u.ativo = TRUE;
            `,
            [login.usuario, login.senha]
        );

        return usuario[0] ?? null;
    }
}