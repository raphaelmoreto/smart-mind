import { Inject, Injectable } from '@nestjs/common';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { DispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class BuscarDispositivoPorIdUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async buscaPorId(id: number): Promise<DispositivoOutputDto | null> {
        return this.dispositivoRepository.getById(id);
    }
}
