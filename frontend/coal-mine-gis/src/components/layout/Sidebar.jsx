import LayerControl from "../panels/LayerControl";
import Legend from "../panels/Legend";

export default function Sidebar({ layers, onToggleLayer, sidebarOpen }) {
  return (
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <LayerControl layers={layers} onToggleLayer={onToggleLayer} />
      <Legend layers={layers} />
    </aside>
  );
}
