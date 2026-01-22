import { useState } from "react";
import { LEAK_TYPE_LABELS, type CostLeak } from "../lib/canonicalGraph";
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  Paper,
  Box,
  Anchor,
  Loader,
  ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconExternalLink } from "@tabler/icons-react";

type ResourceDetail = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  monthlyCost?: number;
  isLeaking?: boolean;
  leak?: CostLeak;
};

type Props = {
  resource: ResourceDetail | null;
  onClose: () => void;
};

export default function ResourceDetailModal({ resource, onClose }: Props) {
  const [remediating, setRemediating] = useState(false);
  const [remediationComplete, setRemediationComplete] = useState(false);

  if (!resource) return null;

  const handleRemediate = async () => {
    setRemediating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setRemediating(false);
    setRemediationComplete(true);
  };

  const leakTypeInfo = resource.leak?.type
    ? LEAK_TYPE_LABELS[resource.leak.type]
    : null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      case "low":
        return "yellow";
      default:
        return "gray";
    }
  };

  // Generate Azure portal URL
  const azurePortalUrl = `https://portal.azure.com/#@/resource${resource.id}`;

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Box>
          <Text size="lg" fw={600}>
            {resource.name}
          </Text>
          <Text size="sm" c="dimmed">
            {resource.typeLabel}
          </Text>
        </Box>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Cost Leak Alert */}
        {resource.isLeaking && resource.leak && !remediationComplete && (
          <Paper p="md" withBorder style={{ borderColor: "var(--mantine-color-red-5)", borderWidth: 2 }} bg="red.0">
            <Group justify="space-between" align="flex-start" mb="md">
              <Box>
                <Text size="xl" fw={700} mb={4}>
                  {leakTypeInfo?.label}
                </Text>
                <Badge
                  color={getSeverityColor(resource.leak.severity)}
                  size="sm"
                  variant="filled"
                >
                  {resource.leak.severity.toUpperCase()} SEVERITY
                </Badge>
              </Box>
              <Text size="xl" fw={700} c="red">
                -${resource.leak.monthlyLeak}/mo
              </Text>
            </Group>

            <Stack gap="sm">
              <Box>
                <Text size="sm" fw={600} mb={4}>
                  Reason
                </Text>
                <Text size="sm" c="dimmed">
                  {resource.leak.description}
                </Text>
              </Box>

              <Box>
                <Text size="sm" fw={600} mb={4}>
                  Recommended Action
                </Text>
                <Text size="sm" c="dimmed">
                  {resource.leak.remediation}
                </Text>
              </Box>

              <Anchor
                href={azurePortalUrl}
                target="_blank"
                size="sm"
                mt="xs"
              >
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  View in Azure Portal
                </Group>
              </Anchor>

              <Button
                fullWidth
                mt="sm"
                onClick={handleRemediate}
                disabled={remediating}
                leftSection={
                  remediating ? <Loader size={16} color="white" /> : null
                }
              >
                {remediating ? "Applying Fix..." : "Remediate"}
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Remediation Success */}
        {remediationComplete && (
          <Paper p="md" withBorder bg="green.0">
            <Group gap="sm">
              <ThemeIcon color="green" size="lg" radius="xl">
                <IconCheck size={20} />
              </ThemeIcon>
              <Box>
                <Text fw={600}>Remediation Queued</Text>
                <Text size="sm" c="dimmed">
                  Changes will take effect within 5-10 minutes. Estimated
                  savings:{" "}
                  <Text span fw={600}>
                    ${resource.leak?.monthlyLeak}/mo
                  </Text>
                </Text>
              </Box>
            </Group>
          </Paper>
        )}

        {/* Healthy Resource */}
        {!resource.isLeaking && (
          <Paper p="md" withBorder bg="green.0">
            <Group gap="sm">
              <ThemeIcon color="green" size="lg" radius="xl">
                <IconCheck size={20} />
              </ThemeIcon>
              <Text size="sm">
                This resource is healthy. No cost optimization issues detected.
              </Text>
            </Group>
          </Paper>
        )}
      </Stack>
    </Modal>
  );
}
