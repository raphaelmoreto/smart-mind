import { useState } from 'react';

import { chatbotService } from '../../services/chatbotService.js';

import ChatInput from '../../components/chatbot/ChatInput.jsx';
import ChatMessage from '../../components/chatbot/ChatMessage.jsx';

import './Chatbot.css';

function Chatbot({ casaId }) {
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

    return (
        <div className="chatbot-container">
            <header className="chatbot-header">
                <h1>SmartMind</h1>
                <p>Assistente de eficiência energética</p>
            </header>

            <main className="chatbot-messages">
                {mensagens.map((mensagem, index) => (
                    <ChatMessage key={index} message={mensagem} />
                ))}

                {carregando && (
                    <div className="chat-loading">
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
        </div>
    );
}

export default Chatbot;