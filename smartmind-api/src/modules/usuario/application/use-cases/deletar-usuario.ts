import { Inject, Injectable } from '@nestjs/common';
import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';


@Injectable()
export class DeletarUsuarioUseCase {
    
    constructor (
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) { }

    async delete(id: number): Promise<Response> {
        if (id < 0)
            return Response.erro(TipoRetorno.BadRequest, "id do usuário não informado!");

        const verficarUsuario = await this.usuarioRepository.verificarSeUsuarioExiste(id);
        if (!verficarUsuario) {
            return Response.erro(
                TipoRetorno.NotFound,
                "usuário não encontrado na base!"
            );
        }

        const deleteUsuario = await this.usuarioRepository.delete(id);
        if (!deleteUsuario) {
            return Response.erro(
                TipoRetorno.Conflict,
                "usuário não pode ser deletado"
            );
        }

        return Response.ok("usuário deletado com sucesso");
    }
}
