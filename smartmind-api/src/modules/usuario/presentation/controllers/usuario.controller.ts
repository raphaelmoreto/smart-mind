import { Body, Controller, Post } from '@nestjs/common';
import { CriarUsuarioUseCase } from '../../application/use-cases/criar-usuario/criar-usuario.use-case.js';
import { Response } from '../../../core/application/response/response.js';
import { UsuarioInputDto } from '../../domain/dto/usuario.dto.js';
import { ResponseHttpMapper } from '../../../core/presentation/mappers/response-http.mapper.js';

@Controller('usuario')
export class UsuarioController {
    
    constructor (
        private readonly criarUsuarioUseCase: CriarUsuarioUseCase
    ) { }

    @Post()
    async post(@Body() dto: UsuarioInputDto): Promise<Response> {
        const result = await this.criarUsuarioUseCase.create(dto);
        return ResponseHttpMapper.map(result);
    }
}
