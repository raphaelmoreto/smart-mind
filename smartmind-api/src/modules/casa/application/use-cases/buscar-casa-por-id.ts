import { Inject, Injectable } from '@nestjs/common';

import { CasaOutputDto } from '../../domain/dto/casa.dto.js';
import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.interface.js';

@Injectable()
export class BuscarCasaPorIdUseCase {

    constructor (
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) { }

    async buscaPorId(id: number): Promise<CasaOutputDto | null> {
        return await this.casaRepository.getById(id);
    }
}
