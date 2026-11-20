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