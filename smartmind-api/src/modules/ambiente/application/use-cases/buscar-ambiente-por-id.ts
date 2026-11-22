import { Inject, Injectable } from '@nestjs/common';
import { AMBIENTE_REPOSITORY } from '../../ambiente.constants.js';
import type { IAmbienteRepository } from '../../domain/interfaces/repositories/ambiente.repository.interface.js';
import { AmbienteOutputDto } from '../../domain/dto/ambiente.dto.js';

@Injectable()
export class BuscarAmbientePorIdUseCase {
    constructor(
        @Inject(AMBIENTE_REPOSITORY)
        private readonly ambienteRepository: IAmbienteRepository
    ) {}

    async buscaPorId(id: number): Promise<AmbienteOutputDto | null> {
        return this.ambienteRepository.getById(id);
    }
}