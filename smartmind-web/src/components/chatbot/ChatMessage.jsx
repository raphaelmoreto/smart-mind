const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarHora(data) {
    return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ChatMessage({ message, mostrarAcoes, onQuickReply }) {
    const isUser = message.role === "user";
    const { result } = message;

    return (
        <div className={`chat-message ${isUser ? "user" : "assistant"}`}>
            {!isUser && <div className="chat-message-avatar" aria-hidden="true">SM</div>}

            <div className="chat-message-body">
                <div className="chat-message-content">
                    {message.content}

                    {result && (
                        <div className="chat-result-card">
                            {result.consumption_kwh != null && (
                                <div>
                                    <span>Consumo</span>
                                    <strong>{Number(result.consumption_kwh).toLocaleString("pt-BR")} kWh/mês</strong>
                                </div>
                            )}
                            {result.monthly_cost != null && (
                                <div>
                                    <span>Custo estimado</span>
                                    <strong>{moeda.format(result.monthly_cost)}</strong>
                                </div>
                            )}
                            {result.tariff != null && (
                                <div>
                                    <span>Tarifa</span>
                                    <strong>{moeda.format(result.tariff)}/kWh</strong>
                                </div>
                            )}
                        </div>
                    )}

                    {message.suggestions?.length > 0 && (
                        <div className="chat-suggestions">
                            <strong>Dicas para economizar</strong>
                            <ul>
                                {message.suggestions.map((sugestao) => (
                                    <li key={sugestao}>{sugestao}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="chat-message-meta">
                    {message.createdAt && (
                        <time dateTime={new Date(message.createdAt).toISOString()}>
                            {formatarHora(message.createdAt)}
                        </time>
                    )}
                    {!isUser && (
                        <button
                            type="button"
                            className="chat-copy"
                            onClick={() => navigator.clipboard?.writeText(message.content)}
                        >
                            Copiar
                        </button>
                    )}
                </div>

                {mostrarAcoes && message.quickReplies?.length > 0 && (
                    <div className="chat-quick-replies">
                        {message.quickReplies.map((resposta) => (
                            <button key={resposta} type="button" onClick={() => onQuickReply(resposta)}>
                                {resposta}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatMessage;