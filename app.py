"""
Subsidence Risk Monitoring & Real-Time Anomaly Detection Dashboard
==================================================================
Built with Dash & Plotly.
Features:
1. Historical Visualizer with 4-tier risk zone bands & sensor telemetry.
2. Real-Time Predictor & What-If Simulator with live radial gauge & diagnostics.
3. Live Replay / Streaming Simulator.
4. Batch CSV File Scorer & Data Exporter.
"""

import base64
import io
import os
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import dash
from dash import dcc, html, Input, Output, State, callback_context
import dash.dash_table as dt

from subsidence_model import (
    SubsidenceSensorFusion,
    get_risk_band,
    BAND_NORMAL,
    BAND_WATCH,
    BAND_WARNING,
    BAND_CRITICAL,
    DEFAULT_WEIGHTS,
    SENSORS
)

# Initialize and train / load model
MODEL_PATH = os.path.join("models", "subsidence_model.joblib")
DATA_PATH = "subsidence_sensor_data_365.csv"

if os.path.exists(MODEL_PATH):
    model = SubsidenceSensorFusion.load(MODEL_PATH)
else:
    model = SubsidenceSensorFusion()
    if os.path.exists(DATA_PATH):
        df_init = pd.read_csv(DATA_PATH)
        model.fit(df_init, baseline_days=30)
        os.makedirs("models", exist_ok=True)
        model.save(MODEL_PATH)

# Load cached or full dataset for explorer
if os.path.exists("scored_subsidence_sensor_data.csv"):
    df_history = pd.read_csv("scored_subsidence_sensor_data.csv")
elif os.path.exists(DATA_PATH):
    df_raw = pd.read_csv(DATA_PATH)
    df_history = model.predict_batch(df_raw)
    df_history.to_csv("scored_subsidence_sensor_data.csv", index=False)
else:
    df_history = pd.DataFrame()

available_nodes = sorted(df_history["node_id"].unique().tolist()) if not df_history.empty else ["Node01"]

# Initialize Dash App
app = dash.Dash(
    __name__,
    title="Subsidence Sensor Fusion AI",
    update_title=None,
    suppress_callback_exceptions=True
)

# Color Scheme
THEME = {
    "bg_dark": "#0B1120",        # Deep obsidian
    "card_bg": "#1E293B",        # Slate 800
    "card_border": "#334155",    # Slate 700
    "text_main": "#F8FAFC",      # Slate 50
    "text_muted": "#94A3B8",     # Slate 400
    "accent_cyan": "#06B6D4",    # Cyan 500
    "band_normal": "#10B981",    # Emerald
    "band_watch": "#F59E0B",     # Amber
    "band_warning": "#F97316",   # Orange
    "band_critical": "#EF4444"   # Red
}

def create_badge(text, bg_color):
    return html.Span(
        text,
        style={
            "backgroundColor": bg_color,
            "color": "#FFFFFF",
            "padding": "4px 12px",
            "borderRadius": "9999px",
            "fontWeight": "700",
            "fontSize": "0.85rem",
            "display": "inline-block",
            "letterSpacing": "0.05em",
            "boxShadow": f"0 2px 8px {bg_color}40"
        }
    )

# Layout
app.layout = html.Div(
    style={
        "backgroundColor": THEME["bg_dark"],
        "minHeight": "100vh",
        "color": THEME["text_main"],
        "fontFamily": "Segoe UI, Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        "padding": "24px",
        "boxSizing": "border-box"
    },
    children=[
        # Top Header Bar
        html.Div(
            style={
                "display": "flex",
                "justifyContent": "space-between",
                "alignItems": "center",
                "padding": "16px 24px",
                "backgroundColor": THEME["card_bg"],
                "borderRadius": "16px",
                "border": f"1px solid {THEME['card_border']}",
                "marginBottom": "24px",
                "boxShadow": "0 10px 25px -5px rgba(0, 0, 0, 0.4)"
            },
            children=[
                html.Div([
                    html.Div(
                        style={"display": "flex", "alignItems": "center", "gap": "12px"},
                        children=[
                            html.Div(
                                "3L",
                                style={
                                    "background": "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                                    "color": "#FFFFFF",
                                    "fontWeight": "900",
                                    "fontSize": "1.4rem",
                                    "width": "48px",
                                    "height": "48px",
                                    "borderRadius": "12px",
                                    "display": "flex",
                                    "alignItems": "center",
                                    "justifyContent": "center",
                                    "boxShadow": "0 4px 14px rgba(6, 182, 212, 0.4)"
                                }
                            ),
                            html.Div([
                                html.H1(
                                    "Subsidence Risk Intelligence System",
                                    style={"margin": "0", "fontSize": "1.45rem", "fontWeight": "700", "letterSpacing": "-0.02em"}
                                ),
                                html.P(
                                    "Unsupervised 3-Layer Architecture: Isolation Forest • Rolling Trend & 2nd Derivative • Sensor Fusion",
                                    style={"margin": "4px 0 0 0", "fontSize": "0.85rem", "color": THEME["text_muted"]}
                                )
                            ])
                        ]
                    )
                ]),
                html.Div(
                    style={"display": "flex", "alignItems": "center", "gap": "16px"},
                    children=[
                        html.Div([
                            html.Span("Model Status: ", style={"color": THEME["text_muted"], "fontSize": "0.85rem"}),
                            html.Span("ONLINE (Trained)", style={"color": THEME["band_normal"], "fontWeight": "700", "fontSize": "0.85rem"})
                        ]),
                        html.Div([
                            create_badge("0-25 Normal", THEME["band_normal"]),
                            html.Span(" ", style={"margin": "0 2px"}),
                            create_badge("26-50 Watch", THEME["band_watch"]),
                            html.Span(" ", style={"margin": "0 2px"}),
                            create_badge("51-75 Warning", THEME["band_warning"]),
                            html.Span(" ", style={"margin": "0 2px"}),
                            create_badge("76-100 Critical", THEME["band_critical"]),
                        ])
                    ]
                )
            ]
        ),

        # Tabs Navigation
        dcc.Tabs(
            id="main-tabs",
            value="tab-predictor",
            style={"marginBottom": "24px"},
            colors={
                "border": THEME["card_border"],
                "primary": THEME["accent_cyan"],
                "background": THEME["card_bg"]
            },
            children=[
                dcc.Tab(
                    label="Real-Time Predictor & What-If Simulator",
                    value="tab-predictor",
                    style={"backgroundColor": THEME["card_bg"], "color": THEME["text_muted"], "fontWeight": "600", "padding": "14px"},
                    selected_style={"backgroundColor": "#0F172A", "color": THEME["accent_cyan"], "fontWeight": "700", "borderTop": f"3px solid {THEME['accent_cyan']}", "padding": "14px"}
                ),
                dcc.Tab(
                    label="Historical Data & Telemetry Analytics",
                    value="tab-historical",
                    style={"backgroundColor": THEME["card_bg"], "color": THEME["text_muted"], "fontWeight": "600", "padding": "14px"},
                    selected_style={"backgroundColor": "#0F172A", "color": THEME["accent_cyan"], "fontWeight": "700", "borderTop": f"3px solid {THEME['accent_cyan']}", "padding": "14px"}
                ),
                dcc.Tab(
                    label="Live Streaming & Replay Simulator",
                    value="tab-replay",
                    style={"backgroundColor": THEME["card_bg"], "color": THEME["text_muted"], "fontWeight": "600", "padding": "14px"},
                    selected_style={"backgroundColor": "#0F172A", "color": THEME["accent_cyan"], "fontWeight": "700", "borderTop": f"3px solid {THEME['accent_cyan']}", "padding": "14px"}
                ),
                dcc.Tab(
                    label="Batch CSV Scorer & External Ingestion",
                    value="tab-batch",
                    style={"backgroundColor": THEME["card_bg"], "color": THEME["text_muted"], "fontWeight": "600", "padding": "14px"},
                    selected_style={"backgroundColor": "#0F172A", "color": THEME["accent_cyan"], "fontWeight": "700", "borderTop": f"3px solid {THEME['accent_cyan']}", "padding": "14px"}
                )
            ]
        ),

        # Main Tab Content Container
        html.Div(id="tab-content")
    ]
)


# ==============================================================================
# TAB 1: REAL-TIME PREDICTOR & WHAT-IF SIMULATOR
# ==============================================================================
def render_predictor_tab():
    return html.Div(
        style={"display": "grid", "gridTemplateColumns": "420px 1fr", "gap": "24px"},
        children=[
            # Left Panel: Input Controls & Presets
            html.Div(
                style={
                    "backgroundColor": THEME["card_bg"],
                    "borderRadius": "16px",
                    "border": f"1px solid {THEME['card_border']}",
                    "padding": "24px",
                    "boxShadow": "0 10px 25px -5px rgba(0, 0, 0, 0.4)"
                },
                children=[
                    html.H3("Sensor Input Panel", style={"marginTop": "0", "fontSize": "1.2rem", "borderBottom": f"1px solid {THEME['card_border']}", "paddingBottom": "10px"}),
                    
                    # Node Selector
                    html.Label("Target Sensor Node:", style={"fontWeight": "600", "fontSize": "0.9rem", "color": THEME["text_muted"]}),
                    dcc.Dropdown(
                        id="pred-node-id",
                        options=[{"label": n, "value": n} for n in available_nodes],
                        value=available_nodes[0] if available_nodes else "Node01",
                        clearable=False,
                        style={"color": "#000000", "marginBottom": "16px"}
                    ),

                    # Presets Buttons
                    html.Label("Scenario Quick Presets:", style={"fontWeight": "600", "fontSize": "0.85rem", "color": THEME["text_muted"]}),
                    html.Div(
                        style={"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "8px", "marginBottom": "20px"},
                        children=[
                            html.Button("Nominal Quiet", id="preset-nominal", n_clicks=0, style={"backgroundColor": "#064E3B", "color": "#6EE7B7", "border": "none", "padding": "8px 10px", "borderRadius": "8px", "cursor": "pointer", "fontSize": "0.8rem", "fontWeight": "600"}),
                            html.Button("Subtle Creep", id="preset-creep", n_clicks=0, style={"backgroundColor": "#78350F", "color": "#FCD34D", "border": "none", "padding": "8px 10px", "borderRadius": "8px", "cursor": "pointer", "fontSize": "0.8rem", "fontWeight": "600"}),
                            html.Button("Accelerated Slide", id="preset-slide", n_clicks=0, style={"backgroundColor": "#7C2D12", "color": "#FDBA74", "border": "none", "padding": "8px 10px", "borderRadius": "8px", "cursor": "pointer", "fontSize": "0.8rem", "fontWeight": "600"}),
                            html.Button("Critical Rupture", id="preset-rupture", n_clicks=0, style={"backgroundColor": "#7F1D1D", "color": "#FCA5A5", "border": "none", "padding": "8px 10px", "borderRadius": "8px", "cursor": "pointer", "fontSize": "0.8rem", "fontWeight": "600"})
                        ]
                    ),

                    # 1. Tilt Input
                    html.Div(style={"marginBottom": "16px"}, children=[
                        html.Div(style={"display": "flex", "justifyContent": "space-between"}, children=[
                            html.Label("Tilt (°):", style={"fontWeight": "600", "fontSize": "0.85rem"}),
                            html.Span(id="tilt-val-display", style={"color": THEME["accent_cyan"], "fontWeight": "700"})
                        ]),
                        dcc.Slider(id="slider-tilt", min=0.0, max=50.0, step=0.1, value=0.3, marks={0: "0°", 10: "10°", 25: "25°", 50: "50°"}),
                        dcc.Input(id="num-tilt", type="number", value=0.3, step=0.01, style={"width": "100%", "marginTop": "4px", "backgroundColor": "#0F172A", "border": f"1px solid {THEME['card_border']}", "color": "#FFF", "padding": "6px", "borderRadius": "6px"})
                    ]),

                    # 2. Displacement Input
                    html.Div(style={"marginBottom": "16px"}, children=[
                        html.Div(style={"display": "flex", "justifyContent": "space-between"}, children=[
                            html.Label("Displacement (mm):", style={"fontWeight": "600", "fontSize": "0.85rem"}),
                            html.Span(id="disp-val-display", style={"color": THEME["accent_cyan"], "fontWeight": "700"})
                        ]),
                        dcc.Slider(id="slider-disp", min=0.0, max=100.0, step=0.2, value=1.5, marks={0: "0", 25: "25", 50: "50", 100: "100"}),
                        dcc.Input(id="num-disp", type="number", value=1.5, step=0.01, style={"width": "100%", "marginTop": "4px", "backgroundColor": "#0F172A", "border": f"1px solid {THEME['card_border']}", "color": "#FFF", "padding": "6px", "borderRadius": "6px"})
                    ]),

                    # 3. Strain Input
                    html.Div(style={"marginBottom": "16px"}, children=[
                        html.Div(style={"display": "flex", "justifyContent": "space-between"}, children=[
                            html.Label("Strain (με):", style={"fontWeight": "600", "fontSize": "0.85rem"}),
                            html.Span(id="strain-val-display", style={"color": THEME["accent_cyan"], "fontWeight": "700"})
                        ]),
                        dcc.Slider(id="slider-strain", min=0.0, max=500.0, step=1.0, value=28.0, marks={0: "0", 100: "100", 250: "250", 500: "500"}),
                        dcc.Input(id="num-strain", type="number", value=28.0, step=0.5, style={"width": "100%", "marginTop": "4px", "backgroundColor": "#0F172A", "border": f"1px solid {THEME['card_border']}", "color": "#FFF", "padding": "6px", "borderRadius": "6px"})
                    ]),

                    # 4. Vibration Input
                    html.Div(style={"marginBottom": "20px"}, children=[
                        html.Div(style={"display": "flex", "justifyContent": "space-between"}, children=[
                            html.Label("Vibration (mm/s):", style={"fontWeight": "600", "fontSize": "0.85rem"}),
                            html.Span(id="vib-val-display", style={"color": THEME["accent_cyan"], "fontWeight": "700"})
                        ]),
                        dcc.Slider(id="slider-vib", min=0.0, max=30.0, step=0.1, value=1.0, marks={0: "0", 10: "10", 20: "20", 30: "30"}),
                        dcc.Input(id="num-vib", type="number", value=1.0, step=0.05, style={"width": "100%", "marginTop": "4px", "backgroundColor": "#0F172A", "border": f"1px solid {THEME['card_border']}", "color": "#FFF", "padding": "6px", "borderRadius": "6px"})
                    ]),

                    # Simulated Progression Multiplier (Trend Acceleration)
                    html.Div(style={"marginBottom": "20px"}, children=[
                        html.Label("Simulated Trend Progression Context:", style={"fontWeight": "600", "fontSize": "0.85rem", "color": THEME["text_muted"]}),
                        dcc.RadioItems(
                            id="trend-context-mode",
                            options=[
                                {"label": " Flat / Steady Baseline", "value": "steady"},
                                {"label": " Moderate Upward Drift (+15%/d)", "value": "moderate_drift"},
                                {"label": " Rapid Exponential Acceleration (+50%/d)", "value": "rapid_accel"}
                            ],
                            value="steady",
                            style={"fontSize": "0.85rem", "marginTop": "6px", "lineHeight": "1.8"}
                        )
                    ]),

                    html.Button(
                        "Run Inference & Explain",
                        id="btn-run-pred",
                        n_clicks=0,
                        style={
                            "width": "100%",
                            "padding": "14px",
                            "backgroundColor": THEME["accent_cyan"],
                            "color": "#0F172A",
                            "border": "none",
                            "borderRadius": "10px",
                            "fontWeight": "800",
                            "fontSize": "1rem",
                            "cursor": "pointer",
                            "boxShadow": "0 4px 14px rgba(6, 182, 212, 0.4)",
                            "transition": "all 0.2s ease"
                        }
                    )
                ]
            ),

            # Right Panel: Output Diagnostic Dashboard
            html.Div(id="prediction-output-container")
        ]
    )


# ==============================================================================
# TAB 2: HISTORICAL DATA & SENSOR ANALYTICS
# ==============================================================================
def render_historical_tab():
    return html.Div(
        children=[
            # Top Controls for Explorer
            html.Div(
                style={
                    "display": "flex",
                    "justifyContent": "space-between",
                    "alignItems": "center",
                    "backgroundColor": THEME["card_bg"],
                    "padding": "16px 20px",
                    "borderRadius": "12px",
                    "border": f"1px solid {THEME['card_border']}",
                    "marginBottom": "20px"
                },
                children=[
                    html.Div(style={"display": "flex", "alignItems": "center", "gap": "16px"}, children=[
                        html.Label("Select Node to Inspect:", style={"fontWeight": "700", "fontSize": "0.95rem"}),
                        dcc.Dropdown(
                            id="hist-node-select",
                            options=[{"label": f"Node: {n}", "value": n} for n in available_nodes],
                            value=available_nodes[0] if available_nodes else "Node01",
                            clearable=False,
                            style={"width": "200px", "color": "#000000"}
                        )
                    ]),
                    html.Div(id="hist-summary-badges", style={"display": "flex", "gap": "12px"})
                ]
            ),

            # Main Charts Grid
            html.Div(
                style={"display": "flex", "flexDirection": "column", "gap": "20px"},
                children=[
                    dcc.Graph(id="hist-telemetry-chart", style={"borderRadius": "12px", "overflow": "hidden"}),
                    dcc.Graph(id="hist-risk-chart", style={"borderRadius": "12px", "overflow": "hidden"}),
                    dcc.Graph(id="hist-contribution-chart", style={"borderRadius": "12px", "overflow": "hidden"})
                ]
            )
        ]
    )


# ==============================================================================
# TAB 3: LIVE STREAMING & REPLAY SIMULATOR
# ==============================================================================
def render_replay_tab():
    return html.Div(
        children=[
            html.Div(
                style={
                    "backgroundColor": THEME["card_bg"],
                    "padding": "20px",
                    "borderRadius": "12px",
                    "border": f"1px solid {THEME['card_border']}",
                    "marginBottom": "20px"
                },
                children=[
                    html.H3("Live Sensor Data Streaming Simulator", style={"marginTop": "0"}),
                    html.P("Simulate real-time day-by-day ingestion from field IoT gateways. The model updates its sliding window buffer on every tick.", style={"color": THEME["text_muted"]}),
                    html.Div(style={"display": "flex", "gap": "20px", "alignItems": "center", "flexWrap": "wrap"}, children=[
                        html.Div([
                            html.Label("Replay Node:", style={"fontWeight": "600", "color": THEME["text_muted"]}),
                            dcc.Dropdown(
                                id="replay-node-select",
                                options=[{"label": n, "value": n} for n in available_nodes],
                                value="Node02" if "Node02" in available_nodes else available_nodes[0],
                                clearable=False,
                                style={"width": "180px", "color": "#000000"}
                            )
                        ]),
                        html.Button(
                            "▶ Start Streaming",
                            id="btn-replay-toggle",
                            n_clicks=0,
                            style={"padding": "10px 24px", "backgroundColor": THEME["accent_cyan"], "color": "#0F172A", "border": "none", "borderRadius": "8px", "fontWeight": "700", "cursor": "pointer"}
                        ),
                        html.Button(
                            "↺ Reset to Day 1",
                            id="btn-replay-reset",
                            n_clicks=0,
                            style={"padding": "10px 18px", "backgroundColor": "#334155", "color": "#FFF", "border": "none", "borderRadius": "8px", "fontWeight": "600", "cursor": "pointer"}
                        ),
                        html.Div([
                            html.Label("Playback Speed (Tick Interval):", style={"fontWeight": "600", "color": THEME["text_muted"]}),
                            dcc.Slider(id="replay-speed-slider", min=200, max=2000, step=200, value=800, marks={200: "Fast (0.2s)", 1000: "1.0s", 2000: "Slow (2s)"})
                        ], style={"width": "300px"})
                    ])
                ]
            ),
            dcc.Interval(id="replay-interval", interval=800, n_intervals=0, disabled=True),
            dcc.Store(id="replay-current-day", data=1),
            html.Div(id="replay-display-container")
        ]
    )


# ==============================================================================
# TAB 4: BATCH CSV SCORER & EXTERNAL INGESTION
# ==============================================================================
def render_batch_tab():
    return html.Div(
        children=[
            html.Div(
                style={
                    "backgroundColor": THEME["card_bg"],
                    "padding": "24px",
                    "borderRadius": "12px",
                    "border": f"1px solid {THEME['card_border']}",
                    "marginBottom": "20px"
                },
                children=[
                    html.H3("External Data Ingestion & Batch CSV Scoring", style={"marginTop": "0"}),
                    html.P("Upload external CSV files containing columns: node_id, day (optional), tilt_deg, displacement_mm, strain_microstrain, vibration_mms.", style={"color": THEME["text_muted"]}),
                    
                    dcc.Upload(
                        id="upload-batch-csv",
                        children=html.Div([
                            html.Span("📂 Drag and Drop or ", style={"fontWeight": "600"}),
                            html.A("Select a CSV File", style={"color": THEME["accent_cyan"], "textDecoration": "underline", "cursor": "pointer"})
                        ]),
                        style={
                            "width": "100%",
                            "height": "90px",
                            "lineHeight": "90px",
                            "borderWidth": "2px",
                            "borderStyle": "dashed",
                            "borderColor": THEME["card_border"],
                            "borderRadius": "10px",
                            "textAlign": "center",
                            "backgroundColor": "#0F172A",
                            "cursor": "pointer"
                        }
                    )
                ]
            ),
            html.Div(id="batch-results-container")
        ]
    )


# ==============================================================================
# CALLBACKS & LOGIC
# ==============================================================================

# Tab Switching Callback
@app.callback(
    Output("tab-content", "children"),
    Input("main-tabs", "value")
)
def switch_tabs(tab_name):
    if tab_name == "tab-predictor":
        return render_predictor_tab()
    elif tab_name == "tab-historical":
        return render_historical_tab()
    elif tab_name == "tab-replay":
        return render_replay_tab()
    elif tab_name == "tab-batch":
        return render_batch_tab()
    return html.Div("Tab not found")


# Preset Buttons Callback (updates sliders & inputs in Predictor tab)
@app.callback(
    [
        Output("slider-tilt", "value"),
        Output("num-tilt", "value"),
        Output("slider-disp", "value"),
        Output("num-disp", "value"),
        Output("slider-strain", "value"),
        Output("num-strain", "value"),
        Output("slider-vib", "value"),
        Output("num-vib", "value"),
        Output("trend-context-mode", "value")
    ],
    [
        Input("preset-nominal", "n_clicks"),
        Input("preset-creep", "n_clicks"),
        Input("preset-slide", "n_clicks"),
        Input("preset-rupture", "n_clicks"),
        Input("slider-tilt", "value"),
        Input("num-tilt", "value"),
        Input("slider-disp", "value"),
        Input("num-disp", "value"),
        Input("slider-strain", "value"),
        Input("num-strain", "value"),
        Input("slider-vib", "value"),
        Input("num-vib", "value"),
    ],
    prevent_initial_call=True
)
def update_presets_or_sync(*args):
    ctx = callback_context
    if not ctx.triggered:
        return 0.3, 0.3, 1.5, 1.5, 28.0, 28.0, 1.0, 1.0, "steady"

    trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]

    # Presets
    if trigger_id == "preset-nominal":
        return 0.3, 0.3, 1.5, 1.5, 28.0, 28.0, 1.0, 1.0, "steady"
    elif trigger_id == "preset-creep":
        return 1.8, 1.8, 4.2, 4.2, 55.0, 55.0, 1.8, 1.8, "moderate_drift"
    elif trigger_id == "preset-slide":
        return 12.0, 12.0, 32.0, 32.0, 210.0, 210.0, 6.5, 6.5, "rapid_accel"
    elif trigger_id == "preset-rupture":
        return 45.0, 45.0, 95.0, 95.0, 480.0, 480.0, 25.0, 25.0, "rapid_accel"

    # Sync slider & numeric box
    tilt = args[5] if trigger_id == "num-tilt" else args[4]
    disp = args[7] if trigger_id == "num-disp" else args[6]
    strain = args[9] if trigger_id == "num-strain" else args[8]
    vib = args[11] if trigger_id == "num-vib" else args[10]

    return tilt, tilt, disp, disp, strain, strain, vib, vib, dash.no_update


# Sync slider labels display
@app.callback(
    [
        Output("tilt-val-display", "children"),
        Output("disp-val-display", "children"),
        Output("strain-val-display", "children"),
        Output("vib-val-display", "children")
    ],
    [
        Input("slider-tilt", "value"),
        Input("slider-disp", "value"),
        Input("slider-strain", "value"),
        Input("slider-vib", "value")
    ]
)
def update_slider_displays(t, d, s, v):
    return f"{t:.2f}°", f"{d:.2f} mm", f"{s:.1f} με", f"{v:.2f} mm/s"


# Run Real-Time Prediction & Diagnostic Report
@app.callback(
    Output("prediction-output-container", "children"),
    [
        Input("btn-run-pred", "n_clicks"),
        Input("pred-node-id", "value")
    ],
    [
        State("num-tilt", "value"),
        State("num-disp", "value"),
        State("num-strain", "value"),
        State("num-vib", "value"),
        State("trend-context-mode", "value")
    ]
)
def run_prediction(n_clicks, node_id, tilt, disp, strain, vib, trend_mode):
    # Prepare simulated historical sequence based on trend mode
    readings = {
        "tilt_deg": float(tilt if tilt is not None else 0.3),
        "displacement_mm": float(disp if disp is not None else 1.5),
        "strain_microstrain": float(strain if strain is not None else 28.0),
        "vibration_mms": float(vib if vib is not None else 1.0)
    }

    # Reset buffer for this single-shot demo and prefill according to trend mode
    model.reset_buffer(node_id)
    if trend_mode == "steady":
        history = [readings.copy() for _ in range(7)]
        model.feed_history(node_id, history)
    elif trend_mode == "moderate_drift":
        # Simulate slight drift over last 5 days
        history = []
        for factor in [0.75, 0.80, 0.85, 0.90, 0.95]:
            history.append({k: v * factor for k, v in readings.items()})
        model.feed_history(node_id, history)
    elif trend_mode == "rapid_accel":
        # Simulate sharp progression (e.g. 1, 1, 2, 4, 5)
        history = []
        for factor in [0.2, 0.25, 0.4, 0.65, 0.85]:
            history.append({k: v * factor for k, v in readings.items()})
        model.feed_history(node_id, history)

    # Ingest current point
    report = model.predict_reading(node_id, readings, update_buffer=True)

    # 1. Plotly Radial Gauge Figure
    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=report.risk_score,
        domain={"x": [0, 1], "y": [0, 1]},
        title={"text": f"<b>{report.risk_band}</b>", "font": {"size": 22, "color": report.status_color}},
        number={"suffix": " / 100", "font": {"size": 36, "color": "#FFFFFF"}},
        gauge={
            "axis": {"range": [0, 100], "tickwidth": 1, "tickcolor": "#FFFFFF", "tickfont": {"color": "#94A3B8"}},
            "bar": {"color": report.status_color, "thickness": 0.28},
            "bgcolor": "#0F172A",
            "borderwidth": 1,
            "bordercolor": THEME["card_border"],
            "steps": [
                {"range": [0, 25], "color": "rgba(16, 185, 129, 0.2)"},
                {"range": [25, 50], "color": "rgba(245, 158, 11, 0.2)"},
                {"range": [50, 75], "color": "rgba(249, 115, 22, 0.2)"},
                {"range": [75, 100], "color": "rgba(239, 68, 68, 0.25)"}
            ],
            "threshold": {
                "line": {"color": "#EF4444", "width": 4},
                "thickness": 0.8,
                "value": 75.0
            }
        }
    ))
    fig_gauge.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        height=260,
        margin=dict(l=25, r=25, t=35, b=20)
    )

    # 2. Sensor Driver Contribution Horizontal Bar Chart
    sensor_labels = ["Angular Tilt", "Linear Disp", "Strain", "Vibration"]
    s_keys = ["tilt_deg", "displacement_mm", "strain_microstrain", "vibration_mms"]
    anom_vals = [report.sensor_scores[k] for k in s_keys]
    weights_vals = [model.weights[k] for k in s_keys]
    weighted_contribs = [a * w for a, w in zip(anom_vals, weights_vals)]
    tot = sum(weighted_contribs) + 1e-6
    pcts = [(c / tot) * 100.0 for c in weighted_contribs]

    bar_colors = [
        THEME["band_critical"] if p > 35 else (THEME["band_warning"] if p > 25 else THEME["accent_cyan"])
        for p in pcts
    ]

    fig_drivers = go.Figure(go.Bar(
        x=pcts,
        y=sensor_labels,
        orientation="h",
        marker=dict(color=bar_colors, line=dict(color="#0F172A", width=1)),
        text=[f"{p:.1f}%" for p in pcts],
        textposition="outside",
        textfont=dict(color="#FFFFFF", size=11)
    ))
    fig_drivers.update_layout(
        title="Anomaly Risk Attribution by Sensor Channel (%)",
        title_font=dict(size=13, color=THEME["text_muted"]),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(range=[0, 105], showgrid=True, gridcolor="#334155", color="#94A3B8"),
        yaxis=dict(color="#FFFFFF", autorange="reversed"),
        height=200,
        margin=dict(l=10, r=35, t=30, b=20)
    )

    # Telemetry Table Rows
    table_rows = []
    for s_key, s_label in zip(s_keys, sensor_labels):
        trend = report.sensor_trends[s_key]
        score = report.sensor_scores[s_key]
        badge_col = THEME["band_critical"] if score > 0.7 else (THEME["band_warning"] if score > 0.4 else THEME["band_normal"])
        table_rows.append(
            html.Tr([
                html.Td(s_label, style={"fontWeight": "600", "padding": "8px 12px"}),
                html.Td(f"{trend['value']:.3f}", style={"padding": "8px 12px"}),
                html.Td(f"{trend['slope']:+.3f}", style={"padding": "8px 12px", "color": THEME["band_warning"] if abs(trend['slope']) > 0.5 else THEME["text_main"]}),
                html.Td(f"{trend['acceleration']:+.3f}", style={"padding": "8px 12px"}),
                html.Td(f"{trend['std']:.3f}", style={"padding": "8px 12px"}),
                html.Td(
                    html.Span(f"{score:.2f}", style={"backgroundColor": f"{badge_col}30", "color": badge_col, "padding": "2px 8px", "borderRadius": "4px", "fontWeight": "700"}),
                    style={"padding": "8px 12px"}
                )
            ])
        )

    return html.Div(
        style={
            "display": "flex",
            "flexDirection": "column",
            "gap": "20px"
        },
        children=[
            # Top Banner: Status + Gauge + Drivers
            html.Div(
                style={
                    "display": "grid",
                    "gridTemplateColumns": "320px 1fr",
                    "backgroundColor": THEME["card_bg"],
                    "borderRadius": "16px",
                    "border": f"1px solid {report.status_color}50",
                    "padding": "20px",
                    "boxShadow": f"0 10px 30px -5px {report.status_color}25"
                },
                children=[
                    html.Div([dcc.Graph(figure=fig_gauge, config={"displayModeBar": False})]),
                    html.Div(style={"display": "flex", "flexDirection": "column", "justifyContent": "center"}, children=[
                        dcc.Graph(figure=fig_drivers, config={"displayModeBar": False})
                    ])
                ]
            ),

            # Diagnostic Explanation & Action Recommendation Card
            html.Div(
                style={
                    "backgroundColor": THEME["card_bg"],
                    "borderRadius": "16px",
                    "border": f"1px solid {THEME['card_border']}",
                    "padding": "24px",
                    "boxShadow": "0 10px 25px -5px rgba(0, 0, 0, 0.4)"
                },
                children=[
                    html.Div(style={"display": "flex", "justifyContent": "space-between", "alignItems": "center", "marginBottom": "14px"}, children=[
                        html.H4("Geotechnical Diagnostic Report", style={"margin": "0", "fontSize": "1.1rem", "color": THEME["accent_cyan"]}),
                        html.Span(f"Dominant Driver: {report.primary_driver} ({report.driver_contribution_pct:.1f}%)", style={"fontSize": "0.85rem", "color": THEME["text_muted"]})
                    ]),
                    html.P(report.summary, style={"fontSize": "0.95rem", "lineHeight": "1.6", "color": "#E2E8F0", "marginBottom": "16px"}),
                    html.Div(
                        style={
                            "backgroundColor": f"{report.status_color}15",
                            "borderLeft": f"4px solid {report.status_color}",
                            "padding": "12px 16px",
                            "borderRadius": "0 8px 8px 0"
                        },
                        children=[
                            html.Strong("Recommended Protocol: ", style={"color": report.status_color}),
                            html.Span(report.recommendation, style={"color": "#F8FAFC", "fontSize": "0.9rem"})
                        ]
                    )
                ]
            ),

            # Trend & Progression Telemetry Table
            html.Div(
                style={
                    "backgroundColor": THEME["card_bg"],
                    "borderRadius": "16px",
                    "border": f"1px solid {THEME['card_border']}",
                    "padding": "20px",
                    "overflowX": "auto"
                },
                children=[
                    html.H4("Layer 2 Trend & 2nd Derivative Breakdown", style={"margin": "0 0 12px 0", "fontSize": "1rem", "color": THEME["text_muted"]}),
                    html.Table(
                        style={"width": "100%", "borderCollapse": "collapse", "fontSize": "0.88rem", "textAlign": "left"},
                        children=[
                            html.Thead(
                                html.Tr(style={"borderBottom": f"1px solid {THEME['card_border']}", "color": THEME["text_muted"]}, children=[
                                    html.Th("Sensor Channel", style={"padding": "8px 12px"}),
                                    html.Th("Raw Reading", style={"padding": "8px 12px"}),
                                    html.Th("Rolling Slope (1st Deriv)", style={"padding": "8px 12px"}),
                                    html.Th("Acceleration (2nd Deriv)", style={"padding": "8px 12px"}),
                                    html.Th("Rolling Volatility (Std)", style={"padding": "8px 12px"}),
                                    html.Th("Layer 1&2 Anomaly Score", style={"padding": "8px 12px"})
                                ])
                            ),
                            html.Tbody(table_rows)
                        ]
                    )
                ]
            )
        ]
    )


# ==============================================================================
# HISTORICAL TAB CALLBACKS
# ==============================================================================
@app.callback(
    [
        Output("hist-summary-badges", "children"),
        Output("hist-telemetry-chart", "figure"),
        Output("hist-risk-chart", "figure"),
        Output("hist-contribution-chart", "figure")
    ],
    Input("hist-node-select", "value")
)
def update_historical_charts(node_id):
    if df_history.empty or node_id not in df_history["node_id"].values:
        empty_fig = go.Figure()
        return html.Div(), empty_fig, empty_fig, empty_fig

    df_node = df_history[df_history["node_id"] == node_id].sort_values("day").copy()
    days = df_node["day"]

    # Summary Badges
    avg_risk = df_node["predicted_risk_score"].mean()
    max_risk = df_node["predicted_risk_score"].max()
    crit_days = (df_node["predicted_risk_band"] == BAND_CRITICAL).sum()
    warn_days = (df_node["predicted_risk_band"] == BAND_WARNING).sum()

    badges = [
        html.Span(f"Total Days: {len(df_node)}", style={"backgroundColor": "#334155", "padding": "6px 12px", "borderRadius": "6px", "fontSize": "0.85rem", "fontWeight": "600"}),
        html.Span(f"Avg Risk: {avg_risk:.1f}", style={"backgroundColor": "#334155", "padding": "6px 12px", "borderRadius": "6px", "fontSize": "0.85rem", "fontWeight": "600"}),
        html.Span(f"Max Risk: {max_risk:.1f}", style={"backgroundColor": THEME["band_critical"] if max_risk > 75 else "#334155", "padding": "6px 12px", "borderRadius": "6px", "fontSize": "0.85rem", "fontWeight": "700"}),
        html.Span(f"Warning/Critical Days: {warn_days + crit_days}", style={"backgroundColor": THEME["band_warning"] if (warn_days+crit_days)>0 else "#334155", "padding": "6px 12px", "borderRadius": "6px", "fontSize": "0.85rem", "fontWeight": "600"})
    ]

    # 1. Telemetry Subplots (Tilt, Disp, Strain, Vib)
    fig_telemetry = make_subplots(
        rows=2, cols=2,
        subplot_titles=("Angular Tilt (deg)", "Linear Displacement (mm)", "Structural Strain (με)", "Vibration Velocity (mm/s)"),
        vertical_spacing=0.15,
        horizontal_spacing=0.08
    )
    fig_telemetry.add_trace(go.Scatter(x=days, y=df_node["tilt_deg"], name="Tilt (°)", line=dict(color="#38BDF8", width=2)), row=1, col=1)
    fig_telemetry.add_trace(go.Scatter(x=days, y=df_node["displacement_mm"], name="Displacement (mm)", line=dict(color="#A78BFA", width=2)), row=1, col=2)
    fig_telemetry.add_trace(go.Scatter(x=days, y=df_node["strain_microstrain"], name="Strain (με)", line=dict(color="#F472B6", width=2)), row=2, col=1)
    fig_telemetry.add_trace(go.Scatter(x=days, y=df_node["vibration_mms"], name="Vibration (mm/s)", line=dict(color="#34D399", width=2)), row=2, col=2)

    fig_telemetry.update_layout(
        title=f"Raw Sensor Telemetry Over 365 Days ({node_id})",
        title_font=dict(color="#FFFFFF", size=15),
        paper_bgcolor=THEME["card_bg"],
        plot_bgcolor="#0F172A",
        font=dict(color="#94A3B8"),
        height=400,
        showlegend=False,
        margin=dict(l=40, r=30, t=50, b=30)
    )
    fig_telemetry.update_xaxes(showgrid=True, gridcolor="#334155")
    fig_telemetry.update_yaxes(showgrid=True, gridcolor="#334155")

    # 2. Risk Score & Risk Bands Timeline
    fig_risk = go.Figure()
    # Shaded Risk Bands
    fig_risk.add_hrect(y0=0, y1=25, fillcolor="rgba(16, 185, 129, 0.12)", line_width=0, annotation_text="NORMAL (0-25)", annotation_position="top left", annotation_font=dict(color=THEME["band_normal"], size=10))
    fig_risk.add_hrect(y0=25, y1=50, fillcolor="rgba(245, 158, 11, 0.12)", line_width=0, annotation_text="WATCH (26-50)", annotation_position="top left", annotation_font=dict(color=THEME["band_watch"], size=10))
    fig_risk.add_hrect(y0=50, y1=75, fillcolor="rgba(249, 115, 22, 0.12)", line_width=0, annotation_text="WARNING (51-75)", annotation_position="top left", annotation_font=dict(color=THEME["band_warning"], size=10))
    fig_risk.add_hrect(y0=75, y1=100, fillcolor="rgba(239, 68, 68, 0.15)", line_width=0, annotation_text="CRITICAL (76-100)", annotation_position="top left", annotation_font=dict(color=THEME["band_critical"], size=10))

    # Reference curve if available
    if "risk_score_reference" in df_node.columns:
        fig_risk.add_trace(go.Scatter(
            x=days,
            y=df_node["risk_score_reference"],
            name="Reference Ground Truth",
            line=dict(color="#64748B", width=2, dash="dot"),
            opacity=0.75
        ))

    # Model Predicted curve
    fig_risk.add_trace(go.Scatter(
        x=days,
        y=df_node["predicted_risk_score"],
        name="3-Layer Predicted Risk",
        line=dict(color=THEME["accent_cyan"], width=2.5)
    ))

    fig_risk.update_layout(
        title=f"Composite Risk Score Timeline & Calibrated Domain Bands ({node_id})",
        title_font=dict(color="#FFFFFF", size=15),
        paper_bgcolor=THEME["card_bg"],
        plot_bgcolor="#0F172A",
        font=dict(color="#94A3B8"),
        yaxis=dict(range=[0, 105], title="Risk Score (0-100)", showgrid=True, gridcolor="#334155"),
        xaxis=dict(title="Day", showgrid=True, gridcolor="#334155"),
        height=350,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=40, r=30, t=60, b=40)
    )

    # 3. Stacked Sensor Anomaly Contributions
    fig_contrib = go.Figure()
    s_labels = [("tilt_deg", "Tilt (30%)", "#38BDF8"), ("strain_microstrain", "Strain (30%)", "#F472B6"), ("displacement_mm", "Displacement (25%)", "#A78BFA"), ("vibration_mms", "Vibration (15%)", "#34D399")]
    for s_key, s_name, s_col in s_labels:
        col_name = f"{s_key}_anomaly_score"
        if col_name in df_node.columns:
            # Weighted anomaly
            weighted = df_node[col_name] * model.weights[s_key] * 85.0
            fig_contrib.add_trace(go.Scatter(
                x=days,
                y=weighted,
                name=s_name,
                stackgroup="one",
                line=dict(width=0.5, color=s_col),
                fillcolor=s_col + "80"
            ))

    fig_contrib.update_layout(
        title=f"Per-Sensor Weighted Anomaly Contribution to Risk ({node_id})",
        title_font=dict(color="#FFFFFF", size=15),
        paper_bgcolor=THEME["card_bg"],
        plot_bgcolor="#0F172A",
        font=dict(color="#94A3B8"),
        yaxis=dict(title="Contribution Points", showgrid=True, gridcolor="#334155"),
        xaxis=dict(title="Day", showgrid=True, gridcolor="#334155"),
        height=280,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=40, r=30, t=50, b=40)
    )

    return badges, fig_telemetry, fig_risk, fig_contrib


# ==============================================================================
# REPLAY / STREAMING SIMULATOR CALLBACKS
# ==============================================================================
@app.callback(
    [
        Output("btn-replay-toggle", "children"),
        Output("replay-interval", "disabled"),
        Output("replay-interval", "interval")
    ],
    [
        Input("btn-replay-toggle", "n_clicks"),
        Input("replay-speed-slider", "value")
    ],
    [State("replay-interval", "disabled")]
)
def toggle_replay(n_clicks, speed_interval, is_disabled):
    ctx = callback_context
    if not ctx.triggered:
        return "▶ Start Streaming", True, speed_interval

    trigger = ctx.triggered[0]["prop_id"].split(".")[0]
    if trigger == "btn-replay-toggle":
        new_disabled = not is_disabled
        btn_text = "⏸ Pause Streaming" if not new_disabled else "▶ Start Streaming"
        return btn_text, new_disabled, speed_interval
    else:
        btn_text = "⏸ Pause Streaming" if not is_disabled else "▶ Start Streaming"
        return btn_text, is_disabled, speed_interval


@app.callback(
    Output("replay-current-day", "data"),
    [
        Input("replay-interval", "n_intervals"),
        Input("btn-replay-reset", "n_clicks"),
        Input("replay-node-select", "value")
    ],
    State("replay-current-day", "data")
)
def step_replay(n_intervals, n_reset, node_id, current_day):
    ctx = callback_context
    if not ctx.triggered:
        return 1
    trigger = ctx.triggered[0]["prop_id"].split(".")[0]
    if trigger in ["btn-replay-reset", "replay-node-select"]:
        model.reset_buffer(node_id)
        return 1
    # Advance day
    max_days = 365
    return min(current_day + 1, max_days)


@app.callback(
    Output("replay-display-container", "children"),
    Input("replay-current-day", "data"),
    State("replay-node-select", "value")
)
def render_replay_view(current_day, node_id):
    if df_history.empty or node_id not in df_history["node_id"].values:
        return html.Div("No data available.")

    df_node = df_history[df_history["node_id"] == node_id].sort_values("day")
    row = df_node[df_node["day"] == current_day]
    if row.empty:
        row = df_node.iloc[-1:]

    r = row.iloc[0]
    risk_score = float(r["predicted_risk_score"])
    risk_band = r["predicted_risk_band"]

    color_map = {
        BAND_NORMAL: THEME["band_normal"],
        BAND_WATCH: THEME["band_watch"],
        BAND_WARNING: THEME["band_warning"],
        BAND_CRITICAL: THEME["band_critical"]
    }
    status_col = color_map.get(risk_band, "#FFF")

    # Rolling window chart of last 30 days
    sub_df = df_node[(df_node["day"] <= current_day) & (df_node["day"] >= max(1, current_day - 45))]

    fig_live = go.Figure()
    fig_live.add_hrect(y0=0, y1=25, fillcolor="rgba(16, 185, 129, 0.1)", line_width=0)
    fig_live.add_hrect(y0=25, y1=50, fillcolor="rgba(245, 158, 11, 0.1)", line_width=0)
    fig_live.add_hrect(y0=50, y1=75, fillcolor="rgba(249, 115, 22, 0.1)", line_width=0)
    fig_live.add_hrect(y0=75, y1=100, fillcolor="rgba(239, 68, 68, 0.15)", line_width=0)

    fig_live.add_trace(go.Scatter(
        x=sub_df["day"],
        y=sub_df["predicted_risk_score"],
        mode="lines+markers",
        name="Risk Score",
        line=dict(color=status_col, width=3),
        marker=dict(size=5)
    ))
    fig_live.update_layout(
        title=f"Live Rolling Stream: Day {current_day} of 365 ({node_id})",
        title_font=dict(color="#FFFFFF", size=14),
        paper_bgcolor=THEME["card_bg"],
        plot_bgcolor="#0F172A",
        font=dict(color="#94A3B8"),
        yaxis=dict(range=[0, 105], title="Risk Score", showgrid=True, gridcolor="#334155"),
        xaxis=dict(title="Day", showgrid=True, gridcolor="#334155"),
        height=320,
        margin=dict(l=40, r=20, t=50, b=40)
    )

    return html.Div(
        style={"display": "grid", "gridTemplateColumns": "340px 1fr", "gap": "20px"},
        children=[
            # Live Status Card
            html.Div(
                style={
                    "backgroundColor": THEME["card_bg"],
                    "borderRadius": "14px",
                    "border": f"2px solid {status_col}",
                    "padding": "20px",
                    "display": "flex",
                    "flexDirection": "column",
                    "justifyContent": "center",
                    "alignItems": "center",
                    "textAlign": "center"
                },
                children=[
                    html.H4(f"CURRENT TICK: DAY {current_day}", style={"margin": "0 0 10px 0", "color": THEME["text_muted"], "letterSpacing": "0.1em"}),
                    html.Div(f"{risk_score:.1f}", style={"fontSize": "3.5rem", "fontWeight": "900", "color": status_col}),
                    html.Div(create_badge(risk_band, status_col), style={"marginTop": "8px"}),
                    html.Hr(style={"borderColor": THEME["card_border"], "width": "80%", "margin": "16px 0"}),
                    html.Div(style={"width": "100%", "fontSize": "0.85rem", "color": "#CBD5E1", "textAlign": "left", "padding": "0 12px"}, children=[
                        html.Div(f"• Tilt: {r['tilt_deg']:.3f}°", style={"margin": "4px 0"}),
                        html.Div(f"• Displacement: {r['displacement_mm']:.3f} mm", style={"margin": "4px 0"}),
                        html.Div(f"• Strain: {r['strain_microstrain']:.1f} με", style={"margin": "4px 0"}),
                        html.Div(f"• Vibration: {r['vibration_mms']:.3f} mm/s", style={"margin": "4px 0"})
                    ])
                ]
            ),
            # Rolling Chart
            html.Div([dcc.Graph(figure=fig_live, config={"displayModeBar": False})])
        ]
    )


# ==============================================================================
# BATCH UPLOAD CALLBACK
# ==============================================================================
@app.callback(
    Output("batch-results-container", "children"),
    Input("upload-batch-csv", "contents"),
    State("upload-batch-csv", "filename")
)
def handle_batch_upload(contents, filename):
    if contents is None:
        return html.Div("Upload a CSV file to begin batch scoring.", style={"color": THEME["text_muted"], "fontStyle": "italic", "padding": "20px"})

    content_type, content_string = contents.split(",")
    decoded = base64.b64decode(content_string)

    try:
        df_upload = pd.read_csv(io.StringIO(decoded.decode("utf-8")))
        required = ["node_id", "tilt_deg", "displacement_mm", "strain_microstrain", "vibration_mms"]
        missing = [c for c in required if c not in df_upload.columns]
        if missing:
            return html.Div(f"Error: Missing required columns: {missing}", style={"color": THEME["band_critical"], "fontWeight": "700"})

        # Run inference
        df_scored = model.predict_batch(df_upload)

        # Summary Metrics
        total = len(df_scored)
        counts = df_scored["predicted_risk_band"].value_counts().to_dict()

        # CSV Download String
        csv_str = df_scored.to_csv(index=False)
        b64_csv = base64.b64encode(csv_str.encode()).decode()
        href_data = f"data:text/csv;charset=utf-8;base64,{b64_csv}"

        preview_cols = ["node_id", "tilt_deg", "displacement_mm", "strain_microstrain", "vibration_mms", "predicted_risk_score", "predicted_risk_band"]
        if "day" in df_scored.columns:
            preview_cols.insert(1, "day")

        return html.Div(
            children=[
                html.Div(
                    style={
                        "display": "flex",
                        "justifyContent": "space-between",
                        "alignItems": "center",
                        "backgroundColor": THEME["card_bg"],
                        "padding": "16px 20px",
                        "borderRadius": "12px",
                        "border": f"1px solid {THEME['card_border']}",
                        "marginBottom": "20px"
                    },
                    children=[
                        html.Div([
                            html.H4(f"Successfully Scored File: {filename} ({total:,} rows)", style={"margin": "0 0 6px 0", "color": THEME["accent_cyan"]}),
                            html.Div([
                                create_badge(f"Normal: {counts.get('NORMAL', 0)}", THEME["band_normal"]),
                                html.Span(" "),
                                create_badge(f"Watch: {counts.get('WATCH', 0)}", THEME["band_watch"]),
                                html.Span(" "),
                                create_badge(f"Warning: {counts.get('WARNING', 0)}", THEME["band_warning"]),
                                html.Span(" "),
                                create_badge(f"Critical: {counts.get('CRITICAL', 0)}", THEME["band_critical"])
                            ])
                        ]),
                        html.A(
                            "📥 Download Scored CSV",
                            href=href_data,
                            download=f"scored_{filename}",
                            style={
                                "padding": "10px 20px",
                                "backgroundColor": THEME["accent_cyan"],
                                "color": "#0F172A",
                                "textDecoration": "none",
                                "borderRadius": "8px",
                                "fontWeight": "700",
                                "boxShadow": "0 4px 12px rgba(6, 182, 212, 0.3)"
                            }
                        )
                    ]
                ),
                html.Div(
                    style={"backgroundColor": THEME["card_bg"], "borderRadius": "12px", "padding": "16px", "border": f"1px solid {THEME['card_border']}"},
                    children=[
                        html.H4("Scored Data Preview (First 15 Rows)", style={"margin": "0 0 12px 0", "color": THEME["text_muted"]}),
                        dt.DataTable(
                            data=df_scored[preview_cols].head(15).round(3).to_dict("records"),
                            columns=[{"name": i, "id": i} for i in preview_cols],
                            style_header={"backgroundColor": "#0F172A", "color": "#FFF", "fontWeight": "700", "border": "1px solid #334155"},
                            style_cell={"backgroundColor": THEME["card_bg"], "color": "#E2E8F0", "padding": "8px", "border": "1px solid #334155", "textAlign": "center"},
                            style_data_conditional=[
                                {"if": {"filter_query": "{predicted_risk_band} = 'CRITICAL'"}, "backgroundColor": "rgba(239, 68, 68, 0.25)", "color": "#FCA5A5", "fontWeight": "700"},
                                {"if": {"filter_query": "{predicted_risk_band} = 'WARNING'"}, "backgroundColor": "rgba(249, 115, 22, 0.2)", "color": "#FDBA74", "fontWeight": "700"}
                            ]
                        )
                    ]
                )
            ]
        )
    except Exception as e:
        return html.Div(f"Processing Error: {str(e)}", style={"color": THEME["band_critical"], "fontWeight": "700", "padding": "20px"})


if __name__ == "__main__":
    print("=" * 60)
    print(" SUBSIDENCE RISK DASHBOARD STARTING...")
    print(" Open in your browser: http://127.0.0.1:8050")
    print("=" * 60)
    app.run(debug=False, host="127.0.0.1", port=8050)
