"use client";

import { useCallback, useEffect, useState } from "react";
import StockHistoryChart from "./StockHistoryChart";

type StockInfo = {
  symbol: string;
  name: string;
  color: string;
};


type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  latestTradingDay?: string;
  dataSource?: string;
};


type ApiResponse = Partial<StockQuote> & {
  error?: string;
  "Note"?: string;
  Information?: string;
};

const STOCKS: StockInfo[] = [
  { symbol: "AAPL", name: "Apple Inc.", color: "#60a5fa" },
  { symbol: "MSFT", name: "Microsoft Corporation", color: "#a78bfa" },
  { symbol: "NVDA", name: "NVIDIA Corporation", color: "#4ade80" },
  { symbol: "GOOGL", name: "Alphabet Inc.", color: "#fbbf24" },
  { symbol: "AMZN", name: "Amazon.com Inc.", color: "#fb923c" },
];

const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

function parsePercent(value: string | number): number {
  const parsed = Number.parseFloat(String(value).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function Home() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([
    "AAPL",
    "MSFT",
    "NVDA",
    "GOOGL",
    "AMZN",
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadQuotes = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const successfulQuotes: StockQuote[] = [];
    const errors: string[] = [];

    // Request sequentially to reduce pressure on API rate limits.
    for (const stock of STOCKS) {
      try {
        const response = await fetch(
            `/api/stocks?symbol=${encodeURIComponent(stock.symbol)}`,
            { cache: "no-store" },
        );

        const data: ApiResponse = await response.json();

        if (
            !response.ok ||
            typeof data.price !== "number" ||
            !Number.isFinite(data.price)
        ) {
          errors.push(
              `${stock.symbol}: ${data.error || data.Information || data.Note || "Quote unavailable"}`,
          );
          continue;
        }

        successfulQuotes.push({
          symbol: stock.symbol,
          price: data.price,
          change: Number(data.change ?? 0),
          changePercent: parsePercent(data.changePercent ?? 0),
          latestTradingDay: data.latestTradingDay,
          dataSource: data.dataSource,
        });
      } catch {
        errors.push(`${stock.symbol}: Could not connect to the quote API.`);
      }
    }

    if (successfulQuotes.length > 0) {
      setQuotes(successfulQuotes);
      setLastUpdated(new Date());
    }

    if (errors.length > 0) {
      setError(
          successfulQuotes.length === 0
              ? `Unable to load stock prices. ${errors.join(" | ")}`
              : `Some quotes could not be loaded: ${errors.join(" | ")}`,
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const selectedStock = STOCKS.find(
      (stock) => stock.symbol === selectedSymbol,
  );

  const selectedQuote = quotes.find(
      (quote) => quote.symbol === selectedSymbol,
  );

  const filteredStocks = STOCKS.filter((stock) => {
    const query = search.trim().toLowerCase();

    return (
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
    );
  });

  const positiveMovers = quotes.filter(
      (quote) => quote.change >= 0,
  ).length;

  const averagePrice =
      quotes.length > 0
          ? quotes.reduce((total, quote) => total + quote.price, 0) /
          quotes.length
          : null;

  function toggleWatchlist(symbol: string) {
    setWatchlist((current) =>
        current.includes(symbol)
            ? current.filter((item) => item !== symbol)
            : [...current, symbol],
    );
  }

  return (
      <main className="min-h-screen bg-[#080b12] text-slate-100">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0b0f18] p-5 md:flex">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-xl font-black text-slate-950">
                ↗
              </div>
              <div>
                <h1 className="font-bold">Stock Market</h1>
                <p className="text-xs tracking-widest text-slate-500">
                  INVESTOR DASHBOARD
                </p>
              </div>
            </div>

            <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
              Workspace
            </p>

            <div className="space-y-2">
              <div className="rounded-xl bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                ◫ &nbsp; Market Overview
              </div>
              <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
                ☆ &nbsp; Watchlist ({watchlist.length})
              </div>
              <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
                ▤ &nbsp; Stock Quotes
              </div>
            </div>

            <StockHistoryChart />

            <div className="mt-10">
              <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
                Your Watchlist
              </p>

              <div className="space-y-1">
                {STOCKS.filter((stock) =>
                    watchlist.includes(stock.symbol),
                ).map((stock) => {
                  const quote = quotes.find(
                      (item) => item.symbol === stock.symbol,
                  );

                  return (
                      <button
                          key={stock.symbol}
                          onClick={() => setSelectedSymbol(stock.symbol)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left hover:bg-white/[0.04] ${
                              selectedSymbol === stock.symbol
                                  ? "bg-white/[0.05]"
                                  : ""
                          }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                      <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: stock.color }}
                      />
                          <span>
                        <span className="block text-sm font-semibold">
                          {stock.symbol}
                        </span>
                        <span className="block max-w-24 truncate text-xs text-slate-500">
                          {stock.name}
                        </span>
                      </span>
                        </div>

                        <span className="text-right text-xs">
                      {quote ? formatMoney(quote.price) : "—"}
                          <span
                              className={`mt-1 block ${
                                  (quote?.change ?? 0) >= 0
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                              }`}
                          >
                        {quote
                            ? `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`
                            : ""}
                      </span>
                    </span>
                      </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto rounded-xl border border-white/[0.08] p-4">
              <p className="text-sm font-medium">Data connection</p>
              <p className="mt-2 text-xs text-slate-500">
                {quotes.length} of {STOCKS.length} stocks loaded
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${(quotes.length / STOCKS.length) * 100}%`,
                    }}
                />
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-4 sm:px-8">
              <div>
                <p className="text-xs text-slate-500">
                  Workspace / Market Overview
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  Market Overview
                </h2>
              </div>

              <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:block">
                {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString()}`
                    : "Waiting for quotes"}
              </span>

                <button
                    onClick={() => void loadQuotes(true)}
                    disabled={refreshing}
                    className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "Refreshing…" : "↻ Refresh"}
                </button>
              </div>
            </header>

            <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 sm:px-8">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-widest text-emerald-300">
                  YOUR MARKET AT A GLANCE
                </p>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Make informed moves.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Monitor selected US stocks and review the latest quotes
                  available from your configured market-data provider.
                </p>
              </div>

              {error && (
                  <div
                      role="alert"
                      className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm text-amber-200"
                  >
                    <p className="font-semibold">Market data notice</p>
                    <p className="mt-1 break-words">{error}</p>
                    <p className="mt-2 text-xs text-amber-100/70">
                      Check your API route and provider limits before repeatedly
                      refreshing.
                    </p>
                  </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Stocks loaded"
                    value={`${quotes.length} / ${STOCKS.length}`}
                    subtitle="Successfully retrieved quotes"
                    icon="◫"
                />

                <StatCard
                    label="Positive movers"
                    value={quotes.length ? `${positiveMovers} / ${quotes.length}` : "—"}
                    subtitle="Based on returned daily change"
                    icon="↗"
                />

                <StatCard
                    label="Average share price"
                    value={averagePrice !== null ? formatMoney(averagePrice) : "—"}
                    subtitle="Average of loaded quotes"
                    icon="$"
                />


                <StatCard
                    label="Market data provider"
                    value={quotes[0]?.dataSource ?? (loading ? "Loading…" : "Unavailable")}
                    subtitle="Reported by your API"
                    icon="◉"
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                <section className="rounded-2xl border border-white/[0.08] bg-[#0d121d] p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Selected stock</p>
                      <h3 className="mt-2 text-2xl font-bold">
                        {selectedStock?.symbol ?? selectedSymbol}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedStock?.name ?? "Company"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold sm:text-3xl">
                        {selectedQuote
                            ? formatMoney(selectedQuote.price)
                            : loading
                                ? "Loading…"
                                : "Unavailable"}
                      </p>

                      {selectedQuote && (
                          <p
                              className={`mt-2 text-sm ${
                                  selectedQuote.change >= 0
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                              }`}
                          >
                            {selectedQuote.change >= 0 ? "+" : ""}
                            {formatMoney(selectedQuote.change)} (
                            {Number(selectedQuote.changePercent) >= 0 ? "+" : ""}
                            {Number(selectedQuote.changePercent).toFixed(2)}%)
                          </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#080b12] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Quote details</p>
                      <span className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs text-slate-400">
                      USD
                    </span>
                    </div>

                    {selectedQuote ? (
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              Latest available price
                            </p>
                            <p className="mt-2 text-xl font-semibold">
                              {formatMoney(selectedQuote.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">
                              Daily price change
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold ${
                                    selectedQuote.change >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                }`}
                            >
                              {selectedQuote.change >= 0 ? "+" : ""}
                              {formatMoney(selectedQuote.change)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">
                              Percentage change
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold ${
                                    selectedQuote.changePercent >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                }`}
                            >
                              {selectedQuote.changePercent >= 0 ? "+" : ""}
                              {selectedQuote.changePercent.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">
                              Provider trading date
                            </p>
                            <p className="mt-2 text-xl font-semibold">
                              {selectedQuote.latestTradingDay ?? "Not provided"}
                            </p>
                          </div>
                        </div>
                    ) : (
                        <p className="mt-5 text-sm text-slate-500">
                          {loading
                              ? "Retrieving stock quote…"
                              : "No quote is currently available for this stock."}
                        </p>
                    )}
                  </div>

                  <p className="mt-5 text-xs leading-5 text-slate-500">
                    This version displays actual quote fields returned by your
                    API. It does not invent historical chart points. Historical
                    charts can be added after connecting a historical-data
                    endpoint.
                  </p>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-[#0d121d] p-5 sm:p-7">
                  <div>
                    <h3 className="text-lg font-semibold">Market watch</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Search and select a stock.
                    </p>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="stock-search" className="sr-only">
                      Search stocks
                    </label>
                    <input
                        id="stock-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search symbol or company…"
                        className="w-full rounded-xl border border-white/[0.09] bg-[#080b12] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {filteredStocks.map((stock) => {
                      const quote = quotes.find(
                          (item) => item.symbol === stock.symbol,
                      );
                      const isSelected = selectedSymbol === stock.symbol;
                      const isWatched = watchlist.includes(stock.symbol);

                      return (
                          <div
                              key={stock.symbol}
                              className={`flex items-center gap-2 rounded-xl border p-3 ${
                                  isSelected
                                      ? "border-emerald-400/30 bg-emerald-400/[0.04]"
                                      : "border-transparent hover:bg-white/[0.025]"
                              }`}
                          >
                            <button
                                onClick={() => setSelectedSymbol(stock.symbol)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                          <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-slate-950"
                              style={{ backgroundColor: stock.color }}
                          >
                            {stock.symbol.slice(0, 1)}
                          </span>
                              <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                              {stock.symbol}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {stock.name}
                            </span>
                          </span>
                            </button>

                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {quote ? formatMoney(quote.price) : "—"}
                              </p>
                              <p
                                  className={`mt-1 text-xs ${
                                      (quote?.change ?? 0) >= 0
                                          ? "text-emerald-400"
                                          : "text-rose-400"
                                  }`}
                              >
                                {quote
                                    ? `${Number(quote.changePercent) >= 0 ? "+" : ""}${Number(quote.changePercent).toFixed(2)}%`
                                    : loading
                                        ? "Loading…"
                                        : "Unavailable"}
                              </p>
                            </div>

                            <button
                                onClick={() => toggleWatchlist(stock.symbol)}
                                aria-label={
                                  isWatched
                                      ? `Remove ${stock.symbol} from watchlist`
                                      : `Add ${stock.symbol} to watchlist`
                                }
                                title={
                                  isWatched
                                      ? "Remove from watchlist"
                                      : "Add to watchlist"
                                }
                                className={`ml-1 rounded-lg px-2 py-2 text-lg ${
                                    isWatched
                                        ? "text-amber-300"
                                        : "text-slate-600 hover:text-slate-200"
                                }`}
                            >
                              {isWatched ? "★" : "☆"}
                            </button>
                          </div>
                      );
                    })}

                    {filteredStocks.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">
                          No matching stocks found.
                        </p>
                    )}
                  </div>
                </section>
              </div>

              <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d121d]">
                <div className="border-b border-white/[0.07] p-5 sm:p-6">
                  <h3 className="font-semibold">All tracked stocks</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Click a row to view its quote.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-white/[0.02] text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Company</th>
                      <th className="px-5 py-4 text-right font-medium">Price</th>
                      <th className="px-5 py-4 text-right font-medium">Change</th>
                      <th className="px-5 py-4 text-right font-medium">Change %</th>
                      <th className="px-5 py-4 text-right font-medium">Watchlist</th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.06]">
                    {STOCKS.map((stock) => {
                      const quote = quotes.find(
                          (item) => item.symbol === stock.symbol,
                      );

                      return (
                          <tr
                              key={stock.symbol}
                              onClick={() => setSelectedSymbol(stock.symbol)}
                              className={`cursor-pointer hover:bg-white/[0.025] ${
                                  selectedSymbol === stock.symbol
                                      ? "bg-emerald-400/[0.025]"
                                      : ""
                              }`}
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold">
                                {stock.symbol}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {stock.name}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-right text-sm">
                              {quote ? formatMoney(quote.price) : "—"}
                            </td>

                            <td
                                className={`px-5 py-4 text-right text-sm ${
                                    (quote?.change ?? 0) >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                }`}
                            >
                              {quote
                                  ? `${quote.change >= 0 ? "+" : ""}${formatMoney(quote.change)}`
                                  : "—"}
                            </td>

                            <td
                                className={`px-5 py-4 text-right text-sm ${
                                    (quote?.changePercent ?? 0) >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                }`}
                            >
                              {quote
                                  ? `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`
                                  : "—"}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleWatchlist(stock.symbol);
                                  }}
                                  aria-label={`Toggle ${stock.symbol} watchlist`}
                                  className="rounded-lg px-3 py-2 text-lg text-amber-300 hover:bg-white/[0.05]"
                              >
                                {watchlist.includes(stock.symbol) ? "★" : "☆"}
                              </button>
                            </td>
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-white/[0.06] px-5 py-4 text-xs leading-5 text-slate-500">
                  Market data may be delayed or limited by your provider. This
                  dashboard is for informational purposes and is not investment
                  advice.
                </div>
              </section>

              <footer className="flex flex-col justify-between gap-2 pb-4 text-xs text-slate-600 sm:flex-row">
                <span>Stock Market · Personal dashboard</span>
                <span>
                {lastUpdated
                    ? `Last successful update: ${lastUpdated.toLocaleString()}`
                    : "Waiting for market data"}
              </span>
              </footer>
            </div>
          </section>
        </div>
      </main>
  );
}

function StatCard({
                    label,
                    value,
                    subtitle,
                    icon,
                  }: {
  label: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d121d] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{label}</p>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-lg text-emerald-300">
          {icon}
        </span>
        </div>
        <p className="mt-5 break-words text-2xl font-bold tracking-tight">
          {value}
        </p>
        <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
      </div>
  );
}

