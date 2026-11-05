# Security Policy

## Supported versions

`@oxth/nestjs-storage` is pre-1.0, so security fixes go into the latest release line only. Upgrade to the newest `0.x` release to get them.

| Version | Supported |
| --- | --- |
| Latest `0.x` release | Yes |
| Older releases | No |

## Reporting a vulnerability

Please **don't** open a public issue for security problems.

Report it privately through GitHub instead: go to the repository's [Security tab](https://github.com/oxth/nestjs-storage/security) and click **Report a vulnerability**. That opens a private advisory that only the maintainers can see.

Helpful details to include:

- The affected version and driver(s) (`local`, `s3`, `r2`, `gcs`, `azure`)
- What an attacker can do, and under which configuration
- Steps or a minimal NestJS app that reproduces it

We'll confirm we've received the report, keep you updated while we work on a fix, and credit you in the advisory unless you'd rather stay anonymous.

## Scope

In scope: code in this repository, such as the upload interceptors, signed URL generation and verification (`LocalSignedUrlGuard`, `LocalSignedUrlMiddleware`, `verifySignedUrl`), and the driver wrappers.

Vulnerabilities in dependencies (flydrive, multer, the AWS / Google Cloud / Azure SDKs) should go to those projects. Do tell us if this package uses them in a way that makes the issue worse.
