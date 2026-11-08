import { Inject, Injectable } from '@nestjs/common';

import { PythonAiClient } from '../clients/python-ai.client.js';
import { ConsumoCalculatorUseCase } from './consumo-calculator.js';
import { EconomiaUseCase } from './economia.js';

import type { ITarifaRepository } from '../../domain/interfaces/tarifa.repository.interface.js';
import type { IConsumoRepository } from '../../domain/interfaces/consumo.repository.interface.js';
import type { IChatHistoryRepository } from '../../domain/interfaces/chat-history.repository.interface.js';

import { TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY } from '../../chatbot.constants.js';
import { ChatbotInputDto } from '../../domain/dto/chatbot.dto.js';

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

    async executar(dto: ChatbotInputDto) {

        // Identificar intenção e entidades usando Python.
        const nlu = await this.pythonAiClient.processarMensagem(dto.message);

        const nluEntities = nlu.entities ?? {};

        const entities = {
            ...dto.context,
            ...nluEntities,

            // Normalização das entidades vindas do Python
            device:
                nluEntities.device ??
                nluEntities.dispositivo ??
                dto.context?.device,

            power_watts:
                nluEntities.power_watts ??
                nluEntities.potencia_watts ??
                dto.context?.power_watts,

            hours_per_day:
                nluEntities.hours_per_day ??
                nluEntities.horas_por_dia ??
                dto.context?.hours_per_day,

            days_per_month:
                nluEntities.days_per_month ??
                nluEntities.dias_por_mes ??
                dto.context?.days_per_month
        };

        const intent = nlu.intent;

        if (intent === 'saudacao') {
            return {
                message: 'Olá! Sou o assistente SmartMind. Posso ajudar a analisar seu consumo de energia.',
                intent
            };
        }

        if (intent === 'consultar_consumo') {
            return {
                message: 'Vou precisar consultar o histórico de consumo da sua residência para responder.',
                intent,
                action: 'request_consumption_history'
            };
        }

        if (intent === 'prever_fatura') {
            return {
                message: 'Para prever sua próxima conta de energia, preciso analisar seu histórico de consumo.',
                intent,
                action: 'request_consumption_history'
            };
        }

        if (intent === 'consultar_dispositivos') {
            return {
                message: 'Vou consultar os dispositivos cadastrados na sua residência.',
                intent,
                action: 'request_devices'
            };
        }

        if (intent === 'buscar_economia') {
            const device = entities.device;

            if (!device) {
                return {
                    message: 'Qual dispositivo você deseja analisar?',
                    intent,
                    entities
                };
            }

            const suggestions = this.economiaUseCase.sugerirEconomia(
                device,
                0,
                Number(entities.hours_per_day ?? 0)
            );

            return {
                message: 'Encontrei algumas sugestões para você economizar energia.',
                intent,
                suggestions,
                entities
            };
        }

        if (intent === 'calcular_consumo') {
            const missing: string[] = [];

            if (!entities.device) {
                missing.push('dispositivo');
            }

            if (!entities.power_watts) {
                missing.push('potência em watts');
            }

            if (!entities.hours_per_day) {
                missing.push('horas de utilização por dia');
            }

            if (missing.length > 0) {
                return {
                    message: `Para calcular o consumo, preciso saber: ${missing.join(', ')}.`,
                    intent,
                    entities,
                    missing
                };
            }

            const days = Number(
                entities.days_per_month ?? 30
            );

            const tariff = Number(
                entities.tariff ??
                await this.tarifaRepository.buscarTarifaAtual(dto.casaId)
            );

            const power = Number(entities.power_watts);
            const hours = Number(entities.hours_per_day);

            if (
                !Number.isFinite(power) ||
                !Number.isFinite(hours) ||
                !Number.isFinite(days) ||
                !Number.isFinite(tariff) ||
                power <= 0 ||
                hours <= 0 ||
                hours > 24 ||
                days < 1 ||
                days > 31 ||
                tariff <= 0
            ) {
                return {
                    message: 'Os dados informados para calcular o consumo são inválidos.',
                    intent
                };
            }

            // Calcular consumo mensal.
            const consumption =
                this.consumoCalculator.calcularConsumo(
                    power,
                    hours,
                    days
                );

            // Calcular custo mensal.
            const cost =
                this.consumoCalculator.calcularCusto(
                    consumption,
                    tariff
                );

            // Gerar sugestões.
            const suggestions =
                this.economiaUseCase.sugerirEconomia(
                    entities.device,
                    consumption,
                    hours
                );

            return {
                message: `O ${entities.device} possui consumo estimado de ${consumption} kWh por mês, representando aproximadamente R$ ${cost.toFixed(2)}.`,
                intent,
                entities,
                result: {
                    consumption_kwh: consumption,
                    monthly_cost: cost,
                    tariff
                },
                suggestions
            };
        }

        return {
            message: 'Ainda não consigo executar essa operação. Poderia explicar de outra maneira?',
            intent: intent ?? 'unknown'
        };
    }
}