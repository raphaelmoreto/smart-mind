import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotInputDto } from '../../domain/dto/chatbot.dto.js';
import { ChatbotUseCase } from '../../application/use-cases/chatbot.js';
import { BaseController } from '../../../core/presentation/controllers/base.controller.js';

@Controller('api/chatbot')
export class ChatbotController extends BaseController {

    constructor(
        private readonly chatbotUseCase: ChatbotUseCase,
    ) { super(); }

    @Post('mensagem')
    async enviarMensagem(@Body() body: ChatbotInputDto) {
        return this.chatbotUseCase.executar(
            body.casaId,
            body.message,
        );
    }
}