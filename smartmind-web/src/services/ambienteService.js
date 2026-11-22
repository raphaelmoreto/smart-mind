import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class AmbienteService extends ApiService {
    constructor() {
        super(new HttpClient(), 'ambiente');
    }

    listarPorCasa(casaId) {
        return this.get(`casa/${casaId}`);
    }

    buscarPorId(id) {
        return this.get(String(id));
    }

    criar(dados) {
        return this.post('', dados);
    }

    atualizar(id, dados) {
        return this.put(String(id), dados);
    }

    remover(id) {
        return this.delete(String(id));
    }
}

export const ambienteService = new AmbienteService();