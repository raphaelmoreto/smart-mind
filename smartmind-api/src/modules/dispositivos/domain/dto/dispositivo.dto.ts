import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class DispositivoInputDto {
    @ApiProperty()
    @IsString()
    nome: string;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_tipoDispositivo: number;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_casa: number;

    @ApiProperty({ example: 1200 })
    @IsNumber()
    @Min(0.1)
    potencia_watts: number;

    @ApiProperty({ example: 4 })
    @IsNumber()
    @Min(0)
    @Max(24)
    horas_uso_dia: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    ligado?: boolean;

    @ApiPropertyOptional({ description: 'URL ou data URL (base64) da foto' })
    @IsOptional()
    @IsString()
    @MaxLength(3_000_000)
    foto_url?: string;
}

export class AlterarEstadoDispositivoDto {
    @ApiProperty()
    @IsBoolean()
    ligado: boolean;
}

export class DispositivoOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() nome: string;
    @ApiProperty() fk_tipoDispositivo: number;
    @ApiProperty() tipo: string;
    @ApiProperty() fk_casa: number;
    @ApiProperty() casa: string;
    @ApiProperty() potencia_watts: number;
    @ApiProperty() horas_uso_dia: number;
    @ApiProperty() ligado: boolean;
    @ApiProperty({ nullable: true }) foto_url: string | null;
    @ApiProperty() dt_cadastro: Date;
    @ApiProperty({ nullable: true }) dt_ultima_conexao: Date | null;
    @ApiProperty() status: string;
}

export class TipoDispositivoOutputDto {
    @ApiProperty() id: number;
    @ApiProperty() tipo: string;
}