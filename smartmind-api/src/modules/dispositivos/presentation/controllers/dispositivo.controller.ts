import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { AtualizarDispositivoUseCase } from '../../application/use-cases/atualizar-dispositivo.js';
import { BuscarDispositivoPorIdUseCase } from '../../application/use-cases/buscar-dispositivo-por-id.js';
import { BuscarDispositivosUseCase } from '../../application/use-cases/buscar-dispositivo.js';
import { CriarDispositivoUseCase } from '../../application/use-cases/criar-dispositivo.js';
import { DeletarDispositivoUseCase } from '../../application/use-cases/deletar-dispositivo.js';
import { DispositivoInputDto } from '../../domain/dto/dispositivo.dto.js';

@Controller('dispositivo')
export class DispositivoController extends BaseController {
    constructor(
        private readonly atualizarDispositivoUseCase: AtualizarDispositivoUseCase,
        private readonly buscarDispositivoPorIdUseCase: BuscarDispositivoPorIdUseCase,
        private readonly buscarDispositivosUseCase: BuscarDispositivosUseCase,
        private readonly criarDispositivoUseCase: CriarDispositivoUseCase,
        private readonly deletarDispositivoUseCase: DeletarDispositivoUseCase
    ) {
        super();
    }

    @Delete(':id')
    async delete(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.deletarDispositivoUseCase.delete(id);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

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

    @Put(':id')
    async put(
        @Res() res: ExpressResponse,
        @Body() dto: DispositivoInputDto,
        @Param('id', ParseIntPipe) id: number
    ): Promise<ExpressResponse> {
        const result = await this.atualizarDispositivoUseCase.atualizarDispositivo(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
