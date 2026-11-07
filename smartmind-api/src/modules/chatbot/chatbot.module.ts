import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ChatbotController } from './presentation/controllers/chatbot.controller.js';

import { ChatbotUseCase } from './application/use-cases/chatbot.js';
import { ConsumoCalculatorUseCase } from './application/use-cases/consumo-calculator.js';
import { EconomiaUseCase } from './application/use-cases/economia.js';
import { PythonAiClient } from './application/clients/python-ai.client.js';

import { TarifaRepository } from './infrastructure/repositories/tarifa.repository.js';
import { ConsumoRepository } from './infrastructure/repositories/consumo.repository.js';
import { ChatHistoryRepository } from './infrastructure/repositories/chat-history.repository.js';

import {TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY } from './chatbot.constants.js';

@Module({
    imports: [
        HttpModule,
    ],
    controllers: [
        ChatbotController,
    ],
    providers: [
        ChatbotUseCase,
        ConsumoCalculatorUseCase,
        EconomiaUseCase,
        PythonAiClient,
        { provide: TARIFA_REPOSITORY, useClass: TarifaRepository },
        { provide: CONSUMO_REPOSITORY, useClass: ConsumoRepository },
        { provide: CHAT_HISTORY_REPOSITORY, useClass: ChatHistoryRepository },
    ],
    exports: [
        ChatbotUseCase,
    ],
})
export class ChatbotModule {}