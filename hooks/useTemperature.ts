"use client";

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, limitToLast, query } from 'firebase/database';

export interface TempDataPoint {
    timestamp: number;
    temperature: number;
    humidity: number;
}

const toMs = (ts: number) => (ts && ts < 1e12) ? ts * 1000 : ts;

export function useTemperature() {
    const [current, setCurrent] = useState<TempDataPoint | null>(null);
    const [history, setHistory] = useState<TempDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to current status
        const statusRef = ref(database, 'current_status');
        const unsubscribeStatus = onValue(statusRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                setCurrent({
                    timestamp: toMs(val.last_update ?? val.timestamp ?? 0),
                    temperature: val.temperature,
                    humidity: val.humidity
                });
            }
            setLoading(false);
        });

        // Listen to logs (last 50 for chart)
        const logsRef = query(ref(database, 'logs'), limitToLast(50));
        const unsubscribeLogs = onValue(logsRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                // Convert object to array and normalize timestamps to ms
                const list = Object.values(val).map((it: any) => ({
                    ...it,
                    timestamp: toMs(it.timestamp ?? it.last_update ?? 0)
                })) as TempDataPoint[];
                // Sort by timestamp if needed (Firebase keys usually ordered by time insertion if push() used)
                // push() keys are time-ordered.
                setHistory(list);
            } else {
                setHistory([]);
            }
        });

        return () => {
            unsubscribeStatus();
            unsubscribeLogs();
        };
    }, []);

    return { current, history, loading };
}
