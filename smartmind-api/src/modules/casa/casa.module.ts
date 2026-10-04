import { DatabaseModule } from '../core/database/database.module.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioModule } from '../usuario/usuario.module.js';

import { AtualizarCasaUseCase } from './application/use-cases/atualizar-casa.js';
import { BuscarCasasUseCase } from './application/use-cases/buscar-casas.js';
import { BuscarCasaPorIdUseCase } from './application/use-cases/buscar-casa-por-id.js';
import { CasaController } from './presentation/controllers//casa.controller.js';
import { CasaEntity } from './domain/entities/casa.entity.js';
import { CASA_REPOSITORY } from './casa.constants.js';
import { CasaRepository } from './infrastructure/repositories/casa.repository.js';
import { CriarCasaUseCase } from './application/use-cases/criar-casa.js';
import { DeletarCasaUseCase } from './application/use-cases/deletar-casa.js';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([CasaEntity]),
        UsuarioModule
    ],
    controllers: [
        CasaController
    ],
    providers: [
        AtualizarCasaUseCase,
        BuscarCasasUseCase,
        BuscarCasaPorIdUseCase,
        CasaRepository,
        CriarCasaUseCase,
        DeletarCasaUseCase,
        { provide: CASA_REPOSITORY, useClass: CasaRepository }
    ],
})
export class CasaModule {}
