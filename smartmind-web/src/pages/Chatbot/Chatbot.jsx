import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import ChatInput from "../../components/chatbot/ChatInput.jsx";
import ChatMessage from "../../components/chatbot/ChatMessage.jsx";
import ChatSidebar from "../../components/chatbot/ChatSidebar.jsx";
import { useCasaAtual } from "../../hooks/useCasaAtual.js";
import { chatbotService } from "../../services/chatbotService.js";

import "./Chatbot.css";

const SUGESTOES = [
    { titulo: "Calcular consumo", texto: "Quanto gasta um chuveiro de 5500 W ligado 30 minutos por dia?" },
    { titulo: "Meus dispositivos", texto: "Quais dispositivos tenho cadastrados?" },
    { titulo: "Consumo do mês", texto: "Qual foi meu consumo este mês?" },
    { titulo: "Prever fatura", texto: "Qual a previsão da minha próxima conta de luz?" },
];

let contador = 0;
const novoId = () => `local-${Date.now()}-${contador++}`;

const primeiroNome = (nome = "") => {
    const primeiro = nome.trim().split(" ")[0] ?? "";
    return primeiro.charAt(0) + primeiro.slice(1).toLowerCase();
};

// RESPOSTA DA API -> MENSAGEM NA TELA
function respostaParaMensagem(resposta) {
    return {
        id: novoId(),
        role: "assistant",
        content: resposta.message || "Não consegui gerar uma resposta.",
        suggestions: resposta.suggestions ?? [],
        result: resposta.result ?? null,
        quickReplies: resposta.quick_replies ?? [],
        createdAt: new Date(),
    };
}

// CADA LINHA DO BANCO TEM PERGUNTA + RESPOSTA -> VIRA 2 MENSAGENS NA TELA
function historicoParaMensagens(linhas) {
    return linhas.flatMap((linha) => [
        { id: `u-${linha.id}`, role: "user", content: linha.mensagem, createdAt: linha.dt_mensagem },
        {
            id: `a-${linha.id}`,
            role: "assistant",
            content: linha.resposta,
            suggestions: linha.dados?.suggestions ?? [],
            result: linha.dados?.result ?? null,
            quickReplies: linha.dados?.quick_replies ?? [],
            createdAt: linha.dt_mensagem,
        },
    ]);
}

export default function Chatbot() {
    const { usuario, casaAtual, carregando: carregandoCasa, erro: erroCasa } = useCasaAtual();
    const usuarioId = usuario?.id;

    const [conversas, setConversas] = useState([]);
    const [carregandoConversas, setCarregandoConversas] = useState(true);
    const [conversaId, setConversaId] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [contexto, setContexto] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [ultimaFalha, setUltimaFalha] = useState(null);

    const fimDaListaRef = useRef(null);

    async function carregarConversas() {
        try {
            setConversas((await chatbotService.listarConversas(usuarioId)) ?? []);
        } catch {
            // A LISTA LATERAL NÃO É CRÍTICA
        }
    }

    useEffect(() => {
        if (!usuarioId) return;
        let ignorar = false;

        chatbotService.listarConversas(usuarioId)
            .then((lista) => { if (!ignorar) setConversas(lista ?? []); })
            .catch(() => {})
            .finally(() => { if (!ignorar) setCarregandoConversas(false); });

        return () => { ignorar = true; };
    }, [usuarioId]);

    // AUTO-SCROLL PARA A ÚLTIMA MENSAGEM
    useEffect(() => {
        fimDaListaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [mensagens, enviando]);

    async function abrirConversa(id) {
        if (id === conversaId || enviando) return;
        setErro("");
        setUltimaFalha(null);
        setContexto(null);
        setConversaId(id);
        setMensagens([]);
        try {
            const linhas = await chatbotService.listarMensagens(id, usuarioId);
            setMensagens(historicoParaMensagens(linhas ?? []));
        } catch (error) {
            setErro(error.message || "Não foi possível abrir a conversa.");
        }
    }

    function novaConversa() {
        setConversaId(null);
        setMensagens([]);
        setContexto(null);
        setErro("");
        setUltimaFalha(null);
    }

    async function excluirConversa(id) {
        if (!window.confirm("Excluir esta conversa?")) return;
        try {
            await chatbotService.excluirConversa(id, usuarioId);
            setConversas((atual) => atual.filter((conversa) => conversa.id !== id));
            if (id === conversaId) novaConversa();
        } catch (error) {
            setErro(error.message || "Não foi possível excluir a conversa.");
        }
    }

    async function enviarMensagem(texto, { repetir = false } = {}) {
        if (!usuarioId || !casaAtual) {
            setErro("Cadastre ou selecione uma casa em Configurações para usar o assistente.");
            return;
        }

        if (!repetir) {
            setMensagens((anterior) => [...anterior, { id: novoId(), role: "user", content: texto, createdAt: new Date() }]);
        }

        setEnviando(true);
        setErro("");
        setUltimaFalha(null);

        try {
            const resposta = await chatbotService.enviarMensagem({
                usuarioId,
                casaId: casaAtual.id,
                conversaId,
                mensagem: texto,
                contexto,
            });

            setMensagens((anterior) => [...anterior, respostaParaMensagem(resposta)]);
            setContexto(resposta.context ?? null);         // ← GUARDA O CONTEXTO PARA A PRÓXIMA PERGUNTA
            if (!conversaId && resposta.conversaId) setConversaId(resposta.conversaId);
            carregarConversas();                            // ATUALIZA A LISTA LATERAL
        } catch (error) {
            setErro(error.message || "Não foi possível enviar sua mensagem.");
            setUltimaFalha(texto);
        } finally {
            setEnviando(false);
        }
    }

    const ultimaMensagem = mensagens[mensagens.length - 1];
    const semCasa = !carregandoCasa && !casaAtual;
    const mensagemErro = erro || erroCasa;

    return (
        <div className="chatbot-page">
            <ChatSidebar
                conversas={conversas}
                conversaAtivaId={conversaId}
                carregando={carregandoConversas}
                onSelecionar={abrirConversa}
                onNova={novaConversa}
                onExcluir={excluirConversa}
            />

            <section className="chatbot-container">
                <header className="chatbot-header">
                    <div className="chatbot-brand">
                        <div className="chatbot-avatar"><span>SM</span></div>
                        <div className="chatbot-heading">
                            <h1>Assistente SmartMind</h1>
                            <p>
                                <span className="chatbot-status" />
                                {casaAtual ? `Analisando: ${casaAtual.nome}` : "Assistente de eficiência energética"}
                            </p>
                        </div>
                    </div>

                    {mensagens.length > 0 && (
                        <button className="chatbot-back-button" type="button" onClick={novaConversa}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>Nova conversa</span>
                        </button>
                    )}
                </header>

                <div className="chatbot-messages" aria-live="polite" aria-busy={enviando}>
                    {mensagens.length === 0 ? (
                        <div className="chat-welcome">
                            <div className="chatbot-avatar chat-welcome-avatar"><span>SM</span></div>
                            <h2>Olá{usuario?.nome ? `, ${primeiroNome(usuario.nome)}` : ""}! Como posso ajudar?</h2>
                            <p>Calculo o consumo de aparelhos, consulto seus dispositivos, prevejo a fatura e sugiro formas de economizar.</p>

                            {semCasa ? (
                                <p className="chat-welcome-warning">
                                    Para começar, <Link to="/configuracoes">cadastre sua casa em Configurações</Link>.
                                </p>
                            ) : (
                                <div className="chat-welcome-grid">
                                    {SUGESTOES.map((sugestao) => (
                                        <button
                                            key={sugestao.titulo}
                                            type="button"
                                            className="chat-welcome-card"
                                            onClick={() => enviarMensagem(sugestao.texto)}
                                            disabled={enviando || carregandoCasa}
                                        >
                                            <strong>{sugestao.titulo}</strong>
                                            <span>{sugestao.texto}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        mensagens.map((mensagem) => (
                            <ChatMessage
                                key={mensagem.id}
                                message={mensagem}
                                mostrarAcoes={mensagem === ultimaMensagem && !enviando}
                                onQuickReply={(texto) => enviarMensagem(texto)}
                            />
                        ))
                    )}

                    {enviando && (
                        <div className="chat-loading">
                            <div className="chat-message-avatar" aria-hidden="true">SM</div>
                            <span className="chat-loading-dots"><span /><span /><span /></span>
                            Analisando sua mensagem...
                        </div>
                    )}

                    <div ref={fimDaListaRef} />
                </div>

                {mensagemErro && (
                    <div className="chat-error" role="alert">
                        <span>{mensagemErro}</span>
                        {ultimaFalha && (
                            <button type="button" onClick={() => enviarMensagem(ultimaFalha, { repetir: true })}>
                                Tentar novamente
                            </button>
                        )}
                    </div>
                )}

                <ChatInput onSend={enviarMensagem} disabled={enviando || semCasa || carregandoCasa} />
            </section>
        </div>
    );
}