import { ApiService } from './apiService.js';
import { HttpClient } from '../infrastructure/http-client.js';

class ChatbotService extends ApiService {
    constructor() {
        super(new HttpClient(), 'chatbot');
    }

    // conversaId e contexto são opcionais: JSON.stringify ignora "undefined"
    enviarMensagem({ usuarioId, casaId, conversaId, mensagem, contexto }) {
        return this.post('mensagem', {
            usuarioId,
            casaId,
            conversaId: conversaId ?? undefined,
            message: mensagem,
            context: contexto ?? undefined
        });
    }

    listarConversas(usuarioId) {
        return this.get(`conversas/usuario/${usuarioId}`);
    }

    listarMensagens(conversaId, usuarioId) {
        return this.get(`conversas/${conversaId}/mensagens?usuarioId=${usuarioId}`);
    }

    excluirConversa(conversaId, usuarioId) {
        return this.delete(`conversas/${conversaId}?usuarioId=${usuarioId}`);
    }
}

export const chatbotService = new ChatbotService();