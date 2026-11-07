import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsumoCalculatorUseCase {

    calcular(potenciaWatts: number, horasPorDia: number, diasPorMes: number, tarifa: number) {
        const consumoKwh = (potenciaWatts / 1000) * horasPorDia * diasPorMes;
        const custo = consumoKwh * tarifa;

        return {
            consumoKwh,
            custo,
        };
    }
}