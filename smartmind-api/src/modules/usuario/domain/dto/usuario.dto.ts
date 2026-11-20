import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsString, IsPositive, MinLength } from 'class-validator';

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

export class AtualizarPerfilDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    nome: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    usuario: string;

    @ApiProperty()
    @IsEmail()
    email: string;
}

export class AlterarSenhaDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    senhaAtual: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    senhaNova: string;
}