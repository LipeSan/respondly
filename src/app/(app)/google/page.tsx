"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
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

// Card header with a numbered step marker that turns into a check once the
// step is done.
function StepHeader({
    step,
    done,
    title,
    subtitle,
    action,
}: {
    step: string;
    done?: boolean;
    title: string;
    subtitle?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                >
                    {done ? (
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        step
                    )}
                </span>
                <div>
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
                </div>
            </div>
            {action}
        </div>
    );
}

function ReloadButton({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading || disabled}
            aria-label="Reload"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
        </button>
    );
}

function FieldSkeleton() {
    return (
        <div className="mt-5 animate-pulse space-y-2" aria-busy="true">
            <div className="h-3 w-28 rounded bg-gray-100" />
            <div className="h-11 rounded-lg bg-gray-100" />
        </div>
    );
}

function EmptyState({ title, detail }: { title: string; detail?: string }) {
    return (
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-700">{title}</p>
            {detail ? <p className="mt-1 max-w-xs text-sm text-gray-500">{detail}</p> : null}
        </div>
    );
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
            if (res.status === 401) {
                router.push("/login");
                router.refresh();
                return;
            }
            if (data?.code === "NO_BUSINESS") {
                router.push("/onboarding");
                router.refresh();
                return;
            }
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
            if (res.status === 401) {
                router.push("/login");
                router.refresh();
                return;
            }
            if (data?.code === "NO_BUSINESS") {
                router.push("/onboarding");
                router.refresh();
                return;
            }
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
            if (res.status === 401) {
                router.push("/login");
                router.refresh();
                return;
            }
            if (data?.code === "NO_BUSINESS") {
                router.push("/onboarding");
                router.refresh();
                return;
            }
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
            if (res.status === 401) {
                router.push("/login");
                router.refresh();
                return;
            }
            if (data?.code === "NO_BUSINESS") {
                router.push("/onboarding");
                router.refresh();
                return;
            }
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
            <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <Text variant="h1">Connect Google Business</Text>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
                            Choose the account and location Respondly should manage.
                        </p>
                    </div>
                    <Button variant="outline" className="!w-auto px-4 py-2" onClick={() => router.push("/configuration")}>
                        Back to configuration
                    </Button>
                </div>

                {error ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-red-800">{error}</p>
                        <Button variant="outline" className="!w-auto bg-white px-4 py-2" onClick={loadAccounts}>
                            Try again
                        </Button>
                    </div>
                ) : null}

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <StepHeader
                            step="1"
                            done={Boolean(selectedAccount)}
                            title="Account"
                            subtitle="The Google account that owns your Business Profile."
                            action={<ReloadButton onClick={loadAccounts} loading={loadingAccounts} />}
                        />

                        {loadingAccounts ? (
                            <FieldSkeleton />
                        ) : accounts.length === 0 ? (
                            <EmptyState
                                title="No accounts found"
                                detail="Make sure this Google account has a Business Profile."
                            />
                        ) : (
                            <div className="mt-5">
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
                                <p className="mt-2 text-xs text-gray-500">
                                    If several appear, choose the one that matches your business.
                                </p>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <StepHeader
                            step="2"
                            done={Boolean(selectedLocation)}
                            title="Location"
                            subtitle="Where reviews will be synced from."
                            action={
                                <ReloadButton
                                    onClick={() => selectedAccount && loadLocations(selectedAccount)}
                                    loading={loadingLocations}
                                    disabled={!selectedAccount}
                                />
                            }
                        />

                        {!selectedAccount ? (
                            <EmptyState title="Select an account first" />
                        ) : loadingLocations ? (
                            <FieldSkeleton />
                        ) : locations.length === 0 ? (
                            <EmptyState title="No locations found" detail="This account doesn't have any business locations." />
                        ) : (
                            <div className="mt-5 space-y-4">
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

                                <div className="rounded-xl bg-gray-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selected</p>
                                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedLocationObj?.title ?? "—"}</p>
                                    <p className="mt-0.5 truncate font-mono text-xs text-gray-500">{selectedLocationObj?.name ?? ""}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <Card>
                    <StepHeader
                        step="3"
                        title="Save and sync"
                        subtitle="Automatic replies apply to reviews posted from the first sync onwards. Older reviews stay visible but won't be answered automatically."
                        action={
                            <Button
                                className="!w-auto shrink-0 px-4 py-2"
                                onClick={saveSelection}
                                disabled={saving || !selectedAccount || !selectedLocation}
                            >
                                {saving ? "Saving..." : "Save location"}
                            </Button>
                        }
                    />
                </Card>

                <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Remove connection</h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                            Disconnects your Google account and turns off automatic replies.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="!w-auto shrink-0 border-red-200 px-4 py-2 text-red-700 hover:bg-red-50"
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
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    ["Imported", saveSync?.imported],
                                    ["Updated", saveSync?.updated],
                                    ["Fetched", saveSync?.totalFetched],
                                ] as const).map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                                        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 tabular-nums">{Number(value ?? 0)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : saveState === "error" ? (
                        <div className="space-y-2">
                            <Text variant="body" className="text-gray-700">
                                Couldn&apos;t sync reviews right now.
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
                                Couldn&apos;t remove the connection right now.
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
