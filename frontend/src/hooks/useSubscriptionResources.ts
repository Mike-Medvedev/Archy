import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAzureAuth from "./useAzureAuth";
import { useAppStore } from "../store";
import useCanvasStore from "../store";
import type { Node } from "@xyflow/react";

type ArmResource = {
    id: string;
    name: string;
    type: string;
    location?: string;
};

type ResourcesResponse = {
    value: ArmResource[];
};

const API_VERSION = "2021-04-01";

const buildNodesFromResources = (resources: ArmResource[]): Node[] => {
    const grouped = resources.reduce<Record<string, number>>((acc, resource) => {
        acc[resource.type] = (acc[resource.type] ?? 0) + 1;
        return acc;
    }, {});

    const entries = Object.entries(grouped);
    const columns = 3;
    const gapX = 260;
    const gapY = 140;

    return entries.map(([type, count], index) => ({
        id: `type-${index}`,
        position: {
            x: (index % columns) * gapX,
            y: Math.floor(index / columns) * gapY,
        },
        data: { label: `${type} (${count})` },
    }));
};

export default function useSubscriptionResources() {
    const { isAuthenticated, getAccessToken, account } = useAzureAuth();
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId,
    );
    const setNodes = useCanvasStore((state) => state.setNodes);
    const setEdges = useCanvasStore((state) => state.setEdges);

    const queryKey = useMemo(
        () => ["subscriptionResources", account?.homeAccountId, selectedSubscriptionId],
        [account?.homeAccountId, selectedSubscriptionId],
    );

    const query = useQuery({
        queryKey,
        enabled: isAuthenticated && Boolean(selectedSubscriptionId),
        queryFn: async () => {
            if (!selectedSubscriptionId) return [];
            const token = await getAccessToken();
            const response = await fetch(
                `https://management.azure.com/subscriptions/${selectedSubscriptionId}/resources?api-version=${API_VERSION}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`ARM error: ${response.status}`);
            }

            const data: ResourcesResponse = await response.json();
            return data.value ?? [];
        },
    });

    useEffect(() => {
        if (!query.data) return;
        const nodes = buildNodesFromResources(query.data);
        setNodes(nodes);
        setEdges([]);
    }, [query.data, setEdges, setNodes]);

    return query;
}
