import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShowReconnect(true);
      // Tell service worker to replay queued mutations
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage("REPLAY_MUTATIONS");
      }
      setTimeout(() => setShowReconnect(false), 4000);
    };
    const goOffline = () => {
      setOnline(false);
      setShowReconnect(false);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Listen for service worker messages
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "MUTATIONS_REPLAYED") {
        // Could trigger a refresh of data here
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, []);

  if (online && !showReconnect) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium transition-all duration-300 ${
        online
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white animate-pulse"
      }`}
    >
      {online ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Conexión restaurada — sincronizando...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Sin conexión — los cambios se guardarán localmente</span>
        </>
      )}
    </div>
  );
}
