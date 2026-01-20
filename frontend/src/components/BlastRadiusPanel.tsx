import { useState } from 'react';
import useCanvasStore from '../store';
import {
    BLAST_SCENARIOS,
    computeBlastRadius,
    getImpactedServices,
    type BlastScenario,
} from '../lib/canonicalGraph';
import styles from './BlastRadiusPanel.module.css';

export default function BlastRadiusPanel() {
    const [isExpanded, setIsExpanded] = useState(false);
    const canonicalGraph = useCanvasStore((state) => state.canonicalGraph);
    const showNetworkView = useCanvasStore((state) => state.showNetworkView);
    const toggleNetworkView = useCanvasStore((state) => state.toggleNetworkView);
    const selectedBlastScenarioId = useCanvasStore((state) => state.selectedBlastScenarioId);
    const blastRadiusResult = useCanvasStore((state) => state.blastRadiusResult);
    const setBlastScenario = useCanvasStore((state) => state.setBlastScenario);
    const clearBlastRadius = useCanvasStore((state) => state.clearBlastRadius);

    const handleScenarioSelect = (scenario: BlastScenario) => {
        if (!canonicalGraph) return;
        
        if (selectedBlastScenarioId === scenario.id) {
            // Toggle off
            clearBlastRadius();
        } else {
            // Compute blast radius
            const result = computeBlastRadius(canonicalGraph, scenario.startNodeId);
            setBlastScenario(scenario.id, result);
        }
    };

    const impactedServices = canonicalGraph && blastRadiusResult 
        ? getImpactedServices(canonicalGraph, blastRadiusResult)
        : [];

    const selectedScenario = BLAST_SCENARIOS.find(s => s.id === selectedBlastScenarioId);

    return (
        <div className={styles.panel}>
            {/* Network View Toggle */}
            <div className={styles.toggleSection}>
                <label className={styles.toggleLabel}>
                    <input
                        type="checkbox"
                        checked={showNetworkView}
                        onChange={toggleNetworkView}
                        className={styles.toggleInput}
                    />
                    <span className={styles.toggleSwitch} />
                    <span className={styles.toggleText}>Show Network Infrastructure</span>
                </label>
            </div>

            {/* Blast Radius Section */}
            <div className={styles.blastSection}>
                <button 
                    className={styles.sectionHeader}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className={styles.sectionIcon}>💥</span>
                    <span className={styles.sectionTitle}>Blast Radius Simulation</span>
                    <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                </button>

                {isExpanded && (
                    <div className={styles.sectionContent}>
                        <p className={styles.sectionDescription}>
                            Simulate infrastructure changes to see which services are impacted.
                        </p>

                        <div className={styles.scenarioList}>
                            {BLAST_SCENARIOS.map((scenario) => (
                                <button
                                    key={scenario.id}
                                    className={`${styles.scenarioButton} ${
                                        selectedBlastScenarioId === scenario.id ? styles.scenarioActive : ''
                                    }`}
                                    onClick={() => handleScenarioSelect(scenario)}
                                >
                                    <span className={styles.scenarioIcon}>{scenario.icon}</span>
                                    <div className={styles.scenarioInfo}>
                                        <span className={styles.scenarioName}>{scenario.name}</span>
                                        <span className={styles.scenarioDesc}>{scenario.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Impact Results */}
                        {selectedScenario && blastRadiusResult && (
                            <div className={styles.impactResults}>
                                <div className={styles.impactHeader}>
                                    <span className={styles.impactIcon}>⚠️</span>
                                    <span className={styles.impactTitle}>
                                        {impactedServices.length} Service{impactedServices.length !== 1 ? 's' : ''} Impacted
                                    </span>
                                </div>
                                
                                <div className={styles.impactList}>
                                    {impactedServices.map((service) => {
                                        const explanation = blastRadiusResult.explanations.get(service.id);
                                        return (
                                            <div key={service.id} className={styles.impactItem}>
                                                <div className={styles.impactServiceName}>
                                                    {service.name}
                                                </div>
                                                {explanation && (
                                                    <div className={styles.impactExplanation}>
                                                        {explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button 
                                    className={styles.clearButton}
                                    onClick={clearBlastRadius}
                                >
                                    Clear Simulation
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
