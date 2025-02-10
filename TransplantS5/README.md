# Transplant

A modern data pipeline for managing agricultural planting data, built with Svelte 5 and TypeScript.

## Features

- **CSV Data Import**: Easily import planting data from CSV files
- **Data Validation**: Robust validation with TypeScript and business rules
- **Database Integration**: Seamless PostgreSQL integration via Drizzle ORM
- **Modern UI**: Clean, accessible interface built with Svelte 5 and Pico CSS
- **Type Safety**: Full TypeScript support throughout the application

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm 9+

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd transplant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Development

### State Management

Transplant uses Svelte 5's runes for state management:

```typescript
// Primary States
const csvData = $state<CsvData | null>(null);
const transformedData = $state<TransformedData | null>(null);

// Derived States
const isReady = $derived(transformedData !== null);
```

### Available Scripts

```bash
# Development
npm run dev         # Start development server
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues

# Database
npm run db:push     # Push schema changes
npm run db:generate # Generate migrations
npm run db:studio   # Open Drizzle Studio

# Testing
npm run test        # Run all tests
npm test:unit      # Run unit tests
npm test:integration # Run integration tests
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for our development process, coding standards, and state management patterns.

## Architecture

Transplant follows a three-stage data pipeline:

1. **CSV Stage**: Raw data ingestion
2. **Transform Stage**: Data validation and cleaning
3. **Map Stage**: Schema mapping and database preparation

Each stage maintains its own typed state and validation rules.

## Testing

We use Vitest for unit testing and Playwright for integration tests. Run the full suite:

```bash
npm run test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

