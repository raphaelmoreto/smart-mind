export interface SalvarMensagemInput {
    conversaId: number;
    usuarioId: number;
    casaId: number;
    mensagem: string;
    resposta: string;
    intencao: string | null;
    dados: Record<string, unknown> | null;
}

export interface ConversaOutput {
    id: number;
    titulo: string;
    dt_inicio: Date;
    dt_ultima_mensagem: Date;
    total_mensagens: number;
}

export interface MensagemOutput {
    id: number;
    mensagem: string;
    resposta: string;
    intencao: string | null;
    dados: Record<string, unknown> | null;
    dt_mensagem: Date;
}

export interface IChatHistoryRepository {
    casaPertenceAoUsuario(casaId: number, usuarioId: number): Promise<boolean>;
    conversaPertenceAoUsuario(conversaId: number, usuarioId: number): Promise<boolean>;
    criarConversa(usuarioId: number, casaId: number, titulo: string): Promise<number>;
    salvarMensagem(input: SalvarMensagemInput): Promise<number>;
    listarConversas(usuarioId: number): Promise<ConversaOutput[]>;
    listarMensagens(conversaId: number): Promise<MensagemOutput[]>;
    excluirConversa(conversaId: number, usuarioId: number): Promise<boolean>;
}