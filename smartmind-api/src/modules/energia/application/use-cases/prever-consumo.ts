import { Inject, Injectable } from '@nestjs/common';

import { PythonAiClient } from '../../../chatbot/application/clients/python-ai.client.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { ENERGIA_REPOSITORY, MODELO_PREVISAO } from '../../energia.constants.js';
import type { IEnergiaRepository } from '../../domain/interfaces/repositories/energia.repository.interface.js';
import { PrevisaoOutputDto } from '../../domain/dto/energia.dto.js';

const MESES_HISTORICO = 3;
const TEMPERATURA_PADRAO = 25;

@Injectable()
export class PreverConsumoUseCase {

    constructor(
        @Inject(ENERGIA_REPOSITORY)
        private readonly energiaRepository: IEnergiaRepository,
        private readonly pythonAiClient: PythonAiClient,
    ) {}

    // PREVÊ O CONSUMO DO MÊS SEGUINTE AO ÚLTIMO MÊS FECHADO E GRAVA EM "Previsoes"
    async executar(casaId: number): Promise<PrevisaoOutputDto | Response> {
        const historico = await this.energiaRepository.buscarHistoricoMesesFechados(casaId, MESES_HISTORICO);

        if (!historico.length) {
            return Response.erro(
                TipoRetorno.Validation,
                'é preciso pelo menos um mês completo de medições para prever o consumo'
            );
        }

        // O ÚLTIMO MÊS FECHADO PRECISA SER O MÊS PASSADO; SENÃO A PREVISÃO SERIA DE UM MÊS QUE JÁ ACABOU
        const ultimo = historico[historico.length - 1];
        const [ano, mes] = ultimo.mes.split('-').map(Number);
        const hoje = new Date();
        const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

        if (ano !== mesPassado.getFullYear() || mes !== mesPassado.getMonth() + 1) {
            return Response.erro(
                TipoRetorno.Validation,
                `as medições estão desatualizadas: o último mês completo é ${ultimo.mes}`
            );
        }

        // MESMAS FEATURES DO DATASET (historico_consumo.csv): tendencia = consumo_mes - media_3_meses
        const consumoMes = ultimo.total_kwh;
        const media = historico.reduce((soma, h) => soma + h.total_kwh, 0) / historico.length;
        const tendencia = consumoMes - media;
        const temperatura = (await this.energiaRepository.buscarTemperaturaMedia(casaId, 30)) ?? TEMPERATURA_PADRAO;
        const tarifa = await this.energiaRepository.buscarTarifaVigente(casaId);

        const previsao = await this.pythonAiClient.predictConsumption({
            consumo_mes: Number(consumoMes.toFixed(2)),
            media_3_meses: Number(media.toFixed(2)),
            tendencia: Number(tendencia.toFixed(2)),
            temperatura_media: Number(temperatura.toFixed(1)),
            mes,
            bandeira: tarifa.bandeira,
        });

        const kwh = Number(Number(previsao.consumo_previsto).toFixed(2));

        // MÊS DE REFERÊNCIA = MÊS SEGUINTE AO ÚLTIMO FECHADO (OU SEJA, O MÊS ATUAL)
        const referencia = new Date(ano, mes, 1); // "mes" VAI DE 1 A 12, ENTÃO new Date(ano, mes) JÁ É O MÊS SEGUINTE
        const periodoReferencia =
            `${referencia.getFullYear()}-${String(referencia.getMonth() + 1).padStart(2, '0')}-01`;

        const dtPrevisao = await this.energiaRepository.salvarPrevisao(casaId, kwh, periodoReferencia, MODELO_PREVISAO);

        return {
            consumo_previsto_kwh: kwh,
            valor_estimado: Number((kwh * tarifa.valor_total_kwh).toFixed(2)),
            tarifa_kwh: tarifa.valor_total_kwh,
            bandeira: tarifa.bandeira,
            periodo_referencia: periodoReferencia,
            modelo: MODELO_PREVISAO,
            dt_previsao: dtPrevisao,
        };
    }
}