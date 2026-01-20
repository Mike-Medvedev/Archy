import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAppStore } from "../store";

export type CostData = {
    resourceId: string;
    cost: number;
    currency: string;
};

// Mock cost data for our mock services
const MOCK_COSTS: Record<string, number> = {
    // E-commerce Platform
    "ecom-frontend": 45.50,
    "ecom-api-gateway": 120.00,
    "ecom-auth-api": 35.25,
    "ecom-products-api": 89.75,
    "ecom-orders-api": 156.30,
    "ecom-worker": 67.80,
    "ecom-db-users": 230.00,
    "ecom-db-products": 185.50,
    "ecom-db-orders": 420.00,
    "ecom-cache": 95.00,
    "ecom-queue": 28.40,
    "ecom-stripe": 0, // External service (billed separately)
    
    // SaaS Analytics Platform
    "saas-dashboard": 32.00,
    "saas-api": 145.60,
    "saas-ingest-api": 210.00,
    "saas-etl-worker": 380.00,
    "saas-report-worker": 125.50,
    "saas-timeseries-db": 560.00,
    "saas-metadata-db": 75.25,
    "saas-query-cache": 110.00,
    "saas-event-queue": 65.80,
    "saas-sendgrid": 0, // External service
    
    // Chat Application (Staging)
    "chat-web": 12.50,
    "chat-api": 28.75,
    "chat-presence-api": 18.90,
    "chat-notification-worker": 8.60,
    "chat-messages-db": 45.00,
    "chat-presence-cache": 22.30,
    "chat-notification-queue": 5.40,
    "chat-firebase": 0, // External service
};

/**
 * Returns mock cost data for our mock services
 */
export default function useSubscriptionCosts() {
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId,
    );

    const queryKey = useMemo(
        () => ["subscriptionCosts", "mock", selectedSubscriptionId],
        [selectedSubscriptionId],
    );

    const query = useQuery({
        queryKey,
        enabled: Boolean(selectedSubscriptionId),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            // Simulate a small delay for realism
            await new Promise(resolve => setTimeout(resolve, 500));

            // Build map of resourceId -> cost
            const costMap = new Map<string, CostData>();

            for (const [resourceId, cost] of Object.entries(MOCK_COSTS)) {
                const costEntry: CostData = {
                    resourceId,
                    cost,
                    currency: "USD"
                };
                costMap.set(resourceId, costEntry);
            }

            console.log(`Mock cost data loaded: ${costMap.size} services`);

            return costMap;
        },
    });

    return query;
}
