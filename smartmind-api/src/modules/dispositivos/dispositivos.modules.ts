import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../core/database/database.module.js';
import { AtualizarDispositivoUseCase } from './application/use-cases/atualizar-dispositivo.js';
import { BuscarDispositivoPorIdUseCase } from './application/use-cases/buscar-dispositivo-por-id.js';
import { BuscarDispositivosUseCase } from './application/use-cases/buscar-dispositivo.js';
import { CriarDispositivoUseCase } from './application/use-cases/criar-dispositivo.js';
import { DeletarDispositivoUseCase } from './application/use-cases/deletar-dispositivo.js';
import { DispositivoEntity } from './domain/entities/dispositivo.entity.js';
import { DispositivoController } from './presentation/controllers/dispositivo.controller.js';
import { DISPOSITIVO_REPOSITORY } from './dispositivos.constants.js';
import { DispositivoRepository } from './infrastructure/repositories/dispositivo.repository.js';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([DispositivoEntity])
    ],
    controllers: [DispositivoController],
    providers: [
        AtualizarDispositivoUseCase,
        BuscarDispositivoPorIdUseCase,
        BuscarDispositivosUseCase,
        CriarDispositivoUseCase,
        DeletarDispositivoUseCase,
        DispositivoRepository,
        { provide: DISPOSITIVO_REPOSITORY, useClass: DispositivoRepository }
    ],
    exports: [DISPOSITIVO_REPOSITORY]
})
export class DispositivoModule {}
