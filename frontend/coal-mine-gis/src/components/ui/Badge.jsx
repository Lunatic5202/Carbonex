import { statusLabel } from "../../utils/riskUtils";

export default function Badge({ status, children }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className={`dot dot-${status}`} />
      {children || statusLabel(status)}
    </span>
  );
}
