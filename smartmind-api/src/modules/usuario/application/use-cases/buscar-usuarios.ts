import { Inject, Injectable } from '@nestjs/common';
import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { UsuarioOutputDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class BuscarUsuariosUseCase {

    constructor (
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) { }

    async buscarUsuarios(): Promise<UsuarioOutputDto[]> {
        return await this.usuarioRepository.getAll();
    }
}
