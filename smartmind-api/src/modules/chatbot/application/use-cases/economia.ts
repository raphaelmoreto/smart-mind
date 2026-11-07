import { Injectable } from '@nestjs/common';

@Injectable()
export class EconomiaUseCase {

    sugerirEconomia(dispositivo: string, horasPorDia: number): string[] {
        const sugestoes: string[] = [];

        if (horasPorDia >= 8) {
            sugestoes.push(
                `Reduza o tempo de utilização do ${dispositivo}, se possível.`,
            );
        }

        if (dispositivo.toLowerCase().includes('ar-condicionado')) {
            sugestoes.push(
                'Mantenha os filtros limpos e utilize uma temperatura adequada.',
            );
        }

        if (sugestoes.length === 0) {
            sugestoes.push(
                'Continue monitorando o consumo para identificar oportunidades de economia.',
            );
        }

        return sugestoes;
    }
}