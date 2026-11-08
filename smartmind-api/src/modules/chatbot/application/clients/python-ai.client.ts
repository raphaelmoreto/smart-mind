import { Injectable,InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

@Injectable()
export class PythonAiClient {
    private readonly baseUrl = 'http://localhost:8000';

    constructor(
        private readonly httpService: HttpService
    ) {}

    async processarMensagem(mensagem: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/nlu/parse`,
                    {
                        message: mensagem,
                    },
                ),
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
    }) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/ml/predict-consumption`,
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