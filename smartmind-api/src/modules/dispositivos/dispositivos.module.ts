import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../core/database/database.module.js';
import { AlterarEstadoDispositivoUseCase } from './application/use-cases/alterar-estado-dispositivo.js';
import { AtualizarDispositivoUseCase } from './application/use-cases/atualizar-dispositivo.js';
import { BuscarDispositivosPorCasaUseCase } from './application/use-cases/buscar-dispositivos-por-casa.js';
import { BuscarDispositivoPorIdUseCase } from './application/use-cases/buscar-dispositivo-por-id.js';
import { BuscarDispositivosUseCase } from './application/use-cases/buscar-dispositivo.js';
import { BuscarTiposDispositivoUseCase } from './application/use-cases/buscar-tipos-dispositivo.js';
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
        AlterarEstadoDispositivoUseCase,
        AtualizarDispositivoUseCase,
        BuscarDispositivoPorIdUseCase,
        BuscarDispositivosUseCase,
        BuscarDispositivosPorCasaUseCase,
        BuscarTiposDispositivoUseCase,
        CriarDispositivoUseCase,
        DeletarDispositivoUseCase,
        { provide: DISPOSITIVO_REPOSITORY, useClass: DispositivoRepository }
    ],
    exports: [DISPOSITIVO_REPOSITORY]
})
export class DispositivoModule {}
