#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_VANTAGE_API_KEY;

if (!ALPHA_VANTAGE_API_KEY) {
  console.error('❌ ALPHA_VANTAGE_KEY not found in .env.local');
  process.exit(1);
}

interface BBandsDataPoint {
  'Real Upper Band': string;
  'Real Middle Band': string;
  'Real Lower Band': string;
}

async function testBollingerBandsAPI(symbol: string, interval: string = 'daily') {
  console.log('='.repeat(80));
  console.log(`TESTING BOLLINGER BANDS API FOR ${symbol}`);
  console.log('='.repeat(80));

  const params = new URLSearchParams({
    function: 'BBANDS',
    symbol: symbol,
    interval: interval,
    time_period: '20',
    series_type: 'close',
    nbdevup: '2',
    nbdevdn: '2',
    matype: '0',
    apikey: ALPHA_VANTAGE_API_KEY || ''
  });

  const url = `https://www.alphavantage.co/query?${params}`;

  console.log('\n📡 API REQUEST:');
  console.log(`   URL: ${url.replace(ALPHA_VANTAGE_API_KEY || '', 'API_KEY_HIDDEN')}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Interval: ${interval}`);
  console.log(`   Period: 20`);
  console.log(`   Std Dev: 2`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('\n📊 API RESPONSE:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response Keys: ${Object.keys(data).join(', ')}`);

    // Check for errors
    if (data['Error Message']) {
      console.error(`\n❌ API Error: ${data['Error Message']}`);
      return;
    }

    if (data['Note']) {
      console.error(`\n⚠️  API Note: ${data['Note']}`);
      return;
    }

    if (data['Information']) {
      console.error(`\nℹ️  API Information: ${data['Information']}`);
      return;
    }

    // Process Bollinger Bands data
    const bbandsKey = 'Technical Analysis: BBANDS';
    if (data[bbandsKey]) {
      const bbandsData = data[bbandsKey];
      const dates = Object.keys(bbandsData).slice(0, 5); // Get latest 5 data points

      console.log(`\n📈 LATEST BOLLINGER BANDS DATA (${dates.length} most recent):`);
      console.log('   ' + '-'.repeat(76));

      dates.forEach((date, index) => {
        const point = bbandsData[date] as BBandsDataPoint;
        const upper = parseFloat(point['Real Upper Band']);
        const middle = parseFloat(point['Real Middle Band']);
        const lower = parseFloat(point['Real Lower Band']);
        const bandWidth = upper - lower;
        const bandWidthPercent = (bandWidth / middle) * 100;
        const impliedStdDev = (upper - middle) / 2;

        console.log(`\n   [${index + 1}] ${date}:`);
        console.log(`       Upper:    $${upper.toFixed(2)}`);
        console.log(`       Middle:   $${middle.toFixed(2)} (SMA)`);
        console.log(`       Lower:    $${lower.toFixed(2)}`);
        console.log(`       Width:    $${bandWidth.toFixed(2)} (${bandWidthPercent.toFixed(2)}%)`);
        console.log(`       Std Dev:  $${impliedStdDev.toFixed(4)}`);

        if (index === 0) {
          // Analyze the latest data point
          console.log('\n   📊 ANALYSIS OF LATEST DATA:');
          if (bandWidthPercent < 1.0) {
            console.log(`       ❌ EXTREMELY NARROW BANDS (${bandWidthPercent.toFixed(2)}%)`);
            console.log(`          Possible issues:`);
            console.log(`          - Very low volatility period`);
            console.log(`          - Weekend/holiday data`);
            console.log(`          - Data quality issue`);
          } else if (bandWidthPercent < 2.0) {
            console.log(`       ⚠️  Narrow bands (${bandWidthPercent.toFixed(2)}%) - Low volatility`);
          } else {
            console.log(`       ✅ Normal band width (${bandWidthPercent.toFixed(2)}%)`);
          }

          // Calculate annualized volatility
          const dailyVol = impliedStdDev / middle;
          const annualVol = dailyVol * Math.sqrt(252) * 100;
          console.log(`       📈 Implied Annual Volatility: ${annualVol.toFixed(1)}%`);
        }
      });

      // Check for data consistency
      console.log('\n🔍 DATA CONSISTENCY CHECK:');
      const widths = dates.map(date => {
        const point = bbandsData[date] as BBandsDataPoint;
        const upper = parseFloat(point['Real Upper Band']);
        const lower = parseFloat(point['Real Lower Band']);
        return upper - lower;
      });

      const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
      const maxWidth = Math.max(...widths);
      const minWidth = Math.min(...widths);

      console.log(`   Average Width: $${avgWidth.toFixed(3)}`);
      console.log(`   Min Width:     $${minWidth.toFixed(3)}`);
      console.log(`   Max Width:     $${maxWidth.toFixed(3)}`);
      console.log(`   Variation:     ${((maxWidth - minWidth) / avgWidth * 100).toFixed(1)}%`);

      // Get current price for comparison
      console.log('\n💰 FETCHING CURRENT PRICE...');
      const quoteResponse = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      if (quoteData['Global Quote'] && quoteData['Global Quote']['05. price']) {
        const currentPrice = parseFloat(quoteData['Global Quote']['05. price']);
        const latestBands = bbandsData[dates[0]] as BBandsDataPoint;
        const upper = parseFloat(latestBands['Real Upper Band']);
        const middle = parseFloat(latestBands['Real Middle Band']);
        const lower = parseFloat(latestBands['Real Lower Band']);

        console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
        console.log('\n   📍 PRICE POSITION:');

        if (currentPrice > upper) {
          console.log(`       ⬆️  Price ABOVE upper band (${currentPrice.toFixed(2)} > ${upper.toFixed(2)})`);
          console.log(`       Signal: Overbought condition`);
        } else if (currentPrice < lower) {
          console.log(`       ⬇️  Price BELOW lower band (${currentPrice.toFixed(2)} < ${lower.toFixed(2)})`);
          console.log(`       Signal: Oversold condition`);
        } else if (currentPrice > middle) {
          console.log(`       ↗️  Price above middle, below upper`);
          console.log(`       Position: Upper half of bands`);
        } else {
          console.log(`       ↘️  Price below middle, above lower`);
          console.log(`       Position: Lower half of bands`);
        }

        const distanceToUpper = ((upper - currentPrice) / currentPrice) * 100;
        const distanceToLower = ((currentPrice - lower) / currentPrice) * 100;
        console.log(`       Distance to Upper: ${distanceToUpper > 0 ? '+' : ''}${distanceToUpper.toFixed(2)}%`);
        console.log(`       Distance to Lower: ${distanceToLower.toFixed(2)}%`);
      }

    } else {
      console.error('\n❌ No Bollinger Bands data found in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n💥 Error fetching data:', error);
  }

  console.log('\n' + '='.repeat(80));
}

// Test multiple symbols
async function runTests() {
  const testSymbols = [
    { symbol: 'SPY', description: 'S&P 500 ETF (should have moderate volatility)' },
    { symbol: 'NVDA', description: 'NVIDIA (typically higher volatility)' },
    { symbol: 'JNJ', description: 'Johnson & Johnson (typically lower volatility)' }
  ];

  console.log('Starting Bollinger Bands API Tests...\n');

  for (const test of testSymbols) {
    console.log(`\nTesting: ${test.description}`);
    await testBollingerBandsAPI(test.symbol);

    // Wait 15 seconds between requests to respect API limits
    if (testSymbols.indexOf(test) < testSymbols.length - 1) {
      console.log('\n⏳ Waiting 15 seconds before next request (API rate limit)...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);