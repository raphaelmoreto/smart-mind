import { Inject, Injectable } from '@nestjs/common';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { DispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class BuscarDispositivosPorCasaUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async buscar(casaId: number): Promise<DispositivoOutputDto[]> {
        return this.dispositivoRepository.getAllByCasa(casaId);
    }
}