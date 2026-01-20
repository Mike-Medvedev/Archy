import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import useAzureAuth from "./useAzureAuth";
import { useAppStore } from "../store";

export type CostData = {
    resourceId: string;
    cost: number;
    currency: string;
};

/**
 * Fetches costs for ALL resources in a subscription with a single API call
 * Returns a map of resourceId -> cost data for instant lookup
 */
export default function useSubscriptionCosts() {
    const { isAuthenticated, getAccessToken, account } = useAzureAuth();
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId,
    );

    const queryKey = useMemo(
        () => ["subscriptionCosts", account?.homeAccountId, selectedSubscriptionId],
        [account?.homeAccountId, selectedSubscriptionId],
    );

    const query = useQuery({
        queryKey,
        enabled: isAuthenticated && Boolean(selectedSubscriptionId),
        staleTime: 10 * 60 * 1000, // 10 minutes (costs update every 4-8 hours anyway)
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            if (!selectedSubscriptionId) return new Map<string, CostData>();

            try {
                const token = await getAccessToken();

                // Query for ALL resources in the subscription at once
                const costQuery = {
                    type: "ActualCost",
                    timeframe: "MonthToDate",
                    dataset: {
                        granularity: "None",
                        aggregation: {
                            totalCost: {
                                name: "Cost",
                                function: "Sum"
                            }
                        },
                        grouping: [
                            {
                                type: "Dimension",
                                name: "ResourceId"
                            }
                        ]
                        // No filter - get ALL resources
                    }
                };

                console.log('Fetching ALL subscription costs in one batch...');

                const response = await fetch(
                    `https://management.azure.com/subscriptions/${selectedSubscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(costQuery)
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Batch cost fetch error:', response.status, errorText);
                    
                    if (response.status === 403) {
                        console.warn('Permission denied for cost data. You need Cost Management Reader role.');
                    }
                    
                    return new Map<string, CostData>();
                }

                const result = await response.json();
                
                // Parse the response
                const rows = result?.properties?.rows || [];
                const columns = result?.properties?.columns || [];

                const costColumnIndex = columns.findIndex((col: { name: string }) => col.name === "Cost");
                const resourceIdIndex = columns.findIndex((col: { name: string }) => col.name === "ResourceId");
                const currencyIndex = columns.findIndex((col: { name: string }) => col.name === "Currency");

                // Build map of resourceId -> cost
                const costMap = new Map<string, CostData>();

                for (const row of rows) {
                    if (costColumnIndex >= 0 && resourceIdIndex >= 0) {
                        const resourceId = row[resourceIdIndex];
                        const cost = row[costColumnIndex] || 0;
                        const currency = currencyIndex >= 0 ? row[currencyIndex] : "USD";

                        // Store with original ID AND lowercase version for matching
                        const costEntry = {
                            resourceId: resourceId,
                            cost: typeof cost === "number" ? cost : parseFloat(cost) || 0,
                            currency: currency || "USD"
                        };

                        // Store with both original casing and lowercase for flexible matching
                        costMap.set(resourceId, costEntry);
                        costMap.set(resourceId.toLowerCase(), costEntry);
                    }
                }

                console.log(`Batch cost fetch complete: ${costMap.size / 2} resources with cost data (stored with case-insensitive keys)`);
                console.log('Sample cost entries:', Array.from(costMap.entries()).slice(0, 6).map(([id, data]) => ({ 
                    id, 
                    cost: data.cost,
                    currency: data.currency 
                })));

                return costMap;
            } catch (error) {
                console.error("Error fetching subscription costs:", error);
                return new Map<string, CostData>();
            }
        },
    });

    return query;
}
