function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ChatSidebar({ conversas, conversaAtivaId, carregando, onSelecionar, onNova, onExcluir }) {
    return (
        <aside className="chat-sidebar" aria-label="Histórico de conversas">
            <button type="button" className="chat-new-button" onClick={onNova}>
                + Nova conversa
            </button>

            <p className="chat-sidebar-label">Conversas recentes</p>

            {carregando ? (
                <p className="chat-sidebar-empty">Carregando…</p>
            ) : conversas.length === 0 ? (
                <p className="chat-sidebar-empty">Nenhuma conversa ainda.</p>
            ) : (
                <ul className="chat-conversation-list">
                    {conversas.map((conversa) => (
                        <li key={conversa.id} className={conversa.id === conversaAtivaId ? "active" : ""}>
                            <button
                                type="button"
                                className="chat-conversation-item"
                                onClick={() => onSelecionar(conversa.id)}
                                aria-current={conversa.id === conversaAtivaId ? "true" : undefined}
                            >
                                <strong>{conversa.titulo}</strong>
                                <span>{formatarData(conversa.dt_ultima_mensagem)}</span>
                            </button>
                            <button
                                type="button"
                                className="chat-conversation-delete"
                                onClick={() => onExcluir(conversa.id)}
                                aria-label={`Excluir conversa ${conversa.titulo}`}
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}

export default ChatSidebar;