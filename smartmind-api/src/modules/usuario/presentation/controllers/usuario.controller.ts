import { BaseController } from '../../../core/presentation/controllers/base.controller.js';
import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';

import { AtualizarUsuarioUseCase } from '../../application/use-cases/atualizar-usuario.js';
import { BuscarUsuarioPorIdUseCase } from '../../application/use-cases/buscar-usuario-por-id.js';
import { BuscarUsuariosUseCase } from '../../application/use-cases/buscar-usuarios.js';
import { CriarUsuarioUseCase } from '../../application/use-cases/criar-usuario.js';
import { DeletarUsuarioUseCase } from '../../application/use-cases/deletar-usuario.js';
import type { Response as ExpressResponse } from 'express';
import { UsuarioInputDto } from '../../domain/dto/usuario.dto.js';

@Controller("usuario")
export class UsuarioController extends BaseController {
    
    constructor (
        private readonly atualizarUsuarioUseCase: AtualizarUsuarioUseCase,
        private readonly buscarUsuarioPorIdUseCase: BuscarUsuarioPorIdUseCase,
        private readonly buscarUsuariosUseCase: BuscarUsuariosUseCase,
        private readonly deletarUsuarioUseCase: DeletarUsuarioUseCase,
        private readonly criarUsuarioUseCase: CriarUsuarioUseCase
    ) { super(); }

    @Delete(":id")
    async delete(@Res() res: ExpressResponse, @Param("id") id: number) {
        const result = await this.deletarUsuarioUseCase.delete(id);

        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Get(":id")
    async getUsuarioPorId(@Res() res: ExpressResponse, @Param("id") id: number) {
        const result = await this.buscarUsuarioPorIdUseCase.buscaPorId(id);

        return this.mapResponse(200, res, result);
    }

    @Get()
    async getUsuarios(@Res() res: ExpressResponse) {
        const result = await this.buscarUsuariosUseCase.buscarUsuarios();

        return this.mapResponse(200, res, result);
    }

    @Post()
    async post(@Res() res: ExpressResponse, @Body() dto: UsuarioInputDto): Promise<ExpressResponse> {
        const result = await this.criarUsuarioUseCase.create(dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }

    @Put(":id")
    async put(@Res() res: ExpressResponse, @Body() dto: UsuarioInputDto, @Param("id") id: number): Promise<ExpressResponse> {
        const result = await this.atualizarUsuarioUseCase.atualizarUsuario(id, dto);

        return this.mapResponse(result.tipoRetorno, res, result);
    }
}
