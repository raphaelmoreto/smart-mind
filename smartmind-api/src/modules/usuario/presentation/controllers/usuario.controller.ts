import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { Body, Controller, Delete, Post, Res } from '@nestjs/common';
import { CriarUsuarioUseCase } from '../../application/use-cases/criar-usuario/criar-usuario.use-case.js';
import type { Response as ExpressResponse } from 'express';
import { UsuarioInputDto } from '../../domain/dto/usuario.dto.js';

@Controller('usuario')
export class UsuarioController extends BaseController {
    
    constructor (
        private readonly criarUsuarioUseCase: CriarUsuarioUseCase
    ) { super(); }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: UsuarioInputDto): Promise<ExpressResponse> {
        const result = await this.criarUsuarioUseCase.create(dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
