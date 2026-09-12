import React, { useState } from 'react';
import { motion } from 'motion/react';
import Reveal from './Reveal';
import { FileSpreadsheet, Upload, Download, CheckCircle, Search } from 'lucide-react';

export default function BatchCsvScorer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [filterBand, setFilterBand] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Handle file select
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Run Batch Scoring via Python Model API
  const runBatchScoring = async (useDefault = false) => {
    setLoading(true);
    try {
      let res;
      if (useDefault || !file) {
        // Run with default 365 dataset
        res = await fetch('/api/batch-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/api/batch-score', {
          method: 'POST',
          body: formData
        });
      }

      if (res.ok) {
        const data = await res.json();
        setBatchResult(data);
      } else {
        const err = await res.json();
        alert(`Scoring error: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error in batch scoring:', err);
      alert('Failed to connect to Python scoring engine.');
    } finally {
      setLoading(false);
    }
  };

  // Filter results
  const sampleRows = (batchResult?.sample_results || []).filter(row => {
    const matchesBand = filterBand === 'ALL' || row.predicted_risk_band === filterBand;
    const matchesSearch = !searchTerm || 
      row.node_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.day?.toString().includes(searchTerm);
    return matchesBand && matchesSearch;
  });

  const getStatusColor = (band) => {
    switch (band) {
      case 'CRITICAL': return 'var(--lime)';
      case 'WARNING': return 'var(--orange)';
      case 'WATCH': return 'var(--orange)';
      default: return 'var(--cyan)';
    }
  };

  const exportScoredCsv = () => {
    if (!batchResult?.sample_results?.length) return;
    const headers = Object.keys(batchResult.sample_results[0]).join(',');
    const rows = batchResult.sample_results.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scored_subsidence_sensor_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Upload and Configuration Card */}
      <Reveal className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={22} color="var(--cyan)" />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
              Batch CSV Scorer & High-Throughput Model Ingestion
            </h3>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Engine: 3-Layer Unsupervised Isolation Forest Pipeline
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Drag & Drop File Zone */}
          <div style={{
            border: '2px dashed var(--line)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            background: 'color-mix(in srgb, var(--panel) 60%, transparent)',
            cursor: 'pointer'
          }}>
            <Upload size={32} color="var(--cyan)" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '600', marginBottom: '4px' }}>
              {file ? file.name : 'Select or Drop CSV Sensor Telemetry File'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              Requires columns: node_id, day, tilt_deg, displacement_mm, strain_microstrain, vibration_mms
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              style={{
                background: 'var(--line)',
                color: 'var(--text)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid var(--line)'
              }}
            >
              Browse Local Files
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => runBatchScoring(false)}
              disabled={loading || !file}
              style={{
                background: file ? 'linear-gradient(135deg, var(--cyan) 0%, var(--lime) 100%)' : 'var(--line)',
                color: file ? 'var(--bg)' : 'var(--muted)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: file && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: file ? '0 0 20px color-mix(in srgb, var(--cyan) 40%, transparent)' : 'none'
              }}
            >
              <CheckCircle size={18} />
              <span>{loading ? 'SCORING BATCH DATASET...' : 'SCORE UPLOADED CSV FILE'}</span>
            </button>

            <button
              onClick={() => runBatchScoring(true)}
              disabled={loading}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                color: 'var(--cyan)',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>SCORE DEFAULT 365-DAY SENSOR DATASET</span>
            </button>
          </div>
        </div>
      </Reveal>

      {/* Results Section */}
      {batchResult && (
        <Reveal className="glass-card" style={{ padding: '24px' }}>
          {/* Summary Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Records Evaluated</div>
              <motion.div key={batchResult.total_rows} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ fontSize: '29px', fontWeight: '900', color: 'var(--cyan)', }}>
                {batchResult.total_rows?.toLocaleString()}
              </motion.div>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Normal Nominal Rows</div>
              <motion.div key={batchResult.band_counts?.NORMAL} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }} style={{ fontSize: '29px', fontWeight: '900', color: 'var(--cyan)', }}>
                {batchResult.band_counts?.NORMAL || 0}
              </motion.div>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Watch / Warning Rows</div>
              <motion.div key={(batchResult.band_counts?.WATCH || 0) + (batchResult.band_counts?.WARNING || 0)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }} style={{ fontSize: '29px', fontWeight: '900', color: 'var(--orange)', }}>
                {(batchResult.band_counts?.WATCH || 0) + (batchResult.band_counts?.WARNING || 0)}
              </motion.div>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Critical Hazard Rows</div>
              <motion.div key={batchResult.band_counts?.CRITICAL} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }} style={{ fontSize: '29px', fontWeight: '900', color: 'var(--lime)', }}>
                {batchResult.band_counts?.CRITICAL || 0}
              </motion.div>
            </div>
          </div>

          {/* Table Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'NORMAL', 'WATCH', 'WARNING', 'CRITICAL'].map(band => (
                <button
                  key={band}
                  onClick={() => setFilterBand(band)}
                  style={{
                    background: filterBand === band ? 'var(--cyan)' : 'var(--panel)',
                    color: filterBand === band ? 'var(--bg)' : 'var(--muted)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {band}
                </button>
              ))}
            </div>

            {/* Search and Export */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                <Search size={14} color="var(--muted)" />
                <input
                  type="text"
                  placeholder="Filter Node or Day..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    width: '130px'
                  }}
                />
              </div>

              <button
                onClick={exportScoredCsv}
                style={{
                  background: 'var(--cyan)',
                  border: 'none',
                  color: 'var(--text)',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontWeight: '700',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Scored Data Table */}
          <div style={{
            overflowX: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            maxHeight: '440px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--panel)', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Node</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Day</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tilt (°)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Disp (mm)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Strain (µε)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Vib (mm/s)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Risk Score</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Predicted Band</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      background: row.predicted_risk_band === 'CRITICAL' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '8px 14px', color: 'var(--cyan)', fontWeight: '700', }}>
                      {row.node_id}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text)', }}>
                      {row.day}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text)', }}>
                      {row.tilt_deg?.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text)', }}>
                      {row.displacement_mm?.toFixed(1)}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text)', }}>
                      {row.strain_microstrain?.toFixed(0)}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text)', }}>
                      {row.vibration_mms?.toFixed(2)}
                    </td>
                    <td style={{
                      padding: '8px 14px',
                      fontWeight: '800',
                      color: getStatusColor(row.predicted_risk_band)
                    }}>
                      {row.predicted_risk_score?.toFixed(1)}
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{
                        background: `${getStatusColor(row.predicted_risk_band)}22`,
                        color: getStatusColor(row.predicted_risk_band),
                        border: `1px solid ${getStatusColor(row.predicted_risk_band)}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '800',
                        fontSize: '12px'
                      }}>
                        {row.predicted_risk_band}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
