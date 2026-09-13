import { DatabaseModule } from './../core/database/database.module.js';
import { Module } from '@nestjs/common';
import { CriarUsuarioUseCase } from './application/use-cases/criar-usuario/criar-usuario.use-case.js';
import { UsuarioController } from './presentation/controllers/usuario.controller.js';
import { USUARIO_REPOSITORY } from './usuario.constants.js';
import { UsuarioRepository } from './infrastructure/repositories/usuario.repository.js';

@Module({
    imports: [
        DatabaseModule
    ],
    controllers: [
        UsuarioController
    ],
    providers: [
        CriarUsuarioUseCase,
        { provide: USUARIO_REPOSITORY, useClass: UsuarioRepository }
    ],
    exports: []
})
export class UsuarioModule {}
