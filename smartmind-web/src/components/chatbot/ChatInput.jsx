import { useState } from "react";

function ChatInput({ onSend, disabled }) {
    const [mensagem, setMensagem] = useState('');

    function handleSubmit(event) {
        event.preventDefault();

        const texto = mensagem.trim();
        if (!texto || disabled) {
            return;
        }

        onSend(texto);
        setMensagem('');
    }

    return (
        <form className="chat-input" onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Digite sua mensagem..."
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                disabled={disabled}
            />

            <button type="submit" disabled={disabled || !mensagem.trim()}>
                Enviar
            </button>
        </form>
    )
}

export default ChatInput;