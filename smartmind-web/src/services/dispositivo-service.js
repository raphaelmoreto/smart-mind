import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class DispositivoService extends ApiService {
    constructor() {
        super(new HttpClient(), 'dispositivo');
    }

    listarPorCasa(casaId) {
        return this.get(`casa/${casaId}`);
    }

    buscarTipos() {
        return this.get('tipos');
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

    alterarEstado(id, ligado) {
        return this.put(`${id}/estado`, { ligado });
    }

    remover(id) {
        return this.delete(String(id));
    }
}

export const dispositivoService = new DispositivoService();