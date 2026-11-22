import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../core/database/database.module.js';
import { AMBIENTE_REPOSITORY } from './ambiente.constants.js';
import { AtualizarAmbienteUseCase } from './application/use-cases/atualizar-ambiente.js';
import { BuscarAmbientePorIdUseCase } from './application/use-cases/buscar-ambiente-por-id.js';
import { BuscarAmbientesPorCasaUseCase } from './application/use-cases/buscar-ambientes-por-casa.js';
import { CriarAmbienteUseCase } from './application/use-cases/criar-ambiente.js';
import { DeletarAmbienteUseCase } from './application/use-cases/deletar-ambiente.js';
import { AmbienteEntity } from './domain/entities/ambiente.entity.js';
import { AmbienteRepository } from './infrastructure/repositories/ambiente.repository.js';
import { AmbienteController } from './presentation/controllers/ambiente.controller.js';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([AmbienteEntity])
    ],
    controllers: [AmbienteController],
    providers: [
        AtualizarAmbienteUseCase,
        BuscarAmbientePorIdUseCase,
        BuscarAmbientesPorCasaUseCase,
        CriarAmbienteUseCase,
        DeletarAmbienteUseCase,
        { provide: AMBIENTE_REPOSITORY, useClass: AmbienteRepository }
    ],
    exports: [AMBIENTE_REPOSITORY]
})
export class AmbienteModule {}