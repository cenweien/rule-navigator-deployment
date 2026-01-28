import { useState } from 'react';
import { useChatStore } from '@/hooks/useChatStore';
import { AppSidebar } from '@/components/AppSidebar';
import { HeaderBar } from '@/components/HeaderBar';
import { ChatInterface } from '@/components/ChatInterface';
import { DocumentViewer } from '@/components/DocumentViewer';

const Index = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    documentState,
    isDocumentPanelOpen,
    isSplitView,
    isLoading,
    sendMessage,
    openDocument,
    closeDocumentPanel,
    toggleSplitView,
    createNewSession,
    getDocument,
  } = useChatStore();

  const activeDocument = documentState.activeDocument
    ? getDocument(documentState.activeDocument)
    : null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewSession={createNewSession}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar
          sessionTitle={activeSession.title}
          isSplitView={isSplitView}
          onToggleSplitView={toggleSplitView}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className={`flex-1 min-w-0 ${isSplitView ? 'lg:w-1/2' : ''}`}>
            <ChatInterface
              messages={activeSession.messages}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              onCitationClick={openDocument}
            />
          </div>

          {/* Document Viewer */}
          <DocumentViewer
            isOpen={isDocumentPanelOpen || isSplitView}
            isSplitView={isSplitView}
            documentState={documentState}
            document={activeDocument}
            onClose={closeDocumentPanel}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
