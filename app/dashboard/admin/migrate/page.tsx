"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function MigrationPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        updated?: number;
        error?: string;
        results?: Array<{
            sequence_name: string;
            status: string;
            error?: string;
        }>;
    } | null>(null);

    const runMigration = async () => {
        setIsRunning(true);
        setResult(null);

        try {
            const res = await fetch('/api/migrate-smtp', { method: 'POST' });
            const data = await res.json();

            setResult(data);

            if (data.success) {
                toast.success(`Migration complete! Updated ${data.updated} sequences.`);
            } else {
                toast.error('Migration failed: ' + data.error);
            }
        } catch (error) {
            toast.error('Failed to run migration');
            setResult({ success: false, error: String(error) });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="container max-w-4xl py-10">
            <Card>
                <CardHeader>
                    <CardTitle>SMTP Migration Tool</CardTitle>
                    <CardDescription>
                        This tool will populate the smtp_config_id field for all email sequences
                        that don&apos;t have an SMTP account assigned yet.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={runMigration}
                        disabled={isRunning}
                        className="w-full"
                    >
                        {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Run Migration
                    </Button>

                    {result && (
                        <div className="mt-6 space-y-2">
                            <h3 className="font-semibold text-lg">Migration Results:</h3>

                            {result.success ? (
                                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span className="font-medium text-green-900 dark:text-green-100">
                                            Migration Successful
                                        </span>
                                    </div>
                                    <p className="text-sm text-green-800 dark:text-green-200">
                                        Updated {result.updated} sequence(s)
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                        <span className="font-medium text-red-900 dark:text-red-100">
                                            Migration Failed
                                        </span>
                                    </div>
                                    <p className="text-sm text-red-800 dark:text-red-200">
                                        {result.error}
                                    </p>
                                </div>
                            )}

                            {result.results && result.results.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2">Details:</h4>
                                    <div className="space-y-1 text-sm">
                                        {result.results.map((r, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                {r.status === 'updated' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                                {r.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                                                {r.status === 'already_has_smtp' && <span className="text-blue-600">ℹ️</span>}
                                                {r.status === 'no_smtp_config_found' && <AlertCircle className="h-4 w-4 text-orange-600" />}

                                                <span>
                                                    {r.sequence_name}: {r.status}
                                                    {r.error && ` - ${r.error}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
