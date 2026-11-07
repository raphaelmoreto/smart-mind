import { Inject, Injectable } from '@nestjs/common';

import { PythonAiClient } from '../clients/python-ai.client.js';
import { ConsumoCalculatorUseCase } from './consumo-calculator.js';
import { EconomiaUseCase } from './economia.js';

import type { ITarifaRepository } from '../../domain/interfaces/tarifa.repository.interface.js';
import type { IConsumoRepository } from '../../domain/interfaces/consumo.repository.interface.js';
import type { IChatHistoryRepository } from '../../domain/interfaces/chat-history.repository.interface.js';

import { TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY } from '../../chatbot.constants.js';

@Injectable()
export class ChatbotUseCase {

    constructor(
        private readonly pythonAiClient: PythonAiClient,
        private readonly consumoCalculator: ConsumoCalculatorUseCase,
        private readonly economiaUseCase: EconomiaUseCase,

        @Inject(TARIFA_REPOSITORY)
        private readonly tarifaRepository: ITarifaRepository,

        @Inject(CONSUMO_REPOSITORY)
        private readonly consumoRepository: IConsumoRepository,

        @Inject(CHAT_HISTORY_REPOSITORY)
        private readonly chatHistoryRepository: IChatHistoryRepository,
    ) {}

    async executar(casaId: string, mensagem: string) {

        console.log(mensagem);

        // 1. Identificar intenção e entidades usando Python.
        const nlu = await this.pythonAiClient.processarMensagem(mensagem);

        // 2. Verificar a intenção identificada.
        if (nlu.intent !== 'consultar_consumo') {
            return {
                resposta: 'Ainda não consigo responder a essa solicitação.',
                intent: nlu.intent,
            };
        }

        const dispositivo = nlu.entities.dispositivo;
        const horasPorDia = Number(nlu.entities.horas_por_dia);

        // 3. Buscar informações do dispositivo.
        // Exemplo temporário: substituir por consulta real.
        const potenciaWatts = 1000;
        const dispositivoId = 'dispositivo-exemplo';

        // 4. Buscar tarifa da casa.
        const tarifa = await this.tarifaRepository.buscarTarifaAtual(casaId);

        // 5. Calcular consumo e custo.
        const resultado = this.consumoCalculator.calcular(
            potenciaWatts,
            horasPorDia,
            30,
            tarifa,
        );

        // 6. Salvar consumo.
        await this.consumoRepository.salvarConsumo(
            casaId,
            dispositivoId,
            resultado.consumoKwh,
            resultado.custo,
        );

        // 7. Gerar sugestões.
        const sugestoes = this.economiaUseCase.sugerirEconomia(
            dispositivo,
            horasPorDia,
        );

        // 8. Montar resposta.
        const resposta =
            `O ${dispositivo} consome aproximadamente ` +
            `${resultado.consumoKwh.toFixed(2)} kWh por mês. ` +
            `O custo estimado é R$ ${resultado.custo.toFixed(2)}.`;

        // 9. Salvar histórico.
        await this.chatHistoryRepository.salvarMensagem(
            casaId,
            mensagem,
            resposta,
        );

        return {
            intent: nlu.intent,
            dispositivo,
            consumoKwh: resultado.consumoKwh,
            custo: resultado.custo,
            sugestoes,
            resposta,
        };
    }
}