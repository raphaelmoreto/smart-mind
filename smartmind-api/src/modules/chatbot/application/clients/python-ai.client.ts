import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

// TIPOS E APARELHOS QUE O PYTHON DEVE PROCURAR NA FRASE
export interface CatalogoNlu {
    types: { id: number; nome: string; sinonimos: string[] }[];
    devices: { id: number; nome: string; tipo_id: number }[];
}

@Injectable()
export class PythonAiClient {

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    private get baseUrl(): string {
        return this.configService.get<string>('AI_URL') ?? 'http://localhost:8000';
    }

    async processarMensagem(mensagem: string, catalogo?: CatalogoNlu) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/nlu/parse`, {
                    message: mensagem,
                    catalog: catalogo,
                }),
            );
            return response.data;
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                console.log(
                    'Erro na comunicação com SmartMind AI: ',
                    error.response?.data ?? error.message,
                );
            } else {
                console.error('Erro inesperado ao comunicar com Python: ', error);
            }

            throw new InternalServerErrorException(
                'Não foi possível processar a mensagem pelo serviço de IA'
            );
        }
    }

    async predictConsumption(data: {
        consumo_mes: number;
        media_3_meses: number;
        tendencia: number;
        temperatura_media: number;
        mes: number;
        bandeira: string;
    }): Promise<{ consumo_previsto: number }> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/ml/predict`,
                    data
                )
            );

            return response.data;

        } catch (error: unknown) {
            if (isAxiosError(error)) {
                console.error(
                    'Erro na previsão de consumo:',
                    error.response?.data ?? error.message
                );
            }

            throw new InternalServerErrorException(
                'Não foi possível realizar a previsão de consumo.'
            );
        }
    }
}