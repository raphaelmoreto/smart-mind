import { Injectable } from '@nestjs/common';
import { ITarifaRepository } from '../../domain/interfaces/tarifa.repository.interface.js';

// EXEMPLO ILUSTRATIVO
@Injectable()
export class TarifaRepository implements ITarifaRepository {
    async buscarTarifaAtual(casaId: string): Promise<number> {
        return 0.85;
    }
}