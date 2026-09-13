import { Radio } from "lucide-react";
import SystemStatus from "../panels/SystemStatus";

export default function StatusBar({ systemStatus, live = false }) {
  return (
    <footer className="status-bar">
      <SystemStatus systemStatus={systemStatus} />

      <span className="status-bar-spacer" />

      <span className={`demo-flag${live ? " demo-flag-live" : ""}`}>
        <Radio size={11} />
        {live
          ? "LIVE CARBONEX FEED · realtime risk from /api"
          : "LIVE SIMULATION · demo data"}
      </span>
    </footer>
  );
}
