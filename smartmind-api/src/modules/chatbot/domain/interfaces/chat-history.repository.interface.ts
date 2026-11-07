export interface IChatHistoryRepository {
    salvarMensagem(casaId: string, mensagem: string, resposta: string): Promise<void>;
}