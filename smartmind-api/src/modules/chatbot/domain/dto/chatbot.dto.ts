import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive,
    IsString, Max, MaxLength, Min, ValidateNested
} from 'class-validator';

export class ChatbotContextDto {
    @IsOptional()
    @IsString()
    device?: string;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    power_watts?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    @Max(24)
    hours_per_day?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(31)
    days_per_month?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    tariff?: number;

    // INTENÇÃO QUE FICOU "EM ABERTO" (O BOT FEZ UMA PERGUNTA E ESTÁ ESPERANDO A RESPOSTA)
    // ⚠️ SEM DECORATOR O ValidationPipe (whitelist: true) APAGARIA ESTE CAMPO
    @IsOptional()
    @IsString()
    pending_intent?: string;

    @IsOptional()
    @IsInt()
    @IsPositive()
    device_id?: number;          // APARELHO CADASTRADO PELO USUÁRIO

    @IsOptional()
    @IsInt()
    @IsPositive()
    device_type_id?: number;    // TIPO (Tipo_Dispositivo.id)
}

export class ChatbotInputDto {
    @ApiProperty()
    @IsInt()
    @IsPositive()
    usuarioId: number;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    casaId: number;

    @ApiPropertyOptional({ description: 'Omitir na primeira mensagem: a API cria a conversa' })
    @IsOptional()
    @IsInt()
    @IsPositive()
    conversaId?: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    message: string;

    @ApiPropertyOptional({ type: ChatbotContextDto })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ChatbotContextDto)
    context?: ChatbotContextDto;
}

// FORMATO PADRÃO DE TODA RESPOSTA DO CHATBOT
export interface ChatbotResposta {
    message: string;
    intent: string;
    confidence?: number;
    entities?: Record<string, unknown>;
    missing?: string[];
    suggestions?: string[];
    result?: Record<string, unknown>;
    quick_replies?: string[];
    context?: Record<string, unknown>;
    conversaId?: number;
}