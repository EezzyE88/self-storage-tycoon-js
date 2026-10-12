# Startup graphics guard — 2026-10-12

Base: candidate/rescue-operation-20261011 @ bd164a83432ad3c9209f1cc7b0fd29c23fd46396.
Isolated branch: candidate/startup-graphics-guard-20261012.
Accepted master remains e04a808dd1cac558b9e97e8cd5f021f874ac7cfe; no merge.
Preserved Maple checkout remains clean at ba5212707cab61acceb3ff1acbf4550be7502bb6.

## Behavior

Renderer creation is guarded. On failure an accessible, keyboard-focused screen explains that 3D graphics could not initialize, offers a manual Reload game button, and advises keeping browser site data. Raw error text stays in the console and never becomes HTML. Failure returns before game UI, animation, input, save loading or autosave handler setup. A successful renderer follows the existing startup path.

This is a startup-only guard, not a renderer replacement or a change to the existing runtime context-loss recovery. It does not cure unavailable WebGL. No simulation, economics, existing controls, save module or save schema changed; no user save was accessed or imported. Static imports retain the existing browser-storage availability probe.

## Validation

- New tstartup_graphics.mjs: successful renderer identity/no fallback, static accessible error/no HTML injection/manual reload, and execution of actual complete main module with a failing renderer. Forbidden downstream UI/cloud/save/input/clock setup proves startup aborts safely.
- Existing rescue-operation: 13 groups, including seven-day ordinary-command economic parity, actual leasing tracking, credit projections and pricing UI handlers.
- Existing rescue-operation saves: raw/compressed load round trips for four states, legacy/malformed optional tracking.
- Existing project UI: both authored choices at all four speeds, pause preservation and discard.
- Existing pause policy: 13 checks. Syntax and whitespace checks pass.

## Desktop limitation

Available Chrome (1363×936) initially reported GL_VENDOR/GL_RENDERER Disabled and failed WebGL initialization twice. Only one browser is exposed. No WebGL-capable desktop browser is currently available, so desktop gameplay is HOLD, not PASS. Managed internal preview also cannot launch: bwrap cannot mount /proc (Operation not permitted). These are environment limits; no browser configuration/security settings were changed. Publication and deployed fallback-screen observations are reported separately after deployment.
