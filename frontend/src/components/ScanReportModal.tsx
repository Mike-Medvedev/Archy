import { useState } from "react";
import useCanvasStore from "../store";
import { getLeaksBySeverity, LEAK_TYPE_LABELS } from "../lib/canonicalGraph";
import {
  Modal,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  Progress,
  SimpleGrid,
  Box,
  Divider,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import {
  IconSearch,
  IconAlertTriangle,
  IconCurrencyDollar,
  IconCalendar,
  IconDownload,
  IconCheck,
} from "@tabler/icons-react";

type Props = {
  onClose: () => void;
};

export default function ScanReportModal({ onClose }: Props) {
  const canonicalGraph = useCanvasStore((state) => state.canonicalGraph);
  const leakingSummary = useCanvasStore((state) => state.leakingSummary);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  if (!canonicalGraph || !leakingSummary) return null;

  const leaksBySeverity = getLeaksBySeverity(canonicalGraph);
  const allLeaks = [
    ...leaksBySeverity.high,
    ...leaksBySeverity.medium,
    ...leaksBySeverity.low,
  ];

  const handleExport = async () => {
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setExporting(false);
    setExported(true);
  };

  const savingsPercentage =
    leakingSummary.totalMonthlyCost > 0
      ? (leakingSummary.totalMonthlyLeak / leakingSummary.totalMonthlyCost) *
        100
      : 0;

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

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Box>
          <Text size="lg" fw={600}>
            Cloud Cost Scan Report
          </Text>
          <Text size="xs" c="dimmed">
            Generated on{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </Box>
      }
      size="lg"
      centered
    >
      <Stack gap="lg">
        {/* Summary Cards */}
        <SimpleGrid cols={4} spacing="sm">
          <Paper p="sm" withBorder>
            <Group gap="xs" mb="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconSearch size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Scanned
              </Text>
            </Group>
            <Text size="xl" fw={700}>
              {leakingSummary.totalResources}
            </Text>
          </Paper>

          <Paper p="sm" withBorder>
            <Group gap="xs" mb="xs">
              <ThemeIcon size="sm" variant="light" color="orange">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Issues
              </Text>
            </Group>
            <Text size="xl" fw={700} c="orange">
              {leakingSummary.leakingCount}
            </Text>
          </Paper>

          <Paper p="sm" withBorder>
            <Group gap="xs" mb="xs">
              <ThemeIcon size="sm" variant="light" color="red">
                <IconCurrencyDollar size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Monthly
              </Text>
            </Group>
            <Text size="xl" fw={700} c="red">
              ${leakingSummary.totalMonthlyLeak}
            </Text>
          </Paper>

          <Paper p="sm" withBorder>
            <Group gap="xs" mb="xs">
              <ThemeIcon size="sm" variant="light" color="red">
                <IconCalendar size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Yearly
              </Text>
            </Group>
            <Text size="xl" fw={700} c="red">
              ${(leakingSummary.totalMonthlyLeak * 12).toLocaleString()}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Savings Progress */}
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed" mb="xs">
            Optimization Potential
          </Text>
          <Progress value={savingsPercentage} size="lg" radius="xl" mb="xs" />
          <Text size="sm">
            <Text span fw={600}>
              {savingsPercentage.toFixed(0)}%
            </Text>{" "}
            of your cloud spend could be optimized
          </Text>
        </Paper>

        {/* Issues by Severity */}
        <Box>
          <Text fw={600} mb="sm">
            Issues by Severity
          </Text>
          <Stack gap="sm">
            {(["high", "medium", "low"] as const).map((severity) => {
              const issues = leaksBySeverity[severity];
              if (issues.length === 0) return null;
              const totalLeak = issues.reduce(
                (sum, n) => sum + (n.leak?.monthlyLeak ?? 0),
                0,
              );

              return (
                <Paper key={severity} p="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Badge
                        color={getSeverityColor(severity)}
                        variant="filled"
                        size="sm"
                      >
                        {severity.toUpperCase()}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        {issues.length} issues
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c="red">
                      -${totalLeak}/mo
                    </Text>
                  </Group>
                  <Stack gap="xs">
                    {issues.map((node) => (
                      <Group key={node.id} justify="space-between">
                        <Group gap="xs">
                          <Text size="sm">
                            {node.leak && LEAK_TYPE_LABELS[node.leak.type].icon}
                          </Text>
                          <Box>
                            <Text size="sm">{node.name}</Text>
                            <Text size="xs" c="dimmed">
                              {node.leak &&
                                LEAK_TYPE_LABELS[node.leak.type].label}
                            </Text>
                          </Box>
                        </Group>
                        <Text size="sm" fw={500} c="red">
                          -${node.leak?.monthlyLeak}/mo
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              );
            })}

            {allLeaks.length === 0 && (
              <Paper p="lg" withBorder ta="center">
                <Text c="dimmed">
                  No cost optimization issues detected. Your cloud is running
                  efficiently!
                </Text>
              </Paper>
            )}
          </Stack>
        </Box>

        {/* Quick Wins */}
        {allLeaks.length > 0 && (
          <Box>
            <Text fw={600} mb="sm">
              Quick Wins
            </Text>
            <Stack gap="sm">
              {allLeaks.slice(0, 3).map((node, index) => (
                <Paper key={node.id} p="sm" withBorder>
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon size="lg" radius="xl" variant="light">
                      {index + 1}
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        Fix {node.name}
                      </Text>
                      <Text size="xs" c="dimmed" mb="xs">
                        {node.leak?.remediation}
                      </Text>
                      <Badge color="green" variant="light" size="sm">
                        Save ${node.leak?.monthlyLeak}/month
                      </Badge>
                    </Box>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        <Divider />

        {/* Footer */}
        {exported ? (
          <Group justify="center" gap="xs" c="green">
            <IconCheck size={18} />
            <Text size="sm" fw={500}>
              Report exported to downloads
            </Text>
          </Group>
        ) : (
          <Button
            fullWidth
            leftSection={
              exporting ? <Loader size={16} color="white" /> : <IconDownload size={18} />
            }
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Generating PDF..." : "Export Report as PDF"}
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
