import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsString, IsPositive } from 'class-validator';

export class UsuarioInputDto {

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

    @ApiProperty()
    @IsString()
    senha: string;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_perfil: number;
}