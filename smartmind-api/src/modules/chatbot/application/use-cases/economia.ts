import { Inject, Injectable } from '@nestjs/common';
import { DICA_ECONOMIA_REPOSITORY } from '../../chatbot.constants.js';
import type { IDicaEconomiaRepository } from '../../domain/interfaces/dica-economia.repository.interface.js';

export interface DadosEconomia {
    nome: string;                       // COMO O APARELHO APARECE NA FRASE ("chuveiro", "ar condicionado da sala")
    tipoId?: number | null;
    potenciaW?: number;
    horasDia?: number;
    diasMes?: number;
    tarifa?: number;
    bandeira?: string;
    potenciaMediaTipo?: number | null;
    horasTipicasTipo?: number | null;
    ficaEmStandby?: boolean;
}

const MAXIMO_DICAS = 5;

const reais = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const decimal = (valor: number, casas = 1) =>
    valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });

@Injectable()
export class EconomiaUseCase {

    constructor(
        @Inject(DICA_ECONOMIA_REPOSITORY)
        private readonly dicaRepository: IDicaEconomiaRepository
    ) {}

    async sugerirEconomia(dados: DadosEconomia): Promise<string[]> {
        const potencia = Number(dados.potenciaW ?? 0);
        const horas = Number(dados.horasDia ?? 0);
        const dias = Number(dados.diasMes ?? 30);
        const consumoKwh = (potencia / 1000) * horas * dias;

        // 1) PERSONALIZADAS (COM OS NÚMEROS DO USUÁRIO) VÊM PRIMEIRO
        const calculadas = this.dicasCalculadas(dados, potencia, horas, dias);

        // 2) DEPOIS AS CADASTRADAS NO BANCO PARA ESSE TIPO (+ GERAIS)
        const doBanco = await this.dicaRepository.buscarDicas(dados.tipoId ?? null, horas, consumoKwh);

        // SEM REPETIR E NO MÁXIMO 5
        const dicas = [...new Set([...calculadas, ...doBanco.map((dica) => dica.texto)])].slice(0, MAXIMO_DICAS);

        return dicas.length
            ? dicas
            : ['Continue monitorando o consumo para identificar oportunidades de economia.'];
    }

    // DICAS GERADAS POR REGRAS: FUNCIONAM PARA QUALQUER APARELHO, MESMO SEM DICA NO BANCO
    private dicasCalculadas(dados: DadosEconomia, potencia: number, horas: number, dias: number): string[] {
        const dicas: string[] = [];
        const tarifa = Number(dados.tarifa ?? 0);

        // REGRA 1 – QUANTO ECONOMIZA USANDO MENOS TEMPO
        // (1 h a menos se usa 2 h ou mais; senão, 25% a menos do tempo)
        if (potencia > 0 && horas > 0 && tarifa > 0) {
            const reducaoHoras = horas >= 2 ? 1 : horas * 0.25;
            const kwhEconomizado = (potencia / 1000) * reducaoHoras * dias;

            if (kwhEconomizado >= 0.5) {
                const tempo = reducaoHoras >= 1
                    ? '1 hora'
                    : `${Math.max(1, Math.round(reducaoHoras * 60))} minutos`;

                dicas.push(
                    `Usando o ${dados.nome} ${tempo} a menos por dia, você economiza cerca de ` +
                    `${decimal(kwhEconomizado)} kWh (${reais(kwhEconomizado * tarifa)}) por mês.`
                );
            }
        }

        // REGRA 2 – POTÊNCIA BEM ACIMA DA MÉDIA DO TIPO
        const media = Number(dados.potenciaMediaTipo ?? 0);
        if (media > 0 && potencia > media * 1.25) {
            const percentual = Math.round((potencia / media - 1) * 100);
            dicas.push(
                `Seu ${dados.nome} tem potência ${percentual}% acima da média desse tipo de aparelho (${decimal(media, 0)} W). ` +
                `Na próxima troca, prefira um modelo com selo Procel A.`
            );
        }

        // REGRA 3 – USO BEM ACIMA DO TÍPICO
        const horasTipicas = Number(dados.horasTipicasTipo ?? 0);
        if (horasTipicas > 0 && horas > horasTipicas * 1.5) {
            dicas.push(
                `Você usa o ${dados.nome} cerca de ${decimal(horas)} h por dia, bem acima do uso típico (${decimal(horasTipicas)} h). ` +
                `Um temporizador ou uma rotina de desligamento ajudam.`
            );
        }

        // REGRA 4 – APARELHOS QUE GASTAM EM STANDBY
        if (dados.ficaEmStandby) {
            dicas.push(
                `Quando não estiver usando, desligue o ${dados.nome} da tomada (ou use uma tomada inteligente) para cortar o consumo em standby.`
            );
        }

        // REGRA 5 – BANDEIRA AMARELA/VERMELHA
        const bandeira = dados.bandeira?.toUpperCase();
        if (bandeira && bandeira !== 'VERDE') {
            dicas.push(
                `A bandeira tarifária está ${bandeira.toLowerCase()}, então cada kWh custa mais: priorize reduzir o uso dos aparelhos de maior potência.`
            );
        }

        return dicas;
    }
}