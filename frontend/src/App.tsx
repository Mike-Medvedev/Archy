import { useState } from "react";
import "./App.css";
import ArchyAgent from "./components/ArchyAgent.tsx";
import Canvas from "./components/Canvas.tsx";
import useResizable from "./hooks/useResizable";
import useCanvasStore, { useAppStore } from "./store";
import "@mantine/core/styles.css";

import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  NavLink,
  Button,
  Stack,
  Box,
  ThemeIcon,
} from "@mantine/core";
import { theme } from "./theme";
import {
  IconCloud,
  IconCloudCheck,
  IconChevronDown,
  IconChevronUp,
  IconLogout,
  IconSettings,
  IconScan,
  IconChevronRight,
  IconKey,
} from "@tabler/icons-react";

function App() {
  const { width: agentWidth, handleMouseDown } = useResizable({
    initialWidth: 420,
    minWidth: 360,
    maxWidth: 800,
    direction: "right",
  });

  const [cloudConnected, setCloudConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [azureExpanded, setAzureExpanded] = useState(true);
  const selectedSubscriptionId = useAppStore(
    (state) => state.selectedSubscriptionId,
  );
  const setSelectedSubscriptionId = useAppStore(
    (state) => state.setSelectedSubscriptionId,
  );
  const setSubscriptions = useAppStore((state) => state.setSubscriptions);
  const scanComplete = useCanvasStore((state) => state.scanComplete);

  // Mock subscription for demo
  const mockSubscription = {
    subscriptionId: "demo-subscription-123",
    displayName: "Michael's Subscription",
  };

  const handleConnectCloud = () => {
    setCloudConnected(true);
    setSubscriptions([mockSubscription]);
  };

  const handleSelectSubscription = (subscriptionId: string) => {
    setSelectedSubscriptionId(subscriptionId);
  };

  const handleStartScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 3000);
  };

  // Show scan CTA when subscription is selected but scan hasn't started
  const showScanCTA = selectedSubscriptionId && !scanComplete && !isScanning;

  return (
    <MantineProvider theme={theme}>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 280, breakpoint: "sm" }}
        padding={0}
      >
        {/* Header */}
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            {/* Title */}
            <Text size="xl" fw={700} c="archyBlue.6">
              Archy
            </Text>

            {/* User Menu */}
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" radius="xl" color="violet">
                      M
                    </Avatar>
                    <Text size="sm" fw={500}>
                      Michael
                    </Text>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconSettings size={14} />}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />}>
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </AppShell.Header>

        {/* Left Navbar */}
        <AppShell.Navbar p="md">
          <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed" tt="uppercase">
              Cloud Connections
            </Text>

            {!cloudConnected ? (
              <NavLink
                label="Connect Azure"
                description="Link your Azure account"
                leftSection={
                  <ThemeIcon variant="light" color="blue" size="lg">
                    <IconCloud size={18} />
                  </ThemeIcon>
                }
                rightSection={<IconChevronRight size={14} />}
                onClick={handleConnectCloud}
                active
              />
            ) : (
              <NavLink
                label="Azure"
                description="1 subscription"
                leftSection={
                  <ThemeIcon variant="light" color="green" size="lg">
                    <IconCloudCheck size={18} />
                  </ThemeIcon>
                }
                childrenOffset={28}
                opened={azureExpanded}
                onChange={setAzureExpanded}
                rightSection={azureExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              >
                <NavLink
                  label={mockSubscription.displayName}
                  leftSection={
                    <IconKey 
                      size={16} 
                      color={selectedSubscriptionId === mockSubscription.subscriptionId 
                        ? "var(--mantine-color-blue-6)" 
                        : "var(--mantine-color-gray-5)"
                      } 
                    />
                  }
                  onClick={() =>
                    handleSelectSubscription(mockSubscription.subscriptionId)
                  }
                  style={{
                    fontWeight: selectedSubscriptionId === mockSubscription.subscriptionId ? 600 : 400,
                    color: selectedSubscriptionId === mockSubscription.subscriptionId 
                      ? 'var(--mantine-color-blue-7)' 
                      : undefined,
                  }}
                />
              </NavLink>
            )}

          </Stack>
        </AppShell.Navbar>

        {/* Main Content */}
        <AppShell.Main>
          <div className="mainContent">
            <section
              className="canvas_section"
              style={{ width: `calc(100% - ${agentWidth}px)` }}
            >
              {/* Scan CTA Overlay */}
              {showScanCTA && (
                <div className="scanCtaOverlay">
                  <Box className="scanCtaCard">
                    <ThemeIcon
                      size={80}
                      radius="xl"
                      variant="light"
                      color="blue"
                      mb="lg"
                    >
                      <IconScan size={40} stroke={1.5} />
                    </ThemeIcon>
                    <Text size="xl" fw={600} mb="xs">
                      Ready to Scan
                    </Text>
                    <Text size="sm" c="dimmed" mb="lg" maw={300} ta="center">
                      Analyze your Azure architecture to discover resources,
                      dependencies, and cost optimization opportunities.
                    </Text>
                    <Button
                      size="lg"
                      leftSection={<IconScan size={20} />}
                      onClick={handleStartScan}
                    >
                      Start Architecture Scan
                    </Button>
                  </Box>
                </div>
              )}
              <Canvas />
            </section>
            <div
              className="resizer"
              onMouseDown={handleMouseDown}
              title="Drag to resize"
            />
            <aside className="agent_aside" style={{ width: `${agentWidth}px` }}>
              <ArchyAgent />
            </aside>
          </div>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
