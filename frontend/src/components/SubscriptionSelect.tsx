import useSubscriptions from "../hooks/useSubscriptions";
import { useAppStore } from "../store";

export default function SubscriptionSelect() {
    const { isLoading, error } = useSubscriptions();
    const subscriptions = useAppStore((state) => state.subscriptions);
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId,
    );
    const setSelectedSubscriptionId = useAppStore(
        (state) => state.setSelectedSubscriptionId,
    );

    return (
        <div className="subscriptionSelect">
            <label className="subscriptionLabel" htmlFor="subscription-select">
                Environment
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
                    {isLoading ? "Loading..." : "Select environment"}
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
