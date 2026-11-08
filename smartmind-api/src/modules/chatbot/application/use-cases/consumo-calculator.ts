import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsumoCalculatorUseCase {

    calcularConsumo(potenciaWatts: number, horasPorDia: number, diasPorMes: number) {
        const consumoKwh = (potenciaWatts / 1000) * horasPorDia * diasPorMes;
        return Number(consumoKwh.toFixed(2))
    }

    calcularCusto(consumoKwh: number, tarifa: number) {
        const custo = consumoKwh * tarifa;
        return Number(custo.toFixed(2));
    }
}