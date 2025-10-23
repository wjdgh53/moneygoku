'use client';

import { TestReport } from '@/lib/services/botTestService';

interface TestRunReportProps {
  report: TestReport | null;
  isRunning?: boolean;
  show?: boolean;
  onClose?: () => void;
  inline?: boolean;  // 인라인 모드 (모달 없이)
}

export default function TestRunReport({ report, isRunning = false, show = true, onClose, inline = false }: TestRunReportProps) {
  if (!inline && !show) return null;

  const content = (
    <div className={inline ? "" : "p-6 overflow-y-auto max-h-[70vh]"}>
        {isRunning ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">테스트 실행 중...</span>
          </div>
        ) : report ? (
            <div className="space-y-6">
              {/* Test Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Symbol</p>
                    <p className="font-semibold text-gray-900">{report.symbol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">실행 시간</p>
                    <p className="font-semibold text-gray-900">{report.executionTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">타임스탬프</p>
                    <p className="font-semibold text-xs text-gray-900">
                      {new Date(report.timestamp).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">최종 결정</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      report.finalDecision === 'BUY'
                        ? 'bg-green-100 text-green-800'
                        : report.finalDecision === 'SELL'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.finalDecision}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Price Information */}
              {report.currentPrice && report.targetPrice && report.stopLossPrice && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-3">🎯 목표주가 정보</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">현재가</p>
                      <p className="font-semibold text-gray-900">${report.currentPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">목표가 (익절)</p>
                      <p className="font-semibold text-green-700">
                        ${report.targetPrice.toFixed(2)}
                        <span className="text-xs ml-1">(+{report.takeProfitPercent}%)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">손절가</p>
                      <p className="font-semibold text-red-700">
                        ${report.stopLossPrice.toFixed(2)}
                        <span className="text-xs ml-1">(-{report.stopLossPercent}%)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">예상 수익</p>
                      <p className="font-semibold text-green-700">
                        +${(report.targetPrice - report.currentPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {report.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">❌ 오류 발생</h3>
                  <p className="text-red-700">{report.error}</p>
                </div>
              )}

              {/* API Calls */}
              <div className="bg-white border rounded-lg">
                <h3 className="font-semibold text-gray-900 p-4 border-b">
                  📡 API 호출 내역
                </h3>
                <div className="divide-y">
                  {report.apiCalls.map((call, index) => (
                    <div key={index} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex w-2 h-2 rounded-full ${
                            call.success ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          <span className="font-medium text-gray-900">
                            {call.indicator.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {call.responseTime}ms
                        </span>
                      </div>

                      {/* Parameters */}
                      {Object.keys(call.params).length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">파라미터: </span>
                          <span className="text-sm text-gray-900">
                            {JSON.stringify(call.params)}
                          </span>
                        </div>
                      )}

                      {/* Result */}
                      <div>
                        <span className="text-sm text-gray-500">결과: </span>
                        {call.success ? (
                          typeof call.result === 'object' && call.result !== null ? (
                            <div className="text-sm text-gray-900 mt-1 pl-4 border-l-2 border-gray-200">
                              {Object.entries(call.result).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium text-gray-900">{key}:</span> {
                                    typeof value === 'number' ? value.toFixed(4) : String(value || 'N/A')
                                  }
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900">
                              {typeof call.result === 'number'
                                ? call.result.toFixed(4)
                                : String(call.result || 'N/A')
                              }
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-red-600">호출 실패</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conditions Evaluation */}
              <div className="bg-white border rounded-lg">
                <h3 className="font-semibold text-gray-900 p-4 border-b">
                  🔍 조건 평가 결과
                </h3>
                <div className="divide-y">
                  {report.conditions.map((condition, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start space-x-3">
                        <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-xs font-medium ${
                          condition.result
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {condition.result ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {condition.condition}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            실제값: {condition.actual}
                          </p>
                          {condition.details && (
                            <p className="text-xs text-gray-500 mt-1">
                              {condition.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🆕 News Analysis Section */}
              {report.newsAnalysis && (
                <div className="bg-white border rounded-lg">
                  <h3 className="font-semibold text-gray-900 p-4 border-b">
                    📰 뉴스 분석
                  </h3>

                  {/* Alpha Vantage Sentiment */}
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-700">📊 Alpha Vantage 감성 분석</h4>
                        <div className={`text-2xl font-bold ${
                          report.newsAnalysis.sentiment >= 0.15 ? 'text-green-600' :
                          report.newsAnalysis.sentiment <= -0.15 ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {report.newsAnalysis.sentiment >= 0 ? '+' : ''}{report.newsAnalysis.sentiment.toFixed(2)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {report.newsAnalysis.sentimentLabel}
                      </p>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            report.newsAnalysis.sentiment >= 0.15 ? 'bg-green-500' :
                            report.newsAnalysis.sentiment <= -0.15 ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{
                            width: `${Math.abs(report.newsAnalysis.sentiment) * 100}%`,
                            marginLeft: report.newsAnalysis.sentiment < 0 ? 'auto' : '0'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="p-4 bg-blue-50 border-b">
                    <h4 className="font-semibold text-blue-800 mb-2">🤖 AI 요약</h4>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.newsAnalysis.summary}
                    </p>
                  </div>

                  {/* News Articles List */}
                  {report.newsAnalysis.articles.length > 0 ? (
                    <div className="divide-y">
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-700 text-sm">
                          관련 뉴스 ({report.newsAnalysis.articles.length}개)
                        </h4>
                      </div>
                      {report.newsAnalysis.articles.map((article, index) => (
                        <div key={index} className="p-4 hover:bg-gray-50">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {article.title}
                          </a>
                          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                            <span>📍 {article.source}</span>
                            <span>•</span>
                            <span>
                              {article.publishedDate && !isNaN(new Date(article.publishedDate).getTime())
                                ? new Date(article.publishedDate).toLocaleDateString('ko-KR')
                                : '날짜 없음'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                            {article.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      관련 뉴스를 찾을 수 없습니다.
                    </div>
                  )}
                </div>
              )}

              {/* 🆕 Parsed FMP Data Section (간단 요약) */}
              {report.parsedFmpData && (
                <div className="bg-white border rounded-lg">
                  <h3 className="font-semibold text-gray-900 p-4 border-b">
                    📰 FMP 데이터 요약
                  </h3>
                  <div className="p-4 space-y-4">
                    {/* Critical Events */}
                    {report.parsedFmpData.criticalEvents && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 text-sm mb-2">🚨 중요 이벤트</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-line font-sans">
                          {report.parsedFmpData.criticalEvents}
                        </pre>
                      </div>
                    )}

                    {/* Insider Signals */}
                    {report.parsedFmpData.insiderSignals && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-semibold text-amber-800 text-sm mb-2">💼 내부자 거래</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-line font-sans">
                          {report.parsedFmpData.insiderSignals}
                        </pre>
                      </div>
                    )}

                    {/* Recent News */}
                    {report.parsedFmpData.recentNews && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 text-sm mb-2">📰 최근 뉴스</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-line font-sans">
                          {report.parsedFmpData.recentNews}
                        </pre>
                      </div>
                    )}

                    {/* Social Sentiment (Optional) */}
                    {report.parsedFmpData.socialSentiment && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-800 text-sm mb-2">📊 소셜 감성</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-line font-sans">
                          {report.parsedFmpData.socialSentiment}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🆕 AI Trading Decision */}
              {report.aiDecision && (
                <div className={`border rounded-lg overflow-hidden ${
                  report.aiDecision.action === 'BUY'
                    ? 'bg-green-50 border-green-200'
                    : report.aiDecision.action === 'SELL'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="p-4 border-b bg-white">
                    <h3 className={`font-bold text-lg ${
                      report.aiDecision.action === 'BUY'
                        ? 'text-green-800'
                        : report.aiDecision.action === 'SELL'
                        ? 'text-red-800'
                        : 'text-yellow-800'
                    }`}>
                      🤖 AI 통합 거래 판단
                    </h3>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* 점수 플로우 차트 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">📊 점수 계산 흐름</h4>
                      <div className="space-y-3">
                        {/* Step 1: 뉴스 감성 */}
                        {('news' in (report.aiDecision.objectiveScore || {})) && (report.aiDecision.objectiveScore as any).news !== undefined && (
                          <div className="flex items-center space-x-3">
                            <div className="w-32 text-sm text-gray-600">1️⃣ 뉴스 감성</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-8 flex items-center px-4">
                              <span className={`font-bold ${
                                (report.aiDecision.objectiveScore as any).news >= 0.5 ? 'text-green-600' :
                                (report.aiDecision.objectiveScore as any).news >= 0 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {(report.aiDecision.objectiveScore as any).news >= 0 ? '+' : ''}{(report.aiDecision.objectiveScore as any).news.toFixed(2)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">(가중치 70%)</span>
                            </div>
                          </div>
                        )}

                        {/* Step 2: 기술적 분석 */}
                        {report.aiDecision.objectiveScore?.technical !== undefined && (
                          <div className="flex items-center space-x-3">
                            <div className="w-32 text-sm text-gray-600">2️⃣ 기술적 분석</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-8 flex items-center px-4">
                              <span className={`font-bold ${
                                (report.aiDecision.objectiveScore as any).technical > 0 ? 'text-green-600' :
                                (report.aiDecision.objectiveScore as any).technical < 0 ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {(report.aiDecision.objectiveScore as any).technical >= 0 ? '+' : ''}{(report.aiDecision.objectiveScore as any).technical.toFixed(2)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">(가중치 30%)</span>
                            </div>
                          </div>
                        )}

                        {/* Step 3: 기초 점수 */}
                        {report.aiDecision.objectiveScore?.baseScore !== undefined && (
                          <div className="flex items-center space-x-3 border-t pt-3">
                            <div className="w-32 text-sm text-gray-600">📐 기초 점수</div>
                            <div className="flex-1 bg-blue-50 rounded-full h-8 flex items-center px-4 border border-blue-200">
                              <span className="font-bold text-blue-700">
                                {report.aiDecision.objectiveScore.baseScore >= 0 ? '+' : ''}{report.aiDecision.objectiveScore.baseScore.toFixed(2)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">(뉴스 60% + 기술 40%)</span>
                            </div>
                          </div>
                        )}

                        {/* Step 4: FMP 조정 (GPT) */}
                        {report.aiDecision.gptAdjustment !== undefined && (
                          <div className="flex items-center space-x-3">
                            <div className="w-32 text-sm text-gray-600">🧠 FMP 조정</div>
                            <div className="flex-1 bg-purple-50 rounded-full h-8 flex items-center px-4 border border-purple-200">
                              <span className={`font-bold ${
                                report.aiDecision.gptAdjustment > 0 ? 'text-green-600' :
                                report.aiDecision.gptAdjustment < 0 ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {report.aiDecision.gptAdjustment >= 0 ? '+' : ''}{report.aiDecision.gptAdjustment.toFixed(2)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">(SEC, 내부자거래 분석)</span>
                            </div>
                          </div>
                        )}

                        {/* Step 5: 최종 점수 */}
                        {report.aiDecision.finalScore !== undefined && (
                          <div className="flex items-center space-x-3 border-t pt-3">
                            <div className="w-32 text-sm font-bold text-gray-900">🎯 최종 점수</div>
                            <div className={`flex-1 rounded-full h-10 flex items-center px-4 border-2 ${
                              report.aiDecision.finalScore >= 0.35 ? 'bg-green-100 border-green-400' :
                              report.aiDecision.finalScore <= -0.35 ? 'bg-red-100 border-red-400' :
                              'bg-yellow-100 border-yellow-400'
                            }`}>
                              <span className={`font-bold text-xl ${
                                report.aiDecision.finalScore >= 0.35 ? 'text-green-700' :
                                report.aiDecision.finalScore <= -0.35 ? 'text-red-700' :
                                'text-yellow-700'
                              }`}>
                                {report.aiDecision.finalScore >= 0 ? '+' : ''}{report.aiDecision.finalScore.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 거래 로직 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">⚙️ 거래 로직</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-bold">✅ BUY 조건:</span>
                          <span className="text-gray-700">최종 점수 ≥ +0.35</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600 font-bold">⛔ SELL 조건:</span>
                          <span className="text-gray-700">최종 점수 ≤ -0.35</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600 font-bold">⏸️ HOLD 조건:</span>
                          <span className="text-gray-700">-0.35 &lt; 최종 점수 &lt; +0.35</span>
                        </div>
                      </div>
                    </div>

                    {/* 최종 결정 */}
                    <div className={`rounded-lg border-2 p-4 ${
                      report.aiDecision.action === 'BUY'
                        ? 'bg-green-100 border-green-400'
                        : report.aiDecision.action === 'SELL'
                        ? 'bg-red-100 border-red-400'
                        : 'bg-yellow-100 border-yellow-400'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-bold text-lg ${
                          report.aiDecision.action === 'BUY'
                            ? 'text-green-800'
                            : report.aiDecision.action === 'SELL'
                            ? 'text-red-800'
                            : 'text-yellow-800'
                        }`}>
                          🎯 최종 결정: {report.aiDecision.action}
                        </h4>
                        {report.aiDecision.quantity !== undefined && report.aiDecision.quantity > 0 && (
                          <div className="bg-white px-4 py-2 rounded-lg border-2 border-gray-300">
                            <span className="text-sm text-gray-600">수량: </span>
                            <span className="font-bold text-gray-900">{report.aiDecision.quantity}주</span>
                          </div>
                        )}
                      </div>

                      {report.aiDecision.limitPrice && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-700">리미트 가격: </span>
                          <span className="font-semibold text-gray-900">
                            ${report.aiDecision.limitPrice.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* 객관적 분석 */}
                      {report.aiDecision.objectiveReasoning && (
                        <div className="bg-white rounded p-3 mb-3 border">
                          <h5 className="text-xs font-semibold text-gray-600 mb-1">📊 객관적 분석:</h5>
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {report.aiDecision.objectiveReasoning}
                          </p>
                        </div>
                      )}

                      {/* AI 종합 판단 */}
                      {report.aiDecision.aiReasoning && (
                        <div className="bg-white rounded p-3 border">
                          <h5 className="text-xs font-semibold text-gray-600 mb-1">🤖 AI 종합 판단:</h5>
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {report.aiDecision.aiReasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Trade Execution Result */}
              {report.tradeExecuted !== undefined && (
                <div className={`border rounded-lg p-4 ${
                  report.tradeResult?.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    report.tradeResult?.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {report.tradeResult?.success ? '✅' : '❌'} 거래 실행 결과
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">거래 실행:</span>
                      <span className={`ml-2 font-semibold ${
                        report.tradeExecuted ? 'text-green-700' : 'text-gray-700'
                      }`}>
                        {report.tradeExecuted ? '실행됨' : '실행 안됨'}
                      </span>
                    </div>

                    {report.tradeResult && (
                      <>
                        <div>
                          <span className="text-sm text-gray-600">결과:</span>
                          <span className={`ml-2 font-semibold ${
                            report.tradeResult.success ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {report.tradeResult.message}
                          </span>
                        </div>

                        {report.tradeResult.orderId && (
                          <div>
                            <span className="text-sm text-gray-600">주문 ID:</span>
                            <span className="ml-2 text-sm font-mono text-gray-700">
                              {report.tradeResult.orderId}
                            </span>
                          </div>
                        )}

                        {report.tradeResult.error && (
                          <div className="bg-red-100 border border-red-200 rounded p-2 mt-2">
                            <p className="text-sm text-red-700">
                              오류: {report.tradeResult.error}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : null}
    </div>
  );

  // 인라인 모드: 모달 없이 내용만 표시
  if (inline) {
    return content;
  }

  // 모달 모드: 모달로 감싸서 표시
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            봇 테스트 실행 결과
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {content}

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}