import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class CasaService extends ApiService {
    constructor() {
        super(new HttpClient(), 'casa');
    }

    buscarPorUsuario(usuarioId) {
        return this.get(`usuario/${usuarioId}`);
    }

    buscarPorId(id) {
        return this.get(String(id));
    }

    cadastrar(dados) {
        return this.post('', dados);
    }

    atualizar(id, dados) {
        return this.put(String(id), dados);
    }

    deletar(id) {
        return this.delete(String(id));
    }

    buscarTarifa(casaId) {
        return this.get(`${casaId}/tarifa`);
    }

    salvarTarifa(casaId, dados) {
        return this.post(`${casaId}/tarifa`, dados);
    }
}

export const casaService = new CasaService();