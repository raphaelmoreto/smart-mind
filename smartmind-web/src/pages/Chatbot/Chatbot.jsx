import { useState } from 'react';
import { useNavigate } from 'react-router';

import { chatbotService } from '../../services/chatbotService.js';

import ChatInput from '../../components/chatbot/ChatInput.jsx';
import ChatMessage from '../../components/chatbot/ChatMessage.jsx';

import './Chatbot.css';

function Chatbot({ casaId }) {
    const navigate = useNavigate();

    const [mensagens, setMensagens] = useState([
        {
            role: 'assistant',
            content: 'Olá! Sou o assistente SmartMind. Como posso ajudar hoje?'
        }
    ]);

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    async function enviarMensagem(texto) {
        if (!casaId) {
            setErro('Não foi possível identificar a casa selecionada!');
            return;
        }

        setMensagens((anterior) => [
            ...anterior,
            { role: 'user', content: texto }
        ]);

        setCarregando(true);
        setErro('');

        try {
            const resultado = await chatbotService.enviarMensagem(casaId, texto);

            const conteudo = [
                resultado.message,
                ...(resultado.suggestions?.length
                    ? [
                        'Sugestões para economizar:',
                        ...resultado.suggestions.map(
                            (sugestao) => `• ${sugestao}`,
                        ),
                    ]
                    : []),
            ].filter(Boolean).join('\n\n');

            setMensagens((anterior) => [
                ...anterior,
                { role: 'assistants', content: conteudo || 'Não consegui gerar uma resposta' }
            ]);
        } catch (error) {
            console.error('ERRO AO ENVIAR MENSAGEM: ', error);

            setErro(
                error.message || 'NÃO FOI POSSÍVEL ENVIAR SUA MENSAGEM. TENTE NOVAMENTE'
            );
        } finally {
            setCarregando(false);
        }
    }

    function voltarParaHome() {
        navigate("/home");
    }

    return (
        <main className="chatbot-page">
            <section className="chatbot-container">
                <header className="chatbot-header">
                    <div className="chatbot-brand">
                        <div className="chatbot-avatar">
                            <span>SM</span>
                        </div>

                        <div className="chatbot-heading">
                            <h1>SmartMind</h1>
                            <p>
                                <span className="chatbot-status"></span>
                                Assistente de eficiência energética
                            </p>
                        </div>
                    </div>

                    <button className="chatbot-back-button" type="button" onClick={voltarParaHome}>
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                d="M19 12H5M12 19l-7-7 7-7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>

                        <span>Voltar para Home</span>
                    </button>
                </header>

                <main className="chatbot-messages">
                    {mensagens.map((mensagem, index) => (
                        <ChatMessage
                            key={index}
                            message={mensagem}
                        />
                    ))}

                    {carregando && (
                        <div className="chat-loading">
                            <span className="chat-loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>

                            Analisando sua mensagem...
                        </div>
                    )}
                </main>

                {erro && (
                    <div className="chat-error" role="alert">
                        {erro}
                    </div>
                )}
                <ChatInput onSend={enviarMensagem} disabled={carregando} />
            </section>
        </main>
    );
}

export default Chatbot;