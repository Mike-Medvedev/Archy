import { useState } from 'react';
import styles from './ArchyAgent.module.css';
import useChat from '../hooks/useChat';

export default function ArchyAgent() {
    const [input, setInput] = useState('');
    const { conversation, sendMessage, isLoading } = useChat();

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        sendMessage(trimmed);
        setInput('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.conversation}>
                {conversation.length === 0 ? (
                    <div className={styles.emptyState}>No messages yet.</div>
                ) : (
                    conversation.map((message) => (
                        <div key={message.id}>
                            <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong>{' '}
                            {message.text}
                        </div>
                    ))
                )}
                {isLoading ? <div className={styles.emptyState}>AI is typing...</div> : null}
            </div>
            <div className={styles.inputRow}>
                <input
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            handleSend();
                        }
                    }}
                    placeholder="Type a message..."
                    className={styles.input}
                    disabled={isLoading}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    className={styles.button}
                    disabled={isLoading}
                >
                    Send
                </button>
            </div>
        </div>
    );
}