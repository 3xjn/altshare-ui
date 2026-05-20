import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    accountApi: {
        getAccounts: vi.fn(),
        editAccount: vi.fn(),
        getSharedAccounts: vi.fn(),
        getRank: vi.fn(),
    },
    authApi: {
        logout: vi.fn().mockResolvedValue(undefined),
        updateUserSecurityProfile: vi.fn(),
    },
    groupApi: {
        getGroups: vi.fn(),
        createGroup: vi.fn(),
        renameGroup: vi.fn(),
        deleteGroup: vi.fn(),
    },
    decryptMasterKey: vi.fn(),
    decryptAccountData: vi.fn(),
    encryptAccountData: vi.fn(),
    encryptExistingMasterKey: vi.fn(),
    deriveEncryptionKey: vi.fn(),
    decryptDataToBase64: vi.fn(),
    arrayBufferToBase64: vi.fn(),
    base64ToArrayBuffer: vi.fn(),
}));

vi.mock("@/services/AccountApi", () => ({ accountApi: mocks.accountApi }));
vi.mock("@/services/AuthApi", () => ({ authApi: mocks.authApi }));
vi.mock("@/services/GroupApi", () => ({ groupApi: mocks.groupApi }));
vi.mock("@/utils/encryption", () => ({
    decryptAccountData: mocks.decryptAccountData,
    decryptMasterKey: mocks.decryptMasterKey,
    encryptAccountData: mocks.encryptAccountData,
    encryptExistingMasterKey: mocks.encryptExistingMasterKey,
}));
vi.mock("@/utils/crypto", () => ({
    arrayBufferToBase64: mocks.arrayBufferToBase64,
    base64ToArrayBuffer: mocks.base64ToArrayBuffer,
    decryptDataToBase64: mocks.decryptDataToBase64,
    deriveEncryptionKey: mocks.deriveEncryptionKey,
}));
vi.mock("@/utils/localStorageCache", () => ({
    LocalStorageStore: class {
        private readonly store = new Map<string, unknown>();

        async get<T>(key: string): Promise<T | null> {
            return (this.store.get(key) as T | undefined) ?? null;
        }

        async set<T>(key: string, value: T): Promise<void> {
            this.store.set(key, value);
        }
    },
}));

import { useAccountStore } from "@/stores/AccountStore";

describe("useAccountStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAccountStore.setState({
            isAuthenticated: false,
            currentPassword: null,
            currentEmail: null,
            encryptedMasterKey: null,
            groups: [],
            groupKeys: {},
            defaultGroupId: null,
            decryptedAccounts: [],
        });
    });

    it("updates auth-related state through public setters", () => {
        const store = useAccountStore.getState();

        store.setIsAuthenticated(true);
        store.setCurrentPassword("secret");
        store.setCurrentEmail("user@example.com");
        store.setEncryptedMasterKey("encrypted-key");

        expect(useAccountStore.getState()).toMatchObject({
            isAuthenticated: true,
            currentPassword: "secret",
            currentEmail: "user@example.com",
            encryptedMasterKey: "encrypted-key",
        });
    });

    it("loads groups and resolves decrypted group keys", async () => {
        mocks.decryptMasterKey.mockResolvedValue({
            isUtf8Valid: true,
            data: "master-key",
            wasLegacy: false,
        });
        mocks.groupApi.getGroups.mockResolvedValue([
            { id: "personal", name: "Personal", usesMasterKey: true },
            {
                id: "team",
                name: "Team",
                usesMasterKey: false,
                encryptedGroupKey: "encrypted-group-key",
            },
        ]);
        mocks.decryptAccountData.mockResolvedValue({
            isUtf8Valid: true,
            data: "team-key",
        });

        useAccountStore.setState({
            currentPassword: "secret",
            encryptedMasterKey: "encrypted-master-key",
        });

        await useAccountStore.getState().loadGroups();

        expect(mocks.groupApi.getGroups).toHaveBeenCalledTimes(1);
        expect(useAccountStore.getState()).toMatchObject({
            groups: [
                { id: "personal", name: "Personal", usesMasterKey: true },
                {
                    id: "team",
                    name: "Team",
                    usesMasterKey: false,
                    encryptedGroupKey: "encrypted-group-key",
                },
            ],
            groupKeys: {
                personal: "master-key",
                team: "team-key",
            },
            defaultGroupId: "personal",
        });
    });

    it("loads owned accounts into decryptedAccounts", async () => {
        mocks.decryptMasterKey.mockResolvedValue({
            isUtf8Valid: true,
            data: "master-key",
            wasLegacy: false,
        });
        mocks.accountApi.getAccounts.mockResolvedValue([
            {
                id: "account-1",
                encryptedData: "ciphertext",
                groupId: "personal",
            },
        ]);
        mocks.decryptAccountData.mockResolvedValue({
            isUtf8Valid: true,
            data: JSON.stringify({ username: "alpha", password: "pw" }),
            wasLegacy: false,
            usedFallbackPassword: false,
        });

        useAccountStore.setState({
            currentPassword: "secret",
            encryptedMasterKey: "encrypted-master-key",
            groupKeys: { personal: "master-key" },
            defaultGroupId: "personal",
        });

        await useAccountStore.getState().loadAccounts();

        expect(useAccountStore.getState().decryptedAccounts).toEqual([
            {
                id: "account-1",
                username: "alpha",
                password: "pw",
                groupId: "personal",
                isLoadingRank: false,
            },
        ]);
    });

    it("loads ranks once per username and updates all matching marvel accounts", async () => {
        mocks.accountApi.getRank.mockResolvedValue({ rank: "Gold 1" });
        useAccountStore.setState({
            decryptedAccounts: [
                {
                    id: "1",
                    username: "same-user",
                    password: "pw",
                    game: "Marvel Rivals",
                    isLoadingRank: false,
                },
                {
                    id: "2",
                    username: "same-user",
                    password: "pw",
                    game: "Marvel Rivals",
                    isLoadingRank: false,
                },
                {
                    id: "3",
                    username: "other-user",
                    password: "pw",
                    game: "Another Game",
                    isLoadingRank: false,
                },
            ],
        });

        await useAccountStore.getState().getRanks();

        expect(mocks.accountApi.getRank).toHaveBeenCalledTimes(1);
        expect(mocks.accountApi.getRank).toHaveBeenCalledWith("same-user");
        expect(useAccountStore.getState().decryptedAccounts).toEqual([
            expect.objectContaining({ id: "1", rank: "Gold 1", isLoadingRank: false }),
            expect.objectContaining({ id: "2", rank: "Gold 1", isLoadingRank: false }),
            expect.objectContaining({
                id: "3",
                username: "other-user",
                game: "Another Game",
                isLoadingRank: false,
            }),
        ]);
    });

    it("normalizes stored rank-supported game names before rank loading", async () => {
        mocks.accountApi.getRank.mockResolvedValue({ rank: "Gold 1" });
        useAccountStore.setState({
            decryptedAccounts: [
                {
                    id: "1",
                    username: "trimmed-user",
                    password: "pw",
                    game: " Marvel Rivals ",
                    isLoadingRank: false,
                },
            ],
        });

        await useAccountStore.getState().getRanks();

        expect(mocks.accountApi.getRank).toHaveBeenCalledTimes(1);
        expect(mocks.accountApi.getRank).toHaveBeenCalledWith("trimmed-user");
        expect(useAccountStore.getState().decryptedAccounts).toEqual([
            expect.objectContaining({ id: "1", rank: "Gold 1", isLoadingRank: false }),
        ]);
    });

    it("clears store state and calls logout without changing the public API", () => {
        useAccountStore.setState({
            isAuthenticated: true,
            currentPassword: "secret",
            currentEmail: "user@example.com",
            encryptedMasterKey: "encrypted-master-key",
            groups: [{ id: "personal", name: "Personal", usesMasterKey: true }],
            groupKeys: { personal: "master-key" },
            defaultGroupId: "personal",
            decryptedAccounts: [
                {
                    id: "1",
                    username: "alpha",
                    password: "pw",
                    isLoadingRank: false,
                },
            ],
        });

        useAccountStore.getState().logout();

        expect(mocks.authApi.logout).toHaveBeenCalledTimes(1);
        expect(useAccountStore.getState()).toMatchObject({
            isAuthenticated: false,
            currentPassword: null,
            currentEmail: null,
            encryptedMasterKey: null,
            groups: [],
            groupKeys: {},
            defaultGroupId: null,
            decryptedAccounts: [],
        });
    });

    it("renames a group and reloads groups", async () => {
        mocks.groupApi.renameGroup.mockResolvedValue({
            id: "team",
            name: "Renamed Team",
            usesMasterKey: false,
        });
        mocks.groupApi.getGroups.mockResolvedValue([
            { id: "personal", name: "Personal", usesMasterKey: true },
            { id: "team", name: "Renamed Team", usesMasterKey: false },
        ]);
        mocks.decryptMasterKey.mockResolvedValue({
            isUtf8Valid: true,
            data: "master-key",
            wasLegacy: false,
        });

        useAccountStore.setState({
            currentPassword: "secret",
            encryptedMasterKey: "encrypted-master-key",
        });

        const result = await useAccountStore.getState().renameGroup("team", "Renamed Team");

        expect(mocks.groupApi.renameGroup).toHaveBeenCalledWith("team", {
            name: "Renamed Team",
        });
        expect(result).toMatchObject({ name: "Renamed Team" });
        expect(mocks.groupApi.getGroups).toHaveBeenCalledTimes(1);
    });

    it("deletes a group and reloads groups", async () => {
        mocks.groupApi.deleteGroup.mockResolvedValue(undefined);
        mocks.groupApi.getGroups.mockResolvedValue([
            { id: "personal", name: "Personal", usesMasterKey: true },
        ]);
        mocks.decryptMasterKey.mockResolvedValue({
            isUtf8Valid: true,
            data: "master-key",
            wasLegacy: false,
        });

        useAccountStore.setState({
            currentPassword: "secret",
            encryptedMasterKey: "encrypted-master-key",
        });

        const result = await useAccountStore.getState().deleteGroup("team");

        expect(mocks.groupApi.deleteGroup).toHaveBeenCalledWith("team");
        expect(result).toBe(true);
        expect(mocks.groupApi.getGroups).toHaveBeenCalledTimes(1);
    });
});
