import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { AtualizarAmbienteUseCase } from '../../application/use-cases/atualizar-ambiente.js';
import { BuscarAmbientePorIdUseCase } from '../../application/use-cases/buscar-ambiente-por-id.js';
import { BuscarAmbientesPorCasaUseCase } from '../../application/use-cases/buscar-ambientes-por-casa.js';
import { CriarAmbienteUseCase } from '../../application/use-cases/criar-ambiente.js';
import { DeletarAmbienteUseCase } from '../../application/use-cases/deletar-ambiente.js';
import { AmbienteInputDto } from '../../domain/dto/ambiente.dto.js';

@Controller('api/ambiente')
export class AmbienteController extends BaseController {
    constructor(
        private readonly atualizarAmbienteUseCase: AtualizarAmbienteUseCase,
        private readonly buscarAmbientePorIdUseCase: BuscarAmbientePorIdUseCase,
        private readonly buscarAmbientesPorCasaUseCase: BuscarAmbientesPorCasaUseCase,
        private readonly criarAmbienteUseCase: CriarAmbienteUseCase,
        private readonly deletarAmbienteUseCase: DeletarAmbienteUseCase
    ) {
        super();
    }

    // ROTA FIXA ANTES DE ":id"
    @Get('casa/:casaId')
    async getPorCasa(@Res() res: ExpressResponse, @Param('casaId', ParseIntPipe) casaId: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarAmbientesPorCasaUseCase.buscar(casaId));
    }

    @Get(':id')
    async getPorId(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarAmbientePorIdUseCase.buscaPorId(id));
    }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: AmbienteInputDto): Promise<ExpressResponse> {
        const result = await this.criarAmbienteUseCase.create(dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(':id')
    async put(
        @Res() res: ExpressResponse,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AmbienteInputDto
    ): Promise<ExpressResponse> {
        const result = await this.atualizarAmbienteUseCase.atualizarAmbiente(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Delete(':id')
    async delete(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.deletarAmbienteUseCase.delete(id);
        return this.mapResponse(result.tipoRetorno, res, result);
    }
}