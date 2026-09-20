import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsString, IsPositive } from 'class-validator';
import { UsuarioEntity } from '../entities/usuario.entity.js';

export class UsuarioInputDto {

    @ApiProperty()
    @IsString()
    // @IsNotEmpty()
    nome: string;

    @ApiProperty()
    @IsString()
    // @IsNotEmpty()
    usuario: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    senha: string;

    @ApiProperty()
    @IsInt()
    // @IsPositive()
    fk_perfil: number;
}

export class UsuarioOutputDto {

    @ApiProperty()
    id: number;

    @ApiProperty()
    nome: string;

    @ApiProperty()
    usuario: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    perfil: string;

    @ApiProperty()
    status: string;
}