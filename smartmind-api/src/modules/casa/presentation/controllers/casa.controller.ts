import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';

import { AtualizarCasaUseCase } from '../../application/use-cases/atualizar-casa.js';
import { BuscarCasaPorIdUseCase } from '../../application/use-cases/buscar-casa-por-id.js';
import { BuscarCasasUseCase } from '../../application/use-cases/buscar-casas.js';
import { CasaInputDto } from '../../domain/dto/casa.dto.js';
import { CriarCasaUseCase } from '../../application/use-cases/criar-casa.js';
import { DeletarCasaUseCase } from '../../application/use-cases/deletar-casa.js';
import type { Response as ExpressResponse } from 'express';

@Controller('casa')
export class CasaController extends BaseController {

    constructor (
        private readonly atualizarCasaUseCase: AtualizarCasaUseCase,
        private readonly buscarCasaPorIdUseCase: BuscarCasaPorIdUseCase,
        private readonly buscarCasaUseCase: BuscarCasasUseCase,
        private readonly criarCasaUseCase: CriarCasaUseCase,
        private readonly deletarCasaUseCase: DeletarCasaUseCase 
    ) { super(); }

    @Delete(":id")
    async delete(@Res() res: ExpressResponse, @Param("id") id: number): Promise<ExpressResponse> {
        const result = await this.deletarCasaUseCase.delete(id);

        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Get(":id")
    async getCasaPorId(@Res() res: ExpressResponse, @Param("id") id: number): Promise<ExpressResponse> {
        const result = await this.buscarCasaPorIdUseCase.buscaPorId(id);

        return this.mapResponse(200, res, result);
    }

    @Get()
    async getCasas(@Res() res: ExpressResponse): Promise<ExpressResponse> {
        const result = await this.buscarCasaUseCase.buscarCasas();

        return this.mapResponse(200, res, result);
    }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: CasaInputDto): Promise<ExpressResponse> {
        const result = await this.criarCasaUseCase.create(dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(":id")
    async put(@Res() res: ExpressResponse, @Body() dto: CasaInputDto, @Param("id") id: number): Promise<ExpressResponse> {
        const result = await this.atualizarCasaUseCase.atualizarCasa(id, dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
