import { useEffect, useState } from "react";

type Props = {
  isLoading: boolean;
};

const LOADING_STAGES = [
  "Connecting to your cloud...",
  "Reverse engineering architecture...",
  "Analyzing resource utilization...",
  "Hunting for zombie resources...",
  "Detecting cost leaks...",
];

export default function ArchyLoadingOverlay({ isLoading }: Props) {
  const [currentStage, setCurrentStage] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0);
      setFadeIn(true);
      return;
    }

    let stageIndex = 0;
    const nextStage = () => {
      setFadeIn(false);
      setTimeout(() => {
        stageIndex = (stageIndex + 1) % LOADING_STAGES.length;
        setCurrentStage(stageIndex);
        setFadeIn(true);
      }, 200);
    };

    const interval = setInterval(nextStage, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="scan-overlay">
      <div className="scan-content">
        {/* Logo */}
        <h1 className="scan-logo">Archy</h1>

        {/* Scanning animation */}
        <div className="scan-animation">
          <div className="scan-circle">
            <div className="scan-circle-inner"></div>
            <div className="scan-line"></div>
          </div>
          <div className="scan-pulse"></div>
          <div className="scan-pulse scan-pulse-2"></div>
        </div>

        {/* Message */}
        <p className={`scan-message ${fadeIn ? "fade-in" : "fade-out"}`}>
          {LOADING_STAGES[currentStage]}
        </p>
      </div>

      <style>{`
        .scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          z-index: 100;
        }

        .scan-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
        }

        .scan-logo {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(135deg, #0078d4 0%, #00b4d8 50%, #7b2cbf 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          letter-spacing: -1px;
        }

        .scan-animation {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scan-circle {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0078d4 0%, #00b4d8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 120, 212, 0.3);
        }

        .scan-circle-inner {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          position: relative;
          overflow: hidden;
        }

        .scan-circle-inner::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          background: #0078d4;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .scan-line {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 50%;
          height: 2px;
          background: linear-gradient(90deg, #0078d4 0%, transparent 100%);
          transform-origin: left center;
          animation: radar-sweep 2s linear infinite;
        }

        .scan-pulse {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid #0078d4;
          animation: pulse-ring 2s ease-out infinite;
        }

        .scan-pulse-2 {
          animation-delay: 1s;
        }

        .scan-message {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
          min-height: 1.5rem;
          transition: opacity 0.2s ease;
        }

        .scan-message.fade-in {
          opacity: 1;
        }

        .scan-message.fade-out {
          opacity: 0;
        }

        @keyframes radar-sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
