import { Preferences } from '@capacitor/preferences';
import { z } from 'zod';

export class LocalCollection<T> {
  constructor(private readonly key: string, private readonly schema: z.ZodType<T>) {}

  async all(): Promise<T[]> {
    const result = await Preferences.get({ key: this.key });
    if (!result.value) return [];
    const parsed = JSON.parse(result.value) as unknown;
    return z.array(this.schema).parse(parsed);
  }

  async save(items: T[]): Promise<void> {
    await Preferences.set({ key: this.key, value: JSON.stringify(items) });
  }

  async prepend(item: T): Promise<void> {
    const items = await this.all();
    await this.save([item, ...items]);
  }
}
