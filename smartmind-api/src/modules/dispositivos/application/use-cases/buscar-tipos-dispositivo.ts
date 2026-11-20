import { Inject, Injectable } from '@nestjs/common';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { TipoDispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class BuscarTiposDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async buscar(): Promise<TipoDispositivoOutputDto[]> {
        return this.dispositivoRepository.getTipos();
    }
}