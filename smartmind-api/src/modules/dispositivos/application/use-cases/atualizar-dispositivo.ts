import { Inject, Injectable } from '@nestjs/common';

import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { DispositivoInputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class AtualizarDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async atualizarDispositivo(id: number, dto: DispositivoInputDto): Promise<Response> {
        const dispositivo = await this.dispositivoRepository.getDispositivoEntity(id);
        if (!dispositivo) {
            return Response.erro(TipoRetorno.NotFound, 'dispositivo não encontrado');
        }

        const tipoExiste = await this.dispositivoRepository.verificarSeTipoDispositivoExiste(dto.fk_tipoDispositivo);
        if (!tipoExiste) {
            return Response.erro(TipoRetorno.NotFound, 'tipo de dispositivo não encontrado');
        }

        const casaExiste = await this.dispositivoRepository.verificarSeCasaExiste(dto.fk_casa);
        if (!casaExiste) {
            return Response.erro(TipoRetorno.NotFound, 'casa não encontrada ou inativa');
        }

        dispositivo.setNome(dto.nome);
        dispositivo.setFK_TipoDispositivo(dto.fk_tipoDispositivo);
        dispositivo.setFK_Casa(dto.fk_casa);

        if (!dispositivo.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', dispositivo.notificationsList);
        }

        const atualizado = await this.dispositivoRepository.update(dispositivo);
        if (!atualizado) {
            return Response.erro(TipoRetorno.Conflict, 'dispositivo não pode ser atualizado');
        }

        return Response.ok('dispositivo atualizado com sucesso');
    }
}
