import { useState } from 'react';
import useCanvasStore from '../store';
import { getLeaksBySeverity, LEAK_TYPE_LABELS } from '../lib/canonicalGraph';
import styles from './ScanReportModal.module.css';

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
    const allLeaks = [...leaksBySeverity.high, ...leaksBySeverity.medium, ...leaksBySeverity.low];

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleExport = async () => {
        setExporting(true);
        // Simulate export
        await new Promise(resolve => setTimeout(resolve, 1500));
        setExporting(false);
        setExported(true);
    };

    const savingsPercentage = leakingSummary.totalMonthlyCost > 0 
        ? ((leakingSummary.totalMonthlyLeak / leakingSummary.totalMonthlyCost) * 100).toFixed(0)
        : 0;

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Cloud Cost Scan Report</h2>
                        <p className={styles.subtitle}>
                            Generated on {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Summary Cards */}
                    <section className={styles.summarySection}>
                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryCard}>
                                <div className={styles.summaryIcon}>🔍</div>
                                <div className={styles.summaryValue}>{leakingSummary.totalResources}</div>
                                <div className={styles.summaryLabel}>Resources Scanned</div>
                            </div>
                            
                            <div className={styles.summaryCard} data-type="warning">
                                <div className={styles.summaryIcon}>⚠️</div>
                                <div className={styles.summaryValue}>{leakingSummary.leakingCount}</div>
                                <div className={styles.summaryLabel}>Issues Found</div>
                            </div>
                            
                            <div className={styles.summaryCard} data-type="danger">
                                <div className={styles.summaryIcon}>💸</div>
                                <div className={styles.summaryValue}>${leakingSummary.totalMonthlyLeak}</div>
                                <div className={styles.summaryLabel}>Monthly Waste</div>
                            </div>
                            
                            <div className={styles.summaryCard} data-type="danger">
                                <div className={styles.summaryIcon}>📅</div>
                                <div className={styles.summaryValue}>${(leakingSummary.totalMonthlyLeak * 12).toLocaleString()}</div>
                                <div className={styles.summaryLabel}>Yearly Impact</div>
                            </div>
                        </div>
                    </section>

                    {/* Savings Potential */}
                    <section className={styles.savingsSection}>
                        <div className={styles.savingsBar}>
                            <div className={styles.savingsProgress} style={{ width: `${savingsPercentage}%` }}></div>
                        </div>
                        <div className={styles.savingsText}>
                            <strong>{savingsPercentage}%</strong> of your cloud spend could be optimized
                        </div>
                    </section>

                    {/* Issues by Severity */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Issues by Severity</h3>
                        
                        {leaksBySeverity.high.length > 0 && (
                            <div className={styles.severityGroup} data-severity="high">
                                <div className={styles.severityHeader}>
                                    <span className={styles.severityBadge}>HIGH</span>
                                    <span className={styles.severityCount}>{leaksBySeverity.high.length} issues</span>
                                    <span className={styles.severityAmount}>
                                        -${leaksBySeverity.high.reduce((sum, n) => sum + (n.leak?.monthlyLeak ?? 0), 0)}/mo
                                    </span>
                                </div>
                                <div className={styles.issueList}>
                                    {leaksBySeverity.high.map(node => (
                                        <div key={node.id} className={styles.issueItem}>
                                            <span className={styles.issueIcon}>
                                                {node.leak && LEAK_TYPE_LABELS[node.leak.type].icon}
                                            </span>
                                            <div className={styles.issueInfo}>
                                                <div className={styles.issueName}>{node.name}</div>
                                                <div className={styles.issueType}>
                                                    {node.leak && LEAK_TYPE_LABELS[node.leak.type].label}
                                                </div>
                                            </div>
                                            <div className={styles.issueAmount}>-${node.leak?.monthlyLeak}/mo</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {leaksBySeverity.medium.length > 0 && (
                            <div className={styles.severityGroup} data-severity="medium">
                                <div className={styles.severityHeader}>
                                    <span className={styles.severityBadge}>MEDIUM</span>
                                    <span className={styles.severityCount}>{leaksBySeverity.medium.length} issues</span>
                                    <span className={styles.severityAmount}>
                                        -${leaksBySeverity.medium.reduce((sum, n) => sum + (n.leak?.monthlyLeak ?? 0), 0)}/mo
                                    </span>
                                </div>
                                <div className={styles.issueList}>
                                    {leaksBySeverity.medium.map(node => (
                                        <div key={node.id} className={styles.issueItem}>
                                            <span className={styles.issueIcon}>
                                                {node.leak && LEAK_TYPE_LABELS[node.leak.type].icon}
                                            </span>
                                            <div className={styles.issueInfo}>
                                                <div className={styles.issueName}>{node.name}</div>
                                                <div className={styles.issueType}>
                                                    {node.leak && LEAK_TYPE_LABELS[node.leak.type].label}
                                                </div>
                                            </div>
                                            <div className={styles.issueAmount}>-${node.leak?.monthlyLeak}/mo</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {leaksBySeverity.low.length > 0 && (
                            <div className={styles.severityGroup} data-severity="low">
                                <div className={styles.severityHeader}>
                                    <span className={styles.severityBadge}>LOW</span>
                                    <span className={styles.severityCount}>{leaksBySeverity.low.length} issues</span>
                                    <span className={styles.severityAmount}>
                                        -${leaksBySeverity.low.reduce((sum, n) => sum + (n.leak?.monthlyLeak ?? 0), 0)}/mo
                                    </span>
                                </div>
                                <div className={styles.issueList}>
                                    {leaksBySeverity.low.map(node => (
                                        <div key={node.id} className={styles.issueItem}>
                                            <span className={styles.issueIcon}>
                                                {node.leak && LEAK_TYPE_LABELS[node.leak.type].icon}
                                            </span>
                                            <div className={styles.issueInfo}>
                                                <div className={styles.issueName}>{node.name}</div>
                                                <div className={styles.issueType}>
                                                    {node.leak && LEAK_TYPE_LABELS[node.leak.type].label}
                                                </div>
                                            </div>
                                            <div className={styles.issueAmount}>-${node.leak?.monthlyLeak}/mo</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {allLeaks.length === 0 && (
                            <div className={styles.noIssues}>
                                No cost optimization issues detected. Your cloud is running efficiently!
                            </div>
                        )}
                    </section>

                    {/* Recommendations Summary */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Quick Wins</h3>
                        <div className={styles.recommendations}>
                            {allLeaks.slice(0, 3).map((node, index) => (
                                <div key={node.id} className={styles.recommendation}>
                                    <span className={styles.recommendationNumber}>{index + 1}</span>
                                    <div className={styles.recommendationContent}>
                                        <div className={styles.recommendationTitle}>
                                            Fix {node.name}
                                        </div>
                                        <div className={styles.recommendationText}>
                                            {node.leak?.remediation}
                                        </div>
                                        <div className={styles.recommendationSavings}>
                                            Save ${node.leak?.monthlyLeak}/month
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    {exported ? (
                        <div className={styles.exportedMessage}>
                            ✓ Report exported to downloads
                        </div>
                    ) : (
                        <button 
                            className={styles.exportButton}
                            onClick={handleExport}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Generating PDF...
                                </>
                            ) : (
                                <>
                                    📄 Export Report as PDF
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
