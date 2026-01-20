import useAzureAuth from "../hooks/useAzureAuth";
import useSubscriptions from "../hooks/useSubscriptions";
import { useAppStore } from "../store";

export default function SubscriptionSelect() {
    const { isAuthenticated } = useAzureAuth();
    const { isLoading, error } = useSubscriptions();
    const subscriptions = useAppStore((state) => state.subscriptions);
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId,
    );
    const setSelectedSubscriptionId = useAppStore(
        (state) => state.setSelectedSubscriptionId,
    );

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="subscriptionSelect">
            <label className="subscriptionLabel" htmlFor="subscription-select">
                Subscription
            </label>
            <select
                id="subscription-select"
                className="subscriptionInput"
                value={selectedSubscriptionId ?? ""}
                onChange={(event) =>
                    setSelectedSubscriptionId(
                        event.target.value ? event.target.value : null,
                    )
                }
                disabled={isLoading}
            >
                <option value="" disabled>
                    {isLoading ? "Loading..." : "Select subscription"}
                </option>
                {subscriptions.map((subscription) => (
                    <option key={subscription.subscriptionId} value={subscription.subscriptionId}>
                        {subscription.displayName}
                    </option>
                ))}
            </select>
            {error ? <span className="subscriptionError">Failed to load.</span> : null}
        </div>
    );
}
