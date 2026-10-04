import { Inject, Injectable } from '@nestjs/common';

import { CasaOutputDto } from '../../domain/dto/casa.dto.js';
import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.interface.js';

@Injectable()
export class BuscarCasasUseCase {
    
    constructor (
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) { }

    async buscarCasas(): Promise<CasaOutputDto[]> {
        return await this.casaRepository.getAll();
    }
}
