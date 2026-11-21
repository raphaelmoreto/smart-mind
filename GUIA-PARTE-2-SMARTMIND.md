# Guia de melhorias – SmartMind (parte 2)

> Mesmo combinado da parte 1: **nenhum arquivo de código foi alterado**. Tudo abaixo é para você aplicar à mão.
> Ordem recomendada: **Parte A (banco → API → Python → front)**, depois **Parte B** (reorganizar pastas), depois **Parte C** (Home).
> A Parte C já usa os caminhos novos da Parte B.

## Sumário

- [Parte A – Dispositivos reconhecidos automaticamente + dicas automáticas](#parte-a)
  - [A.0 Ideia geral](#a0-ideia-geral)
  - [A.1 Banco: o conhecimento sai do código e vai para tabelas](#a1-banco)
  - [A.2 API – dispositivos: devolver o catálogo completo](#a2-api--dispositivos)
  - [A.3 API – chatbot: dicas vindas do banco + dicas calculadas](#a3-api--chatbot)
  - [A.4 Python: reconhecimento com tolerância a erro de digitação](#a4-python)
  - [A.5 Front: tipo reconhecido sozinho no cadastro do dispositivo](#a5-front)
  - [A.6 Como adicionar um aparelho novo daqui pra frente](#a6-como-adicionar-um-aparelho-novo)
- [Parte B – Reorganizar `components/energy`](#parte-b)
- [Parte C – Home com dados reais](#parte-c)
- [Como testar](#como-testar)

---

<a id="parte-a"></a>
# Parte A – Reconhecimento automático e dicas automáticas

## A.0 Ideia geral

Hoje o conhecimento sobre aparelhos está **espalhado e fixo no código**:

| Onde | O que está fixo |
|---|---|
| `smartmind-ai/app/nlu/processor.py` → `DEVICES` | quais palavras viram qual aparelho (9 aparelhos) |
| `smartmind-api/.../economia.ts` → `switch` | as dicas de cada aparelho (7 aparelhos) |
| `smartmind-web/.../devicePresentation.js` | qual "desenho" cada aparelho usa |

E o banco já tem `Tipo_Dispositivo` com 25 tipos que **ninguém usa** para isso.

A proposta é ter **uma fonte só: o banco**.

```
                 ┌──────────────────────────── BANCO ────────────────────────────┐
                 │ Tipo_Dispositivo: tipo, SINÔNIMOS, POTÊNCIA MÉDIA, HORAS TÍPICAS │
                 │ Dica_Economia:   texto, tipo (ou geral), condição, prioridade     │
                 │ Dispositivo:     os aparelhos que o usuário cadastrou            │
                 └───────────────┬───────────────────────────────┬──────────────┘
                                 │                               │
          Nest monta o "catálogo"│                               │ Nest busca as dicas
          (tipos + sinônimos +   ▼                               ▼ do tipo + gera dicas
          aparelhos da casa) ─► Python ─► "chuverio" ≈ "chuveiro"   calculadas com números
                                 │        (comparação aproximada)   reais do usuário
                                 ▼
                     { device: "chuveiro", device_type_id: 26, device_id: 7 }
```

O que melhora para o usuário:

1. **Erro de digitação:** "quanto gasta meu chuverio" e "ar condicionao" passam a ser reconhecidos. A comparação é aproximada (`difflib`, que já vem com o Python, sem instalar nada).
2. **Aparelhos do próprio usuário:** "quanto gasta o ar da sala?" acha o `AR CONDICIONADO DA SALA` cadastrado e **já usa a potência e as horas do banco**, sem perguntar nada.
3. **Aparelho novo** = um `INSERT` no banco. Não precisa mexer em código nem retreinar o modelo.
4. **Dicas automáticas** de dois tipos:
   - **do banco:** dicas cadastradas por tipo, com condição (ex.: "só mostra se usar mais de 8 h/dia");
   - **calculadas:** feitas na hora com os números do usuário. Ex.: *"Usando o chuveiro 8 minutos a menos por dia você economiza 22 kWh (R$ 16,50) por mês"* e *"seu aparelho tem potência 40% acima da média do tipo"*. Isso funciona para **qualquer** aparelho, mesmo sem nenhuma dica cadastrada.
5. **Erro de digitação na intenção**: o classificador passa a olhar também **pedaços de letras** (char n-grams) e o treino gera variações com erros de digitação automaticamente, então você não precisa escrever cada erro à mão no `training_data.json`.

---

## A.1 Banco

Rode no PostgreSQL e acrescente ao final do `SCRIPT BANCO Smart_Mind.txt`.

### A.1.1 `Tipo_Dispositivo`: sinônimos, potência média, horas típicas

```sql
ALTER TABLE "Tipo_Dispositivo"
    ADD COLUMN sinonimos            TEXT[]        NOT NULL DEFAULT '{}',
    ADD COLUMN potencia_media_watts DECIMAL(10,2) NULL,
    ADD COLUMN horas_uso_tipicas    DECIMAL(4,2)  NULL,
    ADD COLUMN fica_em_standby      BOOLEAN       NOT NULL DEFAULT FALSE;

-- TIPOS QUE FALTAVAM (O CHATBOT JÁ FALAVA DELES, MAS NÃO EXISTIAM NO BANCO)
INSERT INTO "Tipo_Dispositivo" (tipo)
VALUES ('CHUVEIRO'), ('COMPUTADOR'), ('FERRO DE PASSAR'),
       ('AQUECEDOR'), ('SECADOR DE CABELO'), ('VIDEOGAME');

-- PREENCHE TUDO DE UMA VEZ
-- (POTÊNCIA EM W, HORAS DE USO POR DIA, SE FICA EM STANDBY)
UPDATE "Tipo_Dispositivo" AS t
SET sinonimos            = v.sinonimos,
    potencia_media_watts = v.potencia,
    horas_uso_tipicas    = v.horas,
    fica_em_standby      = v.standby
FROM (VALUES
    ('LAMPADA',               ARRAY['lampada','luminaria','abajur','spot','lustre'],          9,    6,    FALSE),
    ('INTERRUPTOR',           ARRAY['interruptor'],                                            1,    24,   TRUE),
    ('TOMADA',                ARRAY['tomada','tomada inteligente'],                            2,    24,   TRUE),
    ('AR CONDICIONADO',       ARRAY['ar condicionado','ar','split','climatizador'],            1400, 8,    TRUE),
    ('VENTILADOR',            ARRAY['ventilador','ventilador de teto'],                        100,  8,    FALSE),
    ('TELEVISAO',             ARRAY['televisao','televisor','tv','smart tv'],                  100,  5,    TRUE),
    ('GELADEIRA',             ARRAY['geladeira','refrigerador','freezer','frigobar'],          60,   24,   FALSE),
    ('MAQUINA DE LAVAR',      ARRAY['maquina de lavar','lavadora','lava roupas'],              500,  1,    FALSE),
    ('FORNO',                 ARRAY['forno','forno eletrico'],                                 1500, 0.5,  FALSE),
    ('MICRO-ONDAS',           ARRAY['microondas','micro ondas'],                               1200, 0.25, TRUE),
    ('CAFETEIRA',             ARRAY['cafeteira'],                                              800,  0.3,  FALSE),
    ('ASPIRADOR DE PO',       ARRAY['aspirador','aspirador de po'],                            1000, 0.3,  FALSE),
    ('CAMERA DE SEGURANCA',   ARRAY['camera','camera de seguranca'],                           5,    24,   FALSE),
    ('FECHADURA INTELIGENTE', ARRAY['fechadura'],                                              3,    24,   FALSE),
    ('CAMPAINHA INTELIGENTE', ARRAY['campainha'],                                              3,    24,   FALSE),
    ('SENSOR DE MOVIMENTO',   ARRAY['sensor de movimento'],                                    1,    24,   FALSE),
    ('SENSOR DE TEMPERATURA', ARRAY['sensor de temperatura'],                                  1,    24,   FALSE),
    ('SENSOR DE UMIDADE',     ARRAY['sensor de umidade'],                                      1,    24,   FALSE),
    ('SENSOR DE FUMACA',      ARRAY['sensor de fumaca'],                                       1,    24,   FALSE),
    ('SENSOR DE PRESENCA',    ARRAY['sensor de presenca'],                                     1,    24,   FALSE),
    ('TERMOSTATO',            ARRAY['termostato'],                                             2,    24,   FALSE),
    ('ALARME',                ARRAY['alarme'],                                                 5,    24,   FALSE),
    ('ROTEADOR',              ARRAY['roteador','modem','wifi'],                                10,   24,   FALSE),
    ('CAIXA DE SOM',          ARRAY['caixa de som','alexa','echo','som'],                      15,   4,    TRUE),
    ('PERSIANA INTELIGENTE',  ARRAY['persiana','cortina'],                                     30,   0.1,  FALSE),
    ('CHUVEIRO',              ARRAY['chuveiro','ducha'],                                       5500, 0.5,  FALSE),
    ('COMPUTADOR',            ARRAY['computador','notebook','pc','desktop'],                   150,  6,    TRUE),
    ('FERRO DE PASSAR',       ARRAY['ferro de passar','ferro'],                                1000, 0.5,  FALSE),
    ('AQUECEDOR',             ARRAY['aquecedor'],                                              1500, 4,    FALSE),
    ('SECADOR DE CABELO',     ARRAY['secador','secador de cabelo'],                            1200, 0.2,  FALSE),
    ('VIDEOGAME',             ARRAY['videogame','playstation','xbox','console'],               150,  3,    TRUE)
) AS v(tipo, sinonimos, potencia, horas, standby)
WHERE t.tipo = v.tipo;
```

> **Geladeira com 60 W?** A etiqueta diz uns 150 W, mas o compressor liga e desliga o dia todo. 60 W × 24 h dá ~43 kWh/mês, que é o consumo real de uma geladeira comum.
> **Evite "luz" como sinônimo:** "conta de **luz**" seria lido como lâmpada.

### A.1.2 Nova tabela `Dica_Economia` (usa a sua tabela `Prioridade`)

```sql
CREATE TABLE "Dica_Economia" (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    texto TEXT NOT NULL,
    min_horas_dia   DECIMAL(4,2)  NULL,   -- SÓ MOSTRA SE O USO DIÁRIO FOR >= ISSO
    min_consumo_kwh DECIMAL(10,2) NULL,   -- SÓ MOSTRA SE O CONSUMO MENSAL FOR >= ISSO
    "fk_tipoDispositivo" INTEGER NULL,    -- NULL = DICA GERAL (VALE PARA QUALQUER APARELHO)
    fk_prioridade INTEGER NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_dica_tipo
        FOREIGN KEY ("fk_tipoDispositivo")
        REFERENCES "Tipo_Dispositivo" (id),

    CONSTRAINT fk_dica_prioridade
        FOREIGN KEY (fk_prioridade)
        REFERENCES "Prioridade" (id)
);

CREATE INDEX idx_dica_tipo ON "Dica_Economia" ("fk_tipoDispositivo");

-- MIGRA AS DICAS QUE ESTAVAM NO economia.ts + NOVAS
-- (tipo = NULL → dica geral)
INSERT INTO "Dica_Economia" (texto, min_horas_dia, "fk_tipoDispositivo", fk_prioridade)
SELECT v.texto, v.min_horas, t.id, p.id
FROM (VALUES
    ('AR CONDICIONADO', 'Configure a temperatura entre 23 °C e 25 °C: cada grau a menos aumenta o consumo.', NULL::numeric, 'ALTA'),
    ('AR CONDICIONADO', 'Mantenha portas e janelas fechadas durante o funcionamento.',                   NULL, 'MÉDIA'),
    ('AR CONDICIONADO', 'Limpe os filtros a cada 15 dias: filtro sujo força o compressor.',              NULL, 'MÉDIA'),
    ('AR CONDICIONADO', 'Use o timer para desligar o aparelho de madrugada.',                            8,    'ALTA'),
    ('CHUVEIRO',        'Use a posição "verão" nos dias quentes: ela consome cerca de 30% menos.',       NULL, 'ALTA'),
    ('CHUVEIRO',        'Banhos de até 8 minutos já fazem grande diferença na conta.',                  0.25, 'ALTA'),
    ('CHUVEIRO',        'Evite banhos no horário de pico (18h às 21h).',                                NULL, 'BAIXA'),
    ('GELADEIRA',       'Verifique a borracha de vedação: feche a porta sobre uma folha de papel; se ela escorregar, troque a borracha.', NULL, 'ALTA'),
    ('GELADEIRA',       'Evite abrir a porta com frequência.',                                          NULL, 'MÉDIA'),
    ('GELADEIRA',       'Não coloque alimentos quentes dentro dela.',                                   NULL, 'MÉDIA'),
    ('GELADEIRA',       'Deixe uns 15 cm de espaço atrás dela para ventilação.',                        NULL, 'BAIXA'),
    ('TELEVISAO',       'Ative o modo de economia de energia e reduza o brilho.',                       NULL, 'MÉDIA'),
    ('TELEVISAO',       'Configure o desligamento automático por inatividade.',                         4,    'MÉDIA'),
    ('MICRO-ONDAS',     'Desligue da tomada quando não usar: o relógio do painel consome o mês inteiro.', NULL, 'BAIXA'),
    ('VENTILADOR',      'Desligue quando não houver ninguém no ambiente.',                              NULL, 'BAIXA'),
    ('COMPUTADOR',      'Ative a suspensão automática após 10 minutos sem uso.',                        NULL, 'MÉDIA'),
    ('COMPUTADOR',      'Desligue monitor e computador ao final do dia.',                               8,    'ALTA'),
    ('MAQUINA DE LAVAR','Lave com a carga máxima recomendada e prefira água fria.',                     NULL, 'MÉDIA'),
    ('FERRO DE PASSAR', 'Junte bastante roupa e passe tudo de uma vez.',                                NULL, 'MÉDIA'),
    ('LAMPADA',         'Troque lâmpadas antigas por LED: economia de até 80%.',                        NULL, 'ALTA'),
    ('LAMPADA',         'Aproveite a luz natural durante o dia.',                                       NULL, 'BAIXA'),
    ('FORNO',           'Evite abrir a porta do forno durante o preparo.',                              NULL, 'MÉDIA'),
    ('AQUECEDOR',       'Mantenha o ambiente fechado e use o termostato no mínimo confortável.',        NULL, 'ALTA'),
    (NULL,              'Ao comprar aparelhos novos, prefira os que têm selo Procel A.',                NULL, 'BAIXA'),
    (NULL,              'Evite usar vários aparelhos de alta potência ao mesmo tempo no horário de pico (18h às 21h).', NULL, 'BAIXA')
) AS v(tipo, texto, min_horas, prioridade)
LEFT JOIN "Tipo_Dispositivo" t ON t.tipo = v.tipo
INNER JOIN "Prioridade" p ON p.prioridade = v.prioridade;
```

> O `NULL::numeric` na primeira linha diz ao PostgreSQL o tipo da coluna `min_horas`. Sem ele, o `VALUES` reclama.

---

## A.2 API – dispositivos

### A.2.1 `dispositivos/domain/dto/dispositivo.dto.ts`: tipo completo

Substitua a classe `TipoDispositivoOutputDto`:

```ts
export class TipoDispositivoOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() tipo: string;
    @ApiProperty({ type: [String] }) sinonimos: string[];
    @ApiProperty({ nullable: true }) potencia_media_watts: number | null;
    @ApiProperty({ nullable: true }) horas_uso_tipicas: number | null;
    @ApiProperty() fica_em_standby: boolean;
}
```

### A.2.2 `dispositivos/infrastructure/repositories/dispositivo.repository.ts`: `getTipos()`

```ts
    async getTipos(): Promise<TipoDispositivoOutputDto[]> {
        return this.repository.query(
            `SELECT id,
                    tipo,
                    sinonimos,
                    potencia_media_watts::float AS potencia_media_watts,
                    horas_uso_tipicas::float    AS horas_uso_tipicas,
                    fica_em_standby
             FROM "Tipo_Dispositivo"
             ORDER BY tipo`
        );
    }
```

> O driver `pg` já devolve `TEXT[]` como array do JavaScript (`['chuveiro', 'ducha']`).
> O endpoint `GET /api/dispositivo/tipos` passa a mandar tudo isso para o front automaticamente (usado na A.5).

---

## A.3 API – chatbot

### A.3.1 `chatbot/chatbot.constants.ts`: acrescentar

```ts
export const DICA_ECONOMIA_REPOSITORY = 'DICA_ECONOMIA_REPOSITORY';
```

### A.3.2 Novo `chatbot/domain/interfaces/dica-economia.repository.interface.ts`

```ts
export interface DicaEconomia {
    texto: string;
    prioridade: string;
}

export interface IDicaEconomiaRepository {
    buscarDicas(tipoId: number | null, horasDia: number, consumoKwh: number): Promise<DicaEconomia[]>;
}
```

### A.3.3 Novo `chatbot/infrastructure/repositories/dica-economia.repository.ts`

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { DicaEconomia, IDicaEconomiaRepository } from '../../domain/interfaces/dica-economia.repository.interface.js';

@Injectable()
export class DicaEconomiaRepository implements IDicaEconomiaRepository {

    constructor(private readonly dataSource: DataSource) {}

    // DICAS DO TIPO PRIMEIRO, DEPOIS AS GERAIS; DENTRO DE CADA GRUPO, POR PRIORIDADE
    async buscarDicas(tipoId: number | null, horasDia: number, consumoKwh: number): Promise<DicaEconomia[]> {
        return this.dataSource.query(
            `SELECT d.texto, p.prioridade
             FROM "Dica_Economia" d
             INNER JOIN "Prioridade" p ON p.id = d.fk_prioridade
             WHERE d.ativo = TRUE
               AND (d."fk_tipoDispositivo" = $1::int OR d."fk_tipoDispositivo" IS NULL)
               AND (d.min_horas_dia   IS NULL OR $2::numeric >= d.min_horas_dia)
               AND (d.min_consumo_kwh IS NULL OR $3::numeric >= d.min_consumo_kwh)
             ORDER BY (d."fk_tipoDispositivo" IS NULL),
                      CASE p.prioridade WHEN 'ALTA' THEN 1 WHEN 'MÉDIA' THEN 2 ELSE 3 END,
                      d.id
             LIMIT 6`,
            [tipoId, horasDia, consumoKwh]
        );
    }
}
```

> O `$1::int` é necessário porque `tipoId` pode ser `null`. Sem o cast, o PostgreSQL não sabe o tipo do parâmetro.

### A.3.4 `chatbot/application/use-cases/economia.ts` (substituir **o arquivo inteiro**)

O `switch` gigante some. As dicas passam a vir de dois lugares: do banco e de cálculos feitos na hora.

```ts
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
```

### A.3.5 `chatbot/chatbot.module.ts`: registrar o repositório

```ts
import { DicaEconomiaRepository } from './infrastructure/repositories/dica-economia.repository.js';
import {
    TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY, DICA_ECONOMIA_REPOSITORY
} from './chatbot.constants.js';

// dentro de providers: [...]
        { provide: DICA_ECONOMIA_REPOSITORY, useClass: DicaEconomiaRepository },
```

### A.3.6 `chatbot/application/clients/python-ai.client.ts`: mandar o catálogo

```ts
// TIPOS E APARELHOS QUE O PYTHON DEVE PROCURAR NA FRASE
export interface CatalogoNlu {
    types: { id: number; nome: string; sinonimos: string[] }[];
    devices: { id: number; nome: string; tipo_id: number }[];
}

// ...dentro da classe, troque a assinatura e o corpo do POST:
    async processarMensagem(mensagem: string, catalogo?: CatalogoNlu) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/nlu/parse`, {
                    message: mensagem,
                    catalog: catalogo,
                }),
            );
            return response.data;
        } catch (error: unknown) {
            // ...igual...
        }
    }
```

### A.3.7 `chatbot/domain/dto/chatbot.dto.ts`: o contexto passa a guardar os IDs

Dentro de `ChatbotContextDto`, acrescente (e junte `IsInt`, `IsPositive` ao import, se faltarem):

```ts
    @IsOptional()
    @IsInt()
    @IsPositive()
    device_id?: number;          // APARELHO CADASTRADO PELO USUÁRIO

    @IsOptional()
    @IsInt()
    @IsPositive()
    device_type_id?: number;     // TIPO (Tipo_Dispositivo.id)
```

### A.3.8 `chatbot/application/use-cases/chatbot.ts`: as partes que mudam

**a) Imports e tipos (no topo do arquivo)**

```ts
import { ChatbotContextDto, ChatbotInputDto } from '../../domain/dto/chatbot.dto.js';
import type {
    DispositivoOutputDto, TipoDispositivoOutputDto
} from '../../../dispositivos/domain/dto/dispositivo.dto.js';

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
```

**b) Começo do `gerarResposta`.** Substitua desde a primeira linha do método até antes do `let intent`:

```ts
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
```

**c) No `switch`, os dois cases passam a receber o catálogo:**

```ts
            case 'buscar_economia':
                return this.responderEconomia(dto.casaId, entities, catalogo);

            case 'calcular_consumo':
                return this.responderCalculo(dto.casaId, entities, catalogo);
```

**d) `montarContexto`: guardar os IDs.** Acrescente antes do `if (pendingIntent)`:

```ts
        if (Number.isInteger(entities.device_id) && entities.device_id! > 0) ctx.device_id = entities.device_id;
        if (Number.isInteger(entities.device_type_id) && entities.device_type_id! > 0) ctx.device_type_id = entities.device_type_id;
```

**e) Helpers novos (coloque logo depois do `montarContexto`):**

```ts
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
```

**f) `responderCalculo` (substituir o método inteiro)**

```ts
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
```

**g) `responderEconomia` (substituir o método inteiro)**

```ts
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
```

**h) Extra: sugestão automática na lista de dispositivos.** No `responderDispositivos`, troque o `return` final por:

```ts
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
```

> Repare: o botão "Dicas para economizar com o ar condicionado da sala" é enviado como mensagem. O Python reconhece o aparelho cadastrado pelo nome e o bot responde com as dicas **daquele** aparelho. Ninguém precisou programar isso para esse aparelho.

---

## A.4 Python

Vamos separar o `processor.py` em arquivos com uma responsabilidade cada:

```
smartmind-ai/app/nlu/
├── text.py            ← normalização de texto (NOVO)
├── device_matcher.py  ← acha o aparelho na frase, com tolerância a erro (NOVO)
├── augmentation.py    ← gera frases com erro de digitação para o treino (NOVO)
├── processor.py       ← intenção + entidades (fica menor)
└── training_data.json
```

### A.4.1 Novo `app/nlu/text.py`

```python
import re
import unicodedata

# PALAVRAS QUE NÃO AJUDAM A IDENTIFICAR O APARELHO
PALAVRAS_VAZIAS = {
    "o", "a", "os", "as", "do", "da", "dos", "das", "de", "meu", "minha",
    "meus", "minhas", "um", "uma", "no", "na", "nos", "nas", "em", "por",
    "para", "pra", "com", "e", "esse", "essa", "este", "esta", "seu", "sua",
}


def normalize(text: str) -> str:
    """minúsculas, sem acento, hífen vira espaço, espaços simples"""
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[-_]", " ", text)
    return re.sub(r"\s+", " ", text)


def limpar(text: str) -> str:
    """normalize + sem pontuação + sem palavras vazias (usado para comparar nomes de aparelhos)"""
    text = re.sub(r"[^\w\s]", " ", normalize(text))
    return " ".join(palavra for palavra in text.split() if palavra not in PALAVRAS_VAZIAS)
```

### A.4.2 Novo `app/nlu/device_matcher.py`

Como funciona: a frase vira uma lista de palavras. Para cada nome de aparelho, pegamos **trechos** da frase com o mesmo número de palavras (±1) e medimos a semelhança com o `SequenceMatcher`. Ele dá uma nota de 0 a 1 (`"chuverio"` × `"chuveiro"` ≈ 0,88).

```python
from difflib import SequenceMatcher

from app.nlu.text import limpar

# A PARTIR DE QUAL NOTA CONSIDERAMOS QUE É O MESMO APARELHO (AJUSTE TESTANDO)
LIMIAR_SIMILARIDADE = 0.82

# PALAVRAS CURTAS ("tv", "pc", "ar") SÓ VALEM SE FOREM EXATAS
TAMANHO_MINIMO_APROXIMADO = 4

# USADO QUANDO A API NÃO MANDA O CATÁLOGO (EX.: TESTE DIRETO NO /docs DO PYTHON)
CATALOGO_PADRAO = {
    "types": [
        {"id": None, "nome": "ar condicionado", "sinonimos": ["split"]},
        {"id": None, "nome": "chuveiro", "sinonimos": ["ducha"]},
        {"id": None, "nome": "geladeira", "sinonimos": ["refrigerador", "freezer"]},
        {"id": None, "nome": "televisao", "sinonimos": ["televisor", "tv"]},
        {"id": None, "nome": "microondas", "sinonimos": ["micro ondas"]},
        {"id": None, "nome": "ventilador", "sinonimos": []},
        {"id": None, "nome": "computador", "sinonimos": ["notebook", "pc"]},
    ],
    "devices": [],
}


def _similaridade(trecho: str, termo: str) -> float:
    if trecho == termo:
        return 1.0
    if len(termo) < TAMANHO_MINIMO_APROXIMADO:
        return 0.0
    return SequenceMatcher(None, trecho, termo).ratio()


def _melhor_nota(palavras: list[str], termo: str) -> float:
    """compara o termo com todos os trechos da frase de tamanho parecido"""
    tamanho = len(termo.split())
    melhor = 0.0
    for n in {max(1, tamanho - 1), tamanho, tamanho + 1}:
        for inicio in range(len(palavras) - n + 1):
            trecho = " ".join(palavras[inicio:inicio + n])
            melhor = max(melhor, _similaridade(trecho, termo))
    return melhor


def encontrar_dispositivo(mensagem: str, catalog: dict | None = None) -> dict:
    catalog = catalog or CATALOGO_PADRAO
    palavras = limpar(mensagem).split()
    if not palavras:
        return {}

    melhor = None  # ((nota, especifico), entidade)

    def considerar(nota: float, especifico: int, entidade: dict):
        nonlocal melhor
        if nota < LIMIAR_SIMILARIDADE:
            return
        chave = (nota, especifico)  # EMPATE → APARELHO CADASTRADO GANHA DO TIPO GENÉRICO
        if melhor is None or chave > melhor[0]:
            melhor = (chave, entidade)

    # 1) APARELHOS QUE O USUÁRIO CADASTROU ("AR CONDICIONADO DA SALA")
    for device in catalog.get("devices", []):
        considerar(
            _melhor_nota(palavras, limpar(device["nome"])),
            1,
            {"device": device["nome"].lower(), "device_id": device["id"], "device_type_id": device.get("tipo_id")},
        )

    # 2) TIPOS DO BANCO + SINÔNIMOS
    for tipo in catalog.get("types", []):
        for termo in [tipo["nome"], *tipo.get("sinonimos", [])]:
            termo_limpo = limpar(termo)
            if termo_limpo:
                considerar(
                    _melhor_nota(palavras, termo_limpo),
                    0,
                    {"device": limpar(tipo["nome"]), "device_type_id": tipo["id"]},
                )

    if melhor is None:
        return {}

    (nota, _), entidade = melhor
    entidade = {chave: valor for chave, valor in entidade.items() if valor is not None}

    # 3) ACHOU SÓ O TIPO E A CASA TEM EXATAMENTE 1 APARELHO DESSE TIPO → LIGA AO APARELHO
    if "device_id" not in entidade and "device_type_id" in entidade:
        mesmos = [d for d in catalog.get("devices", []) if d.get("tipo_id") == entidade["device_type_id"]]
        if len(mesmos) == 1:
            entidade["device_id"] = mesmos[0]["id"]
            entidade["device"] = mesmos[0]["nome"].lower()

    entidade["device_score"] = round(nota, 3)
    return entidade
```

> `dict | None` precisa de Python 3.10+. Se o seu for mais antigo, use `from typing import Optional` e `Optional[dict]`.

### A.4.3 Novo `app/nlu/augmentation.py`

Gera variações com erro de digitação (letras trocadas, faltando ou repetidas) de cada frase do `training_data.json`. Assim, o modelo aprende "quanto gasta meu chuverio" sem você escrever isso à mão.

```python
import random


def gerar_erros_digitacao(texto: str, quantidade: int = 2, rng: random.Random | None = None) -> list[str]:
    rng = rng or random.Random(42)
    palavras = texto.split()
    variantes: set[str] = set()

    for _ in range(quantidade * 10):          # LIMITE DE TENTATIVAS
        if len(variantes) >= quantidade or not palavras:
            break

        indice = rng.randrange(len(palavras))
        palavra = palavras[indice]
        if len(palavra) < 4:                  # NÃO ESTRAGA PALAVRAS CURTAS
            continue

        posicao = rng.randrange(1, len(palavra) - 1)
        operacao = rng.choice(["trocar", "apagar", "duplicar"])

        if operacao == "trocar":              # chuveiro -> chuverio
            nova = palavra[:posicao] + palavra[posicao + 1] + palavra[posicao] + palavra[posicao + 2:]
        elif operacao == "apagar":            # condicionado -> condicionao
            nova = palavra[:posicao] + palavra[posicao + 1:]
        else:                                 # geladeira -> geladdeira
            nova = palavra[:posicao] + palavra[posicao] + palavra[posicao:]

        variante = " ".join(palavras[:indice] + [nova] + palavras[indice + 1:])
        if variante != texto:
            variantes.add(variante)

    return list(variantes)
```

### A.4.4 `app/nlu/processor.py` (substituir)

Mudanças:
- o bloco `DEVICES` **some**, porque agora quem diz quais aparelhos existem é o banco;
- o modelo olha **palavras** e também **pedaços de letras** (`char_wb`), o que tolera erros de digitação;
- o treino inclui as variações com erro geradas automaticamente.

```python
import json
import random
import re
from functools import lru_cache
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from app.nlu.augmentation import gerar_erros_digitacao
from app.nlu.device_matcher import encontrar_dispositivo
from app.nlu.text import normalize

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "nlu_model.pkl"
DATA_PATH = BASE_DIR / "training_data.json"

VARIANTES_POR_FRASE = 2


def train_model():
    with open(DATA_PATH, encoding="utf-8") as file:
        data = json.load(file)

    rng = random.Random(42)  # SEMENTE FIXA: O TREINO SAI SEMPRE IGUAL
    textos, rotulos = [], []

    for item in data:
        texto = normalize(item["text"])
        textos.append(texto)
        rotulos.append(item["intent"])

        # FRASES COM ERRO DE DIGITAÇÃO GERADAS AUTOMATICAMENTE
        for variante in gerar_erros_digitacao(texto, VARIANTES_POR_FRASE, rng):
            textos.append(variante)
            rotulos.append(item["intent"])

    model = Pipeline([
        ("features", FeatureUnion([
            # PALAVRAS INTEIRAS E PARES DE PALAVRAS ("quanto gasta")
            ("palavras", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            # PEDAÇOS DE 2 A 5 LETRAS ("chu", "huve", "veir"): "chuverio" AINDA PARECE "chuveiro"
            ("letras", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True)),
        ])),
        ("classifier", CalibratedClassifierCV(LinearSVC(), cv=3)),
    ])

    model.fit(textos, rotulos)
    joblib.dump(model, MODEL_PATH)
    return model


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        train_model()
    return joblib.load(MODEL_PATH)


def extract_entities(message: str, catalog: dict | None = None):
    text = normalize(message)
    entities = {}

    # POTÊNCIA: "1500 w", "1500 watts", "1,5 kw"
    power = re.search(r"(\d+(?:[.,]\d+)?)\s*(kw|quilowatts?|w|watts?)\b", text)
    if power:
        value = float(power.group(1).replace(",", "."))
        if power.group(2).startswith(("kw", "quilo")):
            value *= 1000
        entities["potencia_watts"] = value

    # TEMPO: "1h30", "2 horas", "30 minutos", "meia hora"
    hour_minute = re.search(r"(\d+)\s*h\s*(\d{1,2})\b", text)
    time = re.search(r"(\d+(?:[.,]\d+)?)\s*(minutos?|mins?|horas?|hrs?|h)\b", text)

    if hour_minute:
        entities["hours_per_day"] = int(hour_minute.group(1)) + int(hour_minute.group(2)) / 60
    elif time:
        value = float(time.group(1).replace(",", "."))
        if time.group(2).startswith("min"):
            value /= 60
        entities["hours_per_day"] = round(value, 4)
    elif "meia hora" in text:
        entities["hours_per_day"] = 0.5

    days = re.search(r"(\d+)\s*dias?\s*(?:por|no|ao)\s*mes", text)
    if days:
        entities["days_per_month"] = int(days.group(1))

    # APARELHO: VEM DO CATÁLOGO DO BANCO, COM TOLERÂNCIA A ERRO
    entities.update(encontrar_dispositivo(message, catalog))

    return entities


def process_message(message: str, catalog: dict | None = None):
    model = load_model()
    normalized = normalize(message)

    probabilities = model.predict_proba([normalized])[0]
    index = int(probabilities.argmax())

    return {
        "intent": str(model.classes_[index]),
        "confidence": round(float(probabilities[index]), 3),
        "entities": extract_entities(message, catalog),
    }
```

### A.4.5 `app/main.py`: receber o catálogo + rota para retreinar

```python
from typing import List, Optional

from app.nlu.processor import load_model, process_message, train_model
# (mantenha os outros imports)


class TipoCatalogo(BaseModel):
    id: int
    nome: str
    sinonimos: List[str] = []


class DispositivoCatalogo(BaseModel):
    id: int
    nome: str
    tipo_id: Optional[int] = None


class Catalogo(BaseModel):
    types: List[TipoCatalogo] = []
    devices: List[DispositivoCatalogo] = []


class MessageRequest(BaseModel):
    message: str
    catalog: Optional[Catalogo] = None


@app.post("/nlu/parse")
def parse_message(request: MessageRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Mensagem não pode ser vazia")

    catalog = request.catalog.model_dump() if request.catalog else None
    return process_message(request.message, catalog)


# RETREINA SEM PRECISAR APAGAR O .pkl NA MÃO (USE DEPOIS DE EDITAR O training_data.json)
@app.post("/nlu/train")
def retrain():
    train_model()
    load_model.cache_clear()
    return {"status": "modelo de intenções treinado novamente"}
```

> Se o seu Pydantic for a versão 1 (`pip show pydantic`), troque `.model_dump()` por `.dict()`.

⚠️ **Apague o `app/nlu/nlu_model.pkl`** (ou chame `POST /nlu/train`) depois dessas mudanças. O modelo antigo não tem o `FeatureUnion`.

> **E as frases com erro no `training_data.json`?** Não precisa mais escrever cada erro à mão, porque o `augmentation.py` já gera as variações. Continue acrescentando frases **diferentes** (jeitos novos de perguntar). Isso é o que mais melhora o modelo.

---

## A.5 Front

O mesmo catálogo serve para **reconhecer o tipo enquanto o usuário digita o nome** no cadastro: "Chuveiro do banheiro" escolhe sozinho o tipo CHUVEIRO e preenche 5500 W e 0,5 h, e o usuário só ajusta se souber o valor exato.

### A.5.1 `utils/dispositivoMapper.js`

Esse arquivo é criado na **Parte B** (B.4). A função `reconhecerTipo` já está nele.

### A.5.2 `pages/Dispositivos/DevicesPage.jsx` → `DeviceForm`

Importe:

```js
import { reconhecerTipo } from "../../utils/dispositivoMapper.js";
```

Dentro do `DeviceForm`, troque o `updateField` e acrescente dois estados:

```js
  // CAMPOS QUE O USUÁRIO MEXEU À MÃO NÃO SÃO MAIS SOBRESCRITOS PELO RECONHECIMENTO
  const [manuais, setManuais] = useState(() =>
    device ? { fk_tipoDispositivo: true, potenciaW: true, horasUsoDia: true } : {}
  );
  const [tipoReconhecido, setTipoReconhecido] = useState(null);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    const valor = type === "checkbox" ? checked : value;

    if (name !== "nome") {
      setManuais((atual) => ({ ...atual, [name]: true }));
      setForm((current) => ({ ...current, [name]: valor }));
      return;
    }

    // RECONHECE O TIPO PELO NOME DIGITADO E PREENCHE COM A MÉDIA DO TIPO
    const tipo = reconhecerTipo(valor, tipos);
    setTipoReconhecido(tipo);

    setForm((current) => ({
      ...current,
      nome: valor,
      ...(tipo && !manuais.fk_tipoDispositivo && { fk_tipoDispositivo: String(tipo.id) }),
      ...(tipo?.potencia_media_watts && !manuais.potenciaW && { potenciaW: String(tipo.potencia_media_watts) }),
      ...(tipo?.horas_uso_tipicas != null && !manuais.horasUsoDia && { horasUsoDia: String(tipo.horas_uso_tipicas) }),
    }));
  }
```

Logo abaixo do `<input id="device-name" ... />` (ainda dentro do `FormField` do nome):

```jsx
          {tipoReconhecido && !manuais.fk_tipoDispositivo && (
            <small className="energy-hint">
              Reconhecido como <strong>{tipoReconhecido.tipo}</strong>. Potência e horas foram
              preenchidas com a média desse tipo. Ajuste se souber o valor exato.
            </small>
          )}
```

E em `styles/energy-shared.css` (o antigo `EnergyShared.css`, ver Parte B):

```css
.energy-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--energy-muted);
}
```

---

## A.6 Como adicionar um aparelho novo

Exemplo: **air fryer**.

```sql
INSERT INTO "Tipo_Dispositivo" (tipo, sinonimos, potencia_media_watts, horas_uso_tipicas)
VALUES ('AIR FRYER', ARRAY['air fryer','airfryer','fritadeira'], 1500, 0.5);

INSERT INTO "Dica_Economia" (texto, "fk_tipoDispositivo", fk_prioridade)
SELECT 'Não pré-aqueça por mais tempo que o necessário e prepare porções juntas.', t.id, p.id
FROM "Tipo_Dispositivo" t, "Prioridade" p
WHERE t.tipo = 'AIR FRYER' AND p.prioridade = 'MÉDIA';
```

E pronto: nada de código e nada de retreinar. A partir da próxima mensagem:
- o chat entende "quanto gasta minha **airfrier**?";
- o cadastro do front reconhece o tipo;
- as dicas calculadas e as do banco aparecem.

---

<a id="parte-b"></a>
# Parte B – Reorganizar `components/energy`

## B.1 O que tem lá hoje e para onde vai

| Hoje (`src/components/energy/`) | O que é | Vai para |
|---|---|---|
| `EnergyLayout.jsx` | layout das páginas logadas | `components/layout/EnergyLayout.jsx` |
| `EnergyLayout.css` | estilo do layout | `components/layout/EnergyLayout.css` |
| `AppSidebar.jsx` | menu lateral (parte do layout) | `components/layout/AppSidebar.jsx` |
| `EnergyComponents.jsx` | 5 componentes visuais num arquivo só | `components/ui/` (**um arquivo por componente**) |
| `EnergyShared.css` | variáveis de tema + classes `energy-*` usadas em várias páginas | `styles/energy-shared.css` |
| `EnergyTheme.js` | **contexto** do React (tema) | `contexts/EnergyTheme.js` |
| `useEnergyStorage.js` | **hook** (`useLocalStorageState`) | `hooks/useLocalStorageState.js` |
| `navigation.js` | **configuração** do menu | `config/navigation.js` |
| `devicePresentation.js` | funções de conversão de dados | `utils/dispositivoMapper.js` (junto com `daApi`/`paraApi`) |

Fora de `energy`, ainda tem três coisas que valem arrumar:

| Hoje | Vai para | Por quê |
|---|---|---|
| `components/protected-route/ProtectedRoute.jsx` | `components/routing/ProtectedRoute.jsx` | agrupa o que é de rota |
| `data/energyMock.js` | `mocks/energyMock.js` | deixa claro que são dados falsos |
| `services/dispositivo-service.js` | `services/dispositivoService.js` | mesmo padrão de nome dos outros serviços |

## B.2 Estrutura final

```
src/
├── assets/
│   └── logo.png
├── components/
│   ├── chatbot/
│   │   ├── ChatInput.jsx
│   │   ├── ChatMessage.jsx
│   │   └── ChatSidebar.jsx
│   ├── layout/
│   │   ├── AppSidebar.jsx
│   │   ├── EnergyLayout.css
│   │   └── EnergyLayout.jsx
│   ├── routing/
│   │   └── ProtectedRoute.jsx
│   └── ui/
│       ├── FormField.jsx
│       ├── MetricCard.jsx
│       ├── Modal.jsx
│       ├── PageHeading.jsx
│       ├── Toggle.jsx
│       └── index.js            ← re-exporta todos
├── config/
│   ├── environment.js
│   └── navigation.js
├── contexts/
│   └── EnergyTheme.js
├── hooks/
│   ├── useCasaAtual.js
│   └── useLocalStorageState.js
├── infrastructure/
│   └── http-client.js
├── mocks/
│   └── energyMock.js
├── pages/ (sem mudanças de pasta)
├── services/
│   ├── apiService.js
│   ├── authService.js
│   ├── baseService.js
│   ├── casaService.js
│   ├── chatbotService.js
│   ├── dispositivoService.js
│   ├── energyApi.js            ← mock, ainda usado por Ambientes e Energia
│   └── usuarioService.js
├── styles/
│   └── energy-shared.css
├── utils/
│   └── dispositivoMapper.js
├── App.css
├── App.jsx
├── index.css
└── main.jsx
```

## B.3 Mover os arquivos (PowerShell, dentro de `smartmind-web`)

> Faça um **commit antes**, para conseguir voltar se algo der errado. O `git mv` mantém o histórico de cada arquivo.

```powershell
cd "C:\Users\Raphael\Documents\UNIFECAF\4-SEMESTRE\PROJETO SEMESTRAL\SmartMind\smartmind-web"
```

```powershell
New-Item -ItemType Directory -Force src/components/layout, src/components/ui, src/components/routing, src/contexts, src/utils, src/mocks, src/styles
```

```powershell
git mv src/components/energy/EnergyLayout.jsx src/components/layout/EnergyLayout.jsx
git mv src/components/energy/EnergyLayout.css src/components/layout/EnergyLayout.css
git mv src/components/energy/AppSidebar.jsx src/components/layout/AppSidebar.jsx
git mv src/components/energy/EnergyShared.css src/styles/energy-shared.css
git mv src/components/energy/EnergyTheme.js src/contexts/EnergyTheme.js
git mv src/components/energy/useEnergyStorage.js src/hooks/useLocalStorageState.js
git mv src/components/energy/navigation.js src/config/navigation.js
git mv src/components/energy/devicePresentation.js src/utils/dispositivoMapper.js
git mv src/components/protected-route/ProtectedRoute.jsx src/components/routing/ProtectedRoute.jsx
git mv src/data/energyMock.js src/mocks/energyMock.js
git mv src/services/dispositivo-service.js src/services/dispositivoService.js
```

> Se algum `git mv` disser que o arquivo "not under version control" (arquivo novo, ainda sem commit), use `Move-Item origem destino` para esse arquivo.

O `EnergyComponents.jsx` vai ser **dividido** (B.4), então ele só é apagado no final:

```powershell
git rm src/components/energy/EnergyComponents.jsx
```

Depois que tudo estiver funcionando, apague as pastas vazias `components/energy`, `components/protected-route` e `data`.

> 💡 **Alternativa:** no VS Code, arrastar o arquivo no Explorer pergunta "Atualizar importações?". Clique em **Sim** e ele corrige os imports sozinho (configuração `javascript.updateImportsOnFileMove.enabled`). Mesmo assim, confira com a tabela B.5.

## B.4 Conteúdo dos arquivos novos

### `components/ui/PageHeading.jsx`

```jsx
export default function PageHeading({ eyebrow, title, description, action }) {
  return (
    <header className="energy-heading">
      <div>
        {eyebrow && <div className="energy-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="energy-actions">{action}</div>}
    </header>
  );
}
```

### `components/ui/MetricCard.jsx`

```jsx
export default function MetricCard({ label, value, note, icon }) {
  return (
    <article className="energy-metric">
      <div className="energy-metric-label">
        <span>{label}</span>
        <span className="energy-metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="energy-metric-value">{value}</strong>
      <span className="energy-metric-note">{note}</span>
    </article>
  );
}
```

### `components/ui/FormField.jsx`

```jsx
export default function FormField({ label, htmlFor, children, className = "" }) {
  return (
    <div className={"energy-field " + className}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
```

### `components/ui/Toggle.jsx`

```jsx
export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      className="energy-toggle"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
```

### `components/ui/Modal.jsx`

```jsx
import { useEffect } from "react";

export default function Modal({ title, description, onClose, children, role = "dialog" }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="energy-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="energy-modal"
        role={role}
        aria-modal="true"
        aria-labelledby="energy-modal-title"
        aria-describedby={description ? "energy-modal-description" : undefined}
      >
        <header className="energy-modal-heading">
          <div>
            <h2 id="energy-modal-title">{title}</h2>
            <p id="energy-modal-description">{description}</p>
          </div>
          <button className="energy-close" type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
```

### `components/ui/index.js`

Com ele, as páginas continuam importando tudo numa linha só:

```js
export { default as FormField } from "./FormField.jsx";
export { default as MetricCard } from "./MetricCard.jsx";
export { default as Modal } from "./Modal.jsx";
export { default as PageHeading } from "./PageHeading.jsx";
export { default as Toggle } from "./Toggle.jsx";
```

### `utils/dispositivoMapper.js` (substituir o conteúdo do antigo `devicePresentation.js`)

Junta tudo o que converte e interpreta dados de dispositivo:
- `daApi` e `paraApi`, que **saem do `DevicesPage.jsx`**;
- `kwhMes`;
- a escolha do desenho do card (`getDeviceArt`);
- o `reconhecerTipo` da Parte A.

```js
// ===================== TEXTO =====================

export function normalizarTexto(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // TIRA ACENTOS
    .replace(/[-_]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ===================== API <-> TELA =====================

// API -> TELA
export function daApi(d) {
  return {
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    fk_tipoDispositivo: d.fk_tipoDispositivo,
    potenciaW: Number(d.potencia_watts ?? 0),
    horasUsoDia: Number(d.horas_uso_dia ?? 0),
    ativo: Boolean(d.ligado),
    foto: d.foto_url ?? "",
    arte: getDeviceArt(d.tipo, d.nome),
  };
}

// TELA -> API
export function paraApi(form, casaId) {
  return {
    nome: form.nome.trim(),
    fk_tipoDispositivo: Number(form.fk_tipoDispositivo),
    fk_casa: casaId,
    potencia_watts: Number(form.potenciaW),
    horas_uso_dia: Number(form.horasUsoDia),
    ligado: Boolean(form.ativo),
    foto_url: form.foto?.trim() || undefined,
  };
}

// CONSUMO ESTIMADO (kWh) EM N DIAS
export function kwhMes(device, dias = 30) {
  return (Number(device.potenciaW) * Number(device.horasUsoDia) * dias) / 1000;
}

// ===================== RECONHECIMENTO DE TIPO =====================

// PROCURA O TIPO PELO NOME DIGITADO USANDO O NOME E OS SINÔNIMOS QUE VIERAM DO BANCO.
// O TERMO MAIS LONGO GANHA ("sensor de temperatura" GANHA DE "sensor").
export function reconhecerTipo(nome, tipos = []) {
  const texto = ` ${normalizarTexto(nome)} `;
  let melhor = null;

  for (const tipo of tipos) {
    for (const termo of [tipo.tipo, ...(tipo.sinonimos ?? [])]) {
      const termoNormalizado = normalizarTexto(termo);
      if (!termoNormalizado) continue;

      const encontrou = texto.includes(` ${termoNormalizado} `);
      if (encontrou && (!melhor || termoNormalizado.length > melhor.tamanho)) {
        melhor = { tipo, tamanho: termoNormalizado.length };
      }
    }
  }

  return melhor?.tipo ?? null;
}

// ===================== APARÊNCIA NA HOME =====================

// QUAL DESENHO O CARD DA HOME USA (CLASSES device-art-* DO HomePage.css)
const ARTES = [
  { arte: "air", termos: ["ar condicionado", "aquecedor", "ventilador", "climatizador"] },
  { arte: "coffee", termos: ["cafeteira", "micro ondas", "microondas", "forno"] },
  { arte: "ceiling", termos: ["luz principal", "teto", "plafon", "lustre"] },
];

export function getDeviceArt(tipo = "", nome = "") {
  const texto = normalizarTexto(`${tipo} ${nome}`);
  return ARTES.find(({ termos }) => termos.some((termo) => texto.includes(termo)))?.arte ?? "lamp";
}
```

> No front, o reconhecimento usa só **correspondência exata** (com acento e maiúscula ignorados). Para um campo de cadastro isso basta. A tolerância a erro de digitação ficou no Python, que é onde o usuário escreve livremente.
> As `ARTES` continuam no código porque são **aparência** (qual desenho mostrar), não conhecimento sobre o aparelho.

No `DevicesPage.jsx`, **apague** as funções `daApi`, `paraApi` e `kwhMes` de dentro dele e importe do utilitário:

```js
import { daApi, kwhMes, paraApi, reconhecerTipo } from "../../utils/dispositivoMapper.js";
```

## B.5 Imports para corrigir

| Arquivo | Import antigo | Import novo |
|---|---|---|
| `App.jsx` | `'./components/energy/EnergyLayout.jsx'` | `'./components/layout/EnergyLayout.jsx'` |
| `App.jsx` | `'./components/protected-route/ProtectedRoute.jsx'` | `'./components/routing/ProtectedRoute.jsx'` |
| `components/layout/AppSidebar.jsx` | `"./navigation.js"` | `"../../config/navigation.js"` |
| `components/layout/EnergyLayout.jsx` | `"./EnergyTheme.js"` | `"../../contexts/EnergyTheme.js"` |
| `components/layout/EnergyLayout.jsx` | `"./navigation.js"` | `"../../config/navigation.js"` |
| `components/layout/EnergyLayout.jsx` | `"./EnergyShared.css"` | `"../../styles/energy-shared.css"` |
| `components/routing/ProtectedRoute.jsx` | `'../../services/authService'` | `'../../services/authService.js'` (só acrescentar `.js`) |
| `pages/Configuracoes/SettingsPage.jsx` | `"../../components/energy/EnergyComponents.jsx"` | `"../../components/ui/index.js"` |
| `pages/Configuracoes/SettingsPage.jsx` | `"../../components/energy/useEnergyStorage.js"` | `"../../hooks/useLocalStorageState.js"` |
| `pages/Configuracoes/SettingsPage.jsx` | `"../../components/energy/EnergyTheme.js"` | `"../../contexts/EnergyTheme.js"` |
| `pages/Dispositivos/DevicesPage.jsx` | `"../../components/energy/EnergyComponents.jsx"` | `"../../components/ui/index.js"` |
| `pages/Dispositivos/DevicesPage.jsx` | `"../../services/dispositivo-service.js"` | `"../../services/dispositivoService.js"` |
| `pages/Ambientes/RoomsPage.jsx` | `"../../components/energy/EnergyComponents.jsx"` | `"../../components/ui/index.js"` |
| `pages/Energia/EnergyPage.jsx` | `"../../components/energy/EnergyComponents.jsx"` | `"../../components/ui/index.js"` |
| `pages/Home/HomePage.jsx` | (a Home é reescrita na Parte C) | — |
| `services/energyApi.js` | `"../data/energyMock.js"` | `"../mocks/energyMock.js"` |

Os imports que **não mudam** (`"./AppSidebar.jsx"`, `"./EnergyLayout.css"`, `"../../pages/Home/HomePage.css"`, `"../../services/authService.js"`, `"../../assets/logo.png"`) continuam certos, porque a pasta nova está na mesma profundidade da antiga.

Para conferir se sobrou algum caminho velho:

```powershell
Select-String -Path src\**\*.js, src\**\*.jsx -Pattern "components/energy|protected-route|data/energyMock|dispositivo-service|devicePresentation|useEnergyStorage"
```

Não pode aparecer nada. Depois rode:

```powershell
npm run lint
```

```powershell
npm run dev
```

## B.6 (Opcional) Tirar o CSS do layout de dentro do `HomePage.css`

Hoje o `EnergyLayout.jsx` importa `pages/Home/HomePage.css`, porque é lá que estão os estilos do menu e da barra superior (`.sm-app`, `.sm-sidebar`, `.sm-topbar`...). Um componente importar o CSS de uma página é um acoplamento estranho: se um dia a Home sair, o layout quebra.

Para separar:
1. **Recorte** do `HomePage.css` o bloco do começo até `.sm-content { ... }`, incluindo `.sm-app`, `.sm-sidebar`, `.sm-brand*`, `.sm-side-*`, `.sm-nav-link*`, `.sm-icon`, `.sm-profile*`, `.sm-avatar`, `.sm-main`, `.sm-topbar`, `.sm-breadcrumb*`, `.sm-top-actions`, `.sm-search*`, `.sm-theme-button*`, `.sm-mini-avatar` e `.sm-content`. Hoje isso vai mais ou menos da linha 1 à 275. **Cole** esse bloco em `components/layout/EnergyLayout.css`.
2. Nas `@media` do fim do `HomePage.css`, faça o mesmo **só com as regras desses seletores**. Mantenha o `@media (...)` em volta delas no arquivo novo.
3. Mova `.sm-live-dot` para `styles/energy-shared.css`, porque a página de Dispositivos também usa.
4. No `EnergyLayout.jsx`, apague `import "../../pages/Home/HomePage.css";`.
5. Abra todas as páginas e confira se nada mudou de aparência.

> Esse passo é só organização; o visual não muda. Se estiver em cima da hora da entrega, deixe para depois.

---

<a id="parte-c"></a>
# Parte C – Home com dados reais

O que muda na `HomePage.jsx`:

| Antes (mock) | Depois |
|---|---|
| `getDispositivos()` do `energyApi.js` | `dispositivoService.listarPorCasa(casaAtual.id)` + `daApi` |
| `updateDispositivo` para ligar/desligar | `dispositivoService.alterarEstado` com atualização otimista |
| filtro por **ambiente** (tabela não existe) | filtro por **tipo** (vem do banco) |
| slider de "intensidade" (não existe no banco) | consumo estimado do aparelho (kWh/mês · h/dia) |
| "4,28 kWh" e "12% menos que ontem" fixos | estimativa diária calculada com os aparelhos reais |
| barrinhas do gráfico fixas | uma barra por aparelho, proporcional ao consumo |
| clima "27° São Paulo" fixo | potência ligada agora (dado real) |

> O controle de **temperatura do ar-condicionado** continua só visual: não existe coluna no banco para isso. Deixei um comentário no código. Se quiser que funcione de verdade, é um `ALTER TABLE "Dispositivo" ADD COLUMN temperatura_alvo INTEGER` mais uma rota parecida com a `/estado`.

### `pages/Home/HomePage.jsx` (substituir)

```jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { dispositivoService } from "../../services/dispositivoService.js";
import { daApi, kwhMes } from "../../utils/dispositivoMapper.js";
import "./HomePage.css";

const ICONES_FILTRO = ["▣", "☾", "⌑", "▤"];

const numero = (valor, casas = 1) =>
  valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });

export default function HomePage() {
  const { usuario, casaAtual, carregando: carregandoCasa } = useCasaAtual();
  const casaId = casaAtual?.id;

  const [filtro, setFiltro] = useState("Todos");
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [temperature, setTemperature] = useState(22); // SÓ VISUAL: NÃO EXISTE COLUNA NO BANCO

  // ---------- CARREGA OS DISPOSITIVOS DA CASA ----------
  useEffect(() => {
    if (carregandoCasa || !casaId) return;
    let ignorar = false;

    dispositivoService
      .listarPorCasa(casaId)
      .then((lista) => {
        if (!ignorar) setDevices((lista ?? []).map(daApi));
      })
      .catch((error) => {
        if (!ignorar) setErro(error.message || "Não foi possível carregar os dispositivos.");
      })
      .finally(() => {
        if (!ignorar) setLoading(false);
      });

    return () => {
      ignorar = true;
    };
  }, [carregandoCasa, casaId]);

  // ---------- SAUDAÇÃO ----------
  const displayName = usuario?.nome?.trim();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  // ---------- NÚMEROS DO RESUMO (TODOS CALCULADOS) ----------
  const ativos = devices.filter((device) => device.ativo);
  const potenciaAgora = ativos.reduce((soma, device) => soma + device.potenciaW, 0);
  const consumoDiario = devices.reduce((soma, device) => soma + kwhMes(device, 1), 0);
  const maiorConsumo = Math.max(0, ...devices.map((device) => kwhMes(device)));

  // ---------- FILTRO POR TIPO (VEM DOS PRÓPRIOS DISPOSITIVOS) ----------
  const filtros = useMemo(() => {
    const tipos = [...new Set(devices.map((device) => device.tipo).filter(Boolean))].sort();
    return [
      { nome: "Todos", icone: "⌂" },
      ...tipos.map((tipo, index) => ({ nome: tipo, icone: ICONES_FILTRO[index % ICONES_FILTRO.length] })),
    ];
  }, [devices]);

  const visibleDevices = devices.filter((device) => filtro === "Todos" || device.tipo === filtro);

  // ---------- LIGAR / DESLIGAR (OTIMISTA) ----------
  async function toggleDevice(device) {
    const novoEstado = !device.ativo;
    setDevices((atual) => atual.map((item) => (item.id === device.id ? { ...item, ativo: novoEstado } : item)));

    try {
      await dispositivoService.alterarEstado(device.id, novoEstado);
    } catch (error) {
      setDevices((atual) => atual.map((item) => (item.id === device.id ? { ...item, ativo: device.ativo } : item)));
      setErro(error.message || "Não foi possível alterar o estado do dispositivo.");
    }
  }

  const semCasa = !carregandoCasa && !casaAtual;

  return (
    <>
      <section className="sm-welcome-row">
        <div>
          <div className="sm-eyebrow">
            <span className="sm-live-dot" /> CASA CONECTADA{" "}
            <span className="sm-welcome-date">· {formattedDate}</span>
          </div>
          <h1>
            {displayName ? `${greeting}, ${displayName}` : greeting} <span className="sm-wave">✳</span>
          </h1>
          <p>{casaAtual ? `Acompanhe ${casaAtual.nome.toLowerCase()} em tempo real.` : "Sua casa, em harmonia."}</p>
        </div>
      </section>

      {semCasa ? (
        <div className="sm-empty-state">
          Você ainda não tem uma casa cadastrada. <Link to="/configuracoes">Cadastre em Configurações</Link> para começar.
        </div>
      ) : (
        <>
          <section className="sm-summary-grid" aria-label="Resumo da casa">
            {/* ---------- CASA ---------- */}
            <article className="sm-summary-card sm-summary-home">
              <div className="sm-summary-top">
                <span className="sm-summary-icon lilac">⌂</span>
              </div>
              <span className="sm-card-label">Sua casa</span>
              <strong className="sm-summary-value">{casaAtual?.nome ?? "Carregando…"}</strong>
              <span className="sm-card-foot">
                <i className="sm-live-dot" /> {casaAtual?.cidade ?? "Sistema funcionando normalmente"}
              </span>
            </article>

            {/* ---------- DISPOSITIVOS ATIVOS ---------- */}
            <article className="sm-summary-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon mint">⌘</span>
                <span className="sm-summary-muted">de {devices.length} dispositivos</span>
              </div>
              <span className="sm-card-label">Dispositivos ligados</span>
              <div className="sm-stat-line">
                <strong className="sm-summary-value">{ativos.length}</strong>
                <span className="sm-stat-unit">unidades</span>
              </div>
              <div className="sm-meter">
                <span style={{ width: (ativos.length / Math.max(devices.length, 1)) * 100 + "%" }} />
              </div>
              <span className="sm-card-foot">Ligue e desligue pelos cards abaixo</span>
            </article>

            {/* ---------- CONSUMO ESTIMADO ---------- */}
            <article className="sm-summary-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon amber">ϟ</span>
                <span className="sm-summary-muted">Por dia</span>
              </div>
              <span className="sm-card-label">Consumo estimado</span>
              <div className="sm-stat-line">
                <strong className="sm-summary-value">{numero(consumoDiario, 2)}</strong>
                <span className="sm-stat-unit">kWh</span>
              </div>
              {/* UMA BARRA POR APARELHO, PROPORCIONAL AO CONSUMO */}
              <div className="sm-spark-bars" aria-hidden="true">
                {devices.slice(0, 20).map((device) => (
                  <i
                    key={device.id}
                    title={device.nome}
                    style={{ height: Math.max(6, maiorConsumo ? (kwhMes(device) / maiorConsumo) * 100 : 0) + "%" }}
                  />
                ))}
              </div>
              <span className="sm-card-foot">Potência × horas de uso de cada aparelho</span>
            </article>

            {/* ---------- POTÊNCIA AGORA ---------- */}
            <article className="sm-summary-card sm-weather-card">
              <div className="sm-summary-top">
                <span className="sm-summary-icon sky">◉</span>
                <span className="sm-weather-place">Agora</span>
              </div>
              <span className="sm-card-label">Potência ligada</span>
              <div className="sm-weather-main">
                <strong className="sm-summary-value">{numero(potenciaAgora, 0)}</strong>
                <span className="sm-stat-unit">W</span>
              </div>
              <span className="sm-card-foot">Soma dos aparelhos ligados</span>
            </article>
          </section>

          {/* ---------- FILTRO POR TIPO ---------- */}
          <section className="sm-room-section" id="tipos">
            <div className="sm-section-heading">
              <div>
                <h2>Tipos de aparelho</h2>
                <p>Escolha um tipo para filtrar seus dispositivos</p>
              </div>
              <Link className="sm-text-button" to="/dispositivos">
                Gerenciar <span>→</span>
              </Link>
            </div>
            <div className="sm-room-pills" role="tablist" aria-label="Filtrar por tipo">
              {filtros.map(({ nome, icone }) => (
                <button
                  key={nome}
                  role="tab"
                  aria-selected={filtro === nome}
                  className={"sm-room-pill" + (filtro === nome ? " selected" : "")}
                  onClick={() => setFiltro(nome)}
                  type="button"
                >
                  <span>{icone}</span>
                  {nome}
                  {nome === "Todos" && <small>{devices.length}</small>}
                </button>
              ))}
            </div>
          </section>

          {/* ---------- CARDS ---------- */}
          <section className="sm-device-section" id="dispositivos">
            <div className="sm-section-heading sm-devices-heading">
              <div>
                <h2>
                  Seus dispositivos <span className="sm-heading-count">{visibleDevices.length}</span>
                </h2>
                <p>Gerencie o conforto da sua casa</p>
              </div>
            </div>

            {erro && <div className="sm-empty-state" role="alert">{erro}</div>}

            {loading || carregandoCasa ? (
              <div className="sm-empty-state">Carregando dispositivos…</div>
            ) : (
              <>
                <div className="sm-device-grid">
                  {visibleDevices.map((device) => (
                    <article className={"sm-device-card" + (device.ativo ? " is-on" : "")} key={device.id}>
                      <div className={"sm-device-visual device-art-" + device.arte}>
                        {device.foto && (
                          <img
                            className="sm-device-photo-image"
                            src={device.foto}
                            alt=""
                            aria-hidden="true"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="sm-device-ambient" />
                        <button
                          className={"sm-toggle" + (device.ativo ? " checked" : "")}
                          type="button"
                          onClick={() => toggleDevice(device)}
                          role="switch"
                          aria-checked={device.ativo}
                          aria-label={(device.ativo ? "Desligar " : "Ligar ") + device.nome}
                        >
                          <i />
                        </button>
                        <span className="sm-device-room-tag">{device.tipo}</span>
                      </div>

                      <div className="sm-device-info">
                        <div className="sm-device-title">
                          <div>
                            <h3>{device.nome}</h3>
                            <span>
                              <i className={device.ativo ? "sm-live-dot" : ""} />
                              {device.ativo ? "Ligado" : "Desligado"}
                            </span>
                            <span className="sm-device-power-label">{numero(device.potenciaW, 0)} W</span>
                          </div>
                        </div>

                        {device.arte === "air" ? (
                          <div className="sm-device-control">
                            <button
                              type="button"
                              aria-label="Diminuir temperatura"
                              onClick={() => setTemperature((valor) => Math.max(16, valor - 1))}
                            >
                              −
                            </button>
                            <span>
                              {temperature}°<small>C</small>
                            </span>
                            <button
                              type="button"
                              aria-label="Aumentar temperatura"
                              onClick={() => setTemperature((valor) => Math.min(30, valor + 1))}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="sm-coffee-note">
                            ϟ <span>≈ {numero(kwhMes(device))} kWh/mês · {numero(device.horasUsoDia)} h/dia</span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {visibleDevices.length === 0 && (
                  <div className="sm-empty-state">
                    {devices.length === 0 ? (
                      <>Nenhum dispositivo cadastrado. <Link to="/dispositivos">Adicione o primeiro</Link>.</>
                    ) : (
                      "Nenhum dispositivo desse tipo."
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      <footer className="sm-footer">
        <span>
          SmartMind <b>·</b> Sua casa, em harmonia.
        </span>
        <span>
          <i className="sm-live-dot" /> Todos os sistemas operacionais
        </span>
      </footer>
    </>
  );
}
```

> O `daApi` devolve os mesmos nomes de campo que o mock usava (`potenciaW`, `horasUsoDia`, `ativo`). Por isso, a página **Energia** (`EnergyPage.jsx`) pode trocar `getDispositivos()` por `useCasaAtual()` + `dispositivoService.listarPorCasa()` + `daApi` quase sem mexer no resto. A tarifa sai do `casaService.buscarTarifa(casaAtual.id)`. Depois disso, só a página **Ambientes** continua no mock (ela precisa da tabela `Ambiente`, que ainda não existe).

---

## Como testar

1. **Banco:** confira os dados novos.
   ```sql
   SELECT tipo, sinonimos, potencia_media_watts FROM "Tipo_Dispositivo" ORDER BY tipo;
   SELECT COUNT(*) FROM "Dica_Economia";
   ```
2. **Python:**
   ```powershell
   cd "C:\Users\Raphael\Documents\UNIFECAF\4-SEMESTRE\PROJETO SEMESTRAL\SmartMind\smartmind-ai"
   ```
   ```powershell
   Remove-Item app\nlu\nlu_model.pkl
   ```
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   Em http://localhost:8000/docs → `POST /nlu/parse` com `{"message": "quanto gasta meu chuverio?"}`.
   A resposta precisa ter `"device": "chuveiro"` (veio do `CATALOGO_PADRAO`, porque o teste não mandou o catálogo).
3. **API:** `npm run start:dev` e, no Swagger (`/api`), `POST /api/chatbot/mensagem`:
   - `"quanto gasta o ar condicionao da sala?"` → reconhece o aparelho cadastrado e já calcula com a potência do banco;
   - `"quanto gasta minha geladeira?"` → pede potência e horas e oferece os botões "Usar 60 W" e "24 horas por dia";
   - `"dicas para o chuveiro"` → mistura dicas calculadas (economia em R$) com as do banco;
   - `"quais dispositivos eu tenho?"` → mostra quem mais consome, com o botão de dicas para ele.
4. **Front:**
   - Dispositivos → "Novo dispositivo" → digite "Chuveiro do banheiro". O tipo deve virar **CHUVEIRO** sozinho, com 5500 W e 0,5 h.
   - Home → os cards mostram os aparelhos reais, o filtro por tipo funciona, e ligar/desligar muda o banco (confira em Dispositivos ou com `SELECT ligado FROM "Dispositivo"`).
   - `npm run lint` sem erros.
