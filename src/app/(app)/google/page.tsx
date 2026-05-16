"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Modal } from "@/components/Modal";

type Account = {
    name: string; // accounts/123
    accountName?: string;
    type?: string;
};

type Location = {
    name: string; // accounts/123/locations/456 (ou locations/..)
    title?: string;
    storefrontAddress?: unknown;
};

type SyncResult = {
    imported?: number;
    updated?: number;
    totalFetched?: number;
};

async function safeJson(res: Response) {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { error: text };
    }
}

export default function GoogleSetupPage() {
    const router = useRouter();
    const lastLocationsAccount = useRef<string | null>(null);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [saving, setSaving] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [saveSync, setSaveSync] = useState<SyncResult | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
    const [disconnectState, setDisconnectState] = useState<"idle" | "disconnecting" | "success" | "error">("idle");
    const [disconnectError, setDisconnectError] = useState<string | null>(null);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>("");

    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>("");

    const selectedLocationObj = useMemo(
        () => locations.find((l) => l.name === selectedLocation) ?? null,
        [locations, selectedLocation]
    );

    const loadAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        setError(null);
        try {
            const res = await fetch("/api/google/accounts");
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "Failed to load accounts");
            setAccounts(data.accounts ?? []);
            // auto select first
            if ((data.accounts ?? []).length > 0) {
                setSelectedAccount((prev: string) => prev || data.accounts[0].name);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unexpected error";
            setError(msg);
        } finally {
            setLoadingAccounts(false);
        }
    }, []);

    const loadLocations = useCallback(async (accountName: string) => {
        setLoadingLocations(true);
        setError(null);
        setLocations([]);
        setSelectedLocation("");
        try {
            const res = await fetch(`/api/google/locations?account=${encodeURIComponent(accountName)}`);
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "Failed to load locations");
            setLocations(data.locations ?? []);
            if ((data.locations ?? []).length > 0) {
                setSelectedLocation(data.locations[0].name);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unexpected error";
            setError(msg);
        } finally {
            setLoadingLocations(false);
        }
    }, []);

    const saveSelection = useCallback(async () => {
        if (!selectedAccount || !selectedLocation) return;
        setSaveModalOpen(true);
        setSaveState("saving");
        setSaveSync(null);
        setSaveError(null);
        setSaving(true);
        setError(null);

        try {
            const res = await fetch("/api/google/select-location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountName: selectedAccount,
                    locationName: selectedLocation,
                    locationTitle: selectedLocationObj?.title ?? null,
                }),
            });

            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "Failed to save location");

            setSaveSync(data?.sync ?? null);
            setSaveState("success");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unexpected error";
            setError(msg);
            setSaveError(msg);
            setSaveState("error");
        } finally {
            setSaving(false);
        }
    }, [selectedAccount, selectedLocation, selectedLocationObj?.title]);

    const disconnectGoogle = useCallback(async () => {
        setDisconnectModalOpen(true);
        setDisconnectState("disconnecting");
        setDisconnectError(null);
        setDisconnecting(true);
        setError(null);

        try {
            const res = await fetch("/api/google/disconnect", { method: "POST" });
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "Failed to disconnect Google");

            setAccounts([]);
            setLocations([]);
            setSelectedAccount("");
            setSelectedLocation("");
            lastLocationsAccount.current = null;
            setDisconnectState("success");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unexpected error";
            setError(msg);
            setDisconnectError(msg);
            setDisconnectState("error");
        } finally {
            setDisconnecting(false);
        }
    }, []);

    const didInit = useRef(false);

    useEffect(() => {
        if (!didInit.current) {
            didInit.current = true;
            loadAccounts();
        }
    }, [loadAccounts]);

    useEffect(() => {
        if (!selectedAccount) return;

        // avoid repeated calls for the same account
        if (lastLocationsAccount.current === selectedAccount) return;
        lastLocationsAccount.current = selectedAccount;

        loadLocations(selectedAccount);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAccount]);

    return (
        <div className="pb-12">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <Text variant="h1">Connect Google Business</Text>
                        <Text variant="subtitle" className="mt-2">
                            Select the account and location for your Google Business Profile.
                        </Text>
                    </div>

                    <div className="w-auto">
                        <Button
                            variant="outline"
                            className="!w-auto inline-flex items-center px-4 py-2"
                            onClick={() => router.push("/dashboard")}
                        >
                            Back
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-full text-red-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                            </div>
                            <Text variant="body" className="text-red-700 font-medium">{error}</Text>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Accounts */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <span className="font-bold">1</span>
                                </div>
                                <Text variant="subtitle" className="font-bold text-gray-900">Accounts</Text>
                            </div>
                            <Button
                                variant="outline"
                                className="!w-auto !py-1.5 !px-3 text-xs"
                                onClick={loadAccounts}
                                disabled={loadingAccounts}
                            >
                                {loadingAccounts ? "..." : "Reload"}
                            </Button>
                        </div>

                        {loadingAccounts ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <Text variant="body">Loading accounts...</Text>
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="py-4 text-center">
                                <Text variant="body" className="text-gray-500">
                                    No accounts found. Make sure this Google account has a Business Profile.
                                </Text>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <Select
                                    id="google-account"
                                    label="Select an account"
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    {accounts.map((a) => (
                                        <option key={a.name} value={a.name}>
                                            {a.accountName ? `${a.accountName} (${a.name})` : a.name}
                                        </option>
                                    ))}
                                </Select>

                                <Text variant="body" className="text-xs text-gray-500">
                                    Tip: if multiple appear, choose the one that matches your business.
                                </Text>
                            </div>
                        )}
                    </div>

                    {/* Locations */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <span className="font-bold">2</span>
                                </div>
                                <Text variant="subtitle" className="font-bold text-gray-900">Locations</Text>
                            </div>
                            <Button
                                variant="outline"
                                className="!w-auto !py-1.5 !px-3 text-xs"
                                onClick={() => selectedAccount && loadLocations(selectedAccount)}
                                disabled={loadingLocations || !selectedAccount}
                            >
                                {loadingLocations ? "..." : "Reload"}
                            </Button>
                        </div>

                        {!selectedAccount ? (
                            <div className="py-8 text-center">
                                <Text variant="body" className="text-gray-500">Select an account first.</Text>
                            </div>
                        ) : loadingLocations ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <Text variant="body">Loading locations...</Text>
                            </div>
                        ) : locations.length === 0 ? (
                            <div className="py-8 text-center">
                                <Text variant="body" className="text-gray-500">
                                    No locations found for this account.
                                </Text>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div>
                                    <Select
                                        id="google-location"
                                        label="Select a location"
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                    >
                                        {locations.map((l) => (
                                            <option key={l.name} value={l.name}>
                                                {l.title ? `${l.title} (${l.name})` : l.name}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                    <Text variant="body" className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</Text>
                                    <Text variant="body" className="font-medium text-gray-900">
                                        {selectedLocationObj?.title ?? "—"}
                                    </Text>
                                    <Text variant="body" className="text-xs text-gray-500 mt-1 font-mono truncate">
                                        {selectedLocationObj?.name ?? ""}
                                    </Text>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save */}
                <div className="mt-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-50 rounded-lg text-green-600 mt-1">
                                <span className="font-bold">3</span>
                            </div>
                            <div>
                                <Text variant="subtitle" className="font-bold text-gray-900">Save configuration</Text>
                                <Text variant="body" className="mt-1 text-gray-600">
                                    This defines which location will be used to sync reviews.
                                </Text>
                            </div>
                        </div>

                        <Button
                            className="w-full md:w-auto min-w-[150px]"
                            onClick={saveSelection}
                            disabled={saving || !selectedAccount || !selectedLocation}
                        >
                            {saving ? "Saving..." : "Save location"}
                        </Button>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-gray-100 pt-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-50 rounded-lg text-red-600 mt-1">
                                <span className="font-bold">!</span>
                            </div>
                            <div>
                                <Text variant="subtitle" className="font-bold text-gray-900">Remove connection</Text>
                                <Text variant="body" className="mt-1 text-gray-600">
                                    This removes the connected account and disables the auto responder.
                                </Text>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full md:w-auto min-w-[150px] border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => {
                                setDisconnectModalOpen(true);
                                setDisconnectState("idle");
                                setDisconnectError(null);
                            }}
                            disabled={disconnecting}
                        >
                            Disconnect
                        </Button>
                    </div>
                </div>

                <Modal
                    open={saveModalOpen}
                    title={
                        saveState === "saving"
                            ? "Saving location"
                            : saveState === "success"
                                ? "Connected"
                                : saveState === "error"
                                    ? "Failed to save"
                                    : "Save location"
                    }
                    onClose={() => {
                        if (saveState === "saving") return;
                        setSaveModalOpen(false);
                    }}
                    footer={
                        saveState === "success" ? (
                            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <Button
                                    variant="outline"
                                    className="!w-auto"
                                    onClick={() => router.push("/dashboard")}
                                >
                                    Go to Dashboard
                                </Button>
                                <Button
                                    className="!w-auto"
                                    onClick={() => router.push("/reviews")}
                                >
                                    View Reviews
                                </Button>
                            </div>
                        ) : saveState === "error" ? (
                            <div className="flex justify-end">
                                <Button
                                    className="!w-auto"
                                    onClick={() => setSaveModalOpen(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        ) : null
                    }
                >
                    {saveState === "saving" ? (
                        <div className="flex items-center gap-3 text-gray-700">
                            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <Text variant="body" className="font-medium text-gray-900">
                                Syncing Google reviews...
                            </Text>
                        </div>
                    ) : saveState === "success" ? (
                        <div className="space-y-3">
                            <Text variant="body" className="text-gray-700">
                                Location saved successfully and sync completed.
                            </Text>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Text variant="label" className="text-xs text-gray-500">Imported</Text>
                                        <Text variant="body" className="font-semibold text-gray-900">
                                            {Number(saveSync?.imported ?? 0)}
                                        </Text>
                                    </div>
                                    <div>
                                        <Text variant="label" className="text-xs text-gray-500">Updated</Text>
                                        <Text variant="body" className="font-semibold text-gray-900">
                                            {Number(saveSync?.updated ?? 0)}
                                        </Text>
                                    </div>
                                    <div>
                                        <Text variant="label" className="text-xs text-gray-500">Fetched</Text>
                                        <Text variant="body" className="font-semibold text-gray-900">
                                            {Number(saveSync?.totalFetched ?? 0)}
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : saveState === "error" ? (
                        <div className="space-y-2">
                            <Text variant="body" className="text-gray-700">
                                Couldn't sync reviews right now.
                            </Text>
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                <Text variant="body" className="text-sm text-red-700 font-medium">
                                    {saveError ?? "Unknown error"}
                                </Text>
                            </div>
                        </div>
                    ) : null}
                </Modal>

                <Modal
                    open={disconnectModalOpen}
                    title={
                        disconnectState === "disconnecting"
                            ? "Disconnecting"
                            : disconnectState === "success"
                                ? "Disconnected"
                                : disconnectState === "error"
                                    ? "Failed to disconnect"
                                    : "Remove connection"
                    }
                    onClose={() => {
                        if (disconnectState === "disconnecting") return;
                        setDisconnectModalOpen(false);
                    }}
                    footer={
                        disconnectState === "idle" ? (
                            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <Button
                                    variant="outline"
                                    className="!w-auto"
                                    onClick={() => setDisconnectModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="!w-auto bg-red-600 hover:bg-red-700"
                                    onClick={disconnectGoogle}
                                >
                                    Remove connection
                                </Button>
                            </div>
                        ) : disconnectState === "success" ? (
                            <div className="flex justify-end">
                                <Button
                                    className="!w-auto"
                                    onClick={() => {
                                        setDisconnectModalOpen(false);
                                        router.push("/dashboard");
                                    }}
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        ) : disconnectState === "error" ? (
                            <div className="flex justify-end">
                                <Button className="!w-auto" onClick={() => setDisconnectModalOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        ) : null
                    }
                >
                    {disconnectState === "idle" ? (
                        <div className="space-y-2">
                            <Text variant="body" className="text-gray-700">
                                Are you sure you want to remove the Google Business connection?
                            </Text>
                            <Text variant="body" className="text-sm text-gray-600">
                                You can reconnect at any time.
                            </Text>
                        </div>
                    ) : disconnectState === "disconnecting" ? (
                        <div className="flex items-center gap-3 text-gray-700">
                            <svg className="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <Text variant="body" className="font-medium text-gray-900">
                                Removing connection...
                            </Text>
                        </div>
                    ) : disconnectState === "success" ? (
                        <div className="space-y-2">
                            <Text variant="body" className="text-gray-700">
                                Google connection removed successfully.
                            </Text>
                        </div>
                    ) : disconnectState === "error" ? (
                        <div className="space-y-2">
                            <Text variant="body" className="text-gray-700">
                                Couldn't remove the connection right now.
                            </Text>
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                <Text variant="body" className="text-sm text-red-700 font-medium">
                                    {disconnectError ?? "Unknown error"}
                                </Text>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            </main>
        </div>
    );
}
