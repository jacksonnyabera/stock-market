import { NextResponse } from "next/server";


const ALLOWED_SYMBOLS = new Set([
    "AAPL",
    "MSFT",
    "NVDA",
    "GOOGL",
    "AMZN",
]);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();

    if (!ALLOWED_SYMBOLS.has(symbol)) {
        return NextResponse.json(
            { error: "Unsupported stock symbol." },
            { status: 400 }
        );
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "Market data is not configured on the server." },
            { status: 500 }
        );
    }

    const apiUrl = new URL("https://www.alphavantage.co/query");
    apiUrl.searchParams.set("function", "GLOBAL_QUOTE");
    apiUrl.searchParams.set("symbol", symbol);
    apiUrl.searchParams.set("apikey", apiKey);

    try {
        const response = await fetch(apiUrl, {
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Market data provider request failed." },
                { status: 502 }
            );
        }

        const data = await response.json();

        if (data.Note || data.Information) {
            return NextResponse.json(
                { error: "Market data limit reached or provider access restricted." },
                { status: 429 }
            );
        }

        if (data["Error Message"]) {
            return NextResponse.json(
                { error: "The market data provider rejected this request." },
                { status: 502 }
            );
        }

        const quote = data["Global Quote"];

        if (!quote || !quote["05. price"]) {
            return NextResponse.json(
                { error: "No quote is available for this symbol." },
                { status: 502 }
            );
        }

        return NextResponse.json({
            symbol: quote["01. symbol"],
            price: Number(quote["05. price"]),
            change: Number(quote["09. change"]),
            changePercent: quote["10. change percent"],
            latestTradingDay: quote["07. latest trading day"],
            dataSource: "Alpha Vantage",
        });
    } catch {
        return NextResponse.json(
            { error: "Unable to retrieve market data. Please try again." },
            { status: 502 }
        );
    }
}
