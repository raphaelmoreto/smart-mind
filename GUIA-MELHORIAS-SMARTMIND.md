# Guia de melhorias – SmartMind

> Guia passo a passo para você implementar à mão. **Nenhum arquivo de código foi alterado.**
> Ordem recomendada: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**, porque cada etapa usa o que foi feito na anterior
> (o chatbot, por exemplo, usa o repositório de dispositivos para responder "quais dispositivos eu tenho?").

---

## Sumário

0. [Diagnóstico – o que encontrei no código](#0-diagnóstico)
1. [Banco de dados (script SQL)](#1-banco-de-dados)
2. [API – Dispositivos (CRUD completo + ligar/desligar)](#2-api--dispositivos)
3. [API – Usuário e Casa (para a página Configurações)](#3-api--usuário-e-casa)
4. [API – Chatbot: histórico por usuário + respostas melhores](#4-api--chatbot)
5. [IA (Python) – NLU mais esperta, confiança e correções](#5-ia-python)
6. [Front – infraestrutura (env, serviços, hook da casa, rotas protegidas)](#6-front--infraestrutura)
7. [Front – páginas Configurações e Dispositivos](#7-front--configurações-e-dispositivos)
8. [Front – nova página do Chatbot (layout e interface)](#8-front--página-do-chatbot)
9. [Outras melhorias (segurança, pequenos bugs)](#9-outras-melhorias)
10. [Como testar tudo](#10-como-testar)

---

## 0. Diagnóstico

| # | Onde | Problema |
|---|------|----------|
| 1 | `smartmind-web/src/App.jsx` | O chatbot recebe `casaId="123"` fixo, e essa casa não existe no banco. A rota `/chatbot` também fica fora do `EnergyLayout` (sem menu lateral nem tema). |
| 2 | `chatbot/infrastructure/repositories/chat-history.repository.ts` | Só faz `console.log`, então nada é salvo. E o use case nem chama esse repositório. |
| 3 | `chatbot/domain/dto/chatbot.dto.ts` | `casaId` é `string` (no banco é `INTEGER`) e não existe `usuarioId`, então não dá para gravar `fk_usuario`. |
| 4 | `chatbot/application/clients/python-ai.client.ts` | Chama `/ml/predict-consumption`, mas o Python expõe **`/ml/predict`** (sempre daria 404). A URL `localhost:8000` também está fixa no código. |
| 5 | `chatbot/infrastructure/repositories/tarifa.repository.ts` | A tarifa está fixa em `0.85`, apesar de existir a tabela `Tarifa_Energia`. |
| 6 | `chatbot.ts` | As intenções `consultar_consumo`, `prever_fatura` e `consultar_dispositivos` só respondem "vou consultar..." e não consultam nada. |
| 7 | Chatbot (front + back) | Não existe **contexto entre mensagens**. Quando o bot pergunta "qual a potência?" e o usuário responde "1500 W", a informação anterior (o aparelho) se perde. Isso é o que mais atrapalha a experiência. |
| 8 | `smartmind-ai/app/nlu/processor.py` | O `LinearSVC` sempre escolhe uma intenção, mesmo para "qual a capital da França?" (não há confiança). "ar-condicionado" com hífen não é reconhecido. |
| 9 | `Chatbot.jsx` | `role: 'assistants'` (erro de digitação), `<main>` dentro de `<main>`, sem auto-scroll, sem histórico, sem sugestões, sem horário. |
| 10 | `SettingsPage.jsx` | Salva tudo no `localStorage` (`energyApi.js` é um mock). A API de usuário exige `senha` e `fk_perfil` no PUT, então não serve para "editar perfil". |
| 11 | `DevicesPage.jsx` | Usa o mock `energyApi.js`. O front usa `potenciaW`, `ambienteId`, `foto` e `ativo` (ligado), mas a tabela `Dispositivo` não tem potência, foto nem "ligado". Lá, `ativo` é exclusão lógica. |
| 12 | `dispositivo.repository.ts` | `getAll()` devolve os dispositivos **de todas as casas**, inclusive os excluídos. |
| 13 | Segurança | Senhas em texto puro no banco, e as rotas internas (`/home`, `/dispositivos`...) abrem sem login. |
| 14 | `smartmind-ai/app/main.py` | `predict_consumption` lança `ValueError` (bandeira inválida), mas a rota só captura `RuntimeError, KeyError`, o que vira erro 500. |

---

## 1. Banco de dados

Arquivo de referência: `smartmind-api/src/modules/core/database/script-banco/SCRIPT BANCO Smart_Mind.txt`.
Rode os comandos abaixo no PostgreSQL (pgAdmin / DBeaver) **e** acrescente-os ao final do seu script, para o arquivo continuar sendo a "fonte da verdade".

### 1.1 Conversas do chatbot (cada conversa ligada ao usuário)

A tabela `Chat_Mensagem` já tem `fk_usuario` e `fk_casa`. Falta agrupar as mensagens em **conversas**, para listar o histórico como no ChatGPT, e guardar os dados extras da resposta (sugestões, cálculo).

```sql
-- 1) TABELA DE CONVERSAS
CREATE TABLE "Chat_Conversa" (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL DEFAULT 'NOVA CONVERSA',
    dt_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dt_ultima_mensagem TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dt_exclusao TIMESTAMP NULL,
    fk_usuario INTEGER NOT NULL,
    fk_casa INTEGER NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_chatConversa_usuario
        FOREIGN KEY (fk_usuario)
        REFERENCES "Usuario" (id),

    CONSTRAINT fk_chatConversa_casa
        FOREIGN KEY (fk_casa)
        REFERENCES "Casa" (id)
);

-- 2) CADA MENSAGEM PASSA A PERTENCER A UMA CONVERSA + GUARDA DADOS EXTRAS (JSON)
ALTER TABLE "Chat_Mensagem" ADD COLUMN fk_conversa INTEGER NULL;
ALTER TABLE "Chat_Mensagem" ADD COLUMN dados JSONB NULL;

ALTER TABLE "Chat_Mensagem"
    ADD CONSTRAINT fk_chatMensagem_conversa
    FOREIGN KEY (fk_conversa)
    REFERENCES "Chat_Conversa" (id);

-- 3) ÍNDICES (CONSULTAS DE HISTÓRICO FICAM RÁPIDAS)
CREATE INDEX idx_chatConversa_usuario ON "Chat_Conversa" (fk_usuario, dt_ultima_mensagem DESC);
CREATE INDEX idx_chatMensagem_conversa ON "Chat_Mensagem" (fk_conversa, dt_mensagem);

-- 4) MIGRAR A MENSAGEM DE EXEMPLO QUE JÁ EXISTE
INSERT INTO "Chat_Conversa" (titulo, fk_usuario, fk_casa)
VALUES ('Quanto consumi de energia hoje?', 1, 1);

UPDATE "Chat_Mensagem" SET fk_conversa = 1 WHERE fk_conversa IS NULL;
```

### 1.2 Dispositivo: campos que o front precisa

```sql
ALTER TABLE "Dispositivo"
    ADD COLUMN potencia_watts DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN horas_uso_dia  DECIMAL(4,2)  NOT NULL DEFAULT 0,
    ADD COLUMN ligado         BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN foto_url       TEXT          NULL,
    ADD COLUMN dt_exclusao    TIMESTAMP     NULL;

-- FALTAVA A FK PARA O TIPO DO DISPOSITIVO
ALTER TABLE "Dispositivo"
    ADD CONSTRAINT fk_dispositivo_tipo
    FOREIGN KEY ("fk_tipoDispositivo")
    REFERENCES "Tipo_Dispositivo" (id);

-- DADO DE EXEMPLO
UPDATE "Dispositivo" SET potencia_watts = 1200, horas_uso_dia = 8 WHERE id = 1;
```

> **Por que `ligado` separado de `ativo`?** No seu banco, `ativo = FALSE` quer dizer "excluído" (exclusão lógica).
> Ligar e desligar um aparelho é outra informação, então ganha a coluna `ligado`.

### 1.3 Ajustes de precisão (recomendado)

```sql
-- DECIMAL(5,2) SÓ VAI ATÉ 999,99 kWh, O QUE É POUCO PARA HISTÓRICO
ALTER TABLE "Consumo" ALTER COLUMN consumo TYPE DECIMAL(10,3);

-- TARIFAS REAIS TÊM 4–5 CASAS DECIMAIS (EX.: 0,78542)
ALTER TABLE "Tarifa_Energia" ALTER COLUMN valor_kwh TYPE DECIMAL(10,5);
ALTER TABLE "Tarifa_Energia" ALTER COLUMN valor_adicional_kwh TYPE DECIMAL(10,5);

-- O EXEMPLO DE TEMPERATURA ESTAVA 125,50 °C :)
UPDATE "Temperatura" SET temperatura = 25.50 WHERE id = 1;
```

---

## 2. API – Dispositivos

Pasta: `smartmind-api/src/modules/dispositivos/`

### 2.1 `domain/dto/dispositivo.dto.ts` (substituir o arquivo inteiro)

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class DispositivoInputDto {
    @ApiProperty()
    @IsString()
    nome: string;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_tipoDispositivo: number;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_casa: number;

    @ApiProperty({ example: 1200 })
    @IsNumber()
    @Min(0.1)
    potencia_watts: number;

    @ApiProperty({ example: 4 })
    @IsNumber()
    @Min(0)
    @Max(24)
    horas_uso_dia: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    ligado?: boolean;

    @ApiPropertyOptional({ description: 'URL ou data URL (base64) da foto' })
    @IsOptional()
    @IsString()
    @MaxLength(3_000_000)
    foto_url?: string;
}

export class AlterarEstadoDispositivoDto {
    @ApiProperty()
    @IsBoolean()
    ligado: boolean;
}

export class DispositivoOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() nome: string;
    @ApiProperty() fk_tipoDispositivo: number;
    @ApiProperty() tipo: string;
    @ApiProperty() fk_casa: number;
    @ApiProperty() casa: string;
    @ApiProperty() potencia_watts: number;
    @ApiProperty() horas_uso_dia: number;
    @ApiProperty() ligado: boolean;
    @ApiProperty({ nullable: true }) foto_url: string | null;
    @ApiProperty() dt_cadastro: Date;
    @ApiProperty({ nullable: true }) dt_ultima_conexao: Date | null;
    @ApiProperty() status: string;
}

export class TipoDispositivoOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() tipo: string;
}
```

### 2.2 `domain/entities/dispositivo.entity.ts` (substituir)

> O PostgreSQL devolve `DECIMAL` como **string**. O `decimalTransformer` converte para `number` quando o TypeORM monta a entidade.

```ts
import { Column, Entity, type ValueTransformer } from 'typeorm';
import { BaseEntity } from '../../../core/domain/entities/base.entity.js';

const decimalTransformer: ValueTransformer = {
    to: (valor?: number | null) => valor,
    from: (valor?: string | null) => (valor === null || valor === undefined ? null : Number(valor)),
};

@Entity('Dispositivo')
export class DispositivoEntity extends BaseEntity {
    @Column()
    private nome: string;

    @Column()
    private fk_tipoDispositivo: number;

    @Column()
    private fk_casa: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
    private potencia_watts: number;

    @Column({ type: 'decimal', precision: 4, scale: 2, transformer: decimalTransformer })
    private horas_uso_dia: number;

    @Column({ type: 'boolean', default: false })
    private ligado: boolean;

    @Column({ type: 'text', nullable: true })
    private foto_url: string | null;

    constructor() {
        super();
    }

    public static instanciarDispositivo(
        nome: string,
        fk_tipoDispositivo: number,
        fk_casa: number,
        potencia_watts: number,
        horas_uso_dia: number,
        ligado: boolean = false,
        foto_url?: string | null
    ): DispositivoEntity {
        const dispositivo = new DispositivoEntity();
        dispositivo.setNome(nome);
        dispositivo.setFK_TipoDispositivo(fk_tipoDispositivo);
        dispositivo.setFK_Casa(fk_casa);
        dispositivo.setPotenciaWatts(potencia_watts);
        dispositivo.setHorasUsoDia(horas_uso_dia);
        dispositivo.setLigado(ligado);
        dispositivo.setFotoUrl(foto_url);
        return dispositivo;
    }

    public setNome(nome: string): void {
        if (!nome?.trim()) {
            this.addNotification('nome', 'nome do dispositivo não pode ser nulo/vazio');
            return;
        }
        this.nome = nome.trim().toUpperCase();
    }

    public setFK_TipoDispositivo(id: number): void {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            this.addNotification('fk_tipoDispositivo', 'tipo de dispositivo inválido');
            return;
        }
        this.fk_tipoDispositivo = Number(id);
    }

    public setFK_Casa(id: number): void {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            this.addNotification('fk_casa', 'casa do dispositivo inválida');
            return;
        }
        this.fk_casa = Number(id);
    }

    public setPotenciaWatts(potencia: number): void {
        const valor = Number(potencia);
        if (!Number.isFinite(valor) || valor <= 0) {
            this.addNotification('potencia_watts', 'potência deve ser maior que zero');
            return;
        }
        this.potencia_watts = valor;
    }

    public setHorasUsoDia(horas: number): void {
        const valor = Number(horas ?? 0);
        if (!Number.isFinite(valor) || valor < 0 || valor > 24) {
            this.addNotification('horas_uso_dia', 'horas de uso devem estar entre 0 e 24');
            return;
        }
        this.horas_uso_dia = valor;
    }

    public setLigado(ligado: boolean): void {
        this.ligado = Boolean(ligado);
    }

    public setFotoUrl(foto?: string | null): void {
        const valor = foto?.trim();
        this.foto_url = valor ? valor : null;
    }

    public getNome(): string { return this.nome; }
    public getFK_TipoDispositivo(): number { return this.fk_tipoDispositivo; }
    public getFK_Casa(): number { return this.fk_casa; }
    public getPotenciaWatts(): number { return this.potencia_watts; }
    public getHorasUsoDia(): number { return this.horas_uso_dia; }
    public getLigado(): boolean { return this.ligado; }
    public getFotoUrl(): string | null { return this.foto_url; }
}
```

### 2.3 `domain/interfaces/repositories/dispositivo.repository.interface.ts` (substituir)

```ts
import { IDelete } from '../../../../core/domain/interfaces/delete.interface.js';
import { IGetAll } from '../../../../core/domain/interfaces/getAll.interface.js';
import { IGetById } from '../../../../core/domain/interfaces/getById.interface.js';
import { IInsert } from '../../../../core/domain/interfaces/insert.interface.js';
import { IUpdate } from '../../../../core/domain/interfaces/update.interface.js';
import { DispositivoOutputDto, TipoDispositivoOutputDto } from '../../dto/dispositivo.dto.js';
import { DispositivoEntity } from '../../entities/dispositivo.entity.js';

export interface IDispositivoRepository
    extends IDelete<DispositivoEntity>,
        IGetAll<DispositivoOutputDto>,
        IGetById<DispositivoOutputDto>,
        IInsert<DispositivoEntity>,
        IUpdate<DispositivoEntity> {
    getAllByCasa(casaId: number): Promise<DispositivoOutputDto[]>;
    getTipos(): Promise<TipoDispositivoOutputDto[]>;
    alterarEstado(id: number, ligado: boolean): Promise<boolean>;
    getDispositivoEntity(id: number): Promise<DispositivoEntity | null>;
    verificarSeDispositivoExiste(id: number): Promise<boolean>;
    verificarSeCasaExiste(id: number): Promise<boolean>;
    verificarSeTipoDispositivoExiste(id: number): Promise<boolean>;
}
```

### 2.4 `infrastructure/repositories/dispositivo.repository.ts` (substituir)

> Observação: no `select` cru usei `CAST(... AS FLOAT)` porque o `getRawMany` **não** passa pelo transformer.
> E o alias `"fk_tipoDispositivo"` vai entre aspas porque o PostgreSQL deixa em minúsculas o que não estiver entre aspas.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DispositivoEntity } from '../../domain/entities/dispositivo.entity.js';
import { DispositivoOutputDto, TipoDispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';

@Injectable()
export class DispositivoRepository implements IDispositivoRepository {
    constructor(
        @InjectRepository(DispositivoEntity)
        private readonly repository: Repository<DispositivoEntity>
    ) {}

    // SELECT REUTILIZADO POR getAll, getAllByCasa E getById
    private queryBase() {
        return this.repository
            .createQueryBuilder('d')
            .innerJoin('Tipo_Dispositivo', 'td', 'd.fk_tipoDispositivo = td.id')
            .innerJoin('Casa', 'c', 'd.fk_casa = c.id')
            .select([
                'd.id AS id',
                'd.nome AS nome',
                'd.fk_tipoDispositivo AS "fk_tipoDispositivo"',
                'td.tipo AS tipo',
                'd.fk_casa AS fk_casa',
                'c.nome AS casa',
                'CAST(d.potencia_watts AS FLOAT) AS potencia_watts',
                'CAST(d.horas_uso_dia AS FLOAT) AS horas_uso_dia',
                'd.ligado AS ligado',
                'd.foto_url AS foto_url',
                'd.dt_cadastro AS dt_cadastro',
                'd.dt_ultima_conexao AS dt_ultima_conexao',
                `CASE WHEN d.ativo = TRUE THEN 'ATIVO' ELSE 'INATIVO' END AS status`
            ]);
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.query(
            `UPDATE "Dispositivo"
             SET "ativo" = FALSE,
                 "dt_exclusao" = CURRENT_TIMESTAMP
             WHERE "id" = $1 AND "ativo" = TRUE`,
            [id]
        );
        return result[1] === 1;
    }

    async getAll(): Promise<DispositivoOutputDto[]> {
        return this.queryBase()
            .orderBy('d.nome', 'ASC')
            .getRawMany<DispositivoOutputDto>();
    }

    async getAllByCasa(casaId: number): Promise<DispositivoOutputDto[]> {
        return this.queryBase()
            .where('d.fk_casa = :casaId', { casaId })
            .andWhere('d.ativo = TRUE')
            .orderBy('d.nome', 'ASC')
            .getRawMany<DispositivoOutputDto>();
    }

    async getById(id: number): Promise<DispositivoOutputDto | null> {
        const dispositivo = await this.queryBase()
            .where('d.id = :id', { id })
            .getRawOne<DispositivoOutputDto>();
        return dispositivo ?? null;
    }

    async getTipos(): Promise<TipoDispositivoOutputDto[]> {
        return this.repository.query(`SELECT id, tipo FROM "Tipo_Dispositivo" ORDER BY tipo`);
    }

    async alterarEstado(id: number, ligado: boolean): Promise<boolean> {
        const result = await this.repository.query(
            `UPDATE "Dispositivo"
             SET "ligado" = $2,
                 "dt_ultima_conexao" = CURRENT_TIMESTAMP
             WHERE "id" = $1 AND "ativo" = TRUE`,
            [id, ligado]
        );
        return result[1] === 1;
    }

    async getDispositivoEntity(id: number): Promise<DispositivoEntity | null> {
        const dispositivo = await this.repository
            .createQueryBuilder('d')
            .select([
                'd.id', 'd.nome', 'd.fk_tipoDispositivo', 'd.fk_casa',
                'd.potencia_watts', 'd.horas_uso_dia', 'd.ligado', 'd.foto_url'
            ])
            .where('d.id = :id AND d.ativo = TRUE', { id })
            .getOne();
        return dispositivo ?? null;
    }

    async insert(entity: DispositivoEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .insert()
            .into('Dispositivo')
            .values({
                nome: entity.getNome(),
                fk_tipoDispositivo: entity.getFK_TipoDispositivo(),
                fk_casa: entity.getFK_Casa(),
                potencia_watts: entity.getPotenciaWatts(),
                horas_uso_dia: entity.getHorasUsoDia(),
                ligado: entity.getLigado(),
                foto_url: entity.getFotoUrl()
            })
            .orIgnore()
            .execute();
        return result.identifiers[0]?.id !== undefined;
    }

    async update(entity: DispositivoEntity): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .update('Dispositivo')
            .set({
                nome: entity.getNome(),
                fk_tipoDispositivo: entity.getFK_TipoDispositivo(),
                fk_casa: entity.getFK_Casa(),
                potencia_watts: entity.getPotenciaWatts(),
                horas_uso_dia: entity.getHorasUsoDia(),
                ligado: entity.getLigado(),
                foto_url: entity.getFotoUrl()
            })
            .where('id = :id', { id: entity.getId() })
            .execute();
        return result.affected === 1;
    }

    async verificarSeDispositivoExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from(DispositivoEntity, 'd')
            .where('d.id = :id AND d.ativo = TRUE', { id })
            .getRawOne();
        return !!result;
    }

    async verificarSeCasaExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from('Casa', 'c')
            .where('c.id = :id AND c.ativo = TRUE', { id })
            .getRawOne();
        return !!result;
    }

    async verificarSeTipoDispositivoExiste(id: number): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .select('1')
            .from('Tipo_Dispositivo', 'td')
            .where('td.id = :id', { id })
            .getRawOne();
        return !!result;
    }
}
```

### 2.5 Use cases

**`application/use-cases/criar-dispositivo.ts`**: troque só a criação da entidade (e corrija o import que termina em `.ts`, que deve terminar em `.js` como os outros):

```ts
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
// ...

        const dispositivo = DispositivoEntity.instanciarDispositivo(
            dto.nome,
            dto.fk_tipoDispositivo,
            dto.fk_casa,
            dto.potencia_watts,
            dto.horas_uso_dia,
            dto.ligado ?? false,
            dto.foto_url
        );
```

**`application/use-cases/atualizar-dispositivo.ts`**: depois de `dispositivo.setFK_Casa(dto.fk_casa);` acrescente:

```ts
        dispositivo.setPotenciaWatts(dto.potencia_watts);
        dispositivo.setHorasUsoDia(dto.horas_uso_dia);
        if (dto.ligado !== undefined) dispositivo.setLigado(dto.ligado);
        dispositivo.setFotoUrl(dto.foto_url);
```

**Novo `application/use-cases/buscar-dispositivos-por-casa.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { DispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class BuscarDispositivosPorCasaUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async buscar(casaId: number): Promise<DispositivoOutputDto[]> {
        return this.dispositivoRepository.getAllByCasa(casaId);
    }
}
```

**Novo `application/use-cases/buscar-tipos-dispositivo.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';
import { TipoDispositivoOutputDto } from '../../domain/dto/dispositivo.dto.js';

@Injectable()
export class BuscarTiposDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async buscar(): Promise<TipoDispositivoOutputDto[]> {
        return this.dispositivoRepository.getTipos();
    }
}
```

**Novo `application/use-cases/alterar-estado-dispositivo.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { DISPOSITIVO_REPOSITORY } from '../../dispositivos.constants.js';
import type { IDispositivoRepository } from '../../domain/interfaces/repositories/dispositivo.repository.interface.js';

@Injectable()
export class AlterarEstadoDispositivoUseCase {
    constructor(
        @Inject(DISPOSITIVO_REPOSITORY)
        private readonly dispositivoRepository: IDispositivoRepository
    ) {}

    async alterar(id: number, ligado: boolean): Promise<Response> {
        const alterado = await this.dispositivoRepository.alterarEstado(id, ligado);
        if (!alterado) {
            return Response.erro(TipoRetorno.NotFound, 'dispositivo não encontrado');
        }
        return Response.ok(ligado ? 'dispositivo ligado' : 'dispositivo desligado');
    }
}
```

### 2.6 `presentation/controllers/dispositivo.controller.ts` (substituir)

> ⚠️ **A ordem importa:** `@Get('tipos')` precisa vir **antes** de `@Get(':id')`. Se vier depois, o Express trata "tipos" como um `:id` e o `ParseIntPipe` devolve 400.

```ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { AlterarEstadoDispositivoUseCase } from '../../application/use-cases/alterar-estado-dispositivo.js';
import { AtualizarDispositivoUseCase } from '../../application/use-cases/atualizar-dispositivo.js';
import { BuscarDispositivoPorIdUseCase } from '../../application/use-cases/buscar-dispositivo-por-id.js';
import { BuscarDispositivosUseCase } from '../../application/use-cases/buscar-dispositivo.js';
import { BuscarDispositivosPorCasaUseCase } from '../../application/use-cases/buscar-dispositivos-por-casa.js';
import { BuscarTiposDispositivoUseCase } from '../../application/use-cases/buscar-tipos-dispositivo.js';
import { CriarDispositivoUseCase } from '../../application/use-cases/criar-dispositivo.js';
import { DeletarDispositivoUseCase } from '../../application/use-cases/deletar-dispositivo.js';
import { AlterarEstadoDispositivoDto, DispositivoInputDto } from '../../domain/dto/dispositivo.dto.js';

@Controller('api/dispositivo')
export class DispositivoController extends BaseController {
    constructor(
        private readonly alterarEstadoUseCase: AlterarEstadoDispositivoUseCase,
        private readonly atualizarDispositivoUseCase: AtualizarDispositivoUseCase,
        private readonly buscarDispositivoPorIdUseCase: BuscarDispositivoPorIdUseCase,
        private readonly buscarDispositivosUseCase: BuscarDispositivosUseCase,
        private readonly buscarPorCasaUseCase: BuscarDispositivosPorCasaUseCase,
        private readonly buscarTiposUseCase: BuscarTiposDispositivoUseCase,
        private readonly criarDispositivoUseCase: CriarDispositivoUseCase,
        private readonly deletarDispositivoUseCase: DeletarDispositivoUseCase
    ) {
        super();
    }

    // ---------- ROTAS FIXAS PRIMEIRO ----------
    @Get('tipos')
    async getTipos(@Res() res: ExpressResponse): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarTiposUseCase.buscar());
    }

    @Get('casa/:casaId')
    async getPorCasa(@Res() res: ExpressResponse, @Param('casaId', ParseIntPipe) casaId: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarPorCasaUseCase.buscar(casaId));
    }

    // ---------- ROTAS COM :id ----------
    @Get(':id')
    async getDispositivoPorId(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.buscarDispositivoPorIdUseCase.buscaPorId(id);
        return this.mapResponse(200, res, result);
    }

    @Get()
    async getDispositivos(@Res() res: ExpressResponse): Promise<ExpressResponse> {
        const result = await this.buscarDispositivosUseCase.buscarDispositivos();
        return this.mapResponse(200, res, result);
    }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: DispositivoInputDto): Promise<ExpressResponse> {
        const result = await this.criarDispositivoUseCase.create(dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(':id/estado')
    async alterarEstado(
        @Res() res: ExpressResponse,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AlterarEstadoDispositivoDto
    ): Promise<ExpressResponse> {
        const result = await this.alterarEstadoUseCase.alterar(id, dto.ligado);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(':id')
    async put(
        @Res() res: ExpressResponse,
        @Body() dto: DispositivoInputDto,
        @Param('id', ParseIntPipe) id: number
    ): Promise<ExpressResponse> {
        const result = await this.atualizarDispositivoUseCase.atualizarDispositivo(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Delete(':id')
    async delete(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.deletarDispositivoUseCase.delete(id);
        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
```

### 2.7 `dispositivos.module.ts`: registrar os novos use cases

```ts
import { AlterarEstadoDispositivoUseCase } from './application/use-cases/alterar-estado-dispositivo.js';
import { BuscarDispositivosPorCasaUseCase } from './application/use-cases/buscar-dispositivos-por-casa.js';
import { BuscarTiposDispositivoUseCase } from './application/use-cases/buscar-tipos-dispositivo.js';
// ...
    providers: [
        AlterarEstadoDispositivoUseCase,
        AtualizarDispositivoUseCase,
        BuscarDispositivoPorIdUseCase,
        BuscarDispositivosUseCase,
        BuscarDispositivosPorCasaUseCase,
        BuscarTiposDispositivoUseCase,
        CriarDispositivoUseCase,
        DeletarDispositivoUseCase,
        { provide: DISPOSITIVO_REPOSITORY, useClass: DispositivoRepository }
    ],
    exports: [DISPOSITIVO_REPOSITORY]
```

> Pode remover a linha solta `DispositivoRepository,` dos providers, porque o `{ provide: ..., useClass: ... }` já cuida disso.

### 2.8 `src/main.ts`: aumentar o limite do JSON (por causa da foto em base64)

O Express aceita só **100 KB** de corpo por padrão, e uma foto enviada pelo `<input type="file">` passa disso facilmente.

```ts
import type { NestExpressApplication } from '@nestjs/platform-express';
// ...
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useBodyParser('json', { limit: '5mb' });
```

---

## 3. API – Usuário e Casa

A página Configurações precisa de: **ler o perfil**, **editar o perfil** (sem senha), **trocar a senha** (validando a atual), **excluir a conta**, **ler e editar a casa** e **ler e salvar a tarifa**.

### 3.1 Usuário – novos DTOs (`usuario/domain/dto/usuario.dto.ts`, acrescentar no fim)

```ts
import { MinLength } from 'class-validator'; // ← adicione ao import existente

export class AtualizarPerfilDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    nome: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    usuario: string;

    @ApiProperty()
    @IsEmail()
    email: string;
}

export class AlterarSenhaDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    senhaAtual: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    senhaNova: string;
}
```

### 3.2 Novo `usuario/application/use-cases/atualizar-perfil-usuario.ts`

> Reaproveita o `update()` do repositório, que já grava `senha` e `fk_perfil` com os valores atuais carregados pelo `getUsuarioEntity`.

```ts
import { Inject, Injectable } from '@nestjs/common';

import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AtualizarPerfilDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class AtualizarPerfilUsuarioUseCase {
    constructor(
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) {}

    async executar(id: number, dto: AtualizarPerfilDto): Promise<Response> {
        const usuario = await this.usuarioRepository.getUsuarioEntity(id);
        if (!usuario) {
            return Response.erro(TipoRetorno.NotFound, 'usuário não encontrado na base!');
        }

        const duplicado = await this.usuarioRepository.verificarUsuarioDuplicado(id, dto.usuario.trim(), dto.email.trim());
        if (duplicado) {
            return Response.erro(TipoRetorno.Conflict, 'já existe outro usuário cadastrado com esse usuário ou e-mail!');
        }

        usuario.setNome(dto.nome);
        usuario.setUsuario(dto.usuario);
        usuario.setEmail(dto.email);
        if (!usuario.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', usuario.notificationsList);
        }

        const atualizado = await this.usuarioRepository.update(usuario);
        if (!atualizado) {
            return Response.erro(TipoRetorno.Conflict, 'erro! perfil não pode ser atualizado');
        }

        return Response.ok('perfil atualizado com sucesso');
    }
}
```

### 3.3 Novo `usuario/application/use-cases/alterar-senha-usuario.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';

import type { IUsuarioRepository } from '../../domain/interfaces/repositories/usuario.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';
import { AlterarSenhaDto } from '../../domain/dto/usuario.dto.js';
import { USUARIO_REPOSITORY } from '../../usuario.constants.js';

@Injectable()
export class AlterarSenhaUsuarioUseCase {
    constructor(
        @Inject(USUARIO_REPOSITORY)
        private readonly usuarioRepository: IUsuarioRepository
    ) {}

    async executar(id: number, dto: AlterarSenhaDto): Promise<Response> {
        const usuario = await this.usuarioRepository.getUsuarioEntity(id);
        if (!usuario) {
            return Response.erro(TipoRetorno.NotFound, 'usuário não encontrado na base!');
        }

        // ⚠️ QUANDO IMPLEMENTAR O BCRYPT (SEÇÃO 9.1), TROQUE PELA COMPARAÇÃO COM bcrypt.compare
        if (usuario.getSenha() !== dto.senhaAtual) {
            return Response.erro(TipoRetorno.BadRequest, 'senha atual incorreta');
        }

        if (dto.senhaAtual === dto.senhaNova) {
            return Response.erro(TipoRetorno.BadRequest, 'a nova senha deve ser diferente da atual');
        }

        usuario.setSenha(dto.senhaNova);
        if (!usuario.isValid) {
            return Response.erro(TipoRetorno.Validation, 'erro de validação', usuario.notificationsList);
        }

        const atualizado = await this.usuarioRepository.update(usuario);
        if (!atualizado) {
            return Response.erro(TipoRetorno.Conflict, 'senha não pode ser alterada');
        }

        return Response.ok('senha alterada com sucesso');
    }
}
```

### 3.4 `usuario/presentation/controllers/usuario.controller.ts`: novas rotas

```ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';
import { AlterarSenhaUsuarioUseCase } from '../../application/use-cases/alterar-senha-usuario.js';
import { AtualizarPerfilUsuarioUseCase } from '../../application/use-cases/atualizar-perfil-usuario.js';
import { AlterarSenhaDto, AtualizarPerfilDto, UsuarioInputDto } from '../../domain/dto/usuario.dto.js';

// no constructor, acrescente:
        private readonly atualizarPerfilUseCase: AtualizarPerfilUsuarioUseCase,
        private readonly alterarSenhaUseCase: AlterarSenhaUsuarioUseCase,

// novas rotas (pode colocar logo antes do @Put(":id")):
    @Put(':id/perfil')
    async atualizarPerfil(
        @Res() res: ExpressResponse,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AtualizarPerfilDto
    ): Promise<ExpressResponse> {
        const result = await this.atualizarPerfilUseCase.executar(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(':id/senha')
    async alterarSenha(
        @Res() res: ExpressResponse,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AlterarSenhaDto
    ): Promise<ExpressResponse> {
        const result = await this.alterarSenhaUseCase.executar(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }
```

> Aproveite e troque `@Param("id") id: number` por `@Param("id", ParseIntPipe) id: number` nas outras rotas desse controller (e do `casa.controller.ts`).

### 3.5 `usuario/usuario.module.ts`

```ts
import { AlterarSenhaUsuarioUseCase } from './application/use-cases/alterar-senha-usuario.js';
import { AtualizarPerfilUsuarioUseCase } from './application/use-cases/atualizar-perfil-usuario.js';
// providers: [... , AtualizarPerfilUsuarioUseCase, AlterarSenhaUsuarioUseCase]
```

### 3.6 Casa – buscar casas do usuário + tarifa

**`casa/domain/dto/casa.dto.ts`** (acrescentar):

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, Min } from 'class-validator'; // ← junte aos imports existentes

export class TarifaInputDto {
    @ApiProperty({ example: 0.75 })
    @IsNumber()
    @Min(0.01)
    valor_kwh: number;

    @ApiProperty({ enum: ['VERDE', 'AMARELA', 'VERMELHA'] })
    @IsIn(['VERDE', 'AMARELA', 'VERMELHA'])
    bandeira: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    valor_adicional_kwh?: number;
}

export class TarifaOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() valor_kwh: number;
    @ApiProperty() bandeira: string;
    @ApiProperty() valor_adicional_kwh: number;
    @ApiProperty() dt_vigencia: Date;
}
```

**`casa/domain/interfaces/repositories/casa.repository.interface.ts`**: acrescente dentro da interface:

```ts
import { CasaOutputDto, TarifaInputDto, TarifaOutputDto } from "../../dto/casa.dto.js";

    getByUsuario(usuarioId: number): Promise<CasaOutputDto[]>;
    getTarifaVigente(casaId: number): Promise<TarifaOutputDto | null>;
    inserirTarifa(casaId: number, dto: TarifaInputDto): Promise<boolean>;
```

**`casa/infrastructure/repositories/casa.repository.ts`**: novos métodos:

```ts
import { CasaOutputDto, TarifaInputDto, TarifaOutputDto } from '../../domain/dto/casa.dto.js';

    async getByUsuario(usuarioId: number): Promise<CasaOutputDto[]> {
        return await this.repository
            .createQueryBuilder('c')
            .innerJoin('Usuario', 'u', 'c.fk_usuario = u.id')
            .select([
                'c.id AS id',
                'c.nome AS nome',
                'c.rua AS rua',
                'c.bairro AS bairro',
                'c.cidade AS cidade',
                'c.numero AS numero',
                'c.cep AS cep',
                'u.nome AS proprietario',
                `CASE WHEN c.ativo = TRUE THEN 'ATIVO' ELSE 'INATIVO' END AS status`
            ])
            .where('c.fk_usuario = :usuarioId', { usuarioId })
            .andWhere('c.ativo = TRUE')
            .orderBy('c.id', 'ASC')
            .getRawMany<CasaOutputDto>();
    }

    async getTarifaVigente(casaId: number): Promise<TarifaOutputDto | null> {
        const result = await this.repository.query(
            `
            SELECT id,
                   valor_kwh::float AS valor_kwh,
                   bandeira,
                   COALESCE(valor_adicional_kwh, 0)::float AS valor_adicional_kwh,
                   dt_vigencia
            FROM "Tarifa_Energia"
            WHERE fk_casa = $1
              AND dt_vigencia <= CURRENT_DATE
            ORDER BY dt_vigencia DESC, id DESC
            LIMIT 1
            `,
            [casaId]
        );
        return result[0] ?? null;
    }

    // GUARDA HISTÓRICO: CADA ALTERAÇÃO VIRA UMA NOVA LINHA COM VIGÊNCIA = HOJE
    async inserirTarifa(casaId: number, dto: TarifaInputDto): Promise<boolean> {
        const result = await this.repository.query(
            `
            INSERT INTO "Tarifa_Energia" (valor_kwh, bandeira, valor_adicional_kwh, dt_vigencia, fk_casa)
            VALUES ($1, $2, $3, CURRENT_DATE, $4)
            RETURNING id
            `,
            [dto.valor_kwh, dto.bandeira, dto.valor_adicional_kwh ?? 0, casaId]
        );
        return result.length === 1;
    }
```

**Novo `casa/application/use-cases/buscar-casas-por-usuario.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { CasaOutputDto } from '../../domain/dto/casa.dto.js';
import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.js';

@Injectable()
export class BuscarCasasPorUsuarioUseCase {
    constructor(
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) {}

    async buscar(usuarioId: number): Promise<CasaOutputDto[]> {
        return this.casaRepository.getByUsuario(usuarioId);
    }
}
```

**Novo `casa/application/use-cases/tarifa-casa.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { CASA_REPOSITORY } from '../../casa.constants.js';
import type { ICasaRepository } from '../../domain/interfaces/repositories/casa.repository.interface.js';
import { TarifaInputDto, TarifaOutputDto } from '../../domain/dto/casa.dto.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';

@Injectable()
export class TarifaCasaUseCase {
    constructor(
        @Inject(CASA_REPOSITORY)
        private readonly casaRepository: ICasaRepository
    ) {}

    async buscarVigente(casaId: number): Promise<TarifaOutputDto | null> {
        return this.casaRepository.getTarifaVigente(casaId);
    }

    async registrar(casaId: number, dto: TarifaInputDto): Promise<Response> {
        const existe = await this.casaRepository.verificarSeCasaExiste(casaId);
        if (!existe) {
            return Response.erro(TipoRetorno.NotFound, 'casa não encontrada na base');
        }

        const inserida = await this.casaRepository.inserirTarifa(casaId, dto);
        if (!inserida) {
            return Response.erro(TipoRetorno.Conflict, 'tarifa não pode ser registrada');
        }

        return Response.ok('tarifa registrada com sucesso');
    }
}
```

**`casa/presentation/controllers/casa.controller.ts`**: novas rotas:

```ts
import { ParseIntPipe } from '@nestjs/common'; // ← junte ao import existente
import { BuscarCasasPorUsuarioUseCase } from '../../application/use-cases/buscar-casas-por-usuario.js';
import { TarifaCasaUseCase } from '../../application/use-cases/tarifa-casa.js';
import { CasaInputDto, TarifaInputDto } from '../../domain/dto/casa.dto.js';

// constructor: + private readonly buscarCasasPorUsuarioUseCase: BuscarCasasPorUsuarioUseCase,
//              + private readonly tarifaCasaUseCase: TarifaCasaUseCase,

    @Get('usuario/:usuarioId')
    async getCasasDoUsuario(@Res() res: ExpressResponse, @Param('usuarioId', ParseIntPipe) usuarioId: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarCasasPorUsuarioUseCase.buscar(usuarioId));
    }

    @Get(':id/tarifa')
    async getTarifa(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.tarifaCasaUseCase.buscarVigente(id));
    }

    @Post(':id/tarifa')
    async postTarifa(
        @Res() res: ExpressResponse,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TarifaInputDto
    ): Promise<ExpressResponse> {
        const result = await this.tarifaCasaUseCase.registrar(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }
```

**`casa/casa.module.ts`**: providers `+ BuscarCasasPorUsuarioUseCase, TarifaCasaUseCase` (e pode remover a linha solta `CasaRepository,`).

---

## 4. API – Chatbot

Pasta: `smartmind-api/src/modules/chatbot/`

### Como vai funcionar o fluxo

```
Front ──POST /api/chatbot/mensagem { usuarioId, casaId, conversaId?, message, context? }──► Nest
Nest  ── valida se a casa é do usuário e se a conversa é do usuário
Nest  ──POST /nlu/parse──► Python  (intent + confidence + entities)
Nest  ── monta a resposta (consulta o banco: dispositivos, consumo, tarifa, previsão ML)
Nest  ── cria a conversa (se for a 1ª mensagem) e grava em "Chat_Mensagem" (fk_usuario, fk_casa, fk_conversa)
Nest  ──► { message, intent, suggestions, result, quick_replies, context, conversaId }
Front ── guarda conversaId + context e manda os dois de volta na próxima mensagem
```

O `context` é o que resolve o problema 7 do diagnóstico. Quando falta informação, o back devolve
`context = { device: 'chuveiro', pending_intent: 'calcular_consumo' }`. Na próxima mensagem ("5500 W"), o back junta o que estava no contexto com o que veio na frase nova e continua o cálculo.

### 4.1 `domain/dto/chatbot.dto.ts` (substituir)

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive,
    IsString, Max, MaxLength, Min, ValidateNested
} from 'class-validator';

export class ChatbotContextDto {
    @IsOptional()
    @IsString()
    device?: string;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    power_watts?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    @Max(24)
    hours_per_day?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(31)
    days_per_month?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    tariff?: number;

    // INTENÇÃO QUE FICOU "EM ABERTO" (O BOT FEZ UMA PERGUNTA E ESTÁ ESPERANDO A RESPOSTA)
    // ⚠️ SEM DECORATOR O ValidationPipe (whitelist: true) APAGARIA ESTE CAMPO
    @IsOptional()
    @IsString()
    pending_intent?: string;
}

export class ChatbotInputDto {
    @ApiProperty()
    @IsInt()
    @IsPositive()
    usuarioId: number;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    casaId: number;

    @ApiPropertyOptional({ description: 'Omitir na primeira mensagem: a API cria a conversa' })
    @IsOptional()
    @IsInt()
    @IsPositive()
    conversaId?: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    message: string;

    @ApiPropertyOptional({ type: ChatbotContextDto })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ChatbotContextDto)
    context?: ChatbotContextDto;
}

// FORMATO PADRÃO DE TODA RESPOSTA DO CHATBOT
export interface ChatbotResposta {
    message: string;
    intent: string;
    confidence?: number;
    entities?: Record<string, unknown>;
    missing?: string[];
    suggestions?: string[];
    result?: Record<string, unknown>;
    quick_replies?: string[];
    context?: Record<string, unknown>;
    conversaId?: number;
}
```

### 4.2 Interfaces dos repositórios

**`domain/interfaces/chat-history.repository.interface.ts`** (substituir)

```ts
export interface SalvarMensagemInput {
    conversaId: number;
    usuarioId: number;
    casaId: number;
    mensagem: string;
    resposta: string;
    intencao: string | null;
    dados: Record<string, unknown> | null;
}

export interface ConversaOutput {
    id: number;
    titulo: string;
    dt_inicio: Date;
    dt_ultima_mensagem: Date;
    total_mensagens: number;
}

export interface MensagemOutput {
    id: number;
    mensagem: string;
    resposta: string;
    intencao: string | null;
    dados: Record<string, unknown> | null;
    dt_mensagem: Date;
}

export interface IChatHistoryRepository {
    casaPertenceAoUsuario(casaId: number, usuarioId: number): Promise<boolean>;
    conversaPertenceAoUsuario(conversaId: number, usuarioId: number): Promise<boolean>;
    criarConversa(usuarioId: number, casaId: number, titulo: string): Promise<number>;
    salvarMensagem(input: SalvarMensagemInput): Promise<number>;
    listarConversas(usuarioId: number): Promise<ConversaOutput[]>;
    listarMensagens(conversaId: number): Promise<MensagemOutput[]>;
    excluirConversa(conversaId: number, usuarioId: number): Promise<boolean>;
}
```

**`domain/interfaces/consumo.repository.interface.ts`** (substituir)

```ts
export interface ConsumoMensal {
    mes: string;        // 'YYYY-MM'
    total_kwh: number;
}

export interface IConsumoRepository {
    salvarConsumo(dispositivoId: number, consumoKwh: number): Promise<void>;
    buscarHistoricoMensal(casaId: number, meses: number): Promise<ConsumoMensal[]>;
    buscarTemperaturaMedia(casaId: number, dias: number): Promise<number | null>;
}
```

**`domain/interfaces/tarifa.repository.interface.ts`** (substituir)

```ts
export interface TarifaVigente {
    valorKwh: number;
    adicionalKwh: number;
    valorTotalKwh: number;
    bandeira: string;
}

export interface ITarifaRepository {
    buscarTarifaAtual(casaId: number): Promise<number>;
    buscarTarifaVigente(casaId: number): Promise<TarifaVigente>;
}
```

### 4.3 Repositórios (implementação real)

**`infrastructure/repositories/chat-history.repository.ts`** (substituir)

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
    ConversaOutput, IChatHistoryRepository, MensagemOutput, SalvarMensagemInput
} from '../../domain/interfaces/chat-history.repository.interface.js';

@Injectable()
export class ChatHistoryRepository implements IChatHistoryRepository {

    constructor(private readonly dataSource: DataSource) {}

    async casaPertenceAoUsuario(casaId: number, usuarioId: number): Promise<boolean> {
        const result = await this.dataSource.query(
            `SELECT 1 FROM "Casa" WHERE id = $1 AND fk_usuario = $2 AND ativo = TRUE`,
            [casaId, usuarioId]
        );
        return result.length > 0;
    }

    async conversaPertenceAoUsuario(conversaId: number, usuarioId: number): Promise<boolean> {
        const result = await this.dataSource.query(
            `SELECT 1 FROM "Chat_Conversa" WHERE id = $1 AND fk_usuario = $2 AND ativo = TRUE`,
            [conversaId, usuarioId]
        );
        return result.length > 0;
    }

    async criarConversa(usuarioId: number, casaId: number, titulo: string): Promise<number> {
        const result = await this.dataSource.query(
            `INSERT INTO "Chat_Conversa" (titulo, fk_usuario, fk_casa)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [titulo, usuarioId, casaId]
        );
        return result[0].id;
    }

    // MENSAGEM + ATUALIZAÇÃO DA DATA DA CONVERSA NA MESMA TRANSAÇÃO
    async salvarMensagem(input: SalvarMensagemInput): Promise<number> {
        return this.dataSource.transaction(async (manager) => {
            const result = await manager.query(
                `INSERT INTO "Chat_Mensagem"
                    (mensagem, resposta, intencao, dados, fk_usuario, fk_casa, fk_conversa)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    input.mensagem,
                    input.resposta,
                    input.intencao,
                    input.dados ? JSON.stringify(input.dados) : null,
                    input.usuarioId,
                    input.casaId,
                    input.conversaId
                ]
            );

            await manager.query(
                `UPDATE "Chat_Conversa" SET dt_ultima_mensagem = CURRENT_TIMESTAMP WHERE id = $1`,
                [input.conversaId]
            );

            return result[0].id;
        });
    }

    async listarConversas(usuarioId: number): Promise<ConversaOutput[]> {
        return this.dataSource.query(
            `SELECT cc.id,
                    cc.titulo,
                    cc.dt_inicio,
                    cc.dt_ultima_mensagem,
                    COUNT(cm.id)::int AS total_mensagens
             FROM "Chat_Conversa" cc
             LEFT JOIN "Chat_Mensagem" cm ON cm.fk_conversa = cc.id
             WHERE cc.fk_usuario = $1
               AND cc.ativo = TRUE
             GROUP BY cc.id
             ORDER BY cc.dt_ultima_mensagem DESC`,
            [usuarioId]
        );
    }

    async listarMensagens(conversaId: number): Promise<MensagemOutput[]> {
        return this.dataSource.query(
            `SELECT id, mensagem, resposta, intencao, dados, dt_mensagem
             FROM "Chat_Mensagem"
             WHERE fk_conversa = $1
             ORDER BY dt_mensagem ASC, id ASC`,
            [conversaId]
        );
    }

    async excluirConversa(conversaId: number, usuarioId: number): Promise<boolean> {
        const result = await this.dataSource.query(
            `UPDATE "Chat_Conversa"
             SET ativo = FALSE, dt_exclusao = CURRENT_TIMESTAMP
             WHERE id = $1 AND fk_usuario = $2 AND ativo = TRUE`,
            [conversaId, usuarioId]
        );
        return result[1] === 1;
    }
}
```

**`infrastructure/repositories/consumo.repository.ts`** (substituir)

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ConsumoMensal, IConsumoRepository } from '../../domain/interfaces/consumo.repository.interface.js';

@Injectable()
export class ConsumoRepository implements IConsumoRepository {

    constructor(private readonly dataSource: DataSource) {}

    async salvarConsumo(dispositivoId: number, consumoKwh: number): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO "Consumo" (consumo, fk_dispositivo) VALUES ($1, $2)`,
            [consumoKwh, dispositivoId]
        );
    }

    // SOMA DO CONSUMO DE TODOS OS DISPOSITIVOS DA CASA, AGRUPADO POR MÊS (INCLUI O MÊS ATUAL)
    async buscarHistoricoMensal(casaId: number, meses: number): Promise<ConsumoMensal[]> {
        return this.dataSource.query(
            `SELECT TO_CHAR(date_trunc('month', c.dt_medicao), 'YYYY-MM') AS mes,
                    SUM(c.consumo)::float AS total_kwh
             FROM "Consumo" c
             INNER JOIN "Dispositivo" d ON d.id = c.fk_dispositivo
             WHERE d.fk_casa = $1
               AND c.dt_medicao >= date_trunc('month', CURRENT_DATE) - (($2::int - 1) * INTERVAL '1 month')
             GROUP BY 1
             ORDER BY 1`,
            [casaId, meses]
        );
    }

    async buscarTemperaturaMedia(casaId: number, dias: number): Promise<number | null> {
        const result = await this.dataSource.query(
            `SELECT AVG(temperatura)::float AS media
             FROM "Temperatura"
             WHERE fk_casa = $1
               AND dt_medicao >= CURRENT_DATE - ($2::int * INTERVAL '1 day')`,
            [casaId, dias]
        );
        return result[0]?.media ?? null;
    }
}
```

**`infrastructure/repositories/tarifa.repository.ts`** (substituir)

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ITarifaRepository, TarifaVigente } from '../../domain/interfaces/tarifa.repository.interface.js';

// USADA QUANDO A CASA AINDA NÃO TEM TARIFA CADASTRADA
const TARIFA_PADRAO: TarifaVigente = {
    valorKwh: 0.85,
    adicionalKwh: 0,
    valorTotalKwh: 0.85,
    bandeira: 'VERDE',
};

@Injectable()
export class TarifaRepository implements ITarifaRepository {

    constructor(private readonly dataSource: DataSource) {}

    async buscarTarifaVigente(casaId: number): Promise<TarifaVigente> {
        const result = await this.dataSource.query(
            `SELECT valor_kwh::float AS "valorKwh",
                    COALESCE(valor_adicional_kwh, 0)::float AS "adicionalKwh",
                    bandeira
             FROM "Tarifa_Energia"
             WHERE fk_casa = $1
               AND dt_vigencia <= CURRENT_DATE
             ORDER BY dt_vigencia DESC, id DESC
             LIMIT 1`,
            [casaId]
        );

        if (!result.length) return TARIFA_PADRAO;

        const { valorKwh, adicionalKwh, bandeira } = result[0];
        return {
            valorKwh,
            adicionalKwh,
            bandeira,
            valorTotalKwh: Number((valorKwh + adicionalKwh).toFixed(5)),
        };
    }

    async buscarTarifaAtual(casaId: number): Promise<number> {
        return (await this.buscarTarifaVigente(casaId)).valorTotalKwh;
    }
}
```

### 4.4 `application/clients/python-ai.client.ts`: corrigir a rota e tirar a URL fixa

Acrescente no `smartmind-api/.env`:

```
AI_URL=http://localhost:8000
```

E substitua o começo da classe e a URL da previsão:

```ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

@Injectable()
export class PythonAiClient {

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    private get baseUrl(): string {
        return this.configService.get<string>('AI_URL') ?? 'http://localhost:8000';
    }

    // processarMensagem(...) continua igual

    async predictConsumption(data: { /* ...igual... */ }): Promise<{ consumo_previsto: number }> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/ml/predict`,   // ← ERA /ml/predict-consumption (NÃO EXISTE NO PYTHON)
                    data
                )
            );
            return response.data;
        } catch (error: unknown) {
            // ...igual...
        }
    }
}
```

### 4.5 `application/use-cases/chatbot.ts` (substituir)

Principais mudanças:
- grava cada mensagem no banco com `fk_usuario`, `fk_casa` e `fk_conversa`;
- mantém o **contexto** entre mensagens (o usuário pode responder só "1500 W");
- usa a **confiança** do modelo e responde "não entendi" em vez de chutar;
- `consultar_dispositivos`, `consultar_consumo` e `prever_fatura` agora **consultam de verdade**;
- devolve `quick_replies` (botões de resposta rápida) para guiar o usuário.

```ts
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
```

> 💡 Para a previsão ficar mais precisa, o ideal é usar só **meses fechados**. Do jeito acima, o mês atual (ainda incompleto) entra como `consumo_mes`. Quando tiver bastante dado, troque a query para `c.dt_medicao < date_trunc('month', CURRENT_DATE)`.
> 💡 Extra para a apresentação: depois de prever, grave em `"Previsoes"` (`valor_previsto`, `periodo_referencia`, `modelo = 'RandomForest'`, `fk_casa`).

### 4.6 Novo `application/use-cases/historico-chat.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';
import { CHAT_HISTORY_REPOSITORY } from '../../chatbot.constants.js';
import type {
    ConversaOutput, IChatHistoryRepository, MensagemOutput
} from '../../domain/interfaces/chat-history.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';

@Injectable()
export class HistoricoChatUseCase {

    constructor(
        @Inject(CHAT_HISTORY_REPOSITORY)
        private readonly chatHistoryRepository: IChatHistoryRepository
    ) {}

    async listarConversas(usuarioId: number): Promise<ConversaOutput[]> {
        return this.chatHistoryRepository.listarConversas(usuarioId);
    }

    async listarMensagens(conversaId: number, usuarioId: number): Promise<MensagemOutput[] | Response> {
        const pertence = await this.chatHistoryRepository.conversaPertenceAoUsuario(conversaId, usuarioId);
        if (!pertence) {
            return Response.erro(TipoRetorno.NotFound, 'conversa não encontrada');
        }
        return this.chatHistoryRepository.listarMensagens(conversaId);
    }

    async excluirConversa(conversaId: number, usuarioId: number): Promise<Response> {
        const excluida = await this.chatHistoryRepository.excluirConversa(conversaId, usuarioId);
        if (!excluida) {
            return Response.erro(TipoRetorno.NotFound, 'conversa não encontrada');
        }
        return Response.ok('conversa excluída com sucesso');
    }
}
```

### 4.7 `presentation/controllers/chatbot.controller.ts` (substituir)

```ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

import { ChatbotInputDto } from '../../domain/dto/chatbot.dto.js';
import { ChatbotUseCase } from '../../application/use-cases/chatbot.js';
import { HistoricoChatUseCase } from '../../application/use-cases/historico-chat.js';
import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { Response } from '../../../core/application/response/response.js';

@Controller('api/chatbot')
export class ChatbotController extends BaseController {

    constructor(
        private readonly chatbotUseCase: ChatbotUseCase,
        private readonly historicoChatUseCase: HistoricoChatUseCase,
    ) { super(); }

    @Post('mensagem')
    async enviarMensagem(@Body() dto: ChatbotInputDto) {
        return this.chatbotUseCase.executar(dto);
    }

    @Get('conversas/usuario/:usuarioId')
    async listarConversas(
        @Res() res: ExpressResponse,
        @Param('usuarioId', ParseIntPipe) usuarioId: number
    ): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.historicoChatUseCase.listarConversas(usuarioId));
    }

    @Get('conversas/:conversaId/mensagens')
    async listarMensagens(
        @Res() res: ExpressResponse,
        @Param('conversaId', ParseIntPipe) conversaId: number,
        @Query('usuarioId', ParseIntPipe) usuarioId: number
    ): Promise<ExpressResponse> {
        const result = await this.historicoChatUseCase.listarMensagens(conversaId, usuarioId);
        if (result instanceof Response) {
            return this.mapResponse(result.tipoRetorno, res, result);
        }
        return this.mapResponse(200, res, result);
    }

    @Delete('conversas/:conversaId')
    async excluirConversa(
        @Res() res: ExpressResponse,
        @Param('conversaId', ParseIntPipe) conversaId: number,
        @Query('usuarioId', ParseIntPipe) usuarioId: number
    ): Promise<ExpressResponse> {
        const result = await this.historicoChatUseCase.excluirConversa(conversaId, usuarioId);
        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
```

> 🔐 Por enquanto o `usuarioId` vai no corpo ou na query. Isso funciona, mas qualquer pessoa poderia mandar o ID de outro usuário. A forma correta é usar **JWT** (seção 9.2): o ID passa a vir do token.

### 4.8 `chatbot.module.ts` (substituir)

```ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { DatabaseModule } from '../core/database/database.module.js';
import { DispositivoModule } from '../dispositivos/dispositivos.module.js';

import { ChatbotController } from './presentation/controllers/chatbot.controller.js';
import { ChatbotUseCase } from './application/use-cases/chatbot.js';
import { ConsumoCalculatorUseCase } from './application/use-cases/consumo-calculator.js';
import { EconomiaUseCase } from './application/use-cases/economia.js';
import { HistoricoChatUseCase } from './application/use-cases/historico-chat.js';
import { PythonAiClient } from './application/clients/python-ai.client.js';

import { TarifaRepository } from './infrastructure/repositories/tarifa.repository.js';
import { ConsumoRepository } from './infrastructure/repositories/consumo.repository.js';
import { ChatHistoryRepository } from './infrastructure/repositories/chat-history.repository.js';

import { TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY } from './chatbot.constants.js';

@Module({
    imports: [
        HttpModule.register({ timeout: 10000 }), // NÃO DEIXA A REQUISIÇÃO PENDURADA SE O PYTHON TRAVAR
        DatabaseModule,
        DispositivoModule,                        // EXPORTA DISPOSITIVO_REPOSITORY
    ],
    controllers: [ChatbotController],
    providers: [
        ChatbotUseCase,
        ConsumoCalculatorUseCase,
        EconomiaUseCase,
        HistoricoChatUseCase,
        PythonAiClient,
        { provide: TARIFA_REPOSITORY, useClass: TarifaRepository },
        { provide: CONSUMO_REPOSITORY, useClass: ConsumoRepository },
        { provide: CHAT_HISTORY_REPOSITORY, useClass: ChatHistoryRepository },
    ],
    exports: [ChatbotUseCase],
})
export class ChatbotModule {}
```

### 4.9 `application/use-cases/economia.ts`: novos aparelhos (opcional)

O Python passa a reconhecer `maquina de lavar` e `ferro de passar` (seção 5). Acrescente os cases antes do `default`:

```ts
            case 'maquina de lavar':
                sugestoes.push('Lave com a capacidade máxima de roupas recomendada pelo fabricante.');
                sugestoes.push('Prefira ciclos com água fria sempre que possível.');
                break;

            case 'ferro de passar':
                sugestoes.push('Acumule roupas e passe tudo de uma vez.');
                sugestoes.push('Comece pelas peças que pedem temperatura mais baixa.');
                break;
```

---

## 5. IA (Python)

Pasta: `smartmind-ai/app/`

### 5.1 `nlu/processor.py` (substituir)

Mudanças:
- `normalize` troca hífen por espaço ("ar-condicionado" → "ar condicionado");
- sinônimos de aparelhos (tv, split, notebook, freezer...) buscados com **palavra inteira** (`\b`);
- tempo em formatos como "1h30" e "meia hora";
- o modelo passa a retornar **`confidence`** (com `CalibratedClassifierCV`).

```python
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "nlu_model.pkl"
DATA_PATH = BASE_DIR / "training_data.json"

# NOME PADRONIZADO -> FORMAS QUE O USUÁRIO PODE ESCREVER (JÁ NORMALIZADAS)
DEVICES = {
    "ar-condicionado": ["ar condicionado", "split"],
    "chuveiro": ["chuveiro", "ducha"],
    "geladeira": ["geladeira", "refrigerador", "freezer"],
    "televisao": ["televisao", "televisor", "tv"],
    "microondas": ["microondas", "micro ondas"],
    "ventilador": ["ventilador"],
    "computador": ["computador", "notebook", "pc"],
    "maquina de lavar": ["maquina de lavar", "lavadora"],
    "ferro de passar": ["ferro de passar"],
}


def normalize(text: str) -> str:
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[-_]", " ", text)      # "ar-condicionado" -> "ar condicionado"
    return re.sub(r"\s+", " ", text)


def train_model():
    with open(DATA_PATH, encoding="utf-8") as file:
        data = json.load(file)

    texts = [normalize(item["text"]) for item in data]
    labels = [item["intent"] for item in data]

    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        # CalibratedClassifierCV DÁ UMA "PROBABILIDADE" PARA CADA INTENÇÃO (predict_proba)
        ("classifier", CalibratedClassifierCV(LinearSVC(), cv=3)),
    ])

    model.fit(texts, labels)
    joblib.dump(model, MODEL_PATH)
    return model


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        train_model()
    return joblib.load(MODEL_PATH)


def extract_entities(message: str):
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

    # APARELHO (PALAVRA INTEIRA PARA "tv" NÃO CASAR DENTRO DE OUTRA PALAVRA)
    for normalized_device, terms in DEVICES.items():
        if any(re.search(rf"\b{re.escape(term)}\b", text) for term in terms):
            entities["device"] = normalized_device
            break

    days = re.search(r"(\d+)\s*dias?\s*(?:por|no|ao)\s*mes", text)
    if days:
        entities["days_per_month"] = int(days.group(1))

    return entities


def process_message(message: str):
    model = load_model()
    normalized = normalize(message)

    probabilities = model.predict_proba([normalized])[0]
    index = int(probabilities.argmax())

    return {
        "intent": str(model.classes_[index]),
        "confidence": round(float(probabilities[index]), 3),
        "entities": extract_entities(message),
    }
```

> ⚠️ **Importante:** apague o arquivo `app/nlu/nlu_model.pkl` antes de subir o Python. O `load_model()` só treina de novo quando o `.pkl` não existe. Se o modelo antigo continuar lá, ele não tem `predict_proba` e a API vai quebrar.

### 5.2 `nlu/training_data.json`: novas intenções

Antes do `]` final, acrescente (lembre da vírgula depois do último item que já existe):

```json
  { "text": "Ajuda", "intent": "ajuda" },
  { "text": "O que você sabe fazer?", "intent": "ajuda" },
  { "text": "Quais são suas funções?", "intent": "ajuda" },
  { "text": "Como você pode me ajudar?", "intent": "ajuda" },
  { "text": "Me mostre o que você faz", "intent": "ajuda" },
  { "text": "Preciso de ajuda", "intent": "ajuda" },
  { "text": "Quais comandos posso usar?", "intent": "ajuda" },
  { "text": "Para que serve esse assistente?", "intent": "ajuda" },
  { "text": "Não sei o que perguntar", "intent": "ajuda" },
  { "text": "Me dá umas opções", "intent": "ajuda" },
  { "text": "O que dá pra fazer aqui?", "intent": "ajuda" },
  { "text": "Me explique como funciona", "intent": "ajuda" },

  { "text": "Obrigado", "intent": "agradecimento" },
  { "text": "Obrigada", "intent": "agradecimento" },
  { "text": "Valeu", "intent": "agradecimento" },
  { "text": "Muito obrigado pela ajuda", "intent": "agradecimento" },
  { "text": "Agradeço", "intent": "agradecimento" },
  { "text": "Show, obrigado", "intent": "agradecimento" },
  { "text": "Perfeito, valeu", "intent": "agradecimento" },
  { "text": "Ajudou muito, obrigado", "intent": "agradecimento" },
  { "text": "Brigado", "intent": "agradecimento" },
  { "text": "Excelente, muito obrigado", "intent": "agradecimento" },
  { "text": "Top, valeu pela ajuda", "intent": "agradecimento" },
  { "text": "Era isso, obrigado", "intent": "agradecimento" },

  { "text": "Tchau", "intent": "despedida" },
  { "text": "Até logo", "intent": "despedida" },
  { "text": "Até mais", "intent": "despedida" },
  { "text": "Falou", "intent": "despedida" },
  { "text": "Até amanhã", "intent": "despedida" },
  { "text": "Vou sair agora", "intent": "despedida" },
  { "text": "Encerrar conversa", "intent": "despedida" },
  { "text": "Por hoje é só", "intent": "despedida" },
  { "text": "Até a próxima", "intent": "despedida" },
  { "text": "Fui, tchau", "intent": "despedida" },
  { "text": "Tenha um bom dia, tchau", "intent": "despedida" },
  { "text": "Pode encerrar", "intent": "despedida" }
```

> Dica: quanto mais frases variadas por intenção, melhor. Acrescente também exemplos com erros de digitação comuns ("quanto gasta meu chuverio", "ar condicionao").

### 5.3 `main.py`: capturar o `ValueError` da bandeira

```python
@app.post("/ml/predict")
def predict(request: PredictionRequest):
    try:
        consumo = predict_consumption(
            request.consumo_mes,
            request.media_3_meses,
            request.tendencia,
            request.temperatura_media,
            request.mes,
            request.bandeira
        )
        return {"consumo_previsto": consumo}
    except (RuntimeError, KeyError, ValueError) as error:   # ← + ValueError
        raise HTTPException(status_code=400, detail=str(error))
```

### 5.4 `ml/predictor.py`: não carregar o modelo do disco a cada previsão (opcional)

```python
from functools import lru_cache

@lru_cache(maxsize=1)
def _load_model():
    return joblib.load(MODEL_PATH)

# dentro de predict_consumption, troque:  model = joblib.load(MODEL_PATH)
# por:                                    model = _load_model()
```

---

## 6. Front – infraestrutura

Pasta: `smartmind-web/src/`

### 6.1 `config/environment.js`: usar o `.env` que já existe

```js
export const environment = {
    apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
};
```

> Confirme que no `smartmind-web/.env` o valor é `VITE_API_URL=http://localhost:3000/api` e reinicie o `npm run dev` depois de mudar.

### 6.2 `infrastructure/http-client.js`: mostrar as notificações de validação da API

Hoje, quando a API devolve `422` com `notificacoes`, o usuário só vê "ERRO DE VALIDAÇÃO". Dentro do `try` do `if (!response.ok)`, depois de montar `message`, acrescente:

```js
                if (Array.isArray(errorBody.notificacoes) && errorBody.notificacoes.length) {
                    message += ': ' + errorBody.notificacoes
                        .map((notificacao) => notificacao.mensagem)
                        .join('; ');
                }
```

### 6.3 Serviços

**`services/usuarioService.js`**: acrescente dois métodos:

```js
    async atualizarPerfil(id, dados) {
        return await this.put(`usuario/${id}/perfil`, dados);
    }

    async alterarSenha(id, dados) {
        return await this.put(`usuario/${id}/senha`, dados);
    }
```

**Novo `services/casaService.js`**

```js
import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class CasaService extends ApiService {
    constructor() {
        super(new HttpClient(), 'casa');
    }

    buscarPorUsuario(usuarioId) {
        return this.get(`usuario/${usuarioId}`);
    }

    buscarPorId(id) {
        return this.get(String(id));
    }

    cadastrar(dados) {
        return this.post('', dados);
    }

    atualizar(id, dados) {
        return this.put(String(id), dados);
    }

    deletar(id) {
        return this.delete(String(id));
    }

    buscarTarifa(casaId) {
        return this.get(`${casaId}/tarifa`);
    }

    salvarTarifa(casaId, dados) {
        return this.post(`${casaId}/tarifa`, dados);
    }
}

export const casaService = new CasaService();
```

**Novo `services/dispositivoService.js`**

```js
import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class DispositivoService extends ApiService {
    constructor() {
        super(new HttpClient(), 'dispositivo');
    }

    listarPorCasa(casaId) {
        return this.get(`casa/${casaId}`);
    }

    buscarTipos() {
        return this.get('tipos');
    }

    buscarPorId(id) {
        return this.get(String(id));
    }

    criar(dados) {
        return this.post('', dados);
    }

    atualizar(id, dados) {
        return this.put(String(id), dados);
    }

    alterarEstado(id, ligado) {
        return this.put(`${id}/estado`, { ligado });
    }

    remover(id) {
        return this.delete(String(id));
    }
}

export const dispositivoService = new DispositivoService();
```

**`services/chatbotService.js`** (substituir)

```js
import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class ChatbotService extends ApiService {
    constructor() {
        super(new HttpClient(), 'chatbot');
    }

    // conversaId e contexto são opcionais: JSON.stringify ignora "undefined"
    enviarMensagem({ usuarioId, casaId, conversaId, mensagem, contexto }) {
        return this.post('mensagem', {
            usuarioId,
            casaId,
            conversaId: conversaId ?? undefined,
            message: mensagem,
            context: contexto ?? undefined
        });
    }

    listarConversas(usuarioId) {
        return this.get(`conversas/usuario/${usuarioId}`);
    }

    listarMensagens(conversaId, usuarioId) {
        return this.get(`conversas/${conversaId}/mensagens?usuarioId=${usuarioId}`);
    }

    excluirConversa(conversaId, usuarioId) {
        return this.delete(`conversas/${conversaId}?usuarioId=${usuarioId}`);
    }
}

export const chatbotService = new ChatbotService();
```

### 6.4 Novo hook `hooks/useCasaAtual.js`

Substitui o `casaId="123"` fixo e é usado pelas páginas Chatbot, Dispositivos e Configurações.

```js
import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { casaService } from '../services/casaService.js';

const CHAVE_CASA = 'casaAtualId';

export function useCasaAtual() {
    const usuario = authService.getCurrentUser();
    const usuarioId = usuario?.id;

    const [casas, setCasas] = useState([]);
    const [casaAtual, setCasaAtual] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    const carregar = useCallback(async () => {
        if (!usuarioId) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro('');

        try {
            const lista = (await casaService.buscarPorUsuario(usuarioId)) ?? [];
            const idSalvo = Number(sessionStorage.getItem(CHAVE_CASA));
            const escolhida = lista.find((casa) => casa.id === idSalvo) ?? lista[0] ?? null;

            setCasas(lista);
            setCasaAtual(escolhida);

            if (escolhida) sessionStorage.setItem(CHAVE_CASA, String(escolhida.id));
        } catch (error) {
            setErro(error.message || 'Não foi possível carregar suas casas.');
        } finally {
            setCarregando(false);
        }
    }, [usuarioId]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const selecionarCasa = useCallback((id) => {
        const casa = casas.find((item) => item.id === Number(id)) ?? null;
        setCasaAtual(casa);
        if (casa) sessionStorage.setItem(CHAVE_CASA, String(casa.id));
    }, [casas]);

    return { usuario, casas, casaAtual, carregando, erro, recarregar: carregar, selecionarCasa };
}
```

### 6.5 Rotas protegidas + chatbot dentro do layout

**Novo `components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router';
import { authService } from '../services/authService.js';

export default function ProtectedRoute({ children }) {
    return authService.getCurrentUser() ? children : <Navigate to="/" replace />;
}
```

**`App.jsx`** (substituir). Com a rota "pai", o `EnergyLayout` não é recriado a cada troca de página:

```jsx
import './App.css';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router';
import EnergyLayout from './components/energy/EnergyLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DevicesPage from './pages/Dispositivos/DevicesPage.jsx';
import RoomsPage from './pages/Ambientes/RoomsPage.jsx';
import EnergyPage from './pages/Energia/EnergyPage.jsx';
import SettingsPage from './pages/Configuracoes/SettingsPage.jsx';
import LoginPage from './pages/Login/LoginPage.jsx';
import Register from './pages/Register/Register.jsx';
import Home from './pages/Home/HomePage.jsx';
import Chatbot from './pages/Chatbot/Chatbot.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <EnergyLayout>
                <Outlet />
              </EnergyLayout>
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/dispositivos" element={<DevicesPage />} />
          <Route path="/ambientes" element={<RoomsPage />} />
          <Route path="/energia" element={<EnergyPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/chatbot" element={<Chatbot />} />
        </Route>

        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 6.6 Botão "Sair" no menu (`components/energy/AppSidebar.jsx`)

```jsx
import { Link, useLocation, useNavigate } from "react-router";
// ...
  const navigate = useNavigate();

  function sair() {
    authService.logout();
    sessionStorage.removeItem("casaAtualId");
    navigate("/");
  }

// dentro de <div className="sm-sidebar-bottom">, depois de <div className="sm-profile">...</div>:
        <button className="sm-nav-link" type="button" onClick={sair}>
          <span className="sm-icon" aria-hidden="true">⎋</span>
          <span>Sair</span>
        </button>
```

---

## 7. Front – Configurações e Dispositivos

### 7.1 `pages/Configuracoes/SettingsPage.jsx` (substituir)

O que muda:
- **Perfil:** lê com `GET /usuario/:id` e salva com `PUT /usuario/:id/perfil`.
- **Segurança:** formulário separado, `PUT /usuario/:id/senha`.
- **Minha casa:** campos reais do banco (rua, número, bairro, cidade, CEP), salva com `PUT /casa/:id` (ou `POST /casa` se o usuário ainda não tiver casa) e a **tarifa** com `POST /casa/:id/tarifa`.
- **Preferências** (idioma, tema, alerta) continuam no navegador. Isso é normal, porque são preferências do aparelho.
- **Zona de perigo:** excluir a conta (`DELETE /usuario/:id`) com modal de confirmação.

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { FormField, Modal, PageHeading, Toggle } from "../../components/energy/EnergyComponents.jsx";
import { useLocalStorageState } from "../../components/energy/useEnergyStorage.js";
import { useEnergyTheme } from "../../components/energy/EnergyTheme.js";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { authService } from "../../services/authService.js";
import { casaService } from "../../services/casaService.js";
import { usuarioService } from "../../services/usuarioService.js";
import "./SettingsPage.css";

const casaVazia = { nome: "", rua: "", numero: "", bairro: "", cidade: "", cep: "" };
const senhasVazias = { atual: "", nova: "", confirmacao: "" };

const formatarCep = (valor) =>
  valor.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useEnergyTheme();
  const { usuario, casaAtual, recarregar } = useCasaAtual();
  const usuarioId = usuario?.id;

  const [perfil, setPerfil] = useState({ nome: "", usuario: "", email: "" });
  const [senhas, setSenhas] = useState(senhasVazias);
  const [casa, setCasa] = useState(casaVazia);
  const [tarifa, setTarifa] = useState({ valor_kwh: "", bandeira: "VERDE" });
  const [tarifaOriginal, setTarifaOriginal] = useState(null);
  const [preferencias, setPreferencias] = useLocalStorageState("smartmind-preferencias", {
    idioma: "pt-BR",
    alertaConsumoAlto: true,
  });

  const [mensagem, setMensagem] = useState(null); // { tipo: "ok" | "erro", texto }
  const [salvando, setSalvando] = useState("");   // "perfil" | "senha" | "casa"
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  // ---------- CARREGA PERFIL ----------
  useEffect(() => {
    if (!usuarioId) return;
    usuarioService
      .buscarPorId(usuarioId)
      .then((dados) => {
        if (dados) setPerfil({ nome: dados.nome ?? "", usuario: dados.usuario ?? "", email: dados.email ?? "" });
      })
      .catch((error) => setMensagem({ tipo: "erro", texto: error.message }));
  }, [usuarioId]);

  // ---------- CARREGA CASA + TARIFA ----------
  useEffect(() => {
    if (!casaAtual) return;

    setCasa({
      nome: casaAtual.nome ?? "",
      rua: casaAtual.rua ?? "",
      numero: casaAtual.numero ?? "",
      bairro: casaAtual.bairro ?? "",
      cidade: casaAtual.cidade ?? "",
      cep: casaAtual.cep?.trim() ?? "",
    });

    casaService
      .buscarTarifa(casaAtual.id)
      .then((dados) => {
        if (!dados) return;
        const valor = { valor_kwh: String(dados.valor_kwh), bandeira: dados.bandeira };
        setTarifa(valor);
        setTarifaOriginal(valor);
      })
      .catch(() => {});
  }, [casaAtual]);

  // EXECUTA UMA AÇÃO MOSTRANDO "SALVANDO..." E A MENSAGEM DE RESULTADO
  async function executar(secao, acao, textoSucesso) {
    setSalvando(secao);
    setMensagem(null);
    try {
      await acao();
      setMensagem({ tipo: "ok", texto: textoSucesso });
    } catch (error) {
      setMensagem({ tipo: "erro", texto: error.message || "Não foi possível salvar." });
    } finally {
      setSalvando("");
    }
  }

  function salvarPerfil(event) {
    event.preventDefault();
    executar(
      "perfil",
      async () => {
        const dados = { nome: perfil.nome.trim(), usuario: perfil.usuario.trim(), email: perfil.email.trim() };
        await usuarioService.atualizarPerfil(usuarioId, dados);
        // ATUALIZA O NOME QUE APARECE NO MENU LATERAL
        authService.saveSession({ ...usuario, nome: dados.nome.toUpperCase() });
      },
      "Perfil atualizado com sucesso."
    );
  }

  function alterarSenha(event) {
    event.preventDefault();
    if (senhas.nova.length < 6) {
      setMensagem({ tipo: "erro", texto: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (senhas.nova !== senhas.confirmacao) {
      setMensagem({ tipo: "erro", texto: "A nova senha e a confirmação não são iguais." });
      return;
    }
    executar(
      "senha",
      async () => {
        await usuarioService.alterarSenha(usuarioId, { senhaAtual: senhas.atual, senhaNova: senhas.nova });
        setSenhas(senhasVazias);
      },
      "Senha alterada com sucesso."
    );
  }

  function salvarCasa(event) {
    event.preventDefault();
    if (!/^\d{5}-\d{3}$/.test(casa.cep)) {
      setMensagem({ tipo: "erro", texto: "Informe um CEP válido (00000-000)." });
      return;
    }

    executar(
      "casa",
      async () => {
        const dados = { ...casa, fk_usuario: usuarioId };
        let casaId = casaAtual?.id;

        if (casaId) {
          await casaService.atualizar(casaId, dados);
        } else {
          await casaService.cadastrar(dados);
          const lista = await casaService.buscarPorUsuario(usuarioId);
          casaId = lista?.[lista.length - 1]?.id;
        }

        const tarifaMudou =
          !tarifaOriginal ||
          Number(tarifaOriginal.valor_kwh) !== Number(tarifa.valor_kwh) ||
          tarifaOriginal.bandeira !== tarifa.bandeira;

        if (casaId && Number(tarifa.valor_kwh) > 0 && tarifaMudou) {
          await casaService.salvarTarifa(casaId, {
            valor_kwh: Number(tarifa.valor_kwh),
            bandeira: tarifa.bandeira,
          });
        }

        await recarregar();
      },
      "Dados da casa salvos com sucesso."
    );
  }

  async function excluirConta() {
    try {
      await usuarioService.deletar(usuarioId);
      authService.logout();
      sessionStorage.removeItem("casaAtualId");
      navigate("/");
    } catch (error) {
      setConfirmarExclusao(false);
      setMensagem({ tipo: "erro", texto: error.message || "Não foi possível excluir a conta." });
    }
  }

  const atualizarCampo = (setter) => (event) =>
    setter((atual) => ({ ...atual, [event.target.name]: event.target.value }));

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="PREFERÊNCIAS"
        title="Configurações"
        description="Gerencie seu perfil, a segurança da conta, os dados da casa e suas preferências."
      />

      {mensagem && (
        <div
          className={mensagem.tipo === "erro" ? "energy-form-error" : "energy-feedback"}
          role={mensagem.tipo === "erro" ? "alert" : "status"}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="energy-setting-layout">
        {/* ================= PERFIL ================= */}
        <form className="energy-panel energy-setting-card" onSubmit={salvarPerfil}>
          <div className="energy-panel-heading">
            <div>
              <h2>Perfil</h2>
              <p>Seus dados de identificação.</p>
            </div>
            <span className="energy-metric-icon">◎</span>
          </div>
          <div className="energy-form-grid">
            <FormField label="Nome completo" htmlFor="profile-name" className="full">
              <input className="energy-input" id="profile-name" name="nome" value={perfil.nome} onChange={atualizarCampo(setPerfil)} required />
            </FormField>
            <FormField label="Usuário" htmlFor="profile-user">
              <input className="energy-input" id="profile-user" name="usuario" autoComplete="username" value={perfil.usuario} onChange={atualizarCampo(setPerfil)} required />
            </FormField>
            <FormField label="E-mail" htmlFor="profile-email">
              <input className="energy-input" id="profile-email" name="email" type="email" value={perfil.email} onChange={atualizarCampo(setPerfil)} required />
            </FormField>
          </div>
          <div className="energy-form-actions">
            <button className="energy-button" type="submit" disabled={salvando === "perfil"}>
              {salvando === "perfil" ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </form>

        {/* ================= SEGURANÇA ================= */}
        <form className="energy-panel energy-setting-card" onSubmit={alterarSenha}>
          <div className="energy-panel-heading">
            <div>
              <h2>Segurança</h2>
              <p>Altere sua senha de acesso.</p>
            </div>
            <span className="energy-metric-icon">🔒</span>
          </div>
          <div className="energy-form-grid">
            <FormField label="Senha atual" htmlFor="password-current" className="full">
              <input className="energy-input" id="password-current" name="atual" type="password" autoComplete="current-password" value={senhas.atual} onChange={atualizarCampo(setSenhas)} required />
            </FormField>
            <FormField label="Nova senha" htmlFor="password-new">
              <input className="energy-input" id="password-new" name="nova" type="password" autoComplete="new-password" minLength={6} value={senhas.nova} onChange={atualizarCampo(setSenhas)} required />
            </FormField>
            <FormField label="Confirmar nova senha" htmlFor="password-confirm">
              <input className="energy-input" id="password-confirm" name="confirmacao" type="password" autoComplete="new-password" value={senhas.confirmacao} onChange={atualizarCampo(setSenhas)} required />
            </FormField>
          </div>
          <div className="energy-form-actions">
            <button className="energy-button" type="submit" disabled={salvando === "senha"}>
              {salvando === "senha" ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </form>

        {/* ================= MINHA CASA ================= */}
        <form className="energy-panel energy-setting-card" onSubmit={salvarCasa}>
          <div className="energy-panel-heading">
            <div>
              <h2>Minha casa</h2>
              <p>{casaAtual ? "Endereço e tarifa usados nos cálculos." : "Cadastre sua casa para usar o SmartMind."}</p>
            </div>
            <span className="energy-metric-icon">⌂</span>
          </div>
          <div className="energy-form-grid">
            <FormField label="Nome da casa" htmlFor="home-name" className="full">
              <input className="energy-input" id="home-name" name="nome" value={casa.nome} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Rua" htmlFor="home-street" className="full">
              <input className="energy-input" id="home-street" name="rua" value={casa.rua} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Número" htmlFor="home-number">
              <input className="energy-input" id="home-number" name="numero" value={casa.numero} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Bairro" htmlFor="home-district">
              <input className="energy-input" id="home-district" name="bairro" value={casa.bairro} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="Cidade" htmlFor="home-city">
              <input className="energy-input" id="home-city" name="cidade" value={casa.cidade} onChange={atualizarCampo(setCasa)} required />
            </FormField>
            <FormField label="CEP" htmlFor="home-cep">
              <input
                className="energy-input"
                id="home-cep"
                name="cep"
                inputMode="numeric"
                placeholder="00000-000"
                value={casa.cep}
                onChange={(event) => setCasa((atual) => ({ ...atual, cep: formatarCep(event.target.value) }))}
                required
              />
            </FormField>
            <FormField label="Tarifa (R$/kWh)" htmlFor="home-tariff">
              <input
                className="energy-input"
                id="home-tariff"
                type="number"
                min="0.01"
                step="0.00001"
                value={tarifa.valor_kwh}
                onChange={(event) => setTarifa((atual) => ({ ...atual, valor_kwh: event.target.value }))}
              />
            </FormField>
            <FormField label="Bandeira tarifária" htmlFor="home-flag">
              <select
                className="energy-select"
                id="home-flag"
                value={tarifa.bandeira}
                onChange={(event) => setTarifa((atual) => ({ ...atual, bandeira: event.target.value }))}
              >
                <option value="VERDE">Verde</option>
                <option value="AMARELA">Amarela</option>
                <option value="VERMELHA">Vermelha</option>
              </select>
            </FormField>
          </div>
          <div className="energy-form-actions">
            <button className="energy-button" type="submit" disabled={salvando === "casa"}>
              {salvando === "casa" ? "Salvando..." : casaAtual ? "Salvar casa" : "Cadastrar casa"}
            </button>
          </div>
        </form>

        {/* ================= PREFERÊNCIAS (LOCAL) ================= */}
        <section className="energy-panel energy-setting-card energy-preferences">
          <div className="energy-panel-heading">
            <div>
              <h2>Preferências</h2>
              <p>Ficam salvas neste navegador.</p>
            </div>
            <span className="energy-metric-icon">⚙</span>
          </div>
          <div className="energy-setting-row">
            <div>
              <strong>Idioma</strong>
              <span>Idioma da interface</span>
            </div>
            <select
              className="energy-select energy-compact-select"
              value={preferencias.idioma}
              onChange={(event) => setPreferencias({ ...preferencias, idioma: event.target.value })}
              aria-label="Idioma"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
          <div className="energy-setting-row">
            <div>
              <strong>Tema</strong>
              <span>Aparência da interface</span>
            </div>
            <select
              className="energy-select energy-compact-select"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              aria-label="Tema"
            >
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
          <div className="energy-setting-row">
            <div>
              <strong>Alerta de consumo alto</strong>
              <span>Notificar quando a casa ultrapassar o limite.</span>
            </div>
            <Toggle
              checked={preferencias.alertaConsumoAlto}
              onChange={(value) => setPreferencias({ ...preferencias, alertaConsumoAlto: value })}
              label="Alerta de consumo alto"
            />
          </div>
        </section>

        {/* ================= ZONA DE PERIGO ================= */}
        <section className="energy-panel energy-setting-card energy-save-card">
          <div>
            <h2>Excluir conta</h2>
            <p>Sua conta será desativada e você sairá do sistema.</p>
          </div>
          <button className="energy-button-secondary danger" type="button" onClick={() => setConfirmarExclusao(true)}>
            Excluir minha conta
          </button>
        </section>
      </div>

      {confirmarExclusao && (
        <Modal
          title="Excluir sua conta?"
          description="Essa ação desativa seu acesso ao SmartMind. Deseja continuar?"
          onClose={() => setConfirmarExclusao(false)}
          role="alertdialog"
        >
          <div className="energy-form-actions">
            <button className="energy-button-secondary" type="button" onClick={() => setConfirmarExclusao(false)}>
              Cancelar
            </button>
            <button className="energy-button-secondary danger" type="button" onClick={excluirConta}>
              Sim, excluir
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
```

> Depois disso, o `localStorage` com a chave `smartmind-settings` pode ser apagado. Ele guardava nome e e-mail no navegador, o que nem é bom por privacidade.

### 7.2 `pages/Dispositivos/DevicesPage.jsx` (substituir)

O layout dos cards continua o mesmo. As mudanças:
- usa a API real (`/dispositivo/casa/:casaId`);
- "Ambiente" vira **Tipo** (vem de `Tipo_Dispositivo`) e entra o campo **horas de uso por dia**;
- ligar e desligar com **atualização otimista** (a tela muda na hora e volta ao estado anterior se a API falhar);
- novo indicador de **consumo mensal estimado**.

```jsx
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { FormField, MetricCard, Modal, PageHeading } from "../../components/energy/EnergyComponents.jsx";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { dispositivoService } from "../../services/dispositivoService.js";
import "./DevicesPage.css";

const TAMANHO_MAXIMO_FOTO = 1.5 * 1024 * 1024; // 1,5 MB

const emptyForm = {
  nome: "",
  foto: "",
  fk_tipoDispositivo: "",
  potenciaW: "",
  horasUsoDia: "4",
  ativo: false,
};

// API -> TELA
function daApi(d) {
  return {
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    fk_tipoDispositivo: d.fk_tipoDispositivo,
    potenciaW: Number(d.potencia_watts ?? 0),
    horasUsoDia: Number(d.horas_uso_dia ?? 0),
    ativo: Boolean(d.ligado),
    foto: d.foto_url ?? "",
  };
}

// TELA -> API
function paraApi(form, casaId) {
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

const kwhMes = (device) => (device.potenciaW * device.horasUsoDia * 30) / 1000;

function DeviceForm({ device, tipos, salvando, erroApi, onCancel, onSubmit }) {
  const [form, setForm] = useState(
    device
      ? {
          ...device,
          fk_tipoDispositivo: String(device.fk_tipoDispositivo),
          potenciaW: String(device.potenciaW),
          horasUsoDia: String(device.horasUsoDia),
        }
      : emptyForm
  );
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > TAMANHO_MAXIMO_FOTO) {
      setError("A foto deve ter no máximo 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, foto: reader.result }));
    reader.readAsDataURL(file);
  }

  function submit(event) {
    event.preventDefault();
    const horas = Number(form.horasUsoDia);
    if (!form.nome.trim() || !form.fk_tipoDispositivo || Number(form.potenciaW) <= 0) {
      setError("Preencha nome, tipo e uma potência válida.");
      return;
    }
    if (!Number.isFinite(horas) || horas < 0 || horas > 24) {
      setError("As horas de uso por dia devem estar entre 0 e 24.");
      return;
    }
    setError("");
    onSubmit(form);
  }

  return (
    <form onSubmit={submit}>
      <div className="energy-form-grid">
        <FormField label="Nome do dispositivo" htmlFor="device-name">
          <input className="energy-input" id="device-name" name="nome" value={form.nome} onChange={updateField} placeholder="Ex.: Ar-condicionado do quarto" required />
        </FormField>

        <FormField label="Tipo" htmlFor="device-type">
          <select className="energy-select" id="device-type" name="fk_tipoDispositivo" value={form.fk_tipoDispositivo} onChange={updateField} required>
            <option value="">Selecione o tipo</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>{tipo.tipo}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Potência (W)" htmlFor="device-power">
          <input className="energy-input" id="device-power" name="potenciaW" type="number" min="1" step="0.1" value={form.potenciaW} onChange={updateField} placeholder="Ex.: 1200" required />
        </FormField>

        <FormField label="Uso por dia (horas)" htmlFor="device-hours">
          <input className="energy-input" id="device-hours" name="horasUsoDia" type="number" min="0" max="24" step="0.25" value={form.horasUsoDia} onChange={updateField} required />
        </FormField>

        <FormField label="Foto por URL" htmlFor="device-photo">
          <input
            className="energy-input"
            id="device-photo"
            name="foto"
            type="url"
            value={form.foto.startsWith("data:") ? "" : form.foto}
            onChange={updateField}
            placeholder="https://..."
          />
        </FormField>

        <FormField label="Ou envie uma foto" htmlFor="device-upload">
          <input className="energy-input" id="device-upload" type="file" accept="image/*" onChange={uploadPhoto} />
        </FormField>

        <label className="energy-checkbox-field">
          <input type="checkbox" name="ativo" checked={Boolean(form.ativo)} onChange={updateField} />
          Dispositivo ligado
        </label>
      </div>

      {(error || erroApi) && <p className="energy-form-error" role="alert">{error || erroApi}</p>}

      <div className="energy-form-actions">
        <button className="energy-button-secondary" type="button" onClick={onCancel} disabled={salvando}>Cancelar</button>
        <button className="energy-button" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar dispositivo"}
        </button>
      </div>
    </form>
  );
}

export default function DevicesPage() {
  const { casaAtual, carregando: carregandoCasa } = useCasaAtual();
  const casaId = casaAtual?.id;

  const [devices, setDevices] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [modalDevice, setModalDevice] = useState(null);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const carregar = useCallback(async () => {
    if (!casaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [lista, listaTipos] = await Promise.all([
        dispositivoService.listarPorCasa(casaId),
        dispositivoService.buscarTipos(),
      ]);
      setDevices((lista ?? []).map(daApi));
      setTipos(listaTipos ?? []);
    } catch (e) {
      setError(e.message || "Não foi possível carregar os dispositivos.");
    } finally {
      setLoading(false);
    }
  }, [casaId]);

  useEffect(() => {
    if (!carregandoCasa) carregar();
  }, [carregandoCasa, carregar]);

  // A MENSAGEM DE SUCESSO SOME SOZINHA DEPOIS DE 4 SEGUNDOS
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeDevices = devices.filter((device) => device.ativo);
  const currentPower = activeDevices.reduce((sum, device) => sum + device.potenciaW, 0);
  const consumoMensal = devices.reduce((sum, device) => sum + kwhMes(device), 0);

  async function saveDevice(form) {
    setSalvando(true);
    setError("");
    try {
      const payload = paraApi(form, casaId);
      if (modalDevice?.id) {
        await dispositivoService.atualizar(modalDevice.id, payload);
        setNotice("As alterações do dispositivo foram salvas.");
      } else {
        await dispositivoService.criar(payload);
        setNotice("Dispositivo adicionado com sucesso.");
      }
      setModalDevice(null);
      await carregar();
    } catch (e) {
      setError(e.message || "Não foi possível salvar o dispositivo.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmRemoveDevice() {
    if (!deviceToDelete) return;
    try {
      await dispositivoService.remover(deviceToDelete.id);
      setDevices((current) => current.filter((item) => item.id !== deviceToDelete.id));
      setNotice("Dispositivo removido.");
    } catch (e) {
      setError(e.message || "Não foi possível remover o dispositivo.");
    } finally {
      setDeviceToDelete(null);
    }
  }

  // ATUALIZAÇÃO OTIMISTA: MUDA NA TELA NA HORA E VOLTA SE A API FALHAR
  async function toggleDevice(device) {
    const novoEstado = !device.ativo;
    setDevices((current) => current.map((item) => (item.id === device.id ? { ...item, ativo: novoEstado } : item)));
    try {
      await dispositivoService.alterarEstado(device.id, novoEstado);
    } catch (e) {
      setDevices((current) => current.map((item) => (item.id === device.id ? { ...item, ativo: device.ativo } : item)));
      setError(e.message || "Não foi possível alterar o estado do dispositivo.");
    }
  }

  if (!carregandoCasa && !casaAtual) {
    return (
      <main className="energy-page">
        <PageHeading eyebrow="GERENCIAMENTO DA CASA" title="Dispositivos" description="Acompanhe a potência e o estado dos aparelhos da sua casa." />
        <div className="energy-empty">
          Você ainda não tem uma casa cadastrada. <Link to="/configuracoes">Cadastre em Configurações</Link> para adicionar dispositivos.
        </div>
      </main>
    );
  }

  return (
    <main className="energy-page">
      <PageHeading
        eyebrow="GERENCIAMENTO DA CASA"
        title="Dispositivos"
        description={`Aparelhos de ${casaAtual?.nome ?? "sua casa"}.`}
        action={
          <button className="energy-button" type="button" onClick={() => { setError(""); setModalDevice({ ...emptyForm }); }}>
            <span aria-hidden="true">+</span> Adicionar dispositivo
          </button>
        }
      />

      <section className="energy-metrics" aria-label="Resumo dos dispositivos">
        <MetricCard label="Consumo ligado agora" value={currentPower.toLocaleString("pt-BR") + " W"} note="Potência dos aparelhos ligados" icon="ϟ" />
        <MetricCard label="Estimativa mensal" value={consumoMensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " kWh"} note="Potência × horas de uso × 30 dias" icon="▦" />
        <MetricCard label="Dispositivos ligados" value={`${String(activeDevices.length).padStart(2, "0")} / ${String(devices.length).padStart(2, "0")}`} note="Ligue ou desligue pelos cards" icon="◉" />
      </section>

      {notice && <div className="energy-feedback" role="status">{notice}</div>}
      {error && !modalDevice && <div className="energy-form-error" role="alert">{error}</div>}

      {loading || carregandoCasa ? (
        <div className="energy-empty">Carregando dispositivos…</div>
      ) : devices.length ? (
        <section className="energy-device-grid" aria-label="Lista de dispositivos">
          {devices.map((device) => (
            <article className="energy-device-card" key={device.id}>
              <div className="energy-device-photo">
                <span className="energy-device-image-fallback" aria-hidden="true">⌂</span>
                {device.foto && (
                  <img
                    src={device.foto}
                    alt={device.nome}
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                )}
                <span className="energy-device-status">
                  <i className={device.ativo ? "sm-live-dot" : ""} />
                  {device.ativo ? "Ligado" : "Desligado"}
                </span>
              </div>
              <div className="energy-device-card-body">
                <div className="energy-device-title">
                  <div>
                    <h3>{device.nome}</h3>
                    <p>{device.tipo}</p>
                  </div>
                  <strong className="energy-device-power">{device.potenciaW} W</strong>
                </div>
                <div className="energy-device-footer">
                  <span>≈ {kwhMes(device).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh/mês</span>
                  <div className="energy-inline-actions">
                    <button
                      className="energy-small-action"
                      type="button"
                      role="switch"
                      aria-checked={device.ativo}
                      aria-label={(device.ativo ? "Desligar " : "Ligar ") + device.nome}
                      onClick={() => toggleDevice(device)}
                    >
                      {device.ativo ? "●" : "○"}
                    </button>
                    <button className="energy-small-action" type="button" aria-label={"Editar " + device.nome} onClick={() => { setError(""); setModalDevice(device); }}>✎</button>
                    <button className="energy-small-action danger" type="button" aria-label={"Remover " + device.nome} onClick={() => setDeviceToDelete(device)}>×</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="energy-empty">Nenhum dispositivo cadastrado. Adicione o primeiro para começar.</div>
      )}

      {modalDevice && (
        <Modal
          title={modalDevice.id ? "Editar dispositivo" : "Novo dispositivo"}
          description="Potência e horas de uso são usadas para estimar o consumo e responder ao assistente."
          onClose={() => setModalDevice(null)}
        >
          <DeviceForm
            device={modalDevice.id ? modalDevice : null}
            tipos={tipos}
            salvando={salvando}
            erroApi={error}
            onCancel={() => setModalDevice(null)}
            onSubmit={saveDevice}
          />
        </Modal>
      )}

      {deviceToDelete && (
        <Modal
          title="Excluir dispositivo?"
          description={`Tem certeza que deseja remover ${deviceToDelete.nome} da sua casa?`}
          onClose={() => setDeviceToDelete(null)}
          role="alertdialog"
        >
          <div className="energy-form-actions">
            <button className="energy-button-secondary" type="button" onClick={() => setDeviceToDelete(null)}>Cancelar</button>
            <button className="energy-button-secondary danger" type="button" onClick={confirmRemoveDevice}>Excluir dispositivo</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
```

> A **Home** (`HomePage.jsx`) ainda usa `getDispositivos` e `updateDispositivo` do mock `energyApi.js`. Para ela mostrar os dados reais, use o mesmo `useCasaAtual()` + `dispositivoService.listarPorCasa()` + `daApi()` (pode mover o `daApi` para `components/energy/devicePresentation.js` e reaproveitar). O ligar e desligar da Home passa a usar `dispositivoService.alterarEstado`.

---

## 8. Front – página do Chatbot

### O novo layout

```
┌───────────────┬──────────────────────────────────────────────┐
│ + Nova conversa│  (SM)  Assistente SmartMind      [Nova conversa]│
│               │        ● Analisando: CASA PRINCIPAL            │
│ CONVERSAS     ├──────────────────────────────────────────────┤
│ ▸ Quanto gasta │                                              │
│   o chuveiro…  │        (SM)  Olá, Severino! Como posso ajudar?│
│   20/11 14:32  │   ┌──────────────┐ ┌──────────────┐          │
│ ▸ Previsão da… │   │Calcular      │ │Meus          │  ← cards │
│               │   │consumo       │ │dispositivos  │   de     │
│               │   └──────────────┘ └──────────────┘ sugestão │
│               │                                              │
│               │  (SM) O chuveiro consome 82,5 kWh/mês…       │
│               │       ┌─────────┬──────────┬────────┐        │
│               │       │82,5 kWh │ R$ 61,88 │R$ 0,75 │ ← card │
│               │       └─────────┴──────────┴────────┘ result │
│               │       Dicas para economizar: • …             │
│               │       14:32 · Copiar                         │
│               │       [Como economizar?] [Outro aparelho]← chips│
├───────────────┼──────────────────────────────────────────────┤
│               │ [ textarea que cresce…              ] [➤]   │
│               │ Enter envia · Shift+Enter quebra linha 12/1000│
└───────────────┴──────────────────────────────────────────────┘
```

Melhorias de experiência:
- **Histórico de conversas** na lateral (abrir e excluir);
- **tela de boas-vindas** com cards de sugestão (o usuário não fica sem saber o que perguntar);
- **respostas rápidas** (chips) embaixo da última resposta;
- **card de resultado** com kWh, custo e tarifa formatados em R$;
- **horário** e botão **Copiar** em cada mensagem;
- **auto-scroll** até a última mensagem;
- **textarea** que cresce, com Enter para enviar e Shift+Enter para quebrar linha, e contador de caracteres;
- **"Tentar novamente"** quando dá erro;
- **acessibilidade:** `aria-live` (leitores de tela anunciam as respostas) e foco automático no campo.

### 8.1 `components/chatbot/ChatInput.jsx` (substituir)

```jsx
import { useEffect, useRef, useState } from "react";

const LIMITE = 1000;

function ChatInput({ onSend, disabled }) {
    const [mensagem, setMensagem] = useState("");
    const textareaRef = useRef(null);

    // VOLTA O FOCO PARA O CAMPO QUANDO O BOT TERMINA DE RESPONDER
    useEffect(() => {
        if (!disabled) textareaRef.current?.focus();
    }, [disabled]);

    // A TEXTAREA CRESCE CONFORME O TEXTO (ATÉ 160px)
    useEffect(() => {
        const elemento = textareaRef.current;
        if (!elemento) return;
        elemento.style.height = "auto";
        elemento.style.height = `${Math.min(elemento.scrollHeight, 160)}px`;
    }, [mensagem]);

    function enviar() {
        const texto = mensagem.trim();
        if (!texto || disabled) return;
        onSend(texto);
        setMensagem("");
    }

    function handleKeyDown(event) {
        // ENTER ENVIA, SHIFT+ENTER QUEBRA LINHA (isComposing EVITA BUG COM ACENTOS EM ALGUNS TECLADOS)
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            enviar();
        }
    }

    return (
        <form
            className="chat-input"
            onSubmit={(event) => {
                event.preventDefault();
                enviar();
            }}
        >
            <div className="chat-input-field">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    maxLength={LIMITE}
                    placeholder="Pergunte sobre consumo, dispositivos ou economia..."
                    value={mensagem}
                    onChange={(event) => setMensagem(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-label="Mensagem para o assistente"
                />
                <span className="chat-input-hint">
                    Enter para enviar · Shift+Enter para nova linha · {mensagem.length}/{LIMITE}
                </span>
            </div>

            <button type="submit" disabled={disabled || !mensagem.trim()} aria-label="Enviar mensagem">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
            </button>
        </form>
    );
}

export default ChatInput;
```

### 8.2 `components/chatbot/ChatMessage.jsx` (substituir)

```jsx
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarHora(data) {
    return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ChatMessage({ message, mostrarAcoes, onQuickReply }) {
    const isUser = message.role === "user";
    const { result } = message;

    return (
        <div className={`chat-message ${isUser ? "user" : "assistant"}`}>
            {!isUser && <div className="chat-message-avatar" aria-hidden="true">SM</div>}

            <div className="chat-message-body">
                <div className="chat-message-content">
                    {message.content}

                    {result && (
                        <div className="chat-result-card">
                            {result.consumption_kwh != null && (
                                <div>
                                    <span>Consumo</span>
                                    <strong>{Number(result.consumption_kwh).toLocaleString("pt-BR")} kWh/mês</strong>
                                </div>
                            )}
                            {result.monthly_cost != null && (
                                <div>
                                    <span>Custo estimado</span>
                                    <strong>{moeda.format(result.monthly_cost)}</strong>
                                </div>
                            )}
                            {result.tariff != null && (
                                <div>
                                    <span>Tarifa</span>
                                    <strong>{moeda.format(result.tariff)}/kWh</strong>
                                </div>
                            )}
                        </div>
                    )}

                    {message.suggestions?.length > 0 && (
                        <div className="chat-suggestions">
                            <strong>Dicas para economizar</strong>
                            <ul>
                                {message.suggestions.map((sugestao) => (
                                    <li key={sugestao}>{sugestao}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="chat-message-meta">
                    {message.createdAt && (
                        <time dateTime={new Date(message.createdAt).toISOString()}>
                            {formatarHora(message.createdAt)}
                        </time>
                    )}
                    {!isUser && (
                        <button
                            type="button"
                            className="chat-copy"
                            onClick={() => navigator.clipboard?.writeText(message.content)}
                        >
                            Copiar
                        </button>
                    )}
                </div>

                {mostrarAcoes && message.quickReplies?.length > 0 && (
                    <div className="chat-quick-replies">
                        {message.quickReplies.map((resposta) => (
                            <button key={resposta} type="button" onClick={() => onQuickReply(resposta)}>
                                {resposta}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatMessage;
```

### 8.3 Novo `components/chatbot/ChatSidebar.jsx`

```jsx
function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ChatSidebar({ conversas, conversaAtivaId, carregando, onSelecionar, onNova, onExcluir }) {
    return (
        <aside className="chat-sidebar" aria-label="Histórico de conversas">
            <button type="button" className="chat-new-button" onClick={onNova}>
                + Nova conversa
            </button>

            <p className="chat-sidebar-label">Conversas recentes</p>

            {carregando ? (
                <p className="chat-sidebar-empty">Carregando…</p>
            ) : conversas.length === 0 ? (
                <p className="chat-sidebar-empty">Nenhuma conversa ainda.</p>
            ) : (
                <ul className="chat-conversation-list">
                    {conversas.map((conversa) => (
                        <li key={conversa.id} className={conversa.id === conversaAtivaId ? "active" : ""}>
                            <button
                                type="button"
                                className="chat-conversation-item"
                                onClick={() => onSelecionar(conversa.id)}
                                aria-current={conversa.id === conversaAtivaId ? "true" : undefined}
                            >
                                <strong>{conversa.titulo}</strong>
                                <span>{formatarData(conversa.dt_ultima_mensagem)}</span>
                            </button>
                            <button
                                type="button"
                                className="chat-conversation-delete"
                                onClick={() => onExcluir(conversa.id)}
                                aria-label={`Excluir conversa ${conversa.titulo}`}
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}

export default ChatSidebar;
```

### 8.4 `pages/Chatbot/Chatbot.jsx` (substituir)

```jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import ChatInput from "../../components/chatbot/ChatInput.jsx";
import ChatMessage from "../../components/chatbot/ChatMessage.jsx";
import ChatSidebar from "../../components/chatbot/ChatSidebar.jsx";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { chatbotService } from "../../services/chatbotService.js";

import "./Chatbot.css";

const SUGESTOES = [
    { titulo: "Calcular consumo", texto: "Quanto gasta um chuveiro de 5500 W ligado 30 minutos por dia?" },
    { titulo: "Meus dispositivos", texto: "Quais dispositivos tenho cadastrados?" },
    { titulo: "Consumo do mês", texto: "Qual foi meu consumo este mês?" },
    { titulo: "Prever fatura", texto: "Qual a previsão da minha próxima conta de luz?" },
];

let contador = 0;
const novoId = () => `local-${Date.now()}-${contador++}`;

const primeiroNome = (nome = "") => {
    const primeiro = nome.trim().split(" ")[0] ?? "";
    return primeiro.charAt(0) + primeiro.slice(1).toLowerCase();
};

// RESPOSTA DA API -> MENSAGEM NA TELA
function respostaParaMensagem(resposta) {
    return {
        id: novoId(),
        role: "assistant",
        content: resposta.message || "Não consegui gerar uma resposta.",
        suggestions: resposta.suggestions ?? [],
        result: resposta.result ?? null,
        quickReplies: resposta.quick_replies ?? [],
        createdAt: new Date(),
    };
}

// CADA LINHA DO BANCO TEM PERGUNTA + RESPOSTA -> VIRA 2 MENSAGENS NA TELA
function historicoParaMensagens(linhas) {
    return linhas.flatMap((linha) => [
        { id: `u-${linha.id}`, role: "user", content: linha.mensagem, createdAt: linha.dt_mensagem },
        {
            id: `a-${linha.id}`,
            role: "assistant",
            content: linha.resposta,
            suggestions: linha.dados?.suggestions ?? [],
            result: linha.dados?.result ?? null,
            quickReplies: linha.dados?.quick_replies ?? [],
            createdAt: linha.dt_mensagem,
        },
    ]);
}

export default function Chatbot() {
    const { usuario, casaAtual, carregando: carregandoCasa, erro: erroCasa } = useCasaAtual();
    const usuarioId = usuario?.id;

    const [conversas, setConversas] = useState([]);
    const [carregandoConversas, setCarregandoConversas] = useState(true);
    const [conversaId, setConversaId] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [contexto, setContexto] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [ultimaFalha, setUltimaFalha] = useState(null);

    const fimDaListaRef = useRef(null);

    const carregarConversas = useCallback(async () => {
        if (!usuarioId) return;
        try {
            setConversas((await chatbotService.listarConversas(usuarioId)) ?? []);
        } catch {
            // A LISTA LATERAL NÃO É CRÍTICA: SE FALHAR, O CHAT CONTINUA FUNCIONANDO
        } finally {
            setCarregandoConversas(false);
        }
    }, [usuarioId]);

    useEffect(() => {
        carregarConversas();
    }, [carregarConversas]);

    // AUTO-SCROLL PARA A ÚLTIMA MENSAGEM
    useEffect(() => {
        fimDaListaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [mensagens, enviando]);

    async function abrirConversa(id) {
        if (id === conversaId || enviando) return;
        setErro("");
        setUltimaFalha(null);
        setContexto(null);
        setConversaId(id);
        setMensagens([]);
        try {
            const linhas = await chatbotService.listarMensagens(id, usuarioId);
            setMensagens(historicoParaMensagens(linhas ?? []));
        } catch (error) {
            setErro(error.message || "Não foi possível abrir a conversa.");
        }
    }

    function novaConversa() {
        setConversaId(null);
        setMensagens([]);
        setContexto(null);
        setErro("");
        setUltimaFalha(null);
    }

    async function excluirConversa(id) {
        if (!window.confirm("Excluir esta conversa?")) return;
        try {
            await chatbotService.excluirConversa(id, usuarioId);
            setConversas((atual) => atual.filter((conversa) => conversa.id !== id));
            if (id === conversaId) novaConversa();
        } catch (error) {
            setErro(error.message || "Não foi possível excluir a conversa.");
        }
    }

    async function enviarMensagem(texto, { repetir = false } = {}) {
        if (!usuarioId || !casaAtual) {
            setErro("Cadastre ou selecione uma casa em Configurações para usar o assistente.");
            return;
        }

        if (!repetir) {
            setMensagens((anterior) => [...anterior, { id: novoId(), role: "user", content: texto, createdAt: new Date() }]);
        }

        setEnviando(true);
        setErro("");
        setUltimaFalha(null);

        try {
            const resposta = await chatbotService.enviarMensagem({
                usuarioId,
                casaId: casaAtual.id,
                conversaId,
                mensagem: texto,
                contexto,
            });

            setMensagens((anterior) => [...anterior, respostaParaMensagem(resposta)]);
            setContexto(resposta.context ?? null);         // ← GUARDA O CONTEXTO PARA A PRÓXIMA PERGUNTA
            if (!conversaId && resposta.conversaId) setConversaId(resposta.conversaId);
            carregarConversas();                            // ATUALIZA A LISTA LATERAL
        } catch (error) {
            setErro(error.message || "Não foi possível enviar sua mensagem.");
            setUltimaFalha(texto);
        } finally {
            setEnviando(false);
        }
    }

    const ultimaMensagem = mensagens[mensagens.length - 1];
    const semCasa = !carregandoCasa && !casaAtual;
    const mensagemErro = erro || erroCasa;

    return (
        <div className="chatbot-page">
            <ChatSidebar
                conversas={conversas}
                conversaAtivaId={conversaId}
                carregando={carregandoConversas}
                onSelecionar={abrirConversa}
                onNova={novaConversa}
                onExcluir={excluirConversa}
            />

            <section className="chatbot-container">
                <header className="chatbot-header">
                    <div className="chatbot-brand">
                        <div className="chatbot-avatar"><span>SM</span></div>
                        <div className="chatbot-heading">
                            <h1>Assistente SmartMind</h1>
                            <p>
                                <span className="chatbot-status" />
                                {casaAtual ? `Analisando: ${casaAtual.nome}` : "Assistente de eficiência energética"}
                            </p>
                        </div>
                    </div>

                    {mensagens.length > 0 && (
                        <button className="chatbot-back-button" type="button" onClick={novaConversa}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>Nova conversa</span>
                        </button>
                    )}
                </header>

                <div className="chatbot-messages" aria-live="polite" aria-busy={enviando}>
                    {mensagens.length === 0 ? (
                        <div className="chat-welcome">
                            <div className="chatbot-avatar chat-welcome-avatar"><span>SM</span></div>
                            <h2>Olá{usuario?.nome ? `, ${primeiroNome(usuario.nome)}` : ""}! Como posso ajudar?</h2>
                            <p>Calculo o consumo de aparelhos, consulto seus dispositivos, prevejo a fatura e sugiro formas de economizar.</p>

                            {semCasa ? (
                                <p className="chat-welcome-warning">
                                    Para começar, <Link to="/configuracoes">cadastre sua casa em Configurações</Link>.
                                </p>
                            ) : (
                                <div className="chat-welcome-grid">
                                    {SUGESTOES.map((sugestao) => (
                                        <button
                                            key={sugestao.titulo}
                                            type="button"
                                            className="chat-welcome-card"
                                            onClick={() => enviarMensagem(sugestao.texto)}
                                            disabled={enviando || carregandoCasa}
                                        >
                                            <strong>{sugestao.titulo}</strong>
                                            <span>{sugestao.texto}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        mensagens.map((mensagem) => (
                            <ChatMessage
                                key={mensagem.id}
                                message={mensagem}
                                mostrarAcoes={mensagem === ultimaMensagem && !enviando}
                                onQuickReply={(texto) => enviarMensagem(texto)}
                            />
                        ))
                    )}

                    {enviando && (
                        <div className="chat-loading">
                            <div className="chat-message-avatar" aria-hidden="true">SM</div>
                            <span className="chat-loading-dots"><span /><span /><span /></span>
                            Analisando sua mensagem...
                        </div>
                    )}

                    <div ref={fimDaListaRef} />
                </div>

                {mensagemErro && (
                    <div className="chat-error" role="alert">
                        <span>{mensagemErro}</span>
                        {ultimaFalha && (
                            <button type="button" onClick={() => enviarMensagem(ultimaFalha, { repetir: true })}>
                                Tentar novamente
                            </button>
                        )}
                    </div>
                )}

                <ChatInput onSend={enviarMensagem} disabled={enviando || semCasa || carregandoCasa} />
            </section>
        </div>
    );
}
```

### 8.5 `pages/Chatbot/Chatbot.css` (substituir o arquivo inteiro)

> Como a página agora fica dentro do `EnergyLayout`, ela ocupa a área de conteúdo (`height: calc(100vh - 130px)`).
> Se a sua barra superior tiver outra altura, ajuste o `130px`.

```css
/* =========================================
   PÁGINA DO CHATBOT (DENTRO DO EnergyLayout)
========================================= */

.chatbot-page {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 18px;

    height: calc(100vh - 130px);
    min-height: 520px;

    font-family: var(--fonte-corpo);
    color: var(--cor-texto-principal);
}

/* =========================================
   LATERAL – HISTÓRICO DE CONVERSAS
========================================= */

.chat-sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;

    min-height: 0;
    padding: 16px;

    background: var(--cor-fundo-cartao);
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio-borda-grande);
}

.chat-new-button {
    padding: 11px 14px;

    border: 1px dashed var(--cor-primaria);
    border-radius: var(--raio-borda-medio);
    background: color-mix(in srgb, var(--ui-color-brand) 10%, transparent);

    color: var(--cor-texto-principal);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;

    cursor: pointer;
    transition: var(--transicao-padrao);
}

.chat-new-button:hover {
    background: color-mix(in srgb, var(--ui-color-brand) 18%, transparent);
}

.chat-sidebar-label {
    margin: 4px 0 0;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--cor-texto-secundario);
}

.chat-sidebar-empty {
    margin: 0;
    font-size: 13px;
    color: var(--cor-texto-secundario);
}

.chat-conversation-list {
    display: flex;
    flex-direction: column;
    gap: 4px;

    margin: 0;
    padding: 0;
    list-style: none;

    overflow-y: auto;
}

.chat-conversation-list li {
    display: flex;
    align-items: center;
    border-radius: var(--raio-borda-medio);
    transition: var(--transicao-padrao);
}

.chat-conversation-list li:hover,
.chat-conversation-list li.active {
    background: var(--cor-fundo-campo);
}

.chat-conversation-list li.active {
    box-shadow: inset 3px 0 0 var(--cor-primaria);
}

.chat-conversation-item {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;

    min-width: 0;
    padding: 9px 10px;

    background: none;
    border: none;
    text-align: left;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
}

.chat-conversation-item strong {
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.chat-conversation-item span {
    font-size: 11px;
    color: var(--cor-texto-secundario);
}

.chat-conversation-delete {
    padding: 6px 10px;

    background: none;
    border: none;
    color: var(--cor-texto-secundario);
    font-size: 16px;

    opacity: 0;
    cursor: pointer;
    transition: var(--transicao-padrao);
}

.chat-conversation-list li:hover .chat-conversation-delete,
.chat-conversation-delete:focus-visible {
    opacity: 1;
}

.chat-conversation-delete:hover {
    color: var(--ui-color-danger);
}

/* =========================================
   CONTAINER PRINCIPAL
========================================= */

.chatbot-container {
    display: flex;
    flex-direction: column;

    min-width: 0;
    min-height: 0;
    height: 100%;

    background: var(--cor-fundo-cartao);
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio-borda-grande);

    overflow: hidden;
}

/* =========================================
   CABEÇALHO
========================================= */

.chatbot-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;

    padding: 18px 22px;

    background: var(--cor-fundo-cartao);
    border-bottom: 1px solid var(--cor-borda);
}

.chatbot-brand {
    display: flex;
    align-items: center;
    gap: 14px;
}

.chatbot-avatar {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 44px;
    height: 44px;
    flex-shrink: 0;

    border-radius: var(--raio-borda-medio);
    background: linear-gradient(135deg, var(--cor-gradiente-inicio), var(--cor-gradiente-fim));
    box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
}

.chatbot-avatar span {
    font-family: var(--fonte-titulos);
    font-size: 16px;
    font-weight: 800;
    color: var(--ui-color-on-brand);
}

.chatbot-heading h1 {
    margin: 0;
    font-family: var(--fonte-titulos);
    font-size: 18px;
    font-weight: 700;
    color: var(--cor-texto-principal);
}

.chatbot-heading p {
    display: flex;
    align-items: center;
    gap: 7px;

    margin: 4px 0 0;
    font-size: 12px;
    color: var(--cor-texto-secundario);
}

.chatbot-status {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ui-color-success);
    box-shadow: 0 0 8px color-mix(in srgb, var(--ui-color-success) 50%, transparent);
}

.chatbot-back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    padding: 9px 14px;

    background: var(--cor-fundo-campo);
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio-borda-medio);

    color: var(--cor-texto-secundario);
    font-family: var(--fonte-corpo);
    font-size: 13px;
    font-weight: 600;

    cursor: pointer;
    transition: var(--transicao-padrao);
}

.chatbot-back-button svg {
    width: 16px;
    height: 16px;
}

.chatbot-back-button:hover {
    background: color-mix(in srgb, var(--ui-color-brand) 12%, transparent);
    border-color: var(--cor-primaria);
    color: var(--cor-texto-principal);
}

/* =========================================
   ÁREA DE MENSAGENS
========================================= */

.chatbot-messages {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 18px;

    min-height: 0;
    padding: 24px;

    overflow-y: auto;

    background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--ui-color-brand) 4%, transparent), transparent 35%),
        var(--cor-fundo-principal);
}

.chatbot-messages::-webkit-scrollbar { width: 6px; }
.chatbot-messages::-webkit-scrollbar-track { background: transparent; }
.chatbot-messages::-webkit-scrollbar-thumb { background: var(--cor-borda); border-radius: 10px; }
.chatbot-messages::-webkit-scrollbar-thumb:hover { background: var(--cor-texto-secundario); }

/* =========================================
   BOAS-VINDAS
========================================= */

.chat-welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;

    max-width: 640px;
    margin: auto;
    text-align: center;
}

.chat-welcome-avatar {
    width: 58px;
    height: 58px;
}

.chat-welcome h2 {
    margin: 8px 0 0;
    font-family: var(--fonte-titulos);
    font-size: 22px;
}

.chat-welcome p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--cor-texto-secundario);
}

.chat-welcome-warning a {
    color: var(--cor-primaria);
    font-weight: 600;
}

.chat-welcome-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    width: 100%;
    margin-top: 16px;
}

.chat-welcome-card {
    display: flex;
    flex-direction: column;
    gap: 6px;

    padding: 14px 16px;

    text-align: left;
    background: var(--cor-fundo-cartao);
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio-borda-medio);

    color: var(--cor-texto-principal);
    font-family: inherit;

    cursor: pointer;
    transition: var(--transicao-padrao);
}

.chat-welcome-card:hover:not(:disabled) {
    border-color: var(--cor-primaria);
    transform: translateY(-2px);
}

.chat-welcome-card:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.chat-welcome-card strong { font-size: 14px; }

.chat-welcome-card span {
    font-size: 12px;
    line-height: 1.5;
    color: var(--cor-texto-secundario);
}

/* =========================================
   MENSAGENS
========================================= */

.chat-message {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    animation: messageAppear 200ms ease;
}

.chat-message.user { justify-content: flex-end; }
.chat-message.assistant { justify-content: flex-start; }

.chat-message-avatar {
    display: grid;
    place-items: center;

    width: 30px;
    height: 30px;
    flex-shrink: 0;

    border-radius: 50%;
    background: linear-gradient(135deg, var(--cor-gradiente-inicio), var(--cor-gradiente-fim));

    font-size: 10px;
    font-weight: 800;
    color: var(--ui-color-on-brand);
}

.chat-message-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 75%;
}

.chat-message.user .chat-message-body { align-items: flex-end; }

.chat-message-content {
    padding: 13px 17px;
    border-radius: var(--raio-borda-grande);

    font-size: 14px;
    line-height: 1.7;

    overflow-wrap: anywhere;
    white-space: pre-line;
}

.chat-message.user .chat-message-content {
    background: linear-gradient(135deg, var(--cor-primaria), var(--ui-color-brand-hover));
    color: var(--ui-color-on-brand);
    border-bottom-right-radius: 4px;
    box-shadow: 0 5px 18px color-mix(in srgb, var(--ui-color-brand) 15%, transparent);
}

.chat-message.assistant .chat-message-content {
    background: var(--cor-fundo-cartao);
    color: var(--cor-texto-principal);
    border: 1px solid var(--cor-borda);
    border-top-left-radius: 4px;
}

.chat-message-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 4px;

    font-size: 11px;
    color: var(--cor-texto-secundario);
}

.chat-copy {
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font-size: 11px;
    opacity: 0.7;
    cursor: pointer;
}

.chat-copy:hover {
    opacity: 1;
    color: var(--cor-texto-principal);
}

/* CARD DE RESULTADO (kWh / R$ / TARIFA) */
.chat-result-card {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 12px;
    white-space: normal;
}

.chat-result-card div {
    display: flex;
    flex-direction: column;
    gap: 2px;

    padding: 10px 12px;

    background: var(--cor-fundo-campo);
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio-borda-medio);
}

.chat-result-card span {
    font-size: 11px;
    color: var(--cor-texto-secundario);
}

.chat-result-card strong {
    font-size: 15px;
    color: var(--cor-primaria);
}

/* DICAS DE ECONOMIA */
.chat-suggestions {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed var(--cor-borda);
    white-space: normal;
}

.chat-suggestions strong { font-size: 13px; }

.chat-suggestions ul {
    margin: 6px 0 0;
    padding-left: 18px;
}

.chat-suggestions li + li { margin-top: 4px; }

/* RESPOSTAS RÁPIDAS (CHIPS) */
.chat-quick-replies {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.chat-quick-replies button {
    padding: 7px 12px;

    background: var(--cor-fundo-cartao);
    border: 1px solid var(--cor-borda);
    border-radius: 999px;

    color: var(--cor-texto-principal);
    font-family: inherit;
    font-size: 12px;

    cursor: pointer;
    transition: var(--transicao-padrao);
}

.chat-quick-replies button:hover {
    border-color: var(--cor-primaria);
    background: color-mix(in srgb, var(--ui-color-brand) 12%, transparent);
}

/* =========================================
   CARREGANDO ("DIGITANDO...")
========================================= */

.chat-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--cor-texto-secundario);
}

.chat-loading-dots {
    display: flex;
    align-items: center;
    gap: 4px;
}

.chat-loading-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--cor-foco);
    animation: loadingPulse 1s infinite ease-in-out;
}

.chat-loading-dots span:nth-child(2) { animation-delay: 150ms; }
.chat-loading-dots span:nth-child(3) { animation-delay: 300ms; }

/* =========================================
   ERROS
========================================= */

.chat-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    margin: 0 20px 10px;
    padding: 10px 14px;

    background: var(--ui-color-danger-surface);
    border: 1px solid var(--ui-color-danger);
    border-radius: var(--raio-borda-medio);

    color: var(--ui-color-danger);
    font-size: 13px;
}

.chat-error button {
    flex-shrink: 0;
    padding: 6px 12px;

    background: transparent;
    border: 1px solid var(--ui-color-danger);
    border-radius: var(--raio-borda-medio);

    color: var(--ui-color-danger);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

/* =========================================
   CAMPO DE ENVIO
========================================= */

.chat-input {
    display: flex;
    align-items: flex-start;
    gap: 12px;

    padding: 16px 20px 12px;

    background: var(--cor-fundo-cartao);
    border-top: 1px solid var(--cor-borda);
}

.chat-input-field {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.chat-input textarea {
    width: 100%;
    max-height: 160px;
    padding: 13px 16px;

    resize: none;
    background: var(--cor-fundo-campo);
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio-borda-medio);

    color: var(--cor-texto-principal);
    font-family: var(--fonte-corpo);
    font-size: 14px;
    line-height: 1.5;

    outline: none;
    transition: var(--transicao-padrao);
}

.chat-input textarea::placeholder { color: var(--cor-texto-placeholder); }

.chat-input textarea:focus {
    border-color: var(--cor-foco);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-color-focus) 10%, transparent);
}

.chat-input-hint {
    padding-left: 4px;
    font-size: 11px;
    color: var(--cor-texto-secundario);
}

.chat-input button {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 48px;
    height: 48px;
    flex-shrink: 0;

    border: none;
    border-radius: var(--raio-borda-medio);
    background: var(--cor-primaria);
    color: var(--ui-color-on-brand);

    cursor: pointer;
    transition: var(--transicao-padrao);
}

.chat-input button svg {
    width: 20px;
    height: 20px;
}

.chat-input button:hover:not(:disabled) {
    background: var(--cor-primaria-hover);
    transform: translateY(-1px);
}

.chat-input button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* =========================================
   ANIMAÇÕES
========================================= */

@keyframes messageAppear {
    from { opacity: 0; transform: translateY(7px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes loadingPulse {
    0%, 80%, 100% { opacity: 0.35; transform: scale(0.8); }
    40%           { opacity: 1;    transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
    .chat-message,
    .chat-loading-dots span { animation: none; }
}

/* =========================================
   RESPONSIVIDADE
========================================= */

@media (max-width: 900px) {
    .chatbot-page {
        grid-template-columns: 1fr;
        grid-template-rows: auto minmax(0, 1fr);
        height: calc(100vh - 110px);
    }

    .chat-sidebar { max-height: 170px; }

    .chat-welcome-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
    .chatbot-header { padding: 14px; gap: 10px; }
    .chatbot-avatar { width: 38px; height: 38px; }
    .chatbot-heading h1 { font-size: 16px; }
    .chatbot-back-button span { display: none; }
    .chatbot-messages { padding: 16px 12px; }
    .chat-message-body { max-width: 88%; }
    .chat-message-content { font-size: 13px; }
    .chat-input { padding: 12px; gap: 8px; }
    .chat-input-hint { display: none; }
}
```

---

## 9. Outras melhorias

### 9.1 🔐 Senhas com hash (bcrypt): **importante para a apresentação**

Hoje as senhas ficam em texto puro e o login compara `u.senha = $2` no SQL.

```powershell
cd smartmind-api
npm install bcryptjs
```

**Migrar as senhas que já existem**, direto no PostgreSQL (o `pgcrypto` gera hash `$2a$`, compatível com o bcryptjs):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE "Usuario" SET senha = crypt(senha, gen_salt('bf', 10)) WHERE senha NOT LIKE '$2%';
```

**`usuario/application/use-cases/criar-usuario.ts`**

```ts
import bcrypt from 'bcryptjs';
// ...
        const senhaHash = await bcrypt.hash(dto.senha.trim(), 10);
        const usuario = UsuarioEntity.instanciarUsuario(dto.nome, dto.usuario, dto.email, senhaHash, dto.fk_perfil);
```

**`usuario/application/use-cases/atualizar-usuario.ts`**: troque `usuarioEntity.setSenha(dto.senha);` por:

```ts
        usuarioEntity.setSenha(await bcrypt.hash(dto.senha.trim(), 10));
```

**`usuario/application/use-cases/alterar-senha-usuario.ts`**

```ts
import bcrypt from 'bcryptjs';
// ...
        const senhaConfere = await bcrypt.compare(dto.senhaAtual, usuario.getSenha());
        if (!senhaConfere) {
            return Response.erro(TipoRetorno.BadRequest, 'senha atual incorreta');
        }
        // (a verificação "nova igual à atual" pode ser feita com bcrypt.compare(dto.senhaNova, usuario.getSenha()))
        usuario.setSenha(await bcrypt.hash(dto.senhaNova, 10));
```

**`auth/infrastructure/repositories/auth.repository.ts`**: busca só pelo usuário e devolve o hash:

```ts
    async buscarPorUsuario(usuario: string): Promise<(LoginOutputDto & { senha: string }) | null> {
        const result = await this.dataSource.query(
            `SELECT u.id, u.nome, pu.tipo AS "role", u.senha
             FROM "Usuario" AS u
             INNER JOIN "Perfil_Usuario" AS pu ON u.fk_perfil = pu.id
             WHERE u.usuario = $1 AND u.ativo = TRUE`,
            [usuario]
        );
        return result[0] ?? null;
    }
```

(troque o método na interface `IAuthRepository` também)

**`auth/application/use-cases/validar-login.ts`**

```ts
import bcrypt from 'bcryptjs';
// ...
        const usuario = await this.authRepository.buscarPorUsuario(login.usuario);
        if (!usuario || !(await bcrypt.compare(login.senha, usuario.senha))) {
            return Response.erro(TipoRetorno.BadRequest, "usuário ou senha inválidos!");
        }

        const { senha, ...dadosPublicos } = usuario;   // NUNCA DEVOLVA A SENHA
        return dadosPublicos;
```

### 9.2 🔐 JWT (próximo passo de segurança)

Hoje o front manda `usuarioId` no corpo e na query, e qualquer um pode trocar esse número. Caminho recomendado:
1. `npm install @nestjs/jwt`;
2. no login, devolver `accessToken` (`jwtService.sign({ sub: usuario.id, role })`);
3. criar um `AuthGuard` que valida o header `Authorization: Bearer <token>`;
4. nos controllers, ler o ID com `req.user.sub` em vez de `usuarioId` do corpo;
5. no front, o `authService.saveSession` guarda o token e o `HttpClient` envia `Authorization` em toda requisição (o `authService.logout` já remove `accessToken`, então a ideia já estava prevista).

### 9.3 Pequenos bugs encontrados

| Arquivo | Correção |
|---|---|
| `usuario/application/use-cases/deletar-usuario.ts` e `casa/.../deletar-casa.ts` | `if (id < 0)` → `if (id <= 0)` |
| `usuario/domain/entities/usuario.entity.ts` → `setFK_Perfil` | `addNotification("fk_categoria", ...)` → `addNotification("fk_perfil", ...)` |
| `usuario.controller.ts` / `casa.controller.ts` | `@Param("id") id: number` → `@Param("id", ParseIntPipe) id: number` |
| `dispositivos/.../criar-dispositivo.ts` | import termina em `.interface.ts` → trocar para `.interface.js` |
| `smartmind-web/src/pages/Register/Register.jsx` | `alert("As senhas não coincidem!")` → `setError("AS SENHAS NÃO COINCIDEM.")` (fica igual ao resto da tela) |
| `smartmind-web/src/pages/Chatbot/Chatbot.jsx` (antigo) | `role: 'assistants'` → `'assistant'` (já resolvido no código novo da seção 8) |
| `smartmind-api/src/main.ts` | `console.log` mostra sempre a porta 3000, mesmo com `PORT` definido. Use `` `http://localhost:${process.env.PORT ?? 3000}/api` `` |
| `smartmind-api/src/main.ts` | CORS fixo em `localhost:5173`. Use `origin: process.env.FRONT_URL ?? 'http://localhost:5173'` |
| `.gitignore` | confira se `.env` está ignorado nos três projetos (o da API tem a senha do banco) |

### 9.4 Ideias extras (se sobrar tempo)

- **Ambientes reais:** tabela `"Ambiente"` (id, nome, descricao, fk_casa, ativo) + `fk_ambiente` em `Dispositivo`. A `RoomsPage` passa a usar a API, como a de Dispositivos.
- **Seletor de casa** na barra superior (o `useCasaAtual` já tem `casas` e `selecionarCasa`).
- **Previsões salvas** na tabela `"Previsoes"`, para mostrar o gráfico "previsto × real" na página Energia.
- **Swagger:** acrescentar `@ApiTags('Chatbot')` etc. nos controllers, para organizar a documentação em `/api`.

---

## 10. Como testar

1. **Banco:** rode o SQL da seção 1 e confira com `SELECT * FROM "Chat_Conversa";`.
2. **Python:**
   ```powershell
   cd smartmind-ai
   Remove-Item app\nlu\nlu_model.pkl
   uvicorn app.main:app --reload --port 8000
   ```
   Teste em http://localhost:8000/docs → `POST /nlu/parse` com `"Quanto gasta meu ar-condicionado de 1200 W por 1h30?"`.
   A resposta deve ter `intent`, `confidence` e `entities` com `device`, `potencia_watts` e `hours_per_day`.
3. **API:** `npm run start:dev` e depois http://localhost:3000/api (Swagger):
   - `GET /api/dispositivo/tipos`
   - `GET /api/casa/usuario/1`
   - `POST /api/chatbot/mensagem` com `{ "usuarioId": 1, "casaId": 1, "message": "Quanto gasta o chuveiro?" }`. A resposta deve trazer `context.pending_intent = "calcular_consumo"` e um `conversaId`.
   - Mande de novo com `"message": "5500 W por 30 minutos"`, o mesmo `conversaId` e o `context` recebido. O cálculo deve sair completo.
   - `GET /api/chatbot/conversas/usuario/1` deve listar a conversa.
4. **Front:** `npm run dev`, faça login e teste:
   - Configurações: editar perfil, trocar senha (e logar de novo com a nova), salvar casa e tarifa;
   - Dispositivos: criar, editar, ligar/desligar, excluir (confira no banco);
   - Chatbot: clique num card de sugestão, responda o que o bot perguntar, abra uma conversa antiga na lateral e recarregue a página (o histórico precisa continuar lá).
