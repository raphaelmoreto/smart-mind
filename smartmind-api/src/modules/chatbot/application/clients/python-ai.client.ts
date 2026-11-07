import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

@Injectable()
export class PythonAiClient {
    constructor(private readonly httpService: HttpService) {}

    async processarMensagem(mensagem: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'http://localhost:8000/nlu/parse',
                    {
                        message: mensagem,
                    },
                ),
            );

            return response.data;

        } catch (error: unknown) {
            // if (isAxiosError(error)) {
            //     console.log(
            //         'Status HTTP:',
            //         error.response?.status,
            //     );

            //     console.log(
            //         'Erro retornado pelo Python:',
            //         JSON.stringify(error.response?.data, null, 2),
            //     );

            //     console.log(
            //         'Payload enviado:',
            //         error.config?.data,
            //     );
            // } else {
            //     console.log('Erro inesperado:', error);
            // }

            // throw error;
        }
    }
}