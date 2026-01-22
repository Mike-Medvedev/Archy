import { useEffect, useState } from "react";
import { Box, Stack, Text, Progress, Group, Transition } from "@mantine/core";

type Props = {
  isLoading: boolean;
};

const LOADING_STAGES = [
  "Connecting to your cloud...",
  "Reverse engineering architecture...",
  "Analyzing resource utilization...",
  "Hunting for zombie resources...",
  "Detecting cost leaks...",
];

export default function ArchyLoadingOverlay({ isLoading }: Props) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0);
      setIsTransitioning(true);
      return;
    }

    let stageIndex = 0;
    const nextStage = () => {
      setIsTransitioning(false);
      setTimeout(() => {
        stageIndex = (stageIndex + 1) % LOADING_STAGES.length;
        setCurrentStage(stageIndex);
        setIsTransitioning(true);
      }, 200);
    };

    const interval = setInterval(nextStage, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const progressValue = ((currentStage + 1) / LOADING_STAGES.length) * 100;

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(248, 249, 250, 0.95)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
      }}
    >
      <Stack align="center" gap="xl" maw={320}>
        {/* Logo */}
        <Text
          size="2.5rem"
          fw={700}
          variant="gradient"
          gradient={{ from: "#0078d4", to: "#7b2cbf", deg: 135 }}
        >
          Archy
        </Text>

        {/* Simple spinning loader */}
        <Box
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--mantine-color-gray-2)",
            borderTopColor: "var(--mantine-color-blue-6)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />

        {/* Message with fixed height container */}
        <Box h={20} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Transition
            mounted={isTransitioning}
            transition="fade"
            duration={200}
            timingFunction="ease"
          >
            {(styles) => (
              <Text size="sm" c="dimmed" ta="center" style={styles}>
                {LOADING_STAGES[currentStage]}
              </Text>
            )}
          </Transition>
        </Box>

        {/* Progress bar */}
        <Box w="100%">
          <Progress
            value={progressValue}
            size="xs"
            radius="xl"
            color="blue"
          />
        </Box>
      </Stack>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Box>
  );
}
