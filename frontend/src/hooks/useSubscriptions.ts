import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import useAzureAuth from "./useAzureAuth";
import { useAppStore, type AzureSubscription } from "../store";

const SUBSCRIPTIONS_ENDPOINT =
    "https://management.azure.com/subscriptions?api-version=2020-01-01";

type SubscriptionsResponse = {
    value: AzureSubscription[];
};

export default function useSubscriptions() {
    const { isAuthenticated, getAccessToken, account } = useAzureAuth();
    const setSubscriptions = useAppStore((state) => state.setSubscriptions);

    const query = useQuery({
        queryKey: ["subscriptions", account?.homeAccountId],
        enabled: isAuthenticated,
        queryFn: async () => {
            const token = await getAccessToken();
            const response = await fetch(SUBSCRIPTIONS_ENDPOINT, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`ARM error: ${response.status}`);
            }

            const data: SubscriptionsResponse = await response.json();
            return data.value ?? [];
        },
    });

    useEffect(() => {
        if (query.data) {
            setSubscriptions(query.data);
        }
    }, [query.data, setSubscriptions]);

    return query;
}
