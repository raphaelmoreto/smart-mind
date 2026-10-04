import { Inject, Injectable } from '@nestjs/common';

import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';

@Injectable()
export class DeletarCasaUseCase {
    
    constructor (
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) {}

    async delete(id: number): Promise<Response> {
        if (id < 0)
            return Response.erro(TipoRetorno.BadRequest, "id do usuário não informado!");

        const verificarCasa = await this.casaRepository.verificarSeCasaExiste(id);
        if (!verificarCasa) {
            return Response.erro(
                TipoRetorno.NotFound,
                "casa não encontrada na base"
            );
        }

        const deleteCasa = await this.casaRepository.delete(id);
        if (!deleteCasa) {
            return Response.erro(
                TipoRetorno.Conflict,
                "casa não pode ser deletada"
            );
        }

        return Response.ok("casa deletada com sucesso");
    }
}
