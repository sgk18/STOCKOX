# AI Committee Documentation

The **AI Committee** is the core differentiator of the Stockox platform. It represents a shift from single-prompt LLM interactions to a multi-agent orchestrated workflow, simulating the internal debate of a hedge fund's investment committee.

## The Agents

### 1. Research Agent
- **Focus**: Fundamental analysis and company health.
- **Inputs**: SEC filings summaries, earnings reports, P/E ratios, revenue growth, and profit margins.
- **Output Focus**: Does the company have a strong balance sheet and a defensible moat?

### 2. Technical Agent
- **Focus**: Price action and market structure.
- **Inputs**: Moving averages (SMA/EMA), RSI, MACD, volume trends, and support/resistance levels.
- **Output Focus**: Is the stock currently overbought or oversold? What is the short-term momentum?

### 3. News Agent
- **Focus**: Sentiment analysis and catalyst tracking.
- **Inputs**: Recent news headlines, social media sentiment, analyst upgrades/downgrades, and macro-economic announcements.
- **Output Focus**: Are there any immediate catalysts that could drive the price up or down?

### 4. Risk Agent
- **Focus**: Downside protection and volatility.
- **Inputs**: Beta, historical drawdowns, sector correlation, and broader market volatility indices (VIX).
- **Output Focus**: What is the worst-case scenario for this investment in the current environment?

### 5. Committee Agent (The Synthesizer)
- **Focus**: Final decision making.
- **Inputs**: The exact textual outputs and preliminary "votes" of the four subordinate agents.
- **Output Focus**: Resolving conflicting opinions, assigning a final Confidence Score (0-100), and issuing the definitive recommendation (BUY, HOLD, SELL).

## Decision Flow

1. **Trigger**: User requests an analysis for `AAPL`.
2. **Parallel Execution**: The backend spawns goroutines. The Research, Technical, News, and Risk agents run concurrently. They fetch their specific datasets from Redis/External APIs and query the LLM.
3. **Message Collection**: The agents return their findings, which are saved to the `agent_messages` table and streamed via WebSocket to the frontend in real-time.
4. **Synthesis**: Once all four agents complete, the Committee Agent is triggered. It reads the messages, weights the arguments (e.g., if Risk is extremely high, it may override a positive Technical signal), and produces the final JSON payload.
5. **Finalization**: The recommendation is saved to the `recommendations` table.

## Future: Band Protocol Integration
In the future, the inputs provided to these AI agents will be cross-referenced and validated using decentralized oracles via **Band Protocol**. This ensures that the financial data the AI bases its decisions on has not been tampered with and represents a decentralized consensus of truth.