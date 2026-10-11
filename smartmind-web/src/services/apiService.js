
import { BaseService } from './baseService.js';

export class ApiService extends BaseService {
    constructor(http, route) {
        super(http, route);
    }

    buildUrl(endpoint = '') {
        const path = String(endpoint)
            .replace(/^\/+|\/+$/g, '');

        return path
            ? `${this.baseUrl}/${path}`
            : this.baseUrl;
    }

    get(endpoint = '') {
        return this.http.get(this.buildUrl(endpoint));
    }

    post(endpoint = '', body) {
        return this.http.post(this.buildUrl(endpoint), body);
    }

    put(endpoint = '', body) {
        return this.http.put(this.buildUrl(endpoint), body);
    }

    delete(endpoint = '') {
        return this.http.delete(this.buildUrl(endpoint));
    }
}
