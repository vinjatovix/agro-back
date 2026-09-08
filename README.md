# agro-back [![Version](https://img.shields.io/badge/Version-v1.0.0-blue.svg)](https://semver.org)

## Quality report

[Sonarcloud](https://sonarcloud.io/project/overview?id=vinjatovix_agro-back)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vinjatovix_agro-back&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vinjatovix_agro-back)

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=vinjatovix_agro-back&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=vinjatovix_agro-back)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vinjatovix_agro-back&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vinjatovix_agro-back)

## Architecture TL;DR

- Express (layered architecture)
- Domain-driven design (light, bounded contexts)
- Awilix DI container per request scope
- OpenAPI-driven contract validation
- MongoDB persistence layer
- Jest + Cucumber testing pyramid (unit / feature / contract)

## Installation

### Prerequisites

- Node.js version = 22.x
- npm version >= 10.1.0

A `.tool-versions` file is provided to easily work with [asdf](https://asdf-vm.com/)

- Clone the repository:

```bash
git clone https://github.com/vinjatovix/agro-back.git
cd agro-back
```

- Install dependencies:

```bash
npm install
```

### Usage

Please rename `.env_example` to `.env` And fill in the variables.

#### Run in dev mode

Run the development server:

```bash
npm run dev
```

#### Run the build

You can build and run it locally with:

```bash
npm run start:local
```

Or just with:

```bash
npm run docker:local
```

### Setup Local Persistence

- Starts the mongo db

```bash
npm run docker:mongo
```

- Provisioning the db
  Provisioning the local mongo with cloud `$ENV` data

```bash
npm run restoreDB <env> <database> <user> <password>
```

- Or restore previous dumped data.

```bash
npm run restoreDump $ENV
```

> Note this will only work if previous data for such `$ENV` was dumped and restored before

---

### Testing Strategy

- Unit tests → domain logic (pure)
- Feature tests → HTTP API (controllers + flow)
- Contract tests → OpenAPI schema validation

- Acceptance tests

```bash
npm run test:features
```

- Unit tests

```bash
npm run test:unit
```

- Full tests routines

```bash
npm run test
```

## Contributing

Feel free to contribute to this project but keep in mind the guidelines in [CONTRIBUTING.md](CONTRIBUTING.md)

Open an issue or create a [pull request](https://github.com/vinjatovix/agro-back/pulls).

### Bugs and Issues

Please report [bugs](https://github.com/vinjatovix/agro-back/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=), [issues](https://github.com/vinjatovix/agro-back/issues/new?assignees=&labels=&projects=&template=feature_request.md&title=) or [Report a vulnerability](https://github.com/vinjatovix/agro-back/security/advisories/new) at GitHub [Issues](https://github.com/vinjatovix/agro-back/issues).

## License

This project is licensed under the MIT License.

See [LICENSE](LICENSE) for details.

## Changelog

[CHANGELOG](https://github.com/vinjatovix/agro-back/releases)

## Repository

<https://github.com/vinjatovix/agro-back>

### Author

[Vinjatovix](https://github.com/vinjatovix)
