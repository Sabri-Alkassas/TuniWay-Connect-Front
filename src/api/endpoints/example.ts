import { get } from '../client';
import type { ExampleItem } from '../../types/api';

const PATH = '/api/example/items';

export async function fetchExampleItems(): Promise<ExampleItem[]> {
  return get<ExampleItem[]>(PATH);
}
