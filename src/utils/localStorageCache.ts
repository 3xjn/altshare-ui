/**
 * Type definitions for stored items
 */
interface StoredItem<T> {
    value: T;
    expiry: number;
}

/**
 * Configuration options for the local storage store
 */
interface LocalStorageOptions {
    /** Prefix for all keys in this store instance */
    storeName: string;
    /** Default TTL in milliseconds (optional) */
    defaultTTL?: number;
}

/**
 * localStorage wrapper with namespacing and TTL support using Promises
 */
export class LocalStorageStore {
    private storeName: string;
    private defaultTTL: number;

    /**
     * Creates a new local storage store
     * @param options Configuration options
     */
    constructor(options: LocalStorageOptions) {
        this.storeName = options.storeName;
        this.defaultTTL = options.defaultTTL || 24 * 60 * 60 * 1000; // Default 1 day
    }

    /**
     * Gets the full key with the store name prefix
     * @param key The base key
     * @returns The prefixed key
     */
    private getFullKey(key: string): string {
        return `${this.storeName}:${key}`;
    }

    /**
     * Retrieves an item from localStorage
     * @param key The key to retrieve
     * @typeparam T The expected type of the stored value
     * @returns Promise resolving to the value or null if not found/expired
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const fullKey = this.getFullKey(key);
            const item = localStorage.getItem(fullKey);

            if (!item) {
                return null;
            }

            const parsedItem = JSON.parse(item) as StoredItem<T>;

            // Check if the item has expired
            if (new Date().getTime() > parsedItem.expiry) {
                localStorage.removeItem(fullKey);
                return null;
            }

            return parsedItem.value;
        } catch (err) {
            console.error('Error getting item from localStorage:', err);
            return null;
        }
    }

    /**
     * Retrieves an item synchronously
     * @param key The key to retrieve
     * @returns The value or null if not found or expired
     * @typeparam T The expected type of the stored value
     */
    getSync<T>(key: string): T | null {
        try {
            const fullKey = this.getFullKey(key);
            const item = localStorage.getItem(fullKey);

            if (!item) {
                return null;
            }

            const parsedItem = JSON.parse(item) as StoredItem<T>;

            // Check if the item has expired
            if (new Date().getTime() > parsedItem.expiry) {
                localStorage.removeItem(fullKey);
                return null;
            }

            return parsedItem.value;
        } catch (err) {
            console.error('Error getting item from localStorage:', err);
            return null;
        }
    }

    /**
     * Stores an item in localStorage
     * @param key The key to store under
     * @param value The value to store
     * @param ttl Time-to-live in milliseconds (optional, uses default if not provided)
     * @typeparam T The type of the value being stored
     * @returns Promise resolving to true if successful
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
        try {
            const fullKey = this.getFullKey(key);
            const actualTTL = ttl !== undefined ? ttl : this.defaultTTL;
            const expiry = new Date().getTime() + actualTTL;
            const item: StoredItem<T> = { value, expiry };

            localStorage.setItem(fullKey, JSON.stringify(item));
            return true;
        } catch (err) {
            console.error('Error setting item in localStorage:', err);
            return false;
        }
    }

    /**
     * Sets an item synchronously
     * @param key The key to store under
     * @param value The value to store
     * @param ttl Time-to-live in milliseconds (optional, uses default if not provided)
     * @returns Whether the operation was successful
     * @typeparam T The type of the value being stored
     */
    setSync<T>(key: string, value: T, ttl?: number): boolean {
        try {
            const fullKey = this.getFullKey(key);
            const actualTTL = ttl !== undefined ? ttl : this.defaultTTL;
            const expiry = new Date().getTime() + actualTTL;
            const item: StoredItem<T> = { value, expiry };

            localStorage.setItem(fullKey, JSON.stringify(item));
            return true;
        } catch (err) {
            console.error('Error setting item in localStorage:', err);
            return false;
        }
    }

    /**
     * Deletes an item from localStorage
     * @param key The key to delete
     * @returns Promise resolving to true if successful
     */
    async delete(key: string): Promise<boolean> {
        try {
            const fullKey = this.getFullKey(key);
            localStorage.removeItem(fullKey);
            return true;
        } catch (err) {
            console.error('Error deleting item from localStorage:', err);
            return false;
        }
    }

    /**
     * Deletes an item synchronously
     * @param key The key to delete
     * @returns Whether the operation was successful
     */
    deleteSync(key: string): boolean {
        try {
            const fullKey = this.getFullKey(key);
            localStorage.removeItem(fullKey);
            return true;
        } catch (err) {
            console.error('Error deleting item from localStorage:', err);
            return false;
        }
    }

    /**
     * Clears all items belonging to this store
     * @returns Promise resolving to true if successful
     */
    async clear(): Promise<boolean> {
        try {
            const keysToRemove: string[] = [];
            const prefix = `${this.storeName}:`;

            // Find all keys that belong to this store
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }

            // Remove all found keys
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (err) {
            console.error('Error clearing items from localStorage:', err);
            return false;
        }
    }

    /**
     * Lists all keys in this store
     * @returns Array of keys (without store prefix)
     */
    keys(): string[] {
        const result: string[] = [];
        const prefix = `${this.storeName}:`;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                result.push(key.substring(prefix.length));
            }
        }

        return result;
    }
}
