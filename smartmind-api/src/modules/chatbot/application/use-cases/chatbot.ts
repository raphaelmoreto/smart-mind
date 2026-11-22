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
import { ChatbotContextDto, ChatbotInputDto } from '../../domain/dto/chatbot.dto.js';
import { PreverConsumoUseCase } from '../../../energia/application/use-cases/prever-consumo.js';
import { Response } from '../../../core/application/response/response.js';
import type { DispositivoOutputDto, TipoDispositivoOutputDto } from '../../../dispositivos/domain/dto/dispositivo.dto.js';
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
    device_id?: number;
    device_type_id?: number;
    power_watts?: number;
    hours_per_day?: number;
    days_per_month?: number;
    tariff?: number;
};

// CARREGADO UMA VEZ POR MENSAGEM E REPASSADO PARA OS MÉTODOS
type Catalogo = {
    tipos: TipoDispositivoOutputDto[];
    dispositivos: DispositivoOutputDto[];
};

const formatarHoras = (horas: number) =>
    horas < 1 ? `${Math.round(horas * 60)} minutos` : `${String(horas).replace('.', ',')} horas`;

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

        private readonly preverConsumoUseCase: PreverConsumoUseCase,
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
        // 1) CATÁLOGO = TIPOS DO BANCO (COM SINÔNIMOS) + APARELHOS CADASTRADOS NA CASA
        const [tipos, dispositivos] = await Promise.all([
            this.dispositivoRepository.getTipos(),
            this.dispositivoRepository.getAllByCasa(dto.casaId),
        ]);
        const catalogo: Catalogo = { tipos, dispositivos };

        const nlu = await this.pythonAiClient.processarMensagem(dto.message, {
            types: tipos.map((t) => ({ id: t.id, nome: t.tipo, sinonimos: t.sinonimos ?? [] })),
            devices: dispositivos.map((d) => ({ id: d.id, nome: d.nome, tipo_id: d.fk_tipoDispositivo })),
        });

        const nluEntities = nlu.entities ?? {};
        const contexto = dto.context ?? {};

        // 2) SE A FRASE FALA DE OUTRO APARELHO, NÃO REAPROVEITA POTÊNCIA/HORAS DO ANTERIOR
        //    (antes: "quanto gasta o chuveiro?" → "e a geladeira?" usava os 5500 W do chuveiro)
        const trocouAparelho = Boolean(nluEntities.device) && nluEntities.device !== contexto.device;
        const base: ChatbotContextDto = trocouAparelho ? {} : contexto;

        const entities: EntidadesChat = {
            device: nluEntities.device ?? contexto.device,
            device_id: nluEntities.device_id ?? base.device_id,
            device_type_id: nluEntities.device_type_id ?? base.device_type_id,
            power_watts: nluEntities.potencia_watts ?? base.power_watts,
            hours_per_day: nluEntities.hours_per_day ?? base.hours_per_day,
            days_per_month: nluEntities.days_per_month ?? base.days_per_month,
            tariff: contexto.tariff,
        };

        // 3) APARELHO CADASTRADO → JÁ SABEMOS O TIPO, A POTÊNCIA E AS HORAS DE USO
        const cadastrado = dispositivos.find((d) => d.id === entities.device_id);
        if (cadastrado) {
            entities.device_type_id ??= cadastrado.fk_tipoDispositivo;
            entities.power_watts ??= cadastrado.potencia_watts || undefined;
            entities.hours_per_day ??= cadastrado.horas_uso_dia || undefined;
        }

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
                return this.responderEconomia(dto.casaId, entities, catalogo);

            case 'calcular_consumo':
                return this.responderCalculo(dto.casaId, entities, catalogo);

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

        if (Number.isInteger(entities.device_id) && entities.device_id! > 0) ctx.device_id = entities.device_id;

        if (Number.isInteger(entities.device_type_id) && entities.device_type_id! > 0) ctx.device_type_id = entities.device_type_id;

        if (pendingIntent) ctx.pending_intent = pendingIntent;

        return ctx;
    }

    private tipoDoAparelho(entities: EntidadesChat, catalogo: Catalogo) {
        return catalogo.tipos.find((t) => t.id === entities.device_type_id);
    }

    private nomeDoAparelho(entities: EntidadesChat, catalogo: Catalogo): string {
        const cadastrado = catalogo.dispositivos.find((d) => d.id === entities.device_id);
        return (cadastrado?.nome ?? entities.device ?? 'aparelho').toLowerCase();
    }

    // SUGESTÕES DE "QUAL APARELHO?" A PARTIR DO QUE O USUÁRIO TEM CADASTRADO
    private aparelhosSugeridos(catalogo: Catalogo): string[] {
        const cadastrados = catalogo.dispositivos.slice(0, 4).map((d) => d.nome.toLowerCase());
        return cadastrados.length ? cadastrados : ['Chuveiro', 'Ar-condicionado', 'Geladeira', 'Televisão'];
    }

    // ---------------------------------------------------------------------
    private async responderCalculo(casaId: number, entities: EntidadesChat, catalogo: Catalogo): Promise<ChatbotResposta> {
        const tipo = this.tipoDoAparelho(entities, catalogo);
        const nome = this.nomeDoAparelho(entities, catalogo);

        const missing: string[] = [];
        if (!entities.device) missing.push('qual é o aparelho');
        if (!entities.power_watts) missing.push('a potência em watts (ex.: 1500 W)');
        if (!entities.hours_per_day) missing.push('quanto tempo ele fica ligado por dia (ex.: 2 horas)');

        if (missing.length > 0) {
            // SUGESTÕES AUTOMÁTICAS DE RESPOSTA COM A MÉDIA DO TIPO
            const quickReplies: string[] = [];
            if (!entities.device) quickReplies.push(...this.aparelhosSugeridos(catalogo));
            if (!entities.power_watts && tipo?.potencia_media_watts) quickReplies.push(`Usar ${tipo.potencia_media_watts} W`);
            if (!entities.hours_per_day && tipo?.horas_uso_tipicas) quickReplies.push(`${formatarHoras(tipo.horas_uso_tipicas)} por dia`);

            const dicaMedia = !entities.power_watts && tipo?.potencia_media_watts
                ? ` Se não souber, um(a) ${tipo.tipo.toLowerCase()} costuma ter cerca de ${tipo.potencia_media_watts} W.`
                : '';

            return {
                message: `Para calcular o consumo, preciso saber ${missing.join(', ')}.${dicaMedia}`,
                intent: 'calcular_consumo',
                entities,
                missing,
                quick_replies: quickReplies,
                context: this.montarContexto(entities, 'calcular_consumo'),
            };
        }

        const tarifaVigente = await this.tarifaRepository.buscarTarifaVigente(casaId);
        const days = Number(entities.days_per_month ?? 30);
        const tariff = Number(entities.tariff ?? tarifaVigente.valorTotalKwh);
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
                context: this.montarContexto(
                    { device: entities.device, device_id: entities.device_id, device_type_id: entities.device_type_id },
                    'calcular_consumo'
                ),
            };
        }

        const consumption = this.consumoCalculator.calcularConsumo(power, hours, days);
        const cost = this.consumoCalculator.calcularCusto(consumption, tariff);

        const suggestions = await this.economiaUseCase.sugerirEconomia({
            nome,
            tipoId: tipo?.id ?? null,
            potenciaW: power,
            horasDia: hours,
            diasMes: days,
            tarifa: tariff,
            bandeira: tarifaVigente.bandeira,
            potenciaMediaTipo: tipo?.potencia_media_watts,
            horasTipicasTipo: tipo?.horas_uso_tipicas,
            ficaEmStandby: tipo?.fica_em_standby,
        });

        return {
            message: `O ${nome} consome aproximadamente ${consumption} kWh por mês, ` +
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
            context: this.montarContexto({
                device: entities.device,
                device_id: entities.device_id,
                device_type_id: entities.device_type_id,
            }),
        };
    }

    // ---------------------------------------------------------------------
    private async responderEconomia(casaId: number, entities: EntidadesChat, catalogo: Catalogo): Promise<ChatbotResposta> {
        if (!entities.device) {
            return {
                message: 'Qual aparelho você quer analisar?',
                intent: 'buscar_economia',
                context: this.montarContexto(entities, 'buscar_economia'),
                quick_replies: this.aparelhosSugeridos(catalogo),
            };
        }

        const tipo = this.tipoDoAparelho(entities, catalogo);
        const nome = this.nomeDoAparelho(entities, catalogo);
        const tarifa = await this.tarifaRepository.buscarTarifaVigente(casaId);

        // SEM DADOS DO USUÁRIO, USA A MÉDIA DO TIPO PARA AS DICAS CALCULADAS
        const suggestions = await this.economiaUseCase.sugerirEconomia({
            nome,
            tipoId: tipo?.id ?? null,
            potenciaW: entities.power_watts ?? tipo?.potencia_media_watts ?? 0,
            horasDia: entities.hours_per_day ?? tipo?.horas_uso_tipicas ?? 0,
            tarifa: tarifa.valorTotalKwh,
            bandeira: tarifa.bandeira,
            potenciaMediaTipo: tipo?.potencia_media_watts,
            horasTipicasTipo: tipo?.horas_uso_tipicas,
            ficaEmStandby: tipo?.fica_em_standby,
        });

        return {
            message: `Aqui vão algumas dicas para economizar com o ${nome}:`,
            intent: 'buscar_economia',
            suggestions,
            context: this.montarContexto({
                device: entities.device,
                device_id: entities.device_id,
                device_type_id: entities.device_type_id,
            }),
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

        // QUEM MAIS CONSOME (POTÊNCIA × HORAS × 30 DIAS)
        const ranking = dispositivos
            .map((d) => ({ nome: d.nome.toLowerCase(), kwh: (Number(d.potencia_watts) / 1000) * Number(d.horas_uso_dia) * 30 }))
            .sort((a, b) => b.kwh - a.kwh);
        const maior = ranking[0];

        const destaque = maior && maior.kwh > 0
            ? `\n\nO que mais consome é o ${maior.nome} (≈ ${maior.kwh.toFixed(1)} kWh/mês).`
            : '';

        return {
            message: `Você tem ${dispositivos.length} dispositivo(s) cadastrado(s) e ${ligados.length} ligado(s) agora, ` +
                `somando ${potenciaLigada.toLocaleString('pt-BR')} W.\n\n${lista}${destaque}`,
            intent: 'consultar_dispositivos',
            quick_replies: maior && maior.kwh > 0
                ? [`Dicas para economizar com o ${maior.nome}`, 'Qual foi meu consumo este mês?']
                : ['Qual foi meu consumo este mês?', 'Dicas para economizar'],
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
        try {
            const previsao = await this.preverConsumoUseCase.executar(casaId);

            // SEM MESES FECHADOS SUFICIENTES (OU MEDIÇÕES ATRASADAS)
            if (previsao instanceof Response) {
                return {
                    message: 'Para prever sua fatura, preciso de pelo menos um mês completo de medições de consumo, ' +
                        'incluindo o mês passado. Assim que houver esses dados, eu consigo calcular.',
                    intent: 'prever_fatura',
                };
            }

            const nomeDoMes = new Date(`${previsao.periodo_referencia}T00:00:00`)
                .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            return {
                message: `Pela minha análise, o consumo de ${nomeDoMes} deve fechar em ${previsao.consumo_previsto_kwh.toFixed(2)} kWh, ` +
                    `com fatura estimada em R$ ${previsao.valor_estimado.toFixed(2)} (bandeira ${previsao.bandeira.toLowerCase()}).`,
                intent: 'prever_fatura',
                result: {
                    consumption_kwh: previsao.consumo_previsto_kwh,
                    monthly_cost: previsao.valor_estimado,
                    tariff: previsao.tarifa_kwh,
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