# Contributing to CarboNex

Thank you for helping build CarboNex. The project concerns mine-safety monitoring, so contributions must prioritize traceability, measured behavior, and clear limits over unsupported claims.

## Before you start

Read the [README](README.md) to understand the project scope. For substantial changes, open an issue first and describe the problem, proposed approach, affected workstream, and validation plan. Small documentation fixes may be submitted directly.

## Contribution areas

Contributions are welcome in the following areas:

- Embedded firmware for ESP32 sensor nodes.
- LoRa SX1278 communication and self-healing mesh behavior.
- MPU6050 and strain-gauge acquisition, calibration, and filtering.
- Gateway software and telemetry handling.
- AI/ML anomaly detection and subsidence-risk prediction.
- GIS visualization, risk maps, and alert workflows.
- Hardware test plans, deployment notes, and documentation.

## Development principles

1. **Make changes reproducible.** Record hardware revisions, sensor configuration, firmware version, dataset version, model version, and relevant environment details.
2. **Separate measured results from assumptions.** Identify simulated, laboratory, field, and unvalidated behavior explicitly.
3. **Design for failure.** Consider packet loss, node failure, clock drift, sensor noise, power loss, and gateway unavailability.
4. **Avoid unsafe claims.** Do not describe the system as certified, fail-safe, or production-ready without documented evidence and appropriate review.
5. **Protect sensitive data.** Do not commit credentials, private mine data, personally identifiable information, or precise sensitive site information.

## Suggested change workflow

1. Create a focused branch from the default branch.
2. Make the smallest change that addresses the issue.
3. Add or update tests, calibration records, diagrams, or documentation as appropriate.
4. Run the relevant validation locally and record the result.
5. Open a pull request with a concise summary, test evidence, and known limitations.
6. Respond to review comments and keep follow-up changes focused.

## Pull request checklist

Before requesting review, confirm that:

- The change has a clear purpose and limited scope.
- Documentation is updated where behavior or setup changes.
- Hardware assumptions and compatibility constraints are stated.
- Tests or measurements are included, or the reason they are not possible is explained.
- No secrets or sensitive operational data are present.
- Safety-related language is conservative and supported by evidence.
- Generated files are not committed unless they are required project artifacts.

## Data and model contributions

For datasets, include the source, collection conditions, units, sampling rate, preprocessing, labeling method, and known biases. For models, document the training data, validation split, metrics, threshold-selection method, false-positive and false-negative considerations, and model version. Do not report accuracy without explaining the evaluation conditions.

## Hardware contributions

For hardware changes, include the schematic or wiring description, component identifiers, power requirements, environmental assumptions, calibration procedure, and test results. Clearly distinguish a bench prototype from a field-ready design.

## Commit and review guidance

Use clear commit messages that state the change, such as `Add MPU6050 calibration procedure` or `Document gateway telemetry format`. Keep unrelated refactoring out of feature commits. Reviewers should prioritize correctness, reproducibility, security, maintainability, and safety limitations.

## License and ownership

The repository does not currently declare a project license. Do not assume that contribution implies permission to reuse the project. A license and contribution terms should be selected by the repository owner before external distribution.

## Code of conduct

Be respectful, precise, and constructive. Discuss technical decisions on their merits, acknowledge uncertainty, and welcome corrections supported by evidence.
