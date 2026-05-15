export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; expiresAt?: number }>();
  private evictions = 0;
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly capacity: number,
    private readonly ttlMs?: number,
  ) {}

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt !== undefined && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    // Move to MRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: K, value: V): void {
    this.cache.delete(key);
    if (this.cache.size >= this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
        this.evictions++;
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: this.ttlMs !== undefined ? Date.now() + this.ttlMs : undefined,
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== undefined && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
