import { Controller, Get, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { Response } from '../../../core/application/response/response.js';
import { BuscarResumoEnergiaUseCase } from '../../application/use-cases/buscar-resumo-energia.js';
import { BuscarSerieConsumoUseCase } from '../../application/use-cases/buscar-serie-consumo.js';
import { PreverConsumoUseCase } from '../../application/use-cases/prever-consumo.js';
import { SerieQueryDto } from '../../domain/dto/energia.dto.js';

@Controller('api/energia')
export class EnergiaController extends BaseController {

    constructor(
        private readonly buscarResumoUseCase: BuscarResumoEnergiaUseCase,
        private readonly buscarSerieUseCase: BuscarSerieConsumoUseCase,
        private readonly preverConsumoUseCase: PreverConsumoUseCase,
    ) {
        super();
    }

    // CARDS DA PÁGINA: CONSUMO DO MÊS, PROJEÇÃO, TARIFA, ÚLTIMA PREVISÃO, MEDIDO POR APARELHO
    @Get('casa/:casaId/resumo')
    async resumo(@Res() res: ExpressResponse, @Param('casaId', ParseIntPipe) casaId: number): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarResumoUseCase.buscar(casaId));
    }

    // GRÁFICO: ?periodo=dia | semana | ano
    @Get('casa/:casaId/serie')
    async serie(
        @Res() res: ExpressResponse,
        @Param('casaId', ParseIntPipe) casaId: number,
        @Query() query: SerieQueryDto
    ): Promise<ExpressResponse> {
        return this.mapResponse(200, res, await this.buscarSerieUseCase.buscar(casaId, query.periodo));
    }

    // RODA O MODELO DE IA E GRAVA EM "Previsoes"
    @Post('casa/:casaId/previsao')
    async prever(@Res() res: ExpressResponse, @Param('casaId', ParseIntPipe) casaId: number): Promise<ExpressResponse> {
        const result = await this.preverConsumoUseCase.executar(casaId);
        if (result instanceof Response) {
            return this.mapResponse(result.tipoRetorno, res, result);
        }
        return this.mapResponse(200, res, result);
    }
}