import { Inject, Injectable } from '@nestjs/common';

import { AUTH_REPOSITORY } from '../../auth.constants.js';
import type { IAuthRepository } from '../../domain/interfaces/repositories/auth.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { LoginInputDto, LoginOutputDto } from '../../domain/dto/login.dto.js';

@Injectable()
export class ValidarLoginUseCase {

    constructor (
        @Inject(AUTH_REPOSITORY)
        private readonly authRepository: IAuthRepository
    ) { }

    async validarLogin(login: LoginInputDto): Promise<Response | LoginOutputDto> {
        if (!login.usuario || !login.senha) {
            return Response.erro(
                TipoRetorno.BadRequest,
                "usuário e senha são obrigatórios"
            );
        }

        const usuario = await this.authRepository.validarLogin(login);
        if (usuario === null) {
            return Response.erro(
                TipoRetorno.BadRequest,
                "usuário ou senha inválidos!"
            );
        }

        return usuario;
    }
}