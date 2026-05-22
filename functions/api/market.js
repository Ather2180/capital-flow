/**
 * Cloudflare Pages Function
 * 路由：GET /api/market
 *
 * 在服务端统一拉取所有行情数据，
 * 用户手机只和 meihuaqianwen.com 通信，不接触 Bybit。
 */

const BYBIT = 'https://api.bybit.com';
const SYMBOLS = ['BTCUSDT', 'SOLUSDT', 'ETHUSDT'];

export async function onRequestGet(ctx) {
  try {
    const [tickerResults, frResults] = await Promise.all([
      fetchAllTickers(),
      fetchAllFundingRates(),
    ]);

    const data = {
      ok: true,
      ts: Date.now(),
      tickers: tickerResults,
      fundingRates: frResults,
    };

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      },
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function fetchAllTickers() {
  const results = {};
  await Promise.all(SYMBOLS.map(async (sym) => {
    try {
      const r = await fetch(
        `${BYBIT}/v5/market/tickers?category=linear&symbol=${sym}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const j = await r.json();
      if (j.retCode === 0 && j.result.list.length) {
        const t = j.result.list[0];
        results[sym] = {
          lastPrice: t.lastPrice,
          price24hPcnt: t.price24hPcnt,
          highPrice24h: t.highPrice24h,
          lowPrice24h: t.lowPrice24h,
          openInterestValue: t.openInterestValue,
          fundingRate: t.fundingRate,
          nextFundingTime: t.nextFundingTime,
        };
      }
    } catch (e) {
      results[sym] = null;
    }
  }));
  return results;
}

async function fetchAllFundingRates() {
  const results = {};
  await Promise.all(SYMBOLS.map(async (sym) => {
    try {
      const r = await fetch(
        `${BYBIT}/v5/market/funding/history?category=linear&symbol=${sym}&limit=1`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const j = await r.json();
      if (j.retCode === 0 && j.result.list.length) {
        results[sym] = parseFloat(j.result.list[0].fundingRate);
      }
    } catch (e) {
      results[sym] = null;
    }
  }));
  return results;
}
