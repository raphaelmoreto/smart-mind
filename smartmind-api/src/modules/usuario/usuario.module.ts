import { DatabaseModule } from './../core/database/database.module.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AtualizarUsuarioUseCase } from './application/use-cases/atualizar-usuario.js';
import { BuscarUsuarioPorIdUseCase } from './application/use-cases/buscar-usuario-por-id.js';
import { BuscarUsuariosUseCase } from './application/use-cases/buscar-usuarios.js';
import { CriarUsuarioUseCase } from './application/use-cases/criar-usuario.js';
import { DeletarUsuarioUseCase } from './application/use-cases/deletar-usuario.js';
import { UsuarioController } from './presentation/controllers/usuario.controller.js';
import { UsuarioEntity } from './domain/entities/usuario.entity.js';
import { USUARIO_REPOSITORY } from './usuario.constants.js';
import { UsuarioRepository } from './infrastructure/repositories/usuario.repository.js';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([UsuarioEntity])
    ],
    controllers: [
        UsuarioController
    ],
    providers: [
        CriarUsuarioUseCase,
        { provide: USUARIO_REPOSITORY, useClass: UsuarioRepository },
        DeletarUsuarioUseCase,
        BuscarUsuarioPorIdUseCase,
        BuscarUsuariosUseCase,
        AtualizarUsuarioUseCase
    ],
    exports: []
})
export class UsuarioModule {}
