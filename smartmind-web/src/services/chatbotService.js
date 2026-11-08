import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class ChatbotService extends ApiService {
    constructor () { super(new HttpClient(), ''); }

    async enviarMensagem(casaId, mensagem) {
        return await this.post('/chatbot/mensagem', { casaId, message: mensagem });
    }
}

export const chatbotService = new ChatbotService();