"use client";

import { useEffect, useMemo, useState } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

type PricePoint = {
    date: string;
    close: number;
};

type HistoryResponse = {
    symbol?: string;
    prices?: PricePoint[];
    error?: string;
    rateLimited?: boolean;
};

const SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"];
const CACHE_DURATION = 60 * 60 * 1000;
const historyCache = new Map<
    string,
    { prices: PricePoint[]; fetchedAt: number }
>();

export default function StockHistoryChart() {
    const [symbol, setSymbol] = useState("AAPL");
    const [prices, setPrices] = useState<PricePoint[]>([]);
    const [range, setRange] = useState("1M");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadHistory() {
            const cached = historyCache.get(symbol);

            if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
                setPrices(cached.prices);
                setError("");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `/api/history?symbol=${encodeURIComponent(symbol)}`,
                    { signal: controller.signal }
                );

                const data: HistoryResponse = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        (response.status === 429
                            ? "Historical data limit reached. Please try again later."
                            : "Unable to load historical prices.")
                    );
                }

                if (!Array.isArray(data.prices) || data.prices.length === 0) {
                    throw new Error("No historical prices are available.");
                }

                const validPrices = data.prices
                    .filter(
                        (item) =>
                            typeof item.date === "string" &&
                            Number.isFinite(item.close) &&
                            item.close > 0
                    )
                    .sort((a, b) => a.date.localeCompare(b.date));

                if (validPrices.length === 0) {
                    throw new Error("The provider returned no valid prices.");
                }

                historyCache.set(symbol, {
                    prices: validPrices,
                    fetchedAt: Date.now(),
                });

                setPrices(validPrices);
                setError("");
            } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") {
                    setError(err.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadHistory();

        return () => controller.abort();
    }, [symbol]);

    const displayedPrices = useMemo(() => {
        const daysByRange: Record<string, number> = {
            "1W": 7,
            "1M": 30,
            "3M": 90,
        };

        const days = daysByRange[range] ?? 30;

        if (prices.length === 0) return [];

        const latestDate = new Date(`${prices[prices.length - 1].date}T00:00:00`);
        const cutoff = new Date(latestDate);
        cutoff.setDate(cutoff.getDate() - days);

        const filtered = prices.filter(
            (point) => new Date(`${point.date}T00:00:00`) >= cutoff
        );

        // Retain at least one point if the available history is limited.
        return filtered.length > 0 ? filtered : prices.slice(-1);
    }, [prices, range]);

    const first = displayedPrices[0];
    const latest = displayedPrices[displayedPrices.length - 1];
    const change = first && latest ? latest.close - first.close : 0;
    const changePercent =
        first && first.close !== 0 ? (change / first.close) * 100 : 0;

    return (
        <section className="overflow-hidden rounded-xl border border-slate-700 bg-[#131722] text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
                <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                        Market chart
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                        {symbol} <span className="text-slate-400">· Daily</span>
                    </h2>
                </div>

                <select
                    aria-label="Select stock"
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    className="rounded-md border border-slate-600 bg-[#1e222d] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                    {SYMBOLS.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-1 rounded-lg bg-[#1e222d] p-1">
                    {["1W", "1M", "3M"].map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setRange(item)}
                            aria-pressed={range === item}
                            className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                                range === item
                                    ? "bg-[#2962ff] text-white"
                                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <p className="px-5 py-12 text-center text-sm text-slate-400">
                    Loading historical prices…
                </p>
            )}

            {error && !loading && (
                <div className="m-5 rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {!loading && !error && latest && (
                <>
                    <div className="px-5 py-4">
                        <p className="text-2xl font-semibold tabular-nums">
                            ${latest.close.toFixed(2)}
                        </p>
                        <p
                            className={`mt-1 text-sm tabular-nums ${
                                change >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                        >
                            {change >= 0 ? "+" : ""}${change.toFixed(2)} (
                            {changePercent >= 0 ? "+" : ""}
                            {changePercent.toFixed(2)}%)
                            <span className="ml-2 text-slate-500">
                                over displayed period
                            </span>
                        </p>
                    </div>

                    <div className="h-[340px] w-full px-2 pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={displayedPrices}
                                margin={{ top: 12, right: 20, left: 4, bottom: 4 }}
                            >
                                <CartesianGrid
                                    stroke="#2a2e39"
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) => value.slice(5)}
                                    tick={{ fill: "#787b86", fontSize: 11 }}
                                    axisLine={{ stroke: "#363a45" }}
                                    tickLine={false}
                                    minTickGap={28}
                                />
                                <YAxis
                                    orientation="right"
                                    domain={["auto", "auto"]}
                                    tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                                    tick={{ fill: "#787b86", fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={60}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1e222d",
                                        border: "1px solid #363a45",
                                        borderRadius: 8,
                                        color: "#ffffff",
                                    }}
                                    labelStyle={{ color: "#a3a6b3" }}
                                    labelFormatter={(value) => `Date: ${value}`}
                                    formatter={(value) => [
                                        `$${Number(value).toFixed(2)}`,
                                        "Close",
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="close"
                                    name="Closing price"
                                    stroke="#2962ff"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{
                                        r: 4,
                                        fill: "#2962ff",
                                        stroke: "#ffffff",
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border-t border-slate-700 px-5 py-3 text-xs text-slate-500">
                        Data: Alpha Vantage · Daily historical closing prices · May be delayed
                    </div>
                </>
            )}
        </section>
    );
}
