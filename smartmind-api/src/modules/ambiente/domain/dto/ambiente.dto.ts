import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class AmbienteInputDto {
    @ApiProperty({ example: 'Sala de estar' })
    @IsString()
    @MaxLength(100)
    nome: string;

    @ApiPropertyOptional({ example: 'Conforto e entretenimento' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    descricao?: string;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_casa: number;
}

export class AmbienteOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() nome: string;
    @ApiProperty({ nullable: true }) descricao: string | null;
    @ApiProperty() fk_casa: number;
    @ApiProperty() total_dispositivos: number;
    @ApiProperty() dispositivos_ligados: number;
    @ApiProperty() potencia_ligada_watts: number;
}