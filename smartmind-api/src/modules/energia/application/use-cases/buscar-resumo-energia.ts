import { Inject, Injectable } from '@nestjs/common';

import { ENERGIA_REPOSITORY } from '../../energia.constants.js';
import type { IEnergiaRepository } from '../../domain/interfaces/repositories/energia.repository.interface.js';
import { ResumoEnergiaDto } from '../../domain/dto/energia.dto.js';

@Injectable()
export class BuscarResumoEnergiaUseCase {

    constructor(
        @Inject(ENERGIA_REPOSITORY)
        private readonly energiaRepository: IEnergiaRepository
    ) {}

    async buscar(casaId: number): Promise<ResumoEnergiaDto> {
        const [consumo, porDispositivo, tarifa, ultima] = await Promise.all([
            this.energiaRepository.buscarConsumoMesAtualEAnterior(casaId),
            this.energiaRepository.buscarConsumoPorDispositivoNoMes(casaId),
            this.energiaRepository.buscarTarifaVigente(casaId),
            this.energiaRepository.buscarUltimaPrevisao(casaId),
        ]);

        // PROJEÇÃO SIMPLES: CONSUMO ATÉ HOJE ÷ DIAS PASSADOS × DIAS DO MÊS
        const hoje = new Date();
        const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        const diasPassados = hoje.getDate();
        const projecao = (consumo.atual / diasPassados) * diasNoMes;

        return {
            consumo_mes_atual_kwh: Number(consumo.atual.toFixed(2)),
            consumo_mes_anterior_kwh: Number(consumo.anterior.toFixed(2)),
            projecao_mes_kwh: Number(projecao.toFixed(2)),
            dias_no_mes: diasNoMes,
            tarifa,
            ultima_previsao: ultima
                ? {
                      ...ultima,
                      valor_estimado: Number((ultima.consumo_previsto_kwh * tarifa.valor_total_kwh).toFixed(2)),
                      tarifa_kwh: tarifa.valor_total_kwh,
                      bandeira: tarifa.bandeira,
                  }
                : null,
            por_dispositivo: porDispositivo,
        };
    }
}