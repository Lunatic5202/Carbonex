# CarboNex

## AI-enabled mine subsidence monitoring and early warning

CarboNex is a proposed low-cost, real-time monitoring system for underground coal mines in India. It combines distributed wireless sensor nodes, AI/ML-based anomaly detection, GIS risk mapping, and early-warning workflows to help identify potentially dangerous ground movement before it becomes a serious safety event.

> **Smart India Hackathon 2025**  
> Problem Statement ID: **SIH25025**  
> Theme: **Smart Automation**  
> Category: **Hardware**  
> Team: **CarboNex**

## Problem

Underground mining environments are difficult to monitor continuously. Manual inspections and unreliable connectivity can delay detection of deformation and subsidence risks. A practical system must use affordable hardware, tolerate communication failures, reduce false alarms, and present risk information clearly enough to support timely decisions.

## Proposed solution

CarboNex uses a distributed, self-healing wireless sensor network deployed across mine panels. Each smart node measures ground-movement indicators and sends telemetry to a central gateway. The platform is designed to:

1. Collect deformation-related measurements continuously.
2. Reroute data through neighboring nodes when a LoRa path fails.
3. Detect unusual multi-sensor behavior against learned regional baselines.
4. Analyze deformation rate, acceleration, and neighboring-node behavior.
5. Predict areas with elevated subsidence risk.
6. Display risk through GIS thermal mapping.
7. Issue early warnings for inspection and mitigation.

## System concept

```text
[Sensor nodes]
 ESP32 + LoRa + motion/strain sensing
          |
          v
[Self-healing LoRa mesh]
          |
          v
[Gateway and telemetry]
          |
          v
[AI/ML detection and prediction]
          |
          +--> [GIS risk map]
          +--> [Early-warning workflow]
```

## Initial technical approach

The proposal identifies the following prototype hardware:

| Component | Role |
| --- | --- |
| ESP32 | Embedded controller and sensor-node processing |
| LoRa SX1278 | Long-range wireless telemetry |
| MPU6050 | Accelerometer and gyroscope measurements |
| Strain gauge | Stretch and deformation measurement |

The implementation should evolve through calibration, connectivity tests, field trials, and safety review.

## Feasibility and risks

Key engineering priorities include rugged enclosures, protected connectors, reliable sensor mounting, periodic calibration, modular gateways, compact telemetry, and spatial correlation across neighboring nodes.

| Risk | Mitigation direction |
| --- | --- |
| Harsh field conditions | Rugged enclosure, protected connectors, suitable mounting, and calibration. |
| Scaling from prototype to mine-wide deployment | Modular architecture, hierarchical gateways, and scalable telemetry. |
| False alarms | Correlate neighboring-node measurements and use regional baselines. |
| Connectivity failures | Self-healing mesh routing and gateway redundancy where practical. |

## Expected impact

CarboNex is intended to improve miner and community safety through earlier warnings, faster identification of high-risk zones, and reduced dependence on delayed manual monitoring. Future environmental layers could include water-body and coal-fire risk. Temporal monitoring may also help authorities identify unusual ground activity around suspected unauthorized mining areas.

These outputs must support—not replace—qualified inspections, approved mine-safety procedures, professional assessment, and applicable regulatory requirements.

## Project status

This repository is documentation-first and ready for implementation work in the following areas:

- Sensor-node firmware and calibration utilities.
- LoRa mesh communication and gateway software.
- Telemetry storage and validation.
- Anomaly detection and subsidence-risk modeling.
- GIS visualization and alerting.
- Hardware test procedures and field documentation.

## Contributing

Read [CONTRIBUTOR.md](CONTRIBUTOR.md) before opening a change. Contributions should document hardware assumptions, data limitations, test evidence, and safety implications.

## License

No project license has been selected yet. Until a license is added, reuse is subject to the repository owner's default rights.

## Disclaimer

CarboNex is a project proposal and engineering prototype concept. It is not a certified mine-safety instrument and must not be used as a substitute for regulatory compliance, professional assessment, approved monitoring systems, or emergency procedures.

## References

The project scope and technical concept are based on the supplied CarboNex Smart India Hackathon idea-submission presentation, which references research on subsidence management and surface-deformation monitoring in Indian coalfields.

[1]: 26025_CarboNex.pptx "CarboNex Smart India Hackathon idea-submission presentation"
