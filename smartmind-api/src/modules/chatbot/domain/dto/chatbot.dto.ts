import { IsNotEmpty, IsString } from 'class-validator';

export class ChatbotInputDto {
    @IsString()
    @IsNotEmpty()
    casaId: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}