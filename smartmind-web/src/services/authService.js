
import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class AuthService extends ApiService {
    constructor() {
        super(new HttpClient(), '');
    }

    async login(usuario, senha) {
        const result = await this.post('login', {
            usuario,
            senha
        });

        if (
            !result ||
            result.id == null ||
            !result.nome ||
            !result.role
        ) {
            throw new Error(
                'A API retornou dados de login ausentes ou inválidos.'
            );
        }

        return result;
    }

    saveSession(result) {
        const user = {
            id: result.id,
            nome: result.nome,
            role: result.role
        };

        sessionStorage.setItem('user', JSON.stringify(user));
    }

    getCurrentUser() {
        const user = sessionStorage.getItem('user');

        if (!user) {
            return null;
        }

        try {
            return JSON.parse(user);
        } catch {
            sessionStorage.removeItem('user');
            return null;
        }
    }

    logout() {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
    }
}

export const authService = new AuthService();
