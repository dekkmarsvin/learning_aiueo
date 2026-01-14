<script lang="ts">
	import {
		sendMessage,
		translateText,
		getFurigana,
		getHoverTranslation,
		getTopicPrompt,
	} from "$lib/api";

	import { toKana } from "wanakana";
	import { getPredictions } from "$lib/vocabulary";
	import type { FuriganaSegment } from "$lib/types";
	import {
		getTopicSuggestions,
		type TopicSuggestion,
	} from "$lib/topicSuggestions";
	import { onMount } from "svelte";

	type ChatMessage = {
		role: "user" | "assistant";
		content: string;
	};

	let sessionId: string | null = null;
	let message = "";
	let topic = "";
	let isSending = false;
	let error = "";
	let analysis = "";
	let analysisTranslation = "";
	let suggestions: { text: string; reading: string }[] = [];
	let grammarNotes: string[] = [];
	let grammarNotesTranslation: string[] = [];

	let messages: ChatMessage[] = [
		{
			role: "assistant",
			content: "こんにちは！今日はどんな話題で練習しますか？",
		},
	];

	// Language State
	type Language = "tc" | "en";
	let currentLanguage: Language = "tc";

	const translations = {
		tc: {
			analysisTitle: "入力分析",
			analysisDesc:
				"這裡會顯示你的日文輸入分析，包含語法正確性與改進建議。",
			hintTitle: "入力ヒント",
			hintDesc: "這裡會提供假名候選詞與相關的文法重點筆記。",
			topicLabel: "話題",
			topicPlaceholder: "例：旅行・學校・工作",
			send: "送信",
			sending: "送信中...",
			placeholder: "日本語で入力してください...",
		},
		en: {
			analysisTitle: "Input Analysis",
			analysisDesc:
				"Your Japanese input analysis will be shown here, including grammar correctness and improvement suggestions.",
			hintTitle: "Input Hints",
			hintDesc:
				"Kana candidates and relevant grammar notes will be displayed here.",
			topicLabel: "Topic",
			topicPlaceholder: "Ex: Travel, School, Work",
			send: "Send",
			sending: "Sending...",
			placeholder: "Please type in Japanese...",
		},
	};

	$: t = translations[currentLanguage];

	const handleSend = async () => {
		const content = message.trim();
		if (!content || isSending) return;
		error = "";
		isSending = true;
		message = "";
		// Clear furigana segments on send
		furiganaSegments = [];
		// Clear translation hint
		targetText = "";
		targetReading = "";

		messages = [...messages, { role: "user", content }];

		try {
			const response = await sendMessage({
				sessionId,
				message: content,
				topic: topic.trim() ? topic.trim() : undefined,
				targetLang: currentLanguage,
			});

			sessionId = response.sessionId;
			messages = [
				...messages,
				{ role: "assistant", content: response.reply },
			];
			analysis = response.analysis;
			suggestions = response.suggestions;
			grammarNotes = response.grammarNotes;
			analysisTranslation = response.analysisTranslation || "";
			grammarNotesTranslation = response.grammarNotesTranslation || [];
		} catch (err) {
			error = err instanceof Error ? err.message : "送信に失敗しました";
		}

		isSending = false;
	};

	let overrideHint: string | null = null;

	// Translation state
	let translationInput = "";
	let translationOutput = "";
	let translationReading = "";
	let isTranslating = false;

	// Practice target state
	let targetText = "";
	let targetReading = "";
	let targetSegments: FuriganaSegment[] = [];

	const handleTopicClick = async (suggestion: TopicSuggestion) => {
		const text = topicPrompts[suggestion.keyword] || suggestion.keyword;
		topic = text;
		targetText = text;
		targetReading = "";
		targetSegments = [];
		message = "";

		try {
			const segments = await getFurigana(text);
			targetSegments = segments;
			targetReading = segments
				.map((s) => s.reading || s.surface)
				.join("");
		} catch (e) {
			console.error(e);
		}
	};

	const handleSuggestionClick = async (suggestion: {
		text: string;
		reading: string;
	}) => {
		targetText = suggestion.text;
		targetReading = suggestion.reading;
		targetSegments = [];
		message = "";

		try {
			const segments = await getFurigana(suggestion.text);
			targetSegments = segments;
		} catch (e) {
			console.error(e);
			// Fallback if API fails: create a single segment with the full reading (less ideal but works)
			targetSegments = [
				{ surface: suggestion.text, reading: suggestion.reading },
			];
		}
	};

	const handleTranslate = async () => {
		if (!translationInput.trim() || isTranslating) return;
		isTranslating = true;
		try {
			const res = await translateText({ text: translationInput });
			translationOutput = res.translated;
			translationReading = res.reading;
		} catch (e) {
			console.error(e);
			translationOutput = "翻訳に失敗しました";
			translationReading = "";
		} finally {
			isTranslating = false;
		}
	};

	$: kanaHint = overrideHint || toKana(message, { IMEMode: true });
	$: predictions = getPredictions(message);
	let topicSuggestions: TopicSuggestion[] = [];
	let topicPrompts: Record<string, string> = {};

	const loadTopicPrompts = async () => {
		topicSuggestions = getTopicSuggestions();
		for (const suggestion of topicSuggestions) {
			try {
				const prompt = await getTopicPrompt(
					suggestion.keyword,
					suggestion.context,
				);
				topicPrompts[suggestion.keyword] = prompt;
			} catch (e) {
				console.error(e);
				topicPrompts[suggestion.keyword] = suggestion.keyword; // Fallback
			}
		}
	};

	onMount(() => {
		loadTopicPrompts();
	});

	// Furigana State
	let furiganaSegments: FuriganaSegment[] = [];
	let furiganaDebounceTimer: number;

	const updateFurigana = (text: string) => {
		clearTimeout(furiganaDebounceTimer);
		if (!text) {
			furiganaSegments = [];
			return;
		}

		// Debounce to avoid too many API calls while typing
		furiganaDebounceTimer = setTimeout(async () => {
			try {
				const segments = await getFurigana(text);
				furiganaSegments = segments;
			} catch (e) {
				console.error("Furigana fetch failed", e);
			}
		}, 300) as unknown as number;
	};

	const handleInput = () => {
		overrideHint = null;
		updateFurigana(message);
	};

	// Hover Translation State
	let hoverText = "";
	let hoverTranslation = "";
	let hoverX = 0;
	let hoverY = 0;
	let showHover = false;
	let hoverTimer: number;

	const handleMouseEnter = (event: MouseEvent, text: string) => {
		clearTimeout(hoverTimer);
		hoverTimer = setTimeout(async () => {
			hoverText = text;
			hoverX = event.clientX;
			hoverY = event.clientY + 20; // Offset below cursor
			showHover = true;

			// Fetch translation
			try {
				hoverTranslation = "Loading...";
				const translation = await getHoverTranslation(
					text,
					currentLanguage,
				);
				if (showHover) {
					hoverTranslation = translation;
				}
			} catch (e) {
				console.error(e);
				hoverTranslation = "Translation failed";
			}
		}, 300) as unknown as number; // Wait 300ms before showing
	};

	const handleMouseLeave = () => {
		clearTimeout(hoverTimer);
		showHover = false;
		hoverTranslation = "";
	};
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@300;500;700&family=Shippori+Mincho:wght@500;700&display=swap"
	/>
</svelte:head>

<main class="page">
	<header class="header">
		<div>
			<h1>AI日本語タイピング</h1>
			<p>1:1 チャットで日本語入力を練習</p>
		</div>
		<div class="header-controls">
			<div class="control-group">
				<label for="language">Language</label>
				<select id="language" bind:value={currentLanguage}>
					<option value="tc">繁體中文</option>
					<option value="en">English</option>
				</select>
			</div>
			<div class="control-group topic">
				<div class="topic-header">
					<label for="topic">{t.topicLabel}</label>
					<span class="topic-hint">💡 おすすめ</span>
				</div>
				<div class="topic-suggestions">
					{#each topicSuggestions as suggestion}
						<button
							class="topic-chip"
							type="button"
							on:click={() => handleTopicClick(suggestion)}
							title={suggestion.description}
						>
							{topicPrompts[suggestion.keyword] ||
								suggestion.keyword}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</header>

	<section class="grid">
		<div class="panel chat">
			<div class="panel-title">チャット</div>
			<div class="chat-list">
				{#each messages as item}
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class={`bubble ${item.role}`}
						on:mouseenter={(e) =>
							item.role === "assistant" &&
							handleMouseEnter(e, item.content)}
						on:mouseleave={handleMouseLeave}
					>
						<span>{item.content}</span>
					</div>
				{/each}
			</div>

			<div class="chat-input-wrapper">
				{#if targetText}
					<div class="target-display">
						{#if targetSegments.length > 0}
							<div class="target-content">
								{#each targetSegments as segment}
									{#if segment.reading && segment.reading !== segment.surface}
										<ruby
											>{segment.surface}<rt
												>{segment.reading}</rt
											></ruby
										>
									{:else}
										<span>{segment.surface}</span>
									{/if}
								{/each}
							</div>
						{:else}
							<div class="target-content">
								<ruby>{targetText}<rt>{targetReading}</rt></ruby
								>
							</div>
						{/if}
					</div>
				{/if}
				{#if message}
					<div class="kana-hint">
						{#if furiganaSegments.length > 0}
							{#each furiganaSegments as segment}
								{#if segment.reading}
									<ruby
										>{segment.surface}<rt
											>{segment.reading}</rt
										></ruby
									>
								{:else}
									<span>{segment.surface}</span>
								{/if}
							{/each}
						{:else}
							{kanaHint}
						{/if}
					</div>
					{#if predictions.length}
						<div class="predictions">
							{#each predictions as prediction}
								<button
									class="prediction-chip"
									on:click={() => (message = prediction)}
								>
									{prediction}
								</button>
							{/each}
						</div>
					{/if}
				{/if}
				{#if suggestions.length && !message}
					<div class="suggestions">
						{#each suggestions as suggestion}
							<button
								class="suggestion-chip"
								on:click={() =>
									handleSuggestionClick(suggestion)}
							>
								{suggestion.text}
							</button>
						{/each}
					</div>
				{/if}
				<textarea
					rows="3"
					placeholder={t.placeholder}
					bind:value={message}
					on:input={handleInput}
				></textarea>
				<button
					on:click={handleSend}
					disabled={isSending || !message.trim()}
				>
					{isSending ? t.sending : t.send}
				</button>
				{#if error}
					<div class="error">{error}</div>
				{/if}
			</div>
		</div>

		<div class="center-column">
			<div class="panel analysis">
				<div class="panel-title">{t.analysisTitle}</div>
				<div class="panel-body">
					<p class="explanation-text">{t.analysisDesc}</p>
					{#if analysis}
						<div class="analysis-content">
							<p class="orig-text">{analysis}</p>
							{#if analysisTranslation}
								<div class="translation-block">
									<p class="trans-label">
										{currentLanguage === "tc"
											? "翻譯"
											: "Translation"}
									</p>
									<p class="trans-text">
										{analysisTranslation}
									</p>
								</div>
							{/if}
						</div>
					{:else}
						<p class="muted">
							会話を送信すると分析が表示されます。
						</p>
					{/if}
				</div>
			</div>

			<div class="panel translation">
				<div class="panel-title">翻訳 (Translate)</div>
				<div class="panel-body">
					<textarea
						class="trans-input"
						rows="3"
						placeholder="Other language..."
						bind:value={translationInput}
					></textarea>
					<button
						class="trans-btn"
						on:click={handleTranslate}
						disabled={isTranslating || !translationInput.trim()}
					>
						{isTranslating
							? "Translating..."
							: "Translate to Japanese"}
					</button>
					{#if translationOutput}
						<div class="trans-result">
							<p>{translationOutput}</p>
							<button
								class="copy-btn"
								on:click={() => {
									targetText = translationOutput;
									targetReading = translationReading;
								}}
							>
								Use this
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="panel hints">
			<div class="panel-title">{t.hintTitle}</div>
			<div class="panel-body">
				<p class="explanation-text">{t.hintDesc}</p>

				<div class="section">
					<h3>文法メモ</h3>
					{#if grammarNotes.length}
						<ul>
							{#each grammarNotes as note, i}
								<li>
									<div class="note-item">
										<p class="orig-note">{note}</p>
										{#if grammarNotesTranslation[i]}
											<p class="trans-note">
												{grammarNotesTranslation[i]}
											</p>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="muted">
							文法の指摘やポイントが表示されます。
						</p>
					{/if}
				</div>
			</div>
		</div>
	</section>

	{#if showHover && hoverTranslation}
		<div class="hover-tooltip" style="top: {hoverY}px; left: {hoverX}px;">
			{hoverTranslation}
		</div>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: "M PLUS 1", "Noto Sans JP", sans-serif;
		background: radial-gradient(
			circle at top left,
			#f8ede3,
			#f1e4ff 40%,
			#e8f7f3 90%
		);
		color: #1f1f26;
	}

	.page {
		min-height: 100vh;
		padding: 32px 40px 48px;
		box-sizing: border-box;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 24px;
	}

	.header h1 {
		font-family: "Shippori Mincho", "M PLUS 1", serif;
		font-size: 32px;
		margin: 0 0 8px;
		letter-spacing: 1px;
	}

	.header p {
		margin: 0;
		opacity: 0.7;
	}

	.header-controls {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: rgba(255, 255, 255, 0.65);
		padding: 12px 16px;
		border-radius: 14px;
		box-shadow: 0 8px 24px rgba(28, 25, 48, 0.08);
	}

	.control-group label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		opacity: 0.5;
		letter-spacing: 0.5px;
	}

	.control-group select {
		border: none;
		border-bottom: 2px solid rgba(28, 25, 48, 0.2);
		background: transparent;
		padding: 6px 2px;
		font-size: 14px;
		outline: none;
		min-width: 140px;
		font-family: inherit;
		color: inherit;
	}

	.control-group select {
		cursor: pointer;
	}

	.control-group.topic {
		min-width: 280px;
	}

	.topic-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.topic-hint {
		font-size: 10px;
		font-weight: 600;
		opacity: 0.6;
		text-transform: none;
	}

	.topic-suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 4px 0;
	}

	.topic-chip {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: #fff;
		border: none;
		border-radius: 12px;
		padding: 4px 10px;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
	}

	.topic-chip:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
	}

	.grid {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr;
		gap: 20px;
		align-items: start;
	}

	.center-column {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.panel {
		background: rgba(255, 255, 255, 0.72);
		border-radius: 18px;
		padding: 18px;
		box-shadow: 0 12px 30px rgba(19, 16, 33, 0.12);
		backdrop-filter: blur(8px);
		display: flex;
		flex-direction: column;
		min-height: 520px;
		opacity: 0;
		animation: rise 0.6s ease forwards;
	}

	.panel:nth-child(1) {
		animation-delay: 0.05s;
	}

	.panel:nth-child(2) {
		animation-delay: 0.15s;
	}

	.panel:nth-child(3) {
		animation-delay: 0.25s;
	}

	.panel-title {
		font-weight: 700;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		font-size: 12px;
		margin-bottom: 14px;
	}

	.chat-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-right: 8px;
	}

	.bubble {
		padding: 12px 14px;
		border-radius: 16px;
		max-width: 80%;
		line-height: 1.5;
		font-size: 15px;
	}

	.bubble.user {
		align-self: flex-end;
		background: #1f1f26;
		color: #fefefe;
		border-bottom-right-radius: 4px;
	}

	.bubble.assistant {
		align-self: flex-start;
		background: #fff7e6;
		border-bottom-left-radius: 4px;
	}

	.chat-input {
		margin-top: 12px;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 10px;
		align-items: end;
	}

	.chat-input-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.target-display {
		background: #f0f7ff;
		border: 1px dashed #adcce9;
		border-radius: 8px;
		padding: 8px 12px;
		margin-bottom: 8px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.target-reading {
		font-size: 12px;
		color: #666;
		margin-bottom: 2px;
	}

	.target-text,
	.target-content {
		font-size: 18px;
		font-weight: 700;
		color: #1f1f26;
		line-height: 2;
	}

	.target-content ruby {
		margin: 0 2px;
	}

	.target-content rt {
		font-size: 0.6em;
		color: #666;
	}

	.kana-hint {
		font-size: 14px;
		color: #666;
		margin-bottom: 4px;
		margin-left: 4px;
		font-weight: 500;
	}

	.predictions,
	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 8px;
		padding: 0 4px;
	}

	.prediction-chip,
	.suggestion-chip {
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(28, 25, 48, 0.1);
		border-radius: 16px;
		padding: 6px 12px;
		font-size: 13px;
		color: #1f1f26;
		cursor: pointer;
		transition: all 0.2s;
	}

	.prediction-chip:hover,
	.suggestion-chip:hover {
		background: #fff;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
		transform: translateY(-1px);
	}

	.prediction-chip {
		background: #e8f7f3;
		border-color: #8cebc6;
	}

	textarea {
		resize: none;
		border-radius: 12px;
		border: 1px solid rgba(31, 31, 38, 0.2);
		padding: 10px 12px;
		font-family: inherit;
		font-size: 14px;
		background: rgba(255, 255, 255, 0.9);
	}

	.trans-input {
		width: 100%;
		resize: vertical;
		border-radius: 8px;
		border: 1px solid rgba(31, 31, 38, 0.15);
		padding: 8px;
		font-family: inherit;
		box-sizing: border-box;
	}

	.trans-btn {
		width: 100%;
		background: #6c5ce7;
		color: #fff;
		margin-top: 8px;
	}

	.trans-btn:hover:not(:disabled) {
		background: #5b4cc4;
		box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
	}

	.trans-result {
		margin-top: 12px;
		padding: 10px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #eee;
	}

	.trans-result p {
		margin: 0 0 8px;
		font-weight: 500;
	}

	.copy-btn {
		background: transparent;
		color: #6c5ce7;
		border: 1px solid #6c5ce7;
		padding: 4px 10px;
		font-size: 12px;
		width: auto;
	}

	.copy-btn:hover {
		background: #6c5ce7;
		color: #fff;
		transform: none;
		box-shadow: none;
	}

	button {
		border: none;
		border-radius: 12px;
		padding: 10px 18px;
		background: #ff8b5d;
		color: #1f1f26;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		box-shadow: none;
	}

	button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 18px rgba(255, 139, 93, 0.3);
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
		font-size: 14px;
	}

	.explanation-text {
		font-size: 13px;
		color: #666;
		background: rgba(255, 255, 255, 0.5);
		padding: 10px;
		border-radius: 8px;
		margin: 0;
		line-height: 1.5;
	}

	.section h3 {
		margin: 0 0 6px;
		font-size: 14px;
		letter-spacing: 0.3px;
	}

	.section ul {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 6px;
	}

	.muted {
		opacity: 0.6;
		margin: 0;
	}

	.error {
		grid-column: 1 / -1;
		color: #b42318;
		font-size: 12px;
	}

	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.panel {
			min-height: unset;
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.analysis-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.orig-text,
	.orig-note {
		margin: 0;
		line-height: 1.5;
	}

	.translation-block {
		background: rgba(255, 255, 255, 0.4);
		padding: 8px 10px;
		border-radius: 8px;
		border-left: 3px solid #adcce9;
	}

	.trans-label {
		font-size: 11px;
		font-weight: 700;
		color: #666;
		margin: 0 0 4px;
		text-transform: uppercase;
	}

	.trans-text,
	.trans-note {
		margin: 0;
		font-size: 13px;
		color: #444;
		line-height: 1.4;
	}

	.note-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.trans-note {
		font-size: 12px;
		color: #666;
		padding-left: 8px;
		border-left: 2px solid #ddd;
	}

	.hover-tooltip {
		position: fixed;
		background: rgba(31, 31, 38, 0.95);
		color: #fff;
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 13px;
		pointer-events: none;
		z-index: 1000;
		white-space: pre-wrap;
		max-width: 300px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		transform: translateX(-50%);
	}

	ruby {
		ruby-position: over;
	}

	rt {
		font-size: 0.6em;
		color: #666;
	}
</style>
