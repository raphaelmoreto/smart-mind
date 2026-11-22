import { Inject, Injectable } from '@nestjs/common';

import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AMBIENTE_REPOSITORY } from '../../ambiente.constants.js';
import type { IAmbienteRepository } from '../../domain/interfaces/repositories/ambiente.repository.interface.js';

@Injectable()
export class DeletarAmbienteUseCase {
    constructor(
        @Inject(AMBIENTE_REPOSITORY)
        private readonly ambienteRepository: IAmbienteRepository
    ) {}

    async delete(id: number): Promise<Response> {
        if (id <= 0) {
            return Response.erro(TipoRetorno.BadRequest, 'id do ambiente não informado');
        }

        // NÃO APAGA UM CÔMODO QUE AINDA TEM APARELHOS (O USUÁRIO MOVE ELES ANTES)
        const totalDispositivos = await this.ambienteRepository.contarDispositivos(id);
        if (totalDispositivos > 0) {
            return Response.erro(
                TipoRetorno.Conflict,
                `mova os ${totalDispositivos} dispositivo(s) deste ambiente antes de removê-lo`
            );
        }

        const deletado = await this.ambienteRepository.delete(id);
        if (!deletado) {
            return Response.erro(TipoRetorno.NotFound, 'ambiente não encontrado');
        }

        return Response.ok('ambiente removido com sucesso');
    }
}