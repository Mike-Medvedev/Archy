import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Paper, Group, Text, Badge, Stack } from "@mantine/core";
import type { CostLeak } from "../lib/canonicalGraph";

type AzureResourceNodeData = {
  name: string;
  typeLabel: string;
  resourceType?: string;
  iconDataUri?: string;
  monthlyCost?: number;
  isLeaking?: boolean;
  leakAmount?: number;
  leak?: CostLeak;
};

type AzureResourceNodeType = Node<AzureResourceNodeData, "azureResource">;

export default function AzureResourceNode({
  data,
}: NodeProps<AzureResourceNodeType>) {
  return (
    <Paper
      p="sm"
      withBorder
      shadow="xs"
      style={{
        minWidth: 200,
        maxWidth: 260,
        cursor: "pointer",
        position: "relative",
        borderColor: data.isLeaking ? "var(--mantine-color-red-5)" : undefined,
        borderWidth: data.isLeaking ? 2 : 1,
        background: data.isLeaking
          ? "linear-gradient(135deg, var(--mantine-color-red-0) 0%, var(--mantine-color-red-1) 100%)"
          : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {/* Cost leak badge - positioned at top right */}
      {data.isLeaking && data.leakAmount && (
        <Badge
          color="red"
          variant="filled"
          size="sm"
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
          }}
        >
          -${data.leakAmount}/mo
        </Badge>
      )}

      <Group gap="xs" mb="xs">
        {data.iconDataUri && (
          <img
            src={data.iconDataUri}
            alt=""
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
            }}
          />
        )}
        <Text fw={600} size="sm">
          {data.typeLabel}
        </Text>
      </Group>

      <Stack gap={4}>
        <Text size="xs" c="dimmed">
          {data.name}
        </Text>
        {data.monthlyCost !== undefined && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Cost:
            </Text>
            <Text size="xs" fw={600}>
              ${data.monthlyCost}/mo
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
