
import { environment } from '../config/environment.js';

export class BaseService {
    constructor(http, route) {
        if (new.target === BaseService) {
            throw new Error(
                'BaseService não pode ser instanciada diretamente.'
            );
        }

        if (!environment?.apiUrl) {
            throw new Error(
                'URL da API não configurada. Verifique config/environment.js.'
            );
        }

        if (!http) {
            throw new Error(
                'HttpClient não foi informado ao serviço.'
            );
        }

        this.http = http;

        const apiUrl = environment.apiUrl.replace(/\/+$/, '');
        const cleanRoute = String(route ?? '')
            .replace(/^\/+|\/+$/g, '');

        this.baseUrl = cleanRoute
            ? `${apiUrl}/${cleanRoute}`
            : apiUrl;
    }
}
