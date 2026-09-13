import { X } from "lucide-react";

export default function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 12, 13, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width, maxWidth: "90vw", boxShadow: "var(--shadow-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header" style={{ cursor: "default" }}>
          <span className="panel-title">{title}</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}
