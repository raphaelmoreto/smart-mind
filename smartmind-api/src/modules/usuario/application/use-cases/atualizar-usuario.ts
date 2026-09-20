import { Inject, Injectable } from '@nestjs/common';

import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { UsuarioEntity } from '../../domain/entities/usuario.entity.js';
import { UsuarioInputDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class AtualizarUsuarioUseCase {

    constructor (
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) { }

    async atualizarUsuario(id: number, dto: UsuarioInputDto): Promise<Response> {
        const verificarFk_Perfil = await this.usuarioRepository.verificarSePerfilUsuarioExiste(dto.fk_perfil);
        if (!verificarFk_Perfil) {
            return Response.erro(
                TipoRetorno.NotFound,
                "perfil de usuário não encontrado na base!"
            );
        }
        
        const usuarioEntity = await this.usuarioRepository.getUsuarioEntity(id);
        if (!usuarioEntity) {
            return Response.erro(
                TipoRetorno.NotFound,
                "usuário não encontrado na base!"
            );
        }

        const usuarioDuplicado =
            await this.usuarioRepository.verificarUsuarioDuplicado(id, dto.usuario, dto.email);
        if (usuarioDuplicado) {
            return Response.erro(
                TipoRetorno.Conflict,
                "já existe outro usuário cadastrado com esse usuário ou e-mail!"
            );
        }

        usuarioEntity.setNome(dto.nome);
        usuarioEntity.setUsuario(dto.usuario);
        usuarioEntity.setEmail(dto.email);
        usuarioEntity.setSenha(dto.senha);
        usuarioEntity.setFK_Perfil(dto.fk_perfil);
        if (!usuarioEntity.isValid) {
            return Response.erro(
                TipoRetorno.Validation,
                "erro de validação",
                usuarioEntity.notificationsList
            );
        }

        const usuarioAtualizado = await this.usuarioRepository.update(usuarioEntity);
        if (!usuarioAtualizado) {
            return Response.erro(
                TipoRetorno.Conflict,
                "erro! usuário não pode ser atualizado"
            );
        }

        return Response.ok("usuário atualizado com sucesso");
    }
}
