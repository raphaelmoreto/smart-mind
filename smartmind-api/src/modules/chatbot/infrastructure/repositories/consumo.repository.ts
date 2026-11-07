import { Injectable } from '@nestjs/common';
import { IConsumoRepository } from '../../domain/interfaces/consumo.repository.interface.js';

@Injectable()
export class ConsumoRepository implements IConsumoRepository {

    async salvarConsumo(casaId: string, dispositivoId: string, consumoKwh: number, custo: number): Promise<void> {

        // Substituir pela persistência real.
        console.log({
            casaId,
            dispositivoId,
            consumoKwh,
            custo,
        });
    }
}