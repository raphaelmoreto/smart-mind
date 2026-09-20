import { Inject, Injectable } from '@nestjs/common';
import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { UsuarioEntity } from '../../domain/entities/usuario.entity.js';
import { UsuarioInputDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class CriarUsuarioUseCase {

    constructor (
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) { }

    async create(dto: UsuarioInputDto): Promise<Response> {
        const verificarFk_Perfil = await this.usuarioRepository.verificarSePerfilUsuarioExiste(dto.fk_perfil);
        if (!verificarFk_Perfil) {
            return Response.erro(
                TipoRetorno.NotFound,
                "perfil de usuário não encontrado"
            );
        }
        
        const usuario = UsuarioEntity.instanciarUsuario(
            dto.nome,
            dto.usuario,
            dto.email,
            dto.senha,
            dto.fk_perfil
        );

        if (!usuario.isValid) {
            return Response.erro(
                TipoRetorno.Validation,
                "erro de validação",
                usuario.notificationsList
            );
        }

        const insert = await this.usuarioRepository.insert(usuario);
        if (!insert) {
            return Response.erro(
                TipoRetorno.Conflict,
                "usuário não pode ser cadastrado"
            );
        }

        return Response.ok("usuário cadastrado com sucesso");
    }
}