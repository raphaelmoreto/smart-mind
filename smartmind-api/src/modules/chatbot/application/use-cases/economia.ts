import { Injectable } from '@nestjs/common';

@Injectable()
export class EconomiaUseCase {

    sugerirEconomia(dispositivo: string, consumo: number, horasPorDia: number): string[] {
        const sugestoes: string[] = [];

        const device = dispositivo
            .toLowerCase()
            .trim();

        switch (device) {
            case 'ar-condicionado':
                sugestoes.push(
                    'Configure a temperatura entre 23°C e 25°C, conforme o conforto necessário.'
                );

                sugestoes.push(
                    'Mantenha portas e janelas fechadas durante o funcionamento.'
                );

                sugestoes.push(
                    'Realize a limpeza periódica dos filtros.'
                );

                if (horasPorDia >= 8) {
                    sugestoes.push(
                        'Reduza o tempo de utilização do ar-condicionado, se possível.'
                    );
                }
                break;

            case 'chuveiro':
                sugestoes.push(
                    'Reduza o tempo dos banhos.'
                );

                sugestoes.push(
                    'Utilize uma temperatura adequada ao clima.'
                );
                break;

            case 'geladeira':
                sugestoes.push(
                    'Evite abrir a porta da geladeira frequentemente.'
                );

                sugestoes.push(
                    'Verifique a vedação da porta.'
                );

                sugestoes.push(
                    'Evite colocar alimentos quentes diretamente no interior.'
                );
                break;

            case 'televisao':
                sugestoes.push(
                    'Desligue a televisão quando não estiver sendo utilizada.'
                );

                sugestoes.push(
                    'Utilize o modo de economia de energia quando disponível.'
                );
                break;

            case 'microondas':
                sugestoes.push(
                    'Evite deixar o aparelho ligado sem necessidade.'
                );
                break;

            case 'ventilador':
                sugestoes.push(
                    'Desligue o ventilador quando não houver ninguém no ambiente.'
                );
                break;

            case 'computador':
                sugestoes.push(
                    'Utilize o modo de economia de energia quando disponível.'
                );

                sugestoes.push(
                    'Desligue o computador quando não estiver em uso.'
                );
                break;

            default:
                sugestoes.push(
                    'Continue monitorando o consumo para identificar oportunidades de economia.'
                );
        }

        return sugestoes;
    }
}