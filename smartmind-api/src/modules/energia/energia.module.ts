import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { DatabaseModule } from '../core/database/database.module.js';
import { PythonAiClient } from '../chatbot/application/clients/python-ai.client.js';
import { ENERGIA_REPOSITORY } from './energia.constants.js';
import { BuscarResumoEnergiaUseCase } from './application/use-cases/buscar-resumo-energia.js';
import { BuscarSerieConsumoUseCase } from './application/use-cases/buscar-serie-consumo.js';
import { PreverConsumoUseCase } from './application/use-cases/prever-consumo.js';
import { EnergiaRepository } from './infrastructure/repositories/energia.repository.js';
import { EnergiaController } from './presentation/controllers/energia.controller.js';

@Module({
    imports: [
        HttpModule.register({ timeout: 10000 }),
        DatabaseModule,
    ],
    controllers: [EnergiaController],
    providers: [
        BuscarResumoEnergiaUseCase,
        BuscarSerieConsumoUseCase,
        PreverConsumoUseCase,
        PythonAiClient,
        { provide: ENERGIA_REPOSITORY, useClass: EnergiaRepository },
    ],
    // O CHATBOT USA A MESMA PREVISÃO
    exports: [PreverConsumoUseCase],
})
export class EnergiaModule {}