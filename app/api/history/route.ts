
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"];

export async function GET(request: NextRequest) {
    const symbol = (
        request.nextUrl.searchParams.get("symbol") || "AAPL"
    ).toUpperCase();

    if (!ALLOWED_SYMBOLS.includes(symbol)) {
        return NextResponse.json(
            { error: "Unsupported stock symbol." },
            { status: 400 }
        );
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "Stock data API key is not configured." },
            { status: 500 }
        );
    }

    try {
        const url = new URL("https://www.alphavantage.co/query");
        url.searchParams.set("function", "TIME_SERIES_DAILY");
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("outputsize", "compact");
        url.searchParams.set("apikey", apiKey);

        const response = await fetch(url.toString(), {
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "The stock data provider is unavailable." },
                { status: 502 }
            );
        }

        const data = await response.json();

        if (data["Error Message"] || data["Note"] || data["Information"]) {
            return NextResponse.json(
                {
                    error:
                        data["Note"] ||
                        data["Information"] ||
                        data["Error Message"] ||
                        "Historical data is temporarily unavailable.",
                },
                { status: 502 }
            );
        }

        const timeSeries = data["Time Series (Daily)"];

        if (!timeSeries || typeof timeSeries !== "object") {
            return NextResponse.json(
                { error: "No historical price data was returned." },
                { status: 502 }
            );
        }

        const history = Object.entries(timeSeries)
            .map(([date, values]: [string, any]) => ({
                date,
                close: Number(values["4. close"]),
            }))
            .filter(
                (item) =>
                    Number.isFinite(item.close) && item.close > 0
            )
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-100);

        return NextResponse.json(
            {
                symbol,
                dataSource: "Alpha Vantage",
                interval: "daily",
                prices: history,
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                },
            }
        );
    } catch {
        return NextResponse.json(
            { error: "Unable to retrieve historical stock prices." },
            { status: 500 }
        );
    }
}
