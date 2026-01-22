import { useState, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import useCanvasStore from "../store";
import useSubscriptionResources from "../hooks/useSubscriptionResources";
import AzureResourceNode from "./AzureResourceNode";
import ResourceDetailModal from "./ResourceDetailModal";
import ArchyLoadingOverlay from "./ArchyLoadingOverlay";
import ScanReportModal from "./ScanReportModal";
import type { CostLeak } from "../lib/canonicalGraph";
import { Paper, Stack, Group, Text, Button, Divider } from "@mantine/core";
import { IconCurrencyDollar } from "@tabler/icons-react";

type ResourceDetail = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  monthlyCost?: number;
  isLeaking?: boolean;
  leak?: CostLeak;
};

export default function Canvas() {
  const store = useCanvasStore();
  const resourcesQuery = useSubscriptionResources();
  const scanComplete = useCanvasStore((state) => state.scanComplete);
  const leakingSummary = useCanvasStore((state) => state.leakingSummary);
  const showReport = useCanvasStore((state) => state.showReport);
  const setShowReport = useCanvasStore((state) => state.setShowReport);
  const [selectedResource, setSelectedResource] =
    useState<ResourceDetail | null>(null);

  // Check if initial loading is happening
  const isInitialLoading = resourcesQuery.isLoading;

  // Node types
  const nodeTypes = useMemo(
    () => ({
      azureResource: AzureResourceNode,
    }),
    [],
  );

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    const data = node.data as {
      name?: string;
      resourceType?: string;
      typeLabel?: string;
      monthlyCost?: number;
      isLeaking?: boolean;
      leak?: CostLeak;
    };

    const resource: ResourceDetail = {
      id: node.id,
      name: data.name || "Unknown",
      type: data.resourceType || "Unknown",
      typeLabel: data.typeLabel || "Unknown",
      monthlyCost: data.monthlyCost,
      isLeaking: data.isLeaking,
      leak: data.leak,
    };
    setSelectedResource(resource);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={store.nodes}
        edges={store.edges}
        onNodesChange={store.onNodesChange}
        onEdgesChange={store.onEdgesChange}
        onConnect={store.onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>

      {/* Scan Summary Panel - only show when scan is complete */}
      {scanComplete && leakingSummary && leakingSummary.leakingCount > 0 && (
        <Paper
          shadow="lg"
          p="md"
          withBorder
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            minWidth: 260,
          }}
        >
          <Group gap="xs" mb="md">
            <IconCurrencyDollar
              size={20}
              color="var(--mantine-color-red-6)"
            />
            <Text fw={600} c="red.6">
              Cost Leaks Detected
            </Text>
          </Group>

          <Stack gap="xs" mb="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Monthly Waste:
              </Text>
              <Text size="lg" fw={700} c="red.6">
                ${leakingSummary.totalMonthlyLeak.toFixed(0)}/mo
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Yearly Impact:
              </Text>
              <Text size="sm" fw={700} c="red.6">
                ${(leakingSummary.totalMonthlyLeak * 12).toLocaleString()}/yr
              </Text>
            </Group>
          </Stack>

          <Divider mb="md" />

          <Button fullWidth onClick={() => setShowReport(true)}>
            View Full Report
          </Button>
        </Paper>
      )}

      <ArchyLoadingOverlay isLoading={isInitialLoading} />

      {selectedResource && (
        <ResourceDetailModal
          key={selectedResource.id}
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

      {showReport && <ScanReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
