import { Inject, Injectable } from '@nestjs/common';

import { ENERGIA_REPOSITORY } from '../../energia.constants.js';
import type { IEnergiaRepository } from '../../domain/interfaces/repositories/energia.repository.interface.js';
import { PeriodoSerie, PontoSerieDto } from '../../domain/dto/energia.dto.js';

// RÓTULO DE CADA BARRA DO GRÁFICO, EM PORTUGUÊS
const ROTULOS: Record<PeriodoSerie, (data: Date) => string> = {
    dia: (data) => `${String(data.getHours()).padStart(2, '0')}h`,
    semana: (data) => data.toLocaleDateString('pt-BR', { weekday: 'short' }),
    ano: (data) => data.toLocaleDateString('pt-BR', { month: 'short' }),
};

@Injectable()
export class BuscarSerieConsumoUseCase {

    constructor(
        @Inject(ENERGIA_REPOSITORY)
        private readonly energiaRepository: IEnergiaRepository
    ) {}

    async buscar(casaId: number, periodo: PeriodoSerie = 'semana'): Promise<PontoSerieDto[]> {
        const pontos = await this.energiaRepository.buscarSerie(casaId, periodo);

        return pontos.map((ponto) => ({
            rotulo: ROTULOS[periodo](new Date(ponto.inicio)),
            inicio: ponto.inicio,
            kwh: Number(ponto.kwh.toFixed(3)),
        }));
    }
}