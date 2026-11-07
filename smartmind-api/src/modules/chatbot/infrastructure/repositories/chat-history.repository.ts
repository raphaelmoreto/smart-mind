import { Injectable } from '@nestjs/common';
import { IChatHistoryRepository } from '../../domain/interfaces/chat-history.repository.interface.js';

@Injectable()
export class ChatHistoryRepository implements IChatHistoryRepository {

    async salvarMensagem(casaId: string, mensagem: string, resposta: string): Promise<void> {

        // Substituir pela persistência real.
        console.log({
            casaId,
            mensagem,
            resposta,
        });
    }
}