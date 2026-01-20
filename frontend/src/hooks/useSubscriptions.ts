import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore, type AzureSubscription } from "../store";

// Mock subscriptions
const MOCK_SUBSCRIPTIONS: AzureSubscription[] = [
    {
        subscriptionId: "mock-sub-demo-001",
        displayName: "Demo Environment",
    },
];

export default function useSubscriptions() {
    const setSubscriptions = useAppStore((state) => state.setSubscriptions);

    const query = useQuery({
        queryKey: ["subscriptions", "mock"],
        enabled: true, // Always enabled for mock data
        queryFn: async () => {
            // Small delay for realism
            await new Promise(resolve => setTimeout(resolve, 300));
            return MOCK_SUBSCRIPTIONS;
        },
    });

    useEffect(() => {
        if (query.data) {
            setSubscriptions(query.data);
        }
    }, [query.data, setSubscriptions]);

    return query;
}
