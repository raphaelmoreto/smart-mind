import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class EnergiaService extends ApiService {
    constructor() {
        super(new HttpClient(), 'energia');
    }

    // CONSUMO DO MÊS, PROJEÇÃO, TARIFA VIGENTE, ÚLTIMA PREVISÃO E CONSUMO MEDIDO POR APARELHO
    buscarResumo(casaId) {
        return this.get(`casa/${casaId}/resumo`);
    }

    // periodo: "dia" (24 h) | "semana" (7 dias) | "ano" (12 meses)
    buscarSerie(casaId, periodo) {
        return this.get(`casa/${casaId}/serie?periodo=${periodo}`);
    }

    // RODA A IA E GRAVA NA TABELA "Previsoes"
    prever(casaId) {
        return this.post(`casa/${casaId}/previsao`, {});
    }
}

export const energiaService = new EnergiaService();