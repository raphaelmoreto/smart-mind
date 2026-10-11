import { DatabaseModule } from '../core/database/database.module.js';
import { Module } from '@nestjs/common';

import { AuthController } from './presentation/controllers/auth.controller.js';
import { AUTH_REPOSITORY } from './auth.constants.js';
import { AuthRepository } from './infrastructure/repositories/auth.repository.js';
import { ValidarLoginUseCase } from './application/use-cases/validar-login.js';

@Module({
    imports: [
        DatabaseModule
    ],
    controllers: [
        AuthController
    ],
    providers: [
        { provide: AUTH_REPOSITORY, useClass: AuthRepository },
        ValidarLoginUseCase
    ]
})
export class AuthModule {}