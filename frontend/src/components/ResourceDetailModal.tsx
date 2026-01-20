import { useEffect, useState, useRef } from "react";
import styles from "./ResourceDetailModal.module.css";
import useAzureAuth from "../hooks/useAzureAuth";

type ParentResource = {
    name: string;
    type: string;
    sku?: string;
};

type ResourceDetail = {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    location?: string;
    sku?: string;
    isExternal?: boolean;
    parentResource?: ParentResource | null;
};

type CostDataProp = {
    resourceId: string;
    cost: number;
    currency: string;
} | null;

type Props = {
    resource: ResourceDetail | null;
    costData: CostDataProp;
    costLoading: boolean;
    onClose: () => void;
};

type AppSettings = {
    properties?: Record<string, string>;
};

type ConnectionStringItem = {
    name: string;
    value: string;
    type: string;
};

type ConnectionStringsResponse = {
    properties?: Record<string, ConnectionStringItem>;
};

export default function ResourceDetailModal({ resource, costData, costLoading, onClose }: Props) {
    const { getAccessToken } = useAzureAuth();
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [connectionStrings, setConnectionStrings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const fetchedResourceIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Early returns for invalid states - no state updates
        if (!resource) return;
        if (resource.isExternal) return;
        if (resource.type !== "Microsoft.Web/sites") return;
        if (fetchedResourceIdRef.current === resource.id) return;

        let cancelled = false;

        const fetchSettings = async () => {
            setLoading(true);
            try {
                const token = await getAccessToken();

                const [appSettingsRes, connStringsRes] = await Promise.all([
                    fetch(
                        `https://management.azure.com${resource.id}/config/appsettings/list?api-version=2022-03-01`,
                        {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    ),
                    fetch(
                        `https://management.azure.com${resource.id}/config/connectionstrings/list?api-version=2022-03-01`,
                        {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    ),
                ]);

                if (cancelled) return;

                if (appSettingsRes.ok) {
                    const data: AppSettings = await appSettingsRes.json();
                    if (!cancelled) {
                        setSettings(data.properties ?? {});
                    }
                }

                if (connStringsRes.ok) {
                    const data: ConnectionStringsResponse = await connStringsRes.json();
                    const connStrings: Record<string, string> = {};
                    if (data.properties) {
                        for (const [key, value] of Object.entries(data.properties)) {
                            connStrings[key] = value.value;
                        }
                    }
                    if (!cancelled) {
                        setConnectionStrings(connStrings);
                    }
                }

                if (!cancelled) {
                    fetchedResourceIdRef.current = resource.id;
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Error fetching resource settings:", error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchSettings();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resource]);

    if (!resource) return null;

    const portalUrl = resource.isExternal
        ? null
        : `https://portal.azure.com/#@/resource${resource.id}`;

    const allSettings = { ...settings, ...connectionStrings };
    const hasSettings = Object.keys(allSettings).length > 0;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>{resource.name}</h2>
                        <p className={styles.subtitle}>{resource.typeLabel}</p>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Basic Info */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Details</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Type:</span>
                                <span className={styles.detailValue}>{resource.type}</span>
                            </div>
                            {resource.location && (
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Location:</span>
                                    <span className={styles.detailValue}>{resource.location}</span>
                                </div>
                            )}
                            {resource.sku && (
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>SKU:</span>
                                    <span className={styles.detailValue}>{resource.sku}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Parent Resource Info */}
                    {resource.parentResource && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>Hosting Platform</h3>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{resource.parentResource.type}:</span>
                                    <span className={styles.detailValue}>
                                        {resource.parentResource.name}
                                        {resource.parentResource.sku && ` (${resource.parentResource.sku})`}
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Azure Portal Link */}
                    {portalUrl && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>Azure Portal</h3>
                            <a
                                href={portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.portalLink}
                            >
                                Open in Azure Portal →
                            </a>
                        </section>
                    )}

                    {/* Settings and Connection Strings */}
                    {loading && <div className={styles.loading}>Loading settings...</div>}
                    
                    {!loading && hasSettings && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                App Settings & Connection Strings
                            </h3>
                            <div className={styles.settingsList}>
                                {Object.entries(allSettings).map(([key, value]) => (
                                    <div key={key} className={styles.settingItem}>
                                        <div className={styles.settingKey}>{key}</div>
                                        <div className={styles.settingValue}>
                                            {value.length > 100 ? `${value.slice(0, 100)}...` : value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {!loading && !hasSettings && resource.type === "Microsoft.Web/sites" && (
                        <section className={styles.section}>
                            <p className={styles.emptyState}>No app settings or connection strings configured</p>
                        </section>
                    )}

                    {/* Cost Information */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Cost Information</h3>
                        <div className={styles.costInfo}>
                    {!resource.isExternal && (
                        <>
                            {costLoading && (
                                <div className={styles.costCard}>
                                    <div className={styles.costLabel}>Month-to-Date Cost</div>
                                    <div className={styles.costAmount}>Loading...</div>
                                </div>
                            )}
                            
                            {!costLoading && costData && (
                                <div className={styles.costCard}>
                                    <div className={styles.costLabel}>Month-to-Date Cost (Near Real-Time)</div>
                                    <div className={styles.costAmount}>
                                        {costData.currency} ${costData.cost.toFixed(2)}
                                    </div>
                                    {costData.cost === 0 && (
                                        <div className={styles.costNote}>
                                            No cost data yet. Data refreshes every 4-8 hours. New resources or recent usage may not appear immediately.
                                        </div>
                                    )}
                                    {costData.cost > 0 && (
                                        <div className={styles.costNote}>
                                            Updated every 4-8 hours. May take up to 24 hours for recent charges to appear.
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {!costLoading && !costData && (
                                <div className={styles.costCard}>
                                    <div className={styles.costLabel}>Cost Data</div>
                                    <div className={styles.costNote}>
                                        No cost data available for this resource. Data refreshes every 4-8 hours.
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                            
                            <p className={styles.costText}>
                                SKU: <strong>{resource.sku || "N/A"}</strong>
                            </p>
                            
                            {resource.sku && !resource.isExternal && (
                                <a
                                    href={`https://azure.microsoft.com/en-us/pricing/calculator/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.calculatorLink}
                                >
                                    Open Azure Pricing Calculator →
                                </a>
                            )}
                            
                            {!resource.isExternal && (
                                <p className={styles.costNote}>
                                    💡 Cost data refreshes every 4-8 hours via Azure Cost Management API. For detailed analysis, use Azure Cost Management in the portal.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* External Service Note */}
                    {resource.isExternal && (
                        <section className={styles.section}>
                            <div className={styles.externalNote}>
                                <strong>External Service</strong>
                                <p>This service is hosted outside of Azure. Costs are managed separately.</p>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
