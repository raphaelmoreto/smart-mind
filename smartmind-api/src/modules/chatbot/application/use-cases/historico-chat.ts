import { Inject, Injectable } from '@nestjs/common';
import { CHAT_HISTORY_REPOSITORY } from '../../chatbot.constants.js';
import type {
    ConversaOutput, IChatHistoryRepository, MensagemOutput
} from '../../domain/interfaces/chat-history.repository.interface.js';
import { Response } from '../../../core/application/response/response.js';
import { TipoRetorno } from '../../../core/application/enums/eTipoRetorno.js';

@Injectable()
export class HistoricoChatUseCase {

    constructor(
        @Inject(CHAT_HISTORY_REPOSITORY)
        private readonly chatHistoryRepository: IChatHistoryRepository
    ) {}

    async listarConversas(usuarioId: number): Promise<ConversaOutput[]> {
        return this.chatHistoryRepository.listarConversas(usuarioId);
    }

    async listarMensagens(conversaId: number, usuarioId: number): Promise<MensagemOutput[] | Response> {
        const pertence = await this.chatHistoryRepository.conversaPertenceAoUsuario(conversaId, usuarioId);
        if (!pertence) {
            return Response.erro(TipoRetorno.NotFound, 'conversa não encontrada');
        }
        return this.chatHistoryRepository.listarMensagens(conversaId);
    }

    async excluirConversa(conversaId: number, usuarioId: number): Promise<Response> {
        const excluida = await this.chatHistoryRepository.excluirConversa(conversaId, usuarioId);
        if (!excluida) {
            return Response.erro(TipoRetorno.NotFound, 'conversa não encontrada');
        }
        return Response.ok('conversa excluída com sucesso');
    }
}