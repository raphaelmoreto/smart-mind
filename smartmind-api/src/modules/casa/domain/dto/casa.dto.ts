import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsIn, IsNumber, IsOptional, Min, IsString } from 'class-validator';

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

export class TarifaInputDto {
    @ApiProperty({ example: 0.75 })
    @IsNumber()
    @Min(0.01)
    valor_kwh: number;

    @ApiProperty({ enum: ['VERDE', 'AMARELA', 'VERMELHA'] })
    @IsIn(['VERDE', 'AMARELA', 'VERMELHA'])
    bandeira: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    valor_adicional_kwh?: number;
}

export class TarifaOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() valor_kwh: number;
    @ApiProperty() bandeira: string;
    @ApiProperty() valor_adicional_kwh: number;
    @ApiProperty() dt_vigencia: Date;
}