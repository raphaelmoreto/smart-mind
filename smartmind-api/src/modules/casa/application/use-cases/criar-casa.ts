import { Inject, Injectable } from '@nestjs/common';

import { CasaEntity } from '../../domain/entities/casa.entity.js';
import { CasaInputDto } from '../../domain/dto/casa.dto.js';
import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { USUARIO_REPOSITORY } from '../../../usuario/usuario.constants.js';
import type { IUsuarioRepository } from '../../../usuario/domain/interfaces/repositories/usuario.repository.interface.js';

@Injectable()
export class CriarCasaUseCase {

    constructor (
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository,

        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) { }

    async create (dto: CasaInputDto): Promise<Response> {
        const verificarFK_Usuario = await this.usuarioRepository.verificarSeUsuarioExiste(dto.fk_usuario);
        if (!verificarFK_Usuario) {
            return Response.erro(
                TipoRetorno.NotFound,
                "usuário não encontrado na base"
            );
        }

        const casa = CasaEntity.instanciarCasa(
            dto.nome,
            dto.rua,
            dto.bairro,
            dto.cidade,
            dto.numero,
            dto.cep,
            dto.fk_usuario
        );

        if (!casa.isValid) {
            return Response.erro(
                TipoRetorno.Validation,
                "erro de validação",
                casa.notificationsList
            );
        }

        const insert = await this.casaRepository.insert(casa);
        if (!insert) {
            return Response.erro(
                TipoRetorno.Conflict,
                "casa não pode ser cadastrada"
            );
        }

        return Response.ok("casa cadastrada com sucesso");
    }
}
