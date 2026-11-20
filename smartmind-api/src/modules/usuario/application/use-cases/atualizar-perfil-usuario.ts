import { Inject, Injectable } from '@nestjs/common';

import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AtualizarPerfilDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class AtualizarPerfilUsuarioUseCase {
    constructor(
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) {}

    async executar(id: number, dto: AtualizarPerfilDto): Promise<Response> {
        const usuario = await this.usuarioRepository.getUsuarioEntity(id);
        if (!usuario) {
            return Response.erro(TipoRetorno.NotFound, 'usuário não encontrado na base!');
        }

        const duplicado = await this.usuarioRepository.verificarUsuarioDuplicado(id, dto.usuario.trim(), dto.email.trim());
        if (duplicado) {
            return Response.erro(TipoRetorno.Conflict, 'já existe outro usuário cadastrado com esse usuário ou e-mail!');
        }

        usuario.setNome(dto.nome);
        usuario.setUsuario(dto.usuario);
        usuario.setEmail(dto.email);
        if (!usuario.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', usuario.notificationsList);
        }

        const atualizado = await this.usuarioRepository.update(usuario);
        if (!atualizado) {
            return Response.erro(TipoRetorno.Conflict, 'erro! perfil não pode ser atualizado');
        }

        return Response.ok('perfil atualizado com sucesso');
    }
}