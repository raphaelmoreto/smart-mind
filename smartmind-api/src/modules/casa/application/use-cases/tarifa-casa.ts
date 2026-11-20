import { Inject, Injectable } from '@nestjs/common';
import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.js';
import { TarifaInputDto, TarifaOutputDto } from '../../domain/dto/casa.dto.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';

@Injectable()
export class TarifaCasaUseCase {
    constructor(
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) {}

    async buscarVigente(casaId: number): Promise<TarifaOutputDto | null> {
        return this.casaRepository.getTarifaVigente(casaId);
    }

    async registrar(casaId: number, dto: TarifaInputDto): Promise<Response> {
        const existe = await this.casaRepository.verificarSeCasaExiste(casaId);
        if (!existe) {
            return Response.erro(TipoRetorno.NotFound, 'casa não encontrada na base');
        }

        const inserida = await this.casaRepository.inserirTarifa(casaId, dto);
        if (!inserida) {
            return Response.erro(TipoRetorno.Conflict, 'tarifa não pode ser registrada');
        }

        return Response.ok('tarifa registrada com sucesso');
    }
}