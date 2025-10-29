import { newsAnalysisService } from '../lib/services/newsAnalysisService';

async function main() {
  console.log('🧪 Testing Alpha Vantage news for GM...\n');

  const result = await newsAnalysisService.analyzeNews('GM');

  console.log('✅ Analysis Result:');
  console.log('Articles:', result.articles.length);
  console.log('Sentiment:', result.sentiment);
  console.log('Label:', result.sentimentLabel);
  console.log('Summary:', result.summary);
  console.log('\n📰 Articles:');
  result.articles.forEach((article, i) => {
    console.log(`${i + 1}. ${article.title}`);
    console.log(`   Source: ${article.source}`);
    console.log(`   URL: ${article.url}`);
    console.log('');
  });
}

main().catch(console.error);
