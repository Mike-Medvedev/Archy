import { useEffect, useState } from 'react';
import styles from './ArchyLoadingOverlay.module.css';

type Props = {
    isLoading: boolean;
};

const LOADING_STAGES = [
    { message: "🔍 Scanning Azure infrastructure...", duration: 1000 },
    { message: "🔗 Mapping service connections...", duration: 1500 },
    { message: "💰 Analyzing costs and usage...", duration: 1200 },
    { message: "🏗️ Building architecture diagram...", duration: 800 },
];

export default function ArchyLoadingOverlay({ isLoading }: Props) {
    const [currentStage, setCurrentStage] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setCurrentStage(0);
            return;
        }

        let stageIndex = 0;
        const nextStage = () => {
            stageIndex = (stageIndex + 1) % LOADING_STAGES.length;
            setCurrentStage(stageIndex);
        };

        // Cycle through stages
        const interval = setInterval(nextStage, 1500);

        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading) return null;

    const stage = LOADING_STAGES[currentStage];

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className={styles.logoContainer}>
                    <div className={styles.archyLogo}>
                        <span className={styles.logoText}>Archy</span>
                        <div className={styles.scanLine} />
                    </div>
                </div>
                
                <div className={styles.messageContainer}>
                    <div className={styles.message} key={currentStage}>
                        {stage.message}
                    </div>
                </div>

                <div className={styles.progressBar}>
                    <div className={styles.progressFill} />
                </div>

                <div className={styles.dots}>
                    {LOADING_STAGES.map((_, index) => (
                        <div
                            key={index}
                            className={`${styles.dot} ${index === currentStage ? styles.dotActive : ''}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
