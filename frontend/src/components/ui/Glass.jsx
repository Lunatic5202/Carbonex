export default function Glass({ className = '', children }) {
  return (
    <div className={`glass-container ${className}`}>
      <div className="glass-filter" />
      <div className="glass-overlay" />
      <div className="glass-specular" />
      <div className="glass-content">{children}</div>
    </div>
  );
}