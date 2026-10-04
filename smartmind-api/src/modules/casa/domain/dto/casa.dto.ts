import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CasaInputDto {

    @ApiProperty()
    @IsString()
    nome: string;

    @ApiProperty()
    @IsString()
    rua: string;

    @ApiProperty()
    @IsString()
    bairro: string;

    @ApiProperty()
    @IsString()
    cidade: string;

    @ApiProperty()
    @IsString()
    numero: string;

    @ApiProperty()
    @IsString()
    cep: string;

    @ApiProperty()
    @IsInt()
    fk_usuario: number;
}

export class CasaOutputDto {

    @ApiProperty()
    id: number;

    @ApiProperty()
    nome: string;

    @ApiProperty()
    rua: string;

    @ApiProperty()
    bairro: string;

    @ApiProperty()
    cidade: string;

    @ApiProperty()
    numero: string;

    @ApiProperty()
    cep: string;

    @ApiProperty()
    proprietario: string;

    @ApiProperty()
    status: string;
}