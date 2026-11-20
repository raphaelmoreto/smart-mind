import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PythonAiClient } from '../clients/python-ai.client.js';
import { ConsumoCalculatorUseCase } from './consumo-calculator.js';
import { EconomiaUseCase } from './economia.js';

import type { ITarifaRepository } from '../../domain/interfaces/tarifa.repository.interface.js';
import type { IConsumoRepository } from '../../domain/interfaces/consumo.repository.interface.js';
import type { IChatHistoryRepository } from '../../domain/interfaces/chat-history.repository.interface.js';
import type { IDispositivoRepository } from '../../../dispositivos/domain/interfaces/repositories/dispositivo.repository.interface.js';

import { TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY } from '../../chatbot.constants.js';
import { DISPOSITIVO_REPOSITORY } from '../../../dispositivos/dispositivos.constants.js';
import { ChatbotInputDto } from '../../domain/dto/chatbot.dto.js';
import type { ChatbotResposta } from '../../domain/dto/chatbot.dto.js';

// ABAIXO DISSO O BOT ASSUME QUE NÃO ENTENDEU (AJUSTE TESTANDO NO SWAGGER)
const CONFIANCA_MINIMA = 0.35;

// ACIMA DISSO A NOVA FRASE "GANHA" DA PERGUNTA PENDENTE
const CONFIANCA_TROCA_ASSUNTO = 0.7;

const SUGESTOES_INICIAIS = [
    'Quanto gasta um chuveiro de 5500 W por 30 minutos por dia?',
    'Quais dispositivos tenho cadastrados?',
    'Qual foi meu consumo este mês?',
    'Qual a previsão da minha próxima fatura?',
    'Dicas para economizar com o ar-condicionado',
];

type EntidadesChat = {
    device?: string;
    power_watts?: number;
    hours_per_day?: number;
    days_per_month?: number;
    tariff?: number;
};

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

        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository,
    ) {}

    // =====================================================================
    // PONTO DE ENTRADA: VALIDA, RESPONDE E GRAVA NO HISTÓRICO
    // =====================================================================
    async executar(dto: ChatbotInputDto): Promise<ChatbotResposta> {
        const casaValida = await this.chatHistoryRepository.casaPertenceAoUsuario(dto.casaId, dto.usuarioId);
        if (!casaValida) {
            throw new ForbiddenException('A casa informada não pertence a este usuário.');
        }

        if (dto.conversaId) {
            const conversaValida = await this.chatHistoryRepository.conversaPertenceAoUsuario(dto.conversaId, dto.usuarioId);
            if (!conversaValida) {
                throw new NotFoundException('Conversa não encontrada.');
            }
        }

        // PRIMEIRO GERA A RESPOSTA: SE A IA ESTIVER FORA, NÃO CRIA CONVERSA VAZIA
        const resposta = await this.gerarResposta(dto);

        const conversaId = dto.conversaId
            ?? await this.chatHistoryRepository.criarConversa(dto.usuarioId, dto.casaId, this.gerarTitulo(dto.message));

        await this.chatHistoryRepository.salvarMensagem({
            conversaId,
            usuarioId: dto.usuarioId,
            casaId: dto.casaId,
            mensagem: dto.message.trim(),
            resposta: resposta.message,
            intencao: resposta.intent ? resposta.intent.toUpperCase() : null,
            dados: {
                suggestions: resposta.suggestions ?? [],
                result: resposta.result ?? null,
                quick_replies: resposta.quick_replies ?? [],
            },
        });

        return { ...resposta, conversaId };
    }

    private gerarTitulo(mensagem: string): string {
        const texto = mensagem.trim().replace(/\s+/g, ' ');
        return texto.length > 60 ? `${texto.slice(0, 57)}...` : texto;
    }

    // =====================================================================
    // INTERPRETA A MENSAGEM E DECIDE O QUE RESPONDER
    // =====================================================================
    private async gerarResposta(dto: ChatbotInputDto): Promise<ChatbotResposta> {
        const nlu = await this.pythonAiClient.processarMensagem(dto.message);
        const nluEntities = nlu.entities ?? {};
        const contexto = dto.context ?? {};

        // JUNTA O QUE VEIO NA FRASE NOVA COM O QUE JÁ ESTAVA NO CONTEXTO
        const entities: EntidadesChat = {
            device: nluEntities.device ?? contexto.device,
            power_watts: nluEntities.potencia_watts ?? nluEntities.power_watts ?? contexto.power_watts,
            hours_per_day: nluEntities.hours_per_day ?? nluEntities.horas_por_dia ?? contexto.hours_per_day,
            days_per_month: nluEntities.days_per_month ?? nluEntities.dias_por_mes ?? contexto.days_per_month,
            tariff: contexto.tariff,
        };

        let intent: string = nlu.intent ?? 'desconhecido';
        const confianca = Number(nlu.confidence ?? 1);
        const trouxeDados = Object.keys(nluEntities).length > 0;

        // O BOT TINHA FEITO UMA PERGUNTA E O USUÁRIO RESPONDEU SÓ O DADO (EX.: "1500 W")
        if (contexto.pending_intent && trouxeDados &&
            (confianca < CONFIANCA_TROCA_ASSUNTO || intent === contexto.pending_intent)) {
            intent = contexto.pending_intent;
        } else if (confianca < CONFIANCA_MINIMA) {
            intent = 'desconhecido';
        }

        switch (intent) {
            case 'saudacao':
                return {
                    message: 'Olá! Sou o assistente SmartMind. Posso calcular o consumo dos seus aparelhos, ' +
                        'mostrar seus dispositivos, consultar o consumo da casa e prever sua próxima fatura. Por onde começamos?',
                    intent,
                    quick_replies: SUGESTOES_INICIAIS.slice(0, 4),
                };

            case 'ajuda':
                return {
                    message: 'Eu consigo:\n' +
                        '• Calcular quanto um aparelho consome e custa por mês\n' +
                        '• Listar os dispositivos da sua casa\n' +
                        '• Mostrar o consumo do mês e o histórico\n' +
                        '• Prever a próxima fatura usando inteligência artificial\n' +
                        '• Dar dicas de economia por aparelho',
                    intent,
                    quick_replies: SUGESTOES_INICIAIS,
                };

            case 'agradecimento':
                return { message: 'Por nada! Se precisar de mais alguma coisa, é só chamar.', intent };

            case 'despedida':
                return { message: 'Até logo! Continue de olho no seu consumo.', intent };

            case 'consultar_dispositivos':
                return this.responderDispositivos(dto.casaId);

            case 'consultar_consumo':
                return this.responderConsumo(dto.casaId);

            case 'prever_fatura':
                return this.responderPrevisao(dto.casaId);

            case 'buscar_economia':
                return this.responderEconomia(entities);

            case 'calcular_consumo':
                return this.responderCalculo(dto.casaId, entities);

            default:
                return {
                    message: 'Não entendi muito bem. Você pode reformular? Veja alguns exemplos do que eu sei fazer:',
                    intent: 'desconhecido',
                    confidence: confianca,
                    quick_replies: SUGESTOES_INICIAIS,
                };
        }
    }

    // SÓ DEVOLVE NO CONTEXTO VALORES QUE PASSAM NA VALIDAÇÃO DO DTO
    // (SE O USUÁRIO DIGITAR "30 HORAS", A PRÓXIMA REQUISIÇÃO NÃO TOMA 400)
    private montarContexto(entities: EntidadesChat, pendingIntent?: string): Record<string, unknown> {
        const ctx: Record<string, unknown> = {};

        if (entities.device) ctx.device = entities.device;

        const potencia = Number(entities.power_watts);
        if (Number.isFinite(potencia) && potencia > 0) ctx.power_watts = potencia;

        const horas = Number(entities.hours_per_day);
        if (Number.isFinite(horas) && horas > 0 && horas <= 24) ctx.hours_per_day = horas;

        const dias = Number(entities.days_per_month);
        if (Number.isInteger(dias) && dias >= 1 && dias <= 31) ctx.days_per_month = dias;

        if (pendingIntent) ctx.pending_intent = pendingIntent;

        return ctx;
    }

    // ---------------------------------------------------------------------
    private async responderCalculo(casaId: number, entities: EntidadesChat): Promise<ChatbotResposta> {
        const missing: string[] = [];
        if (!entities.device) missing.push('qual é o aparelho');
        if (!entities.power_watts) missing.push('a potência em watts (ex.: 1500 W)');
        if (!entities.hours_per_day) missing.push('quanto tempo ele fica ligado por dia (ex.: 2 horas)');

        if (missing.length > 0) {
            return {
                message: `Para calcular o consumo, preciso saber ${missing.join(', ')}.`,
                intent: 'calcular_consumo',
                entities,
                missing,
                context: this.montarContexto(entities, 'calcular_consumo'),
            };
        }

        const days = Number(entities.days_per_month ?? 30);
        const tariff = Number(entities.tariff ?? await this.tarifaRepository.buscarTarifaAtual(casaId));
        const power = Number(entities.power_watts);
        const hours = Number(entities.hours_per_day);

        if (
            !Number.isFinite(power) || !Number.isFinite(hours) ||
            !Number.isFinite(days) || !Number.isFinite(tariff) ||
            power <= 0 || hours <= 0 || hours > 24 ||
            days < 1 || days > 31 || tariff <= 0
        ) {
            return {
                message: 'Os dados informados parecem inválidos. Lembre que o uso por dia vai de 0 a 24 horas. Pode me passar de novo?',
                intent: 'calcular_consumo',
                context: this.montarContexto({ device: entities.device }, 'calcular_consumo'),
            };
        }

        const consumption = this.consumoCalculator.calcularConsumo(power, hours, days);
        const cost = this.consumoCalculator.calcularCusto(consumption, tariff);
        const suggestions = this.economiaUseCase.sugerirEconomia(entities.device!, consumption, hours);

        return {
            message: `O ${entities.device} consome aproximadamente ${consumption} kWh por mês, ` +
                `cerca de R$ ${cost.toFixed(2)} (${power} W, ${hours} h/dia, ${days} dias, tarifa R$ ${tariff.toFixed(2)}/kWh).`,
            intent: 'calcular_consumo',
            entities,
            result: {
                consumption_kwh: consumption,
                monthly_cost: cost,
                tariff,
                power_watts: power,
                hours_per_day: hours,
                days_per_month: days,
            },
            suggestions,
            quick_replies: ['Como posso economizar com esse aparelho?', 'Calcular outro aparelho'],
            // MANTÉM O APARELHO PARA "COMO ECONOMIZAR COM ESSE APARELHO?"
            context: this.montarContexto({ device: entities.device }),
        };
    }

    // ---------------------------------------------------------------------
    private responderEconomia(entities: EntidadesChat): ChatbotResposta {
        if (!entities.device) {
            return {
                message: 'Qual aparelho você quer analisar?',
                intent: 'buscar_economia',
                context: this.montarContexto(entities, 'buscar_economia'),
                quick_replies: ['Chuveiro', 'Ar-condicionado', 'Geladeira', 'Televisão'],
            };
        }

        const suggestions = this.economiaUseCase.sugerirEconomia(
            entities.device, 0, Number(entities.hours_per_day ?? 0)
        );

        return {
            message: `Aqui vão algumas dicas para economizar com o ${entities.device}:`,
            intent: 'buscar_economia',
            suggestions,
            context: this.montarContexto({ device: entities.device }),
            quick_replies: ['Calcular o consumo desse aparelho', 'Ver meus dispositivos'],
        };
    }

    // ---------------------------------------------------------------------
    private async responderDispositivos(casaId: number): Promise<ChatbotResposta> {
        const dispositivos = await this.dispositivoRepository.getAllByCasa(casaId);

        if (!dispositivos.length) {
            return {
                message: 'Você ainda não tem dispositivos cadastrados. Cadastre-os na página "Dispositivos" e eu consigo analisar tudo para você.',
                intent: 'consultar_dispositivos',
            };
        }

        const ligados = dispositivos.filter((d) => d.ligado);
        const potenciaLigada = ligados.reduce((soma, d) => soma + Number(d.potencia_watts ?? 0), 0);
        const lista = dispositivos
            .map((d) => `• ${d.nome} (${d.tipo}) · ${d.potencia_watts} W · ${d.ligado ? 'ligado' : 'desligado'}`)
            .join('\n');

        return {
            message: `Você tem ${dispositivos.length} dispositivo(s) cadastrado(s) e ${ligados.length} ligado(s) agora, ` +
                `somando ${potenciaLigada.toLocaleString('pt-BR')} W.\n\n${lista}`,
            intent: 'consultar_dispositivos',
            quick_replies: ['Qual foi meu consumo este mês?', 'Dicas para economizar'],
        };
    }

    // ---------------------------------------------------------------------
    private async responderConsumo(casaId: number): Promise<ChatbotResposta> {
        const historico = await this.consumoRepository.buscarHistoricoMensal(casaId, 3);

        if (!historico.length) {
            return {
                message: 'Ainda não encontrei medições de consumo da sua casa nos últimos 3 meses.',
                intent: 'consultar_consumo',
            };
        }

        const tarifa = await this.tarifaRepository.buscarTarifaAtual(casaId);
        const mesAtual = new Date().toISOString().slice(0, 7);
        const atual = historico.find((h) => h.mes === mesAtual)?.total_kwh ?? 0;
        const custoAtual = atual * tarifa;

        const linhas = historico
            .map((h) => `• ${h.mes}: ${h.total_kwh.toFixed(2)} kWh (≈ R$ ${(h.total_kwh * tarifa).toFixed(2)})`)
            .join('\n');

        return {
            message: `Neste mês sua casa consumiu ${atual.toFixed(2)} kWh (≈ R$ ${custoAtual.toFixed(2)}).\n\nHistórico recente:\n${linhas}`,
            intent: 'consultar_consumo',
            result: {
                consumption_kwh: Number(atual.toFixed(2)),
                monthly_cost: Number(custoAtual.toFixed(2)),
                tariff: tarifa,
            },
            quick_replies: ['Qual a previsão da minha próxima fatura?', 'Dicas para economizar'],
        };
    }

    // ---------------------------------------------------------------------
    private async responderPrevisao(casaId: number): Promise<ChatbotResposta> {
        const historico = await this.consumoRepository.buscarHistoricoMensal(casaId, 3);

        if (!historico.length) {
            return {
                message: 'Para prever sua fatura, preciso de pelo menos um mês de medições de consumo.',
                intent: 'prever_fatura',
            };
        }

        // MESMAS FEATURES DO DATASET (historico_consumo.csv): tendencia = consumo_mes - media_3_meses
        const consumoMes = historico[historico.length - 1].total_kwh;
        const media3 = historico.reduce((soma, h) => soma + h.total_kwh, 0) / historico.length;
        const tendencia = consumoMes - media3;
        const temperatura = (await this.consumoRepository.buscarTemperaturaMedia(casaId, 30)) ?? 25;
        const tarifa = await this.tarifaRepository.buscarTarifaVigente(casaId);

        try {
            const previsao = await this.pythonAiClient.predictConsumption({
                consumo_mes: Number(consumoMes.toFixed(2)),
                media_3_meses: Number(media3.toFixed(2)),
                tendencia: Number(tendencia.toFixed(2)),
                temperatura_media: Number(temperatura.toFixed(1)),
                mes: new Date().getMonth() + 1,
                bandeira: tarifa.bandeira,
            });

            const kwh = Number(previsao.consumo_previsto);
            const valor = kwh * tarifa.valorTotalKwh;

            return {
                message: `Pela minha análise, o consumo previsto para o próximo mês é de ${kwh.toFixed(2)} kWh, ` +
                    `com fatura estimada em R$ ${valor.toFixed(2)} (bandeira ${tarifa.bandeira.toLowerCase()}).`,
                intent: 'prever_fatura',
                result: {
                    consumption_kwh: kwh,
                    monthly_cost: Number(valor.toFixed(2)),
                    tariff: tarifa.valorTotalKwh,
                },
                quick_replies: ['Dicas para economizar', 'Quais dispositivos tenho cadastrados?'],
            };
        } catch {
            return {
                message: 'O serviço de previsão está indisponível no momento. Tente novamente em instantes.',
                intent: 'prever_fatura',
            };
        }
    }
}