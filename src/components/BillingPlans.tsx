import { Button } from "@/components/Button";
import { Text } from "@/components/Text";

type BillingPlansProps = {
    subscribing: "starter" | "pro" | null;
    onSubscribe(plan: "starter" | "pro"): void;
    currentPlan?: "starter" | "pro" | null;
};

export function BillingPlans({ subscribing, onSubscribe, currentPlan }: BillingPlansProps) {
    const isStarterCurrent = currentPlan === "starter";
    const isProCurrent = currentPlan === "pro";

    return (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                    <Text variant="body" className="font-semibold text-gray-900">Starter</Text>
                    <Text variant="body" className="font-bold text-gray-900">$9.99</Text>
                </div>
                <div className="mt-2 flex-1">
                    <Text variant="body" className="text-sm text-gray-600">
                        Automatic replies using templates (no AI).
                    </Text>
                    <ul className="mt-3 text-sm text-gray-600 space-y-1">
                        <li>• Star-based rules</li>
                        <li>• Unlimited templates</li>
                        <li>• 24/7 automation</li>
                    </ul>
                </div>
                <Button
                    className="mt-auto"
                    variant="primary"
                    onClick={() => onSubscribe("starter")}
                    disabled={subscribing !== null || isStarterCurrent}
                >
                    {subscribing === "starter" ? "Redirecting..." : "Subscribe to Starter"}
                </Button>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                    <Text variant="body" className="font-semibold text-gray-900">Pro</Text>
                    <Text variant="body" className="font-bold text-gray-900">$19.99</Text>
                </div>
                <div className="mt-2 flex-1">
                    <Text variant="body" className="text-sm text-gray-700">
                        Automatic replies + AI for more natural responses.
                    </Text>
                    <ul className="mt-3 text-sm text-gray-700 space-y-1">
                        <li>• Everything in Starter</li>
                        <li>• AI-powered responses</li>
                        <li>• 24/7 priority support</li>
                    </ul>
                </div>
                <Button
                    className="mt-auto"
                    variant="outline"
                    onClick={() => onSubscribe("pro")}
                    disabled={subscribing !== null || isProCurrent}
                >
                    {subscribing === "pro" ? "Redirecting..." : "Subscribe to Pro"}
                </Button>
            </div>
        </div>
    );
}
