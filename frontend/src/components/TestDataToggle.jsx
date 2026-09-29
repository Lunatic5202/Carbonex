import React from 'react';
import { FlaskConical, Radio } from 'lucide-react';
import { useDataSource } from '../lib/dataSource';

/**
 * Global LIVE FEED / TEST DATA switch. Drives the live monitor, analytics, and
 * event replay from the same data source.
 */
export default function TestDataToggle() {
  const { isTest, toggle } = useDataSource();

  return (
    <button
      type="button"
      className={isTest ? 'data-source-toggle is-test' : 'data-source-toggle'}
      onClick={toggle}
      aria-pressed={isTest}
      title={
        isTest
          ? 'Showing generated test telemetry. Click to switch back to live hardware feed.'
          : 'Showing live hardware telemetry. Click to switch to generated test data.'
      }
    >
      <span className="data-source-toggle-track" aria-hidden="true">
        <span className="data-source-toggle-thumb" />
      </span>
      <span className="data-source-toggle-label">
        {isTest ? <FlaskConical size={13} /> : <Radio size={13} />}
        {isTest ? 'TEST DATA' : 'LIVE FEED'}
      </span>
    </button>
  );
}
