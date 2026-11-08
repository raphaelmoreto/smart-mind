import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class UsuarioService extends ApiService {
    constructor() {
        super(new HttpClient(), '');
    }

    async cadastrar(dados) {
        return await this.post('usuario', dados);
    }

    async buscarPorId(id) {
        return await this.get(`usuario/${id}`);
    }

    async buscarTodos() {
        return await this.get('usuario');
    }

    async atualizar(id, dados) {
        return await this.put(`usuario/${id}`, dados);
    }

    async deletar(id) {
        return await this.delete(`usuario/${id}`);
    }
}

export const usuarioService = new UsuarioService();