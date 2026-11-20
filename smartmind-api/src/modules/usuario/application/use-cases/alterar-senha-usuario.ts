import { Inject, Injectable } from '@nestjs/common';

import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AlterarSenhaDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class AlterarSenhaUsuarioUseCase {
    constructor(
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) {}

    async executar(id: number, dto: AlterarSenhaDto): Promise<Response> {
        const usuario = await this.usuarioRepository.getUsuarioEntity(id);
        if (!usuario) {
            return Response.erro(TipoRetorno.NotFound, 'usuário não encontrado na base!');
        }

        // ⚠️ QUANDO IMPLEMENTAR O BCRYPT (SEÇÃO 9.1), TROQUE PELA COMPARAÇÃO COM bcrypt.compare
        if (usuario.getSenha() !== dto.senhaAtual) {
            return Response.erro(TipoRetorno.BadRequest, 'senha atual incorreta');
        }

        if (dto.senhaAtual === dto.senhaNova) {
            return Response.erro(TipoRetorno.BadRequest, 'a nova senha deve ser diferente da atual');
        }

        usuario.setSenha(dto.senhaNova);
        if (!usuario.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', usuario.notificationsList);
        }

        const atualizado = await this.usuarioRepository.update(usuario);
        if (!atualizado) {
            return Response.erro(TipoRetorno.Conflict, 'senha não pode ser alterada');
        }

        return Response.ok('senha alterada com sucesso');
    }
}