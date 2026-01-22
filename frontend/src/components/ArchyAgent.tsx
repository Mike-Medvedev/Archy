import { useState, useMemo, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Stack,
  Text,
  Paper,
  Group,
  Button,
  TextInput,
  ActionIcon,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import {
  IconMessageCircle,
  IconSend,
  IconChevronDown,
} from "@tabler/icons-react";
import useChat from "../hooks/useChat";
import useCanvasStore from "../store";
import { useAppStore } from "../store";
import useSubscriptionCosts from "../hooks/useSubscriptionCosts";
import { buildArchitectureContext } from "../utils/buildArchitectureContext";
import classes from "./ArchyAgent.module.css";

export default function ArchyAgent() {
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const subscriptions = useAppStore((state) => state.subscriptions);
  const selectedSubscriptionId = useAppStore(
    (state) => state.selectedSubscriptionId,
  );
  const costsQuery = useSubscriptionCosts();

  const architectureContext = useMemo(() => {
    const subscription = subscriptions.find(
      (s) => s.subscriptionId === selectedSubscriptionId,
    );
    const context = buildArchitectureContext(
      nodes,
      edges,
      costsQuery.data,
      subscription?.displayName,
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
    setInput("");
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.length]);

  const suggestionChips = [
    "What are my top cost drivers?",
    "Show me unused resources",
    "How can I optimize costs?",
  ];

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--mantine-color-body)",
      }}
    >
      {/* Conversation Area */}
      <Box
        ref={conversationRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--mantine-spacing-md)",
          position: "relative",
        }}
      >
        {conversation.length === 0 ? (
          <Stack
            align="center"
            justify="center"
            gap="md"
            style={{ height: "100%" }}
          >
            <ThemeIcon size={72} radius="xl" variant="light" color="blue">
              <IconMessageCircle size={36} />
            </ThemeIcon>
            <Text size="lg" fw={600}>
              Start a conversation
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={280}>
              Ask about your Azure architecture, costs, dependencies, or
              optimization opportunities.
            </Text>
            <Group gap="xs" mt="xs" wrap="wrap" justify="center">
              {suggestionChips.map((chip) => (
                <Button
                  key={chip}
                  variant="light"
                  size="xs"
                  radius="xl"
                  onClick={() => setInput(chip)}
                >
                  {chip}
                </Button>
              ))}
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            {conversation.map((message) => (
              <Box
                key={message.id}
                style={{
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: message.role === "user" ? "85%" : "90%",
                }}
              >
                <Paper
                  p="sm"
                  radius="lg"
                  withBorder={message.role !== "user"}
                  style={{
                    background:
                      message.role === "user"
                        ? "var(--mantine-color-blue-6)"
                        : undefined,
                    color: message.role === "user" ? "white" : undefined,
                    borderTopRightRadius:
                      message.role === "user" ? 4 : undefined,
                    borderTopLeftRadius:
                      message.role !== "user" ? 4 : undefined,
                  }}
                >
                  {message.role === "ai" ? (
                    <div className={classes.markdown}>
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <Text size="sm">{message.text}</Text>
                  )}
                </Paper>
              </Box>
            ))}
            {isLoading && (
              <Box style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
                <Paper p="sm" radius="lg" withBorder>
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="sm" c="dimmed">
                      Analyzing...
                    </Text>
                  </Group>
                </Paper>
              </Box>
            )}
          </Stack>
        )}

        {showScrollButton && (
          <ActionIcon
            variant="default"
            radius="md"
            size="lg"
            onClick={scrollToBottom}
            style={{
              position: "absolute",
              bottom: "var(--mantine-spacing-md)",
              right: "var(--mantine-spacing-md)",
            }}
          >
            <IconChevronDown size={18} />
          </ActionIcon>
        )}
      </Box>

      {/* Input Area */}
      <Box
        p="md"
        style={{
          borderTop: "1px solid var(--mantine-color-gray-2)",
          background: "var(--mantine-color-body)",
        }}
      >
        <Group gap="xs">
          <TextInput
            placeholder="Ask about your architecture, costs, or dependencies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            style={{ flex: 1 }}
            radius="lg"
          />
          <ActionIcon
            size="lg"
            radius="lg"
            variant="filled"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}
