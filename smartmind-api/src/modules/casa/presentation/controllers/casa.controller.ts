import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';

import { AtualizarCasaUseCase } from '../../application/use-cases/atualizar-casa.js';
import { BuscarCasaPorIdUseCase } from '../../application/use-cases/buscar-casa-por-id.js';
import { BuscarCasasPorUsuarioUseCase } from '../../application/use-cases/buscar-casas-por-usuario.js';
import { BuscarCasasUseCase } from '../../application/use-cases/buscar-casas.js';
import { CasaInputDto, TarifaInputDto } from '../../domain/dto/casa.dto.js';
import { CriarCasaUseCase } from '../../application/use-cases/criar-casa.js';
import { DeletarCasaUseCase } from '../../application/use-cases/deletar-casa.js';
import { TarifaCasaUseCase } from '../../application/use-cases/tarifa-casa.js';
import type { Response as ExpressResponse } from 'express';

@Controller('api/casa')
export class CasaController extends BaseController {

    constructor (
        private readonly buscarCasasPorUsuarioUseCase: BuscarCasasPorUsuarioUseCase,
        private readonly atualizarCasaUseCase: AtualizarCasaUseCase,
        private readonly buscarCasaPorIdUseCase: BuscarCasaPorIdUseCase,
        private readonly buscarCasaUseCase: BuscarCasasUseCase,
        private readonly criarCasaUseCase: CriarCasaUseCase,
        private readonly deletarCasaUseCase: DeletarCasaUseCase,
        private readonly tarifaCasaUseCase: TarifaCasaUseCase,
    ) { super(); }

    @Delete(":id")
    async delete(@Res() res: ExpressResponse, @Param("id", ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.deletarCasaUseCase.delete(id);

        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Get(":id")
    async getCasaPorId(@Res() res: ExpressResponse, @Param("id", ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.buscarCasaPorIdUseCase.buscaPorId(id);

        return this.mapResponse(200, res, result);
    }

    @Get()
    async getCasas(@Res() res: ExpressResponse): Promise<ExpressResponse> {
        const result = await this.buscarCasaUseCase.buscarCasas();

        return this.mapResponse(200, res, result);
    }

    @Get('usuario/:usuarioId')
    async getCasasDoUsuario(@Res() res: ExpressResponse, @Param('usuarioId', ParseIntPipe) usuarioId: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarCasasPorUsuarioUseCase.buscar(usuarioId));
    }

    @Get(':id/tarifa')
    async getTarifa(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.tarifaCasaUseCase.buscarVigente(id));
    }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: CasaInputDto): Promise<ExpressResponse> {
        const result = await this.criarCasaUseCase.create(dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Post(':id/tarifa')
    async postTarifa(@Res() res: ExpressResponse, @Param('id', ParseIntPipe) id: number, @Body() dto: TarifaInputDto
    ): Promise<ExpressResponse> {
        const result = await this.tarifaCasaUseCase.registrar(id, dto);
        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(":id")
    async put(@Res() res: ExpressResponse, @Body() dto: CasaInputDto, @Param("id", ParseIntPipe) id: number): Promise<ExpressResponse> {
        const result = await this.atualizarCasaUseCase.atualizarCasa(id, dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
