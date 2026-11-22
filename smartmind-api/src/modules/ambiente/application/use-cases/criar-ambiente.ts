import { Inject, Injectable } from '@nestjs/common';

import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AMBIENTE_REPOSITORY } from '../../ambiente.constants.js';
import type { IAmbienteRepository } from '../../domain/interfaces/repositories/ambiente.repository.interface.js';
import { AmbienteInputDto } from '../../domain/dto/ambiente.dto.js';
import { AmbienteEntity } from '../../domain/entities/ambiente.entity.js';

@Injectable()
export class CriarAmbienteUseCase {
    constructor(
        @Inject(AMBIENTE_REPOSITORY)
        private readonly ambienteRepository: IAmbienteRepository
    ) {}

    async create(dto: AmbienteInputDto): Promise<Response> {
        const casaExiste = await this.ambienteRepository.verificarSeCasaExiste(dto.fk_casa);
        if (!casaExiste) {
            return Response.erro(TipoRetorno.NotFound, 'casa não encontrada ou inativa');
        }

        const duplicado = await this.ambienteRepository.verificarNomeDuplicado(dto.fk_casa, dto.nome);
        if (duplicado) {
            return Response.erro(TipoRetorno.Conflict, 'já existe um ambiente com esse nome nesta casa');
        }

        const ambiente = AmbienteEntity.instanciarAmbiente(dto.nome, dto.descricao, dto.fk_casa);
        if (!ambiente.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', ambiente.notificationsList);
        }

        const inserido = await this.ambienteRepository.insert(ambiente);
        if (!inserido) {
            return Response.erro(TipoRetorno.Conflict, 'ambiente não pode ser cadastrado');
        }

        return Response.ok('ambiente cadastrado com sucesso');
    }
}