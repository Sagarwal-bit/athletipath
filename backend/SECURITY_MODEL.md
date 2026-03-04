# AthletiPath Security Model

## Positioning
AthletiPath is a secure, trust-driven performance verification platform with anti-fraud detection and multi-layer authentication.

## Security architecture
- MFA authentication: password + OTP (email) with optional face verification flag.
- Token lifecycle: short-lived JWT access token + persisted refresh tokens + revocation support.
- RBAC: student, coach, admin, super_admin (legacy teacher normalized to coach).
- Behavioral anomaly detection: impossible speed, GPS jump, duplicate video, repeated patterns, timestamp mismatch.
- Risk engine: combines anomalies, failed logins, and trust deviation into low/medium/high risk categories.

## OWASP-focused controls
- Broken Access Control: route-level RBAC middleware and self/role checks.
- Identification/Auth failures: MFA challenges, failed-login tracking, account lock windows.
- Cryptographic failures: AES encryption for sensitive fields (GPS/trust).
- Injection and unsafe input: request schema validation and strict file upload filters.
- Security misconfiguration: security headers + CORS allowlist + token expiry enforcement.
- Logging/monitoring: security_events, login_attempts, risk_scores, admin security dashboard.

## Threat model
- Fake activity submissions
  Mitigation: anomaly detection + trust penalties + admin alerts.
- GPS manipulation
  Mitigation: jump detection + risk score increase.
- Video forgery / replay
  Mitigation: duplicate filename heuristic + timestamp mismatch checks + secure storage + signed URLs.
- Identity spoofing
  Mitigation: MFA and account lock after repeated failures.
- Brute force login
  Mitigation: auth rate limiting + intrusion logging + temporary lock.
- Token tampering
  Mitigation: JWT verify failures logged as token_tampering events.

## Notes
- Email OTP works with configured SMTP; otherwise OTP is logged for local dev fallback.
- Face verification is wired as an optional second factor flag and can be replaced with real biometric matching.
