import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const PERIODOS_SERIE = ['dia', 'semana', 'ano'] as const;
export type PeriodoSerie = (typeof PERIODOS_SERIE)[number];

export class SerieQueryDto {
    @ApiPropertyOptional({ enum: PERIODOS_SERIE, default: 'semana' })
    @IsOptional()
    @IsIn(PERIODOS_SERIE)
    periodo?: PeriodoSerie;
}

export class PontoSerieDto {
    @ApiProperty({ example: 'seg.' }) rotulo: string;
    @ApiProperty() inicio: Date;
    @ApiProperty() kwh: number;
}

export class TarifaVigenteDto {
    @ApiProperty() valor_kwh: number;
    @ApiProperty() valor_adicional_kwh: number;
    @ApiProperty() valor_total_kwh: number;
    @ApiProperty() bandeira: string;
}

export class PrevisaoOutputDto {
    @ApiProperty({ description: 'kWh previstos para o mês de referência' }) consumo_previsto_kwh: number;
    @ApiProperty() valor_estimado: number;
    @ApiProperty() tarifa_kwh: number;
    @ApiProperty() bandeira: string;
    @ApiProperty({ example: '2026-11-01' }) periodo_referencia: string;
    @ApiProperty() modelo: string;
    @ApiProperty() dt_previsao: Date;
}

export class ConsumoDispositivoDto {
    @ApiProperty() dispositivo_id: number;
    @ApiProperty() kwh: number;
}

export class ResumoEnergiaDto {
    @ApiProperty() consumo_mes_atual_kwh: number;
    @ApiProperty() consumo_mes_anterior_kwh: number;
    @ApiProperty({ description: 'Consumo do mês atual projetado até o fim do mês' }) projecao_mes_kwh: number;
    @ApiProperty() dias_no_mes: number;
    @ApiProperty() tarifa: TarifaVigenteDto;
    @ApiProperty({ nullable: true, type: PrevisaoOutputDto }) ultima_previsao: PrevisaoOutputDto | null;
    @ApiProperty({ type: [ConsumoDispositivoDto] }) por_dispositivo: ConsumoDispositivoDto[];
}

export interface ConsumoMensalFechado {
    mes: string;        // 'YYYY-MM'
    total_kwh: number;
}