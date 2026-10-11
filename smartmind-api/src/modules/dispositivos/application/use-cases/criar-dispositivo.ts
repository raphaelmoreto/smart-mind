import { Inject, Injectable } from '@nestjs/common';

import { Response } from '../../../core/application/response/response.ts';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.ts';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.ts';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.ts';
import { DispositivoInputDto } from '../../domain/dto/dispositivo.dto.ts';
import { DispositivoEntity } from '../../domain/entities/dispositivo.entity.ts';

@Injectable()
export class CriarDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async create(dto: DispositivoInputDto): Promise<Response> {
        const tipoExiste = await this.dispositivoRepository.verificarSeTipoDispositivoExiste(dto.fk_tipoDispositivo);
        if (!tipoExiste) {
            return Response.erro(TipoRetorno.NotFound, 'tipo de dispositivo não encontrado');
        }

        const casaExiste = await this.dispositivoRepository.verificarSeCasaExiste(dto.fk_casa);
        if (!casaExiste) {
            return Response.erro(TipoRetorno.NotFound, 'casa não encontrada ou inativa');
        }

        const dispositivo = DispositivoEntity.instanciarDispositivo(
            dto.nome,
            dto.fk_tipoDispositivo,
            dto.fk_casa
        );

        if (!dispositivo.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', dispositivo.notificationsList);
        }

        const inserido = await this.dispositivoRepository.insert(dispositivo);
        if (!inserido) {
            return Response.erro(TipoRetorno.Conflict, 'dispositivo não pode ser cadastrado');
        }

        return Response.ok('dispositivo cadastrado com sucesso');
    }
}
