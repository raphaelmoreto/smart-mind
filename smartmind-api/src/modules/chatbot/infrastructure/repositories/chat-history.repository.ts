import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
    ConversaOutput, IChatHistoryRepository, MensagemOutput, SalvarMensagemInput
} from '../../domain/interfaces/chat-history.repository.interface.js';

@Injectable()
export class ChatHistoryRepository implements IChatHistoryRepository {

    constructor(private readonly dataSource: DataSource) {}

    async casaPertenceAoUsuario(casaId: number, usuarioId: number): Promise<boolean> {
        const result = await this.dataSource.query(
            `SELECT 1 FROM "Casa" WHERE id = $1 AND fk_usuario = $2 AND ativo = TRUE`,
            [casaId, usuarioId]
        );
        return result.length > 0;
    }

    async conversaPertenceAoUsuario(conversaId: number, usuarioId: number): Promise<boolean> {
        const result = await this.dataSource.query(
            `SELECT 1 FROM "Chat_Conversa" WHERE id = $1 AND fk_usuario = $2 AND ativo = TRUE`,
            [conversaId, usuarioId]
        );
        return result.length > 0;
    }

    async criarConversa(usuarioId: number, casaId: number, titulo: string): Promise<number> {
        const result = await this.dataSource.query(
            `INSERT INTO "Chat_Conversa" (titulo, fk_usuario, fk_casa)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [titulo, usuarioId, casaId]
        );
        return result[0].id;
    }

    // MENSAGEM + ATUALIZAÇÃO DA DATA DA CONVERSA NA MESMA TRANSAÇÃO
    async salvarMensagem(input: SalvarMensagemInput): Promise<number> {
        return this.dataSource.transaction(async (manager) => {
            const result = await manager.query(
                `INSERT INTO "Chat_Mensagem"
                    (mensagem, resposta, intencao, dados, fk_usuario, fk_casa, fk_conversa)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    input.mensagem,
                    input.resposta,
                    input.intencao,
                    input.dados ? JSON.stringify(input.dados) : null,
                    input.usuarioId,
                    input.casaId,
                    input.conversaId
                ]
            );

            await manager.query(
                `UPDATE "Chat_Conversa" SET dt_ultima_mensagem = CURRENT_TIMESTAMP WHERE id = $1`,
                [input.conversaId]
            );

            return result[0].id;
        });
    }

    async listarConversas(usuarioId: number): Promise<ConversaOutput[]> {
        return this.dataSource.query(
            `SELECT cc.id,
                    cc.titulo,
                    cc.dt_inicio,
                    cc.dt_ultima_mensagem,
                    COUNT(cm.id)::int AS total_mensagens
             FROM "Chat_Conversa" cc
             LEFT JOIN "Chat_Mensagem" cm ON cm.fk_conversa = cc.id
             WHERE cc.fk_usuario = $1
               AND cc.ativo = TRUE
             GROUP BY cc.id
             ORDER BY cc.dt_ultima_mensagem DESC`,
            [usuarioId]
        );
    }

    async listarMensagens(conversaId: number): Promise<MensagemOutput[]> {
        return this.dataSource.query(
            `SELECT id, mensagem, resposta, intencao, dados, dt_mensagem
             FROM "Chat_Mensagem"
             WHERE fk_conversa = $1
             ORDER BY dt_mensagem ASC, id ASC`,
            [conversaId]
        );
    }

    async excluirConversa(conversaId: number, usuarioId: number): Promise<boolean> {
        const result = await this.dataSource.query(
            `UPDATE "Chat_Conversa"
             SET ativo = FALSE, dt_exclusao = CURRENT_TIMESTAMP
             WHERE id = $1 AND fk_usuario = $2 AND ativo = TRUE`,
            [conversaId, usuarioId]
        );
        return result[1] === 1;
    }
}