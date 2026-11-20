import { Inject, Injectable } from '@nestjs/common';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';

@Injectable()
export class AlterarEstadoDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async alterar(id: number, ligado: boolean): Promise<Response> {
        const alterado = await this.dispositivoRepository.alterarEstado(id, ligado);
        if (!alterado) {
            return Response.erro(TipoRetorno.NotFound, 'dispositivo não encontrado');
        }
        return Response.ok(ligado ? 'dispositivo ligado' : 'dispositivo desligado');
    }
}