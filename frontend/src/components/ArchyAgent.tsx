import { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ArchyAgent.module.css';
import useChat from '../hooks/useChat';
import useCanvasStore from '../store';
import { useAppStore } from '../store';
import useSubscriptionCosts from '../hooks/useSubscriptionCosts';
import { buildArchitectureContext } from '../utils/buildArchitectureContext';

export default function ArchyAgent() {
    const [input, setInput] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);
    const conversationRef = useRef<HTMLDivElement | null>(null);

    const nodes = useCanvasStore(state => state.nodes);
    const edges = useCanvasStore(state => state.edges);
    const subscriptions = useAppStore(state => state.subscriptions);
    const selectedSubscriptionId = useAppStore(state => state.selectedSubscriptionId);
    const costsQuery = useSubscriptionCosts();

    // Build architecture context from current diagram (including costs!)
    const architectureContext = useMemo(() => {
        const subscription = subscriptions.find(s => s.subscriptionId === selectedSubscriptionId);
        const context = buildArchitectureContext(
            nodes,
            edges,
            costsQuery.data,
            subscription?.displayName
        );


        return context;
    }, [nodes, edges, costsQuery.data, subscriptions, selectedSubscriptionId]);

    const { conversation, sendMessage, isLoading } = useChat(architectureContext);

    const scrollToBottom = () => {
        if (conversationRef.current) {
            conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }
    };

    const handleScroll = () => {
        if (!conversationRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = conversationRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        sendMessage(trimmed);
        setInput('');

        // Scroll to bottom after sending
        setTimeout(scrollToBottom, 100);
    };

    // Auto-scroll when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [conversation.length]);

    return (
        <div className={styles.container}>
            <div
                className={styles.conversation}
                ref={conversationRef}
                onScroll={handleScroll}
            >
                {conversation.length === 0 ? (
                    <div className={styles.emptyState}>
                        Ask me anything about your Azure architecture, costs, or dependencies!
                    </div>
                ) : (
                    conversation.map((message) => (
                        <div
                            key={message.id}
                            className={message.role === 'user' ? styles.userMessage : styles.aiMessage}
                        >
                            <div className={styles.messageRole}>
                                {message.role === 'user' ? '👤 You' : '🤖 Archy'}
                            </div>
                            <div className={styles.messageContent}>
                                {message.role === 'ai' ? (
                                    <ReactMarkdown>{message.text}</ReactMarkdown>
                                ) : (
                                    <p>{message.text}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className={styles.aiMessage}>
                        <div className={styles.messageRole}>🤖 Archy</div>
                        <div className={styles.messageContent}>
                            <div className={styles.typing}>Analyzing your architecture...</div>
                        </div>
                    </div>
                )}

                {showScrollButton && (
                    <button
                        className={styles.scrollToBottomFab}
                        onClick={scrollToBottom}
                        title="Scroll to bottom"
                    >
                        ↓
                    </button>
                )}
            </div>
            <div className={styles.inputRow}>
                <input
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ask about your architecture, costs, or dependencies..."
                    className={styles.input}
                    disabled={isLoading}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    className={styles.button}
                    disabled={isLoading || !input.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}