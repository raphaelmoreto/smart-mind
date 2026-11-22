import { Inject, Injectable } from '@nestjs/common';

import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AMBIENTE_REPOSITORY } from '../../ambiente.constants.js';
import type { IAmbienteRepository } from '../../domain/interfaces/repositories/ambiente.repository.interface.js';
import { AmbienteInputDto } from '../../domain/dto/ambiente.dto.js';

@Injectable()
export class AtualizarAmbienteUseCase {
    constructor(
        @Inject(AMBIENTE_REPOSITORY)
        private readonly ambienteRepository: IAmbienteRepository
    ) {}

    async atualizarAmbiente(id: number, dto: AmbienteInputDto): Promise<Response> {
        const ambiente = await this.ambienteRepository.getAmbienteEntity(id);
        if (!ambiente) {
            return Response.erro(TipoRetorno.NotFound, 'ambiente não encontrado');
        }

        const casaExiste = await this.ambienteRepository.verificarSeCasaExiste(dto.fk_casa);
        if (!casaExiste) {
            return Response.erro(TipoRetorno.NotFound, 'casa não encontrada ou inativa');
        }

        const duplicado = await this.ambienteRepository.verificarNomeDuplicado(dto.fk_casa, dto.nome, id);
        if (duplicado) {
            return Response.erro(TipoRetorno.Conflict, 'já existe um ambiente com esse nome nesta casa');
        }

        ambiente.setNome(dto.nome);
        ambiente.setDescricao(dto.descricao);
        ambiente.setFK_Casa(dto.fk_casa);

        if (!ambiente.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', ambiente.notificationsList);
        }

        const atualizado = await this.ambienteRepository.update(ambiente);
        if (!atualizado) {
            return Response.erro(TipoRetorno.Conflict, 'ambiente não pode ser atualizado');
        }

        return Response.ok('ambiente atualizado com sucesso');
    }
}