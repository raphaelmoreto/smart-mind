import { Inject, Injectable } from '@nestjs/common';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { DispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class BuscarDispositivosUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async buscarDispositivos(): Promise<DispositivoOutputDto[]> {
        return this.dispositivoRepository.getAll();
    }
}
