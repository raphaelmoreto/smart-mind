
function ChatMessage({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
            <div className="chat-message-content">
                {message.content}
            </div>
        </div>
    )
}

export default ChatMessage;