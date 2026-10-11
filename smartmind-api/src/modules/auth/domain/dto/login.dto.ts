import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginInputDto {

    @ApiProperty()
    @IsString()
    usuario: string;

    @ApiProperty()
    @IsString()
    senha: string;
}

export class LoginOutputDto {

    @ApiProperty()
    id: number;

    @ApiProperty()
    nome: string;

    @ApiProperty()
    role: string;
}