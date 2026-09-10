"""
Subsidence Risk Intelligence - Native Desktop GUI Application
=============================================================
Built with Python's built-in Tkinter library.
Provides:
- Real-time what-if scenario testing with sliders & presets.
- Risk gauge / meter with color-coded 4-tier domain bands.
- Informative geotechnical diagnostic explanations and driver attribution.
- Batch CSV file scorer with dialog file browser.
"""

import os
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
from subsidence_model import SubsidenceSensorFusion, get_risk_band, BAND_NORMAL, BAND_WATCH, BAND_WARNING, BAND_CRITICAL

MODEL_PATH = os.path.join("models", "subsidence_model.joblib")
DATA_PATH = "subsidence_sensor_data_365.csv"


class SubsidenceDesktopApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Subsidence Sensor Fusion AI - Desktop Monitor")
        self.geometry("980x720")
        self.minsize(850, 600)

        # Load or initialize model
        if os.path.exists(MODEL_PATH):
            self.model = SubsidenceSensorFusion.load(MODEL_PATH)
        elif os.path.exists(DATA_PATH):
            df_init = pd.read_csv(DATA_PATH)
            self.model = SubsidenceSensorFusion()
            self.model.fit(df_init, baseline_days=30)
            os.makedirs("models", exist_ok=True)
            self.model.save(MODEL_PATH)
        else:
            messagebox.showerror("Error", "No trained model or training dataset found.")
            sys.exit(1)

        self.nodes = sorted(list(self.model.node_models.keys())) if self.model.node_models else ["Node01"]
        self._setup_theme()
        self._build_ui()
        self._apply_preset("nominal")

    def _setup_theme(self):
        self.style = ttk.Style(self)
        # Configure styles
        self.configure(bg="#0F172A")
        self.style.theme_use("clam")

        self.style.configure(".", background="#0F172A", foreground="#F8FAFC", font=("Segoe UI", 10))
        self.style.configure("TLabel", background="#0F172A", foreground="#F8FAFC")
        self.style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"), foreground="#38BDF8")
        self.style.configure("SubHeader.TLabel", font=("Segoe UI", 9), foreground="#94A3B8")
        self.style.configure("Card.TFrame", background="#1E293B", relief="groove")
        self.style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=6)
        self.style.configure("Accent.TButton", background="#0284C7", foreground="#FFFFFF")

    def _build_ui(self):
        # Header Frame
        header = tk.Frame(self, bg="#1E293B", padx=20, pady=12, relief="ridge", bd=1)
        header.pack(fill="x", padx=16, pady=(14, 10))

        title_lbl = tk.Label(
            header,
            text="Subsidence Sensor Fusion & Risk Monitoring (3-Layer Architecture)",
            font=("Segoe UI", 14, "bold"),
            bg="#1E293B",
            fg="#38BDF8"
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header,
            text="Unsupervised Anomaly Detection • Rolling Slope & 2nd Derivative • Multi-Sensor Fusion",
            font=("Segoe UI", 9),
            bg="#1E293B",
            fg="#94A3B8"
        )
        sub_lbl.pack(anchor="w")

        # Main Body Grid
        main_frame = tk.Frame(self, bg="#0F172A")
        main_frame.pack(fill="both", expand=True, padx=16, pady=6)

        # Left Column: Inputs & Presets
        left_card = tk.LabelFrame(
            main_frame,
            text="  Sensor Inputs & Controls  ",
            font=("Segoe UI", 10, "bold"),
            bg="#1E293B",
            fg="#38BDF8",
            padx=16,
            pady=12,
            bd=1,
            relief="groove"
        )
        left_card.pack(side="left", fill="both", expand=False, padx=(0, 10), pady=4)
        left_card.config(width=380)

        # Node selection
        tk.Label(left_card, text="Target Node:", font=("Segoe UI", 9, "bold"), bg="#1E293B", fg="#CBD5E1").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.node_var = tk.StringVar(value=self.nodes[0])
        node_menu = ttk.Combobox(left_card, textvariable=self.node_var, values=self.nodes, state="readonly", width=18)
        node_menu.grid(row=0, column=1, sticky="ew", pady=(0, 10))

        # Scenario Presets
        tk.Label(left_card, text="Quick Presets:", font=("Segoe UI", 9, "bold"), bg="#1E293B", fg="#CBD5E1").grid(row=1, column=0, columnspan=2, sticky="w", pady=(4, 4))
        preset_frame = tk.Frame(left_card, bg="#1E293B")
        preset_frame.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(0, 12))

        btn_nom = tk.Button(preset_frame, text="Nominal", bg="#064E3B", fg="#6EE7B7", font=("Segoe UI", 8, "bold"), command=lambda: self._apply_preset("nominal"), width=8)
        btn_nom.pack(side="left", padx=2)
        btn_crp = tk.Button(preset_frame, text="Creep", bg="#78350F", fg="#FCD34D", font=("Segoe UI", 8, "bold"), command=lambda: self._apply_preset("creep"), width=8)
        btn_crp.pack(side="left", padx=2)
        btn_sld = tk.Button(preset_frame, text="Slide", bg="#7C2D12", fg="#FDBA74", font=("Segoe UI", 8, "bold"), command=lambda: self._apply_preset("slide"), width=8)
        btn_sld.pack(side="left", padx=2)
        btn_rup = tk.Button(preset_frame, text="Rupture", bg="#7F1D1D", fg="#FCA5A5", font=("Segoe UI", 8, "bold"), command=lambda: self._apply_preset("rupture"), width=8)
        btn_rup.pack(side="left", padx=2)

        # Sensor Inputs (Sliders + Entries)
        self.inputs = {}
        row_idx = 3

        configs = [
            ("tilt_deg", "Tilt Angle (°):", 0.0, 50.0, 0.3),
            ("displacement_mm", "Displacement (mm):", 0.0, 100.0, 1.5),
            ("strain_microstrain", "Strain (με):", 0.0, 500.0, 28.0),
            ("vibration_mms", "Vibration (mm/s):", 0.0, 30.0, 1.0)
        ]

        for s_key, s_label, min_v, max_v, def_v in configs:
            tk.Label(left_card, text=s_label, font=("Segoe UI", 9, "bold"), bg="#1E293B", fg="#F8FAFC").grid(row=row_idx, column=0, sticky="w", pady=(6, 0))
            
            var = tk.DoubleVar(value=def_v)
            entry = tk.Entry(left_card, textvariable=var, width=8, bg="#0F172A", fg="#38BDF8", insertbackground="#FFF", font=("Segoe UI", 9, "bold"))
            entry.grid(row=row_idx, column=1, sticky="e", pady=(6, 0))

            slider = ttk.Scale(left_card, from_=min_v, to=max_v, variable=var, orient="horizontal")
            slider.grid(row=row_idx + 1, column=0, columnspan=2, sticky="ew", pady=(2, 8))

            self.inputs[s_key] = var
            row_idx += 2

        # Trend context simulation
        tk.Label(left_card, text="Trend Context:", font=("Segoe UI", 9, "bold"), bg="#1E293B", fg="#CBD5E1").grid(row=row_idx, column=0, sticky="w", pady=(8, 2))
        self.trend_var = tk.StringVar(value="steady")
        trend_cb = ttk.Combobox(
            left_card,
            textvariable=self.trend_var,
            values=["steady", "moderate_drift", "rapid_accel"],
            state="readonly",
            width=18
        )
        trend_cb.grid(row=row_idx, column=1, sticky="ew", pady=(8, 2))
        row_idx += 1

        # Predict Button
        btn_pred = tk.Button(
            left_card,
            text="RUN INFERENCE & DIAGNOSE",
            font=("Segoe UI", 10, "bold"),
            bg="#0284C7",
            fg="#FFFFFF",
            activebackground="#0369A1",
            activeforeground="#FFFFFF",
            relief="flat",
            pady=8,
            command=self._on_predict
        )
        btn_pred.grid(row=row_idx, column=0, columnspan=2, sticky="ew", pady=(18, 8))
        row_idx += 1

        # Batch Scorer Button
        btn_batch = tk.Button(
            left_card,
            text="📂 Batch Score CSV File...",
            font=("Segoe UI", 9),
            bg="#334155",
            fg="#F8FAFC",
            activebackground="#475569",
            activeforeground="#FFFFFF",
            relief="flat",
            pady=6,
            command=self._on_batch_score
        )
        btn_batch.grid(row=row_idx, column=0, columnspan=2, sticky="ew", pady=(4, 0))

        # Right Column: Output Diagnostics
        right_card = tk.LabelFrame(
            main_frame,
            text="  Model Prediction & Geotechnical Diagnostics  ",
            font=("Segoe UI", 10, "bold"),
            bg="#1E293B",
            fg="#38BDF8",
            padx=16,
            pady=12,
            bd=1,
            relief="groove"
        )
        right_card.pack(side="right", fill="both", expand=True, padx=(10, 0), pady=4)

        # Risk Banner
        self.banner_frame = tk.Frame(right_card, bg="#0F172A", padx=16, pady=12, relief="ridge", bd=1)
        self.banner_frame.pack(fill="x", pady=(0, 14))

        self.score_lbl = tk.Label(self.banner_frame, text="0.0", font=("Segoe UI", 36, "bold"), bg="#0F172A", fg="#10B981")
        self.score_lbl.pack(side="left", padx=(10, 16))

        banner_info = tk.Frame(self.banner_frame, bg="#0F172A")
        banner_info.pack(side="left", fill="both", expand=True)

        self.band_lbl = tk.Label(banner_info, text="NORMAL (0 - 25)", font=("Segoe UI", 14, "bold"), bg="#0F172A", fg="#10B981")
        self.band_lbl.pack(anchor="w")

        self.driver_lbl = tk.Label(banner_info, text="Primary Driver: Nominal Baseline", font=("Segoe UI", 10), bg="#0F172A", fg="#94A3B8")
        self.driver_lbl.pack(anchor="w", pady=(2, 0))

        # Text Diagnostics
        diag_box = tk.LabelFrame(right_card, text=" Diagnostic Assessment & Recommended Action ", font=("Segoe UI", 9, "bold"), bg="#1E293B", fg="#CBD5E1", padx=10, pady=8)
        diag_box.pack(fill="x", pady=(0, 12))

        self.summary_text = tk.Text(diag_box, height=4, bg="#0F172A", fg="#E2E8F0", font=("Segoe UI", 9), wrap="word", relief="flat", padx=8, pady=8)
        self.summary_text.pack(fill="x", pady=(0, 8))

        self.action_lbl = tk.Label(diag_box, text="", font=("Segoe UI", 9, "bold"), bg="#0F172A", fg="#F8FAFC", justify="left", wraplength=480, padx=8, pady=6)
        self.action_lbl.pack(fill="x")

        # Telemetry breakdown treeview
        tk.Label(right_card, text="Sensor Channel & Trend Telemetry:", font=("Segoe UI", 9, "bold"), bg="#1E293B", fg="#CBD5E1").pack(anchor="w", pady=(4, 4))
        columns = ("channel", "reading", "slope", "accel", "std", "anom_score")
        self.tree = ttk.Treeview(right_card, columns=columns, show="headings", height=5)
        self.tree.heading("channel", text="Sensor")
        self.tree.heading("reading", text="Reading")
        self.tree.heading("slope", text="Slope (1st)")
        self.tree.heading("accel", text="Accel (2nd)")
        self.tree.heading("std", text="Rolling Std")
        self.tree.heading("anom_score", text="Anomaly Score")

        for c in columns:
            self.tree.column(c, width=80, anchor="center")
        self.tree.column("channel", width=120, anchor="w")

        self.tree.pack(fill="both", expand=True)

    def _apply_preset(self, name):
        presets = {
            "nominal": {"tilt_deg": 0.3, "displacement_mm": 1.5, "strain_microstrain": 28.0, "vibration_mms": 1.0, "trend": "steady"},
            "creep": {"tilt_deg": 1.8, "displacement_mm": 4.2, "strain_microstrain": 55.0, "vibration_mms": 1.8, "trend": "moderate_drift"},
            "slide": {"tilt_deg": 12.0, "displacement_mm": 32.0, "strain_microstrain": 210.0, "vibration_mms": 6.5, "trend": "rapid_accel"},
            "rupture": {"tilt_deg": 45.0, "displacement_mm": 95.0, "strain_microstrain": 480.0, "vibration_mms": 25.0, "trend": "rapid_accel"}
        }
        p = presets.get(name, presets["nominal"])
        for k, v in p.items():
            if k in self.inputs:
                self.inputs[k].set(v)
        self.trend_var.set(p.get("trend", "steady"))
        self._on_predict()

    def _on_predict(self):
        node_id = self.node_var.get()
        readings = {k: self.inputs[k].get() for k in self.inputs}
        trend_mode = self.trend_var.get()

        self.model.reset_buffer(node_id)
        if trend_mode == "steady":
            history = [readings.copy() for _ in range(7)]
            self.model.feed_history(node_id, history)
        elif trend_mode == "moderate_drift":
            history = [{k: v * f for k, v in readings.items()} for f in [0.75, 0.80, 0.85, 0.90, 0.95]]
            self.model.feed_history(node_id, history)
        elif trend_mode == "rapid_accel":
            history = [{k: v * f for k, v in readings.items()} for f in [0.2, 0.25, 0.4, 0.65, 0.85]]
            self.model.feed_history(node_id, history)

        report = self.model.predict_reading(node_id, readings, update_buffer=True)

        # Update display
        self.score_lbl.config(text=f"{report.risk_score:.1f}", fg=report.status_color)
        self.band_lbl.config(text=f"{report.risk_band} RISK", fg=report.status_color)
        self.driver_lbl.config(text=f"Primary Driver: {report.primary_driver} ({report.driver_contribution_pct:.1f}%)")

        self.summary_text.delete("1.0", tk.END)
        self.summary_text.insert("1.0", report.summary)

        self.action_lbl.config(text=f"ACTION REQUIRED: {report.recommendation}", fg=report.status_color)

        # Update treeview
        for item in self.tree.get_children():
            self.tree.delete(item)

        labels = {
            "tilt_deg": "Angular Tilt (°)",
            "displacement_mm": "Linear Disp (mm)",
            "strain_microstrain": "Structural Strain (με)",
            "vibration_mms": "Vibration (mm/s)"
        }
        for s_key, s_name in labels.items():
            tr = report.sensor_trends[s_key]
            sc = report.sensor_scores[s_key]
            self.tree.insert("", "end", values=(
                s_name,
                f"{tr['value']:.3f}",
                f"{tr['slope']:+.3f}",
                f"{tr['acceleration']:+.3f}",
                f"{tr['std']:.3f}",
                f"{sc:.3f}"
            ))

    def _on_batch_score(self):
        file_path = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")])
        if not file_path:
            return

        try:
            df = pd.read_csv(file_path)
            required = ["node_id", "tilt_deg", "displacement_mm", "strain_microstrain", "vibration_mms"]
            missing = [c for c in required if c not in df.columns]
            if missing:
                messagebox.showerror("Error", f"Uploaded CSV missing required columns: {missing}")
                return

            df_scored = self.model.predict_batch(df)

            save_path = filedialog.asksaveasfilename(
                defaultextension=".csv",
                initialfile=f"scored_{os.path.basename(file_path)}",
                filetypes=[("CSV Files", "*.csv")]
            )
            if save_path:
                df_scored.to_csv(save_path, index=False)
                crit_count = (df_scored["predicted_risk_band"] == BAND_CRITICAL).sum()
                messagebox.showinfo(
                    "Batch Scoring Complete",
                    f"Processed {len(df_scored):,} records.\n"
                    f"Critical Alerts: {crit_count}\n"
                    f"Saved results to:\n{save_path}"
                )
        except Exception as e:
            messagebox.showerror("Scoring Error", str(e))


if __name__ == "__main__":
    app = SubsidenceDesktopApp()
    app.mainloop()
