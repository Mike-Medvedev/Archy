import { ReactFlowProvider } from "@xyflow/react";
import { CanvasProvider } from "@/store/canvasStore";
import { InfraCanvas } from "@/components/canvas/InfraCanvas";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { ServiceModal } from "@/components/modals/ServiceModal";
import { ConfigModal } from "@/components/modals/ConfigModal";
import { TerraformPreview } from "@/components/preview/TerraformPreview";

function App() {
  return (
    <CanvasProvider>
      <ReactFlowProvider>
        <div className="h-screen w-screen flex overflow-hidden bg-background">
          {/* Main Canvas Area */}
          <InfraCanvas />

          {/* AI Chat Sidebar */}
          <AIChatPanel />

          {/* Modals */}
          <ServiceModal />
          <ConfigModal />
          <TerraformPreview />
        </div>
      </ReactFlowProvider>
    </CanvasProvider>
  );
}

export default App;
