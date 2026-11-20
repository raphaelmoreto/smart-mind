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