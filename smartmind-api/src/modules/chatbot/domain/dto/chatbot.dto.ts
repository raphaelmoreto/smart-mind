import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested}
    from 'class-validator';

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
}

export class ChatbotInputDto {
    @IsString()
    @IsNotEmpty()
    casaId: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ChatbotContextDto)
    context?: ChatbotContextDto;
}