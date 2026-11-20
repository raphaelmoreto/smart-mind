import { useEffect, useRef, useState } from "react";

const LIMITE = 1000;

function ChatInput({ onSend, disabled }) {
    const [mensagem, setMensagem] = useState("");
    const textareaRef = useRef(null);

    // VOLTA O FOCO PARA O CAMPO QUANDO O BOT TERMINA DE RESPONDER
    useEffect(() => {
        if (!disabled) textareaRef.current?.focus();
    }, [disabled]);

    // A TEXTAREA CRESCE CONFORME O TEXTO (ATÉ 160px)
    useEffect(() => {
        const elemento = textareaRef.current;
        if (!elemento) return;
        elemento.style.height = "auto";
        elemento.style.height = `${Math.min(elemento.scrollHeight, 160)}px`;
    }, [mensagem]);

    function enviar() {
        const texto = mensagem.trim();
        if (!texto || disabled) return;
        onSend(texto);
        setMensagem("");
    }

    function handleKeyDown(event) {
        // ENTER ENVIA, SHIFT+ENTER QUEBRA LINHA (isComposing EVITA BUG COM ACENTOS EM ALGUNS TECLADOS)
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            enviar();
        }
    }

    return (
        <form
            className="chat-input"
            onSubmit={(event) => {
                event.preventDefault();
                enviar();
            }}
        >
            <div className="chat-input-field">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    maxLength={LIMITE}
                    placeholder="Pergunte sobre consumo, dispositivos ou economia..."
                    value={mensagem}
                    onChange={(event) => setMensagem(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-label="Mensagem para o assistente"
                />
                <span className="chat-input-hint">
                    Enter para enviar · Shift+Enter para nova linha · {mensagem.length}/{LIMITE}
                </span>
            </div>

            <button type="submit" disabled={disabled || !mensagem.trim()} aria-label="Enviar mensagem">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
            </button>
        </form>
    );
}

export default ChatInput;