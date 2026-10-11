import { Inject, Injectable } from '@nestjs/common';

import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';

@Injectable()
export class DeletarDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async delete(id: number): Promise<Response> {
        if (id <= 0) {
            return Response.erro(TipoRetorno.BadRequest, 'id do dispositivo não informado');
        }

        const existe = await this.dispositivoRepository.verificarSeDispositivoExiste(id);
        if (!existe) {
            return Response.erro(TipoRetorno.NotFound, 'dispositivo não encontrado');
        }

        const deletado = await this.dispositivoRepository.delete(id);
        if (!deletado) {
            return Response.erro(TipoRetorno.Conflict, 'dispositivo não pode ser removido');
        }

        return Response.ok('dispositivo removido com sucesso');
    }
}
