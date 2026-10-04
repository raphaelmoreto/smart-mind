import { Inject, Injectable } from '@nestjs/common';

import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { CasaInputDto } from '../../domain/dto/casa.dto.js';
import { CASA_REPOSITORY } from '../../casa.constants.js';

@Injectable()
export class AtualizarCasaUseCase {

    constructor (
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) { }

    async atualizarCasa(id: number, dto: CasaInputDto): Promise<Response> {
        const casaEntity = await this.casaRepository.getCasaEntity(id);
        if (!casaEntity) {
            return Response.erro(
                TipoRetorno.NotFound,
                "casa não encontrada na base!"
            );
        }

        casaEntity.setBairro(dto.bairro);
        casaEntity.setCep(dto.cep);
        casaEntity.setCidade(dto.cidade);
        casaEntity.setFK_Usuario(dto.fk_usuario);
        casaEntity.setNome(dto.nome);
        casaEntity.setNumero(dto.numero);
        casaEntity.setRua(dto.rua);
        if (!casaEntity.isValid) {
            return Response.erro(
                TipoRetorno.Validation,
                "erro de validação",
                casaEntity.notificationsList
            );
        }

        const casaAtualizada = await this.casaRepository.update(casaEntity);
        if (!casaAtualizada) {
            return Response.erro(
                TipoRetorno.Conflict,
                "erro! casa não pode ser atualizada"
            );
        }

        return Response.ok("casa atualizada com sucesso");
    }
}
