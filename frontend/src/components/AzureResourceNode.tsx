import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Paper, Group, Text, Badge } from "@mantine/core";
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
        minWidth: 160,
        maxWidth: 220,
        cursor: "pointer",
        position: "relative",
        borderColor: data.isLeaking ? "var(--mantine-color-red-4)" : undefined,
        borderWidth: data.isLeaking ? 2 : 1,
        background: data.isLeaking ? "#fef7f7" : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {/* Cost leak badge */}
      {data.isLeaking && data.leakAmount && (
        <Badge
          color="red"
          variant="filled"
          size="sm"
          style={{
            position: "absolute",
            top: -10,
            right: -10,
          }}
        >
          -${data.leakAmount}/mo
        </Badge>
      )}

      <Group gap="xs" wrap="nowrap">
        {data.iconDataUri && (
          <img
            src={data.iconDataUri}
            alt=""
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <Text fw={500} size="sm" lh={1.2}>
            {data.typeLabel}
          </Text>
          {data.monthlyCost !== undefined && (
            <Text size="xs" c="dimmed">
              ${data.monthlyCost}/mo
            </Text>
          )}
        </div>
      </Group>
    </Paper>
  );
}
