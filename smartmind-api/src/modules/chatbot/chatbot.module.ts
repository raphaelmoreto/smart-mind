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

import { DicaEconomiaRepository } from './infrastructure/repositories/dica-economia.repository.js';
import { ConsumoRepository } from './infrastructure/repositories/consumo.repository.js';
import { ChatHistoryRepository } from './infrastructure/repositories/chat-history.repository.js';
import { TarifaRepository } from './infrastructure/repositories/tarifa.repository.js';
import { TARIFA_REPOSITORY, CONSUMO_REPOSITORY, CHAT_HISTORY_REPOSITORY, DICA_ECONOMIA_REPOSITORY } from './chatbot.constants.js';

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
        { provide: DICA_ECONOMIA_REPOSITORY, useClass: DicaEconomiaRepository }
    ],
    exports: [ChatbotUseCase],
})
export class ChatbotModule {}