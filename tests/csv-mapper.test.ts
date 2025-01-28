import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CsvMapper from '../src/routes/csv-mapper/+page.svelte';

describe('CSV Mapper', () => {
  it('should render without breaking other routes', () => {
    const { container } = render(CsvMapper);
    expect(container).toBeTruthy();
  });

  it('should load Supabase tables', async () => {
    // Test table loading
  });
}); 