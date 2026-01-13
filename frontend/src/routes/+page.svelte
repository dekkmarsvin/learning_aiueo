<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@300;500;700&family=Shippori+Mincho:wght@500;700&display=swap"
	/>
</svelte:head>

<script lang="ts">
	import { sendMessage } from '$lib/api';
	import { generateKanaCandidates } from '$lib/kana';

	type ChatMessage = {
		role: 'user' | 'assistant';
		content: string;
	};

	let sessionId: string | null = null;
	let message = '';
	let topic = '';
	let isSending = false;
	let error = '';
	let analysis = '';
	let suggestions: string[] = [];
	let grammarNotes: string[] = [];

	let messages: ChatMessage[] = [
		{ role: 'assistant', content: 'こんにちは！今日はどんな話題で練習しますか？' }
	];

	const handleSend = async () => {
		const content = message.trim();
		if (!content || isSending) return;
		error = '';
		isSending = true;
		message = '';

		messages = [...messages, { role: 'user', content }];

		try {
			const response = await sendMessage({
				sessionId,
				message: content,
				topic: topic.trim() ? topic.trim() : undefined
			});

			sessionId = response.sessionId;
			messages = [...messages, { role: 'assistant', content: response.reply }];
			analysis = response.analysis;
			suggestions = response.suggestions;
			grammarNotes = response.grammarNotes;
		} catch (err) {
			error = err instanceof Error ? err.message : '送信に失敗しました';
		}

		isSending = false;
	};

	const kanaCandidates = () => generateKanaCandidates(message);
</script>

<main class="page">
	<header class="header">
		<div>
			<h1>AI日本語タイピング</h1>
			<p>1:1 チャットで日本語入力を練習</p>
		</div>
		<div class="topic">
			<label for="topic">話題</label>
			<input id="topic" type="text" placeholder="例：旅行・学校・仕事" bind:value={topic} />
		</div>
	</header>

	<section class="grid">
		<div class="panel chat">
			<div class="panel-title">チャット</div>
			<div class="chat-list">
				{#each messages as item}
					<div class={`bubble ${item.role}`}>
						<span>{item.content}</span>
					</div>
				{/each}
			</div>

			<div class="chat-input">
				<textarea
					rows="3"
					placeholder="日本語で入力してください..."
					bind:value={message}
				/>
				<button on:click={handleSend} disabled={isSending || !message.trim()}>
					{isSending ? '送信中...' : '送信'}
				</button>
				{#if error}
					<div class="error">{error}</div>
				{/if}
			</div>
		</div>

		<div class="panel analysis">
			<div class="panel-title">入力分析</div>
			<div class="panel-body">
				{#if analysis}
					<p>{analysis}</p>
				{:else}
					<p class="muted">会話を送信すると分析が表示されます。</p>
				{/if}
			</div>
		</div>

		<div class="panel hints">
			<div class="panel-title">入力ヒント</div>
			<div class="panel-body">
				<div class="section">
					<h3>かな候補</h3>
					{#if message.trim()}
						<ul>
							{#each kanaCandidates() as candidate}
								<li>{candidate}</li>
							{/each}
						</ul>
					{:else}
						<p class="muted">入力中に候補を表示します。</p>
					{/if}
				</div>

				<div class="section">
					<h3>おすすめ返信</h3>
					{#if suggestions.length}
						<ul>
							{#each suggestions as suggestion}
								<li>{suggestion}</li>
							{/each}
						</ul>
					{:else}
						<p class="muted">AIの提案がここに表示されます。</p>
					{/if}
				</div>

				<div class="section">
					<h3>文法メモ</h3>
					{#if grammarNotes.length}
						<ul>
							{#each grammarNotes as note}
								<li>{note}</li>
							{/each}
						</ul>
					{:else}
						<p class="muted">文法の指摘やポイントが表示されます。</p>
					{/if}
				</div>
			</div>
		</div>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'M PLUS 1', 'Noto Sans JP', sans-serif;
		background: radial-gradient(circle at top left, #f8ede3, #f1e4ff 40%, #e8f7f3 90%);
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
		font-family: 'Shippori Mincho', 'M PLUS 1', serif;
		font-size: 32px;
		margin: 0 0 8px;
		letter-spacing: 1px;
	}

	.header p {
		margin: 0;
		opacity: 0.7;
	}

	.topic {
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: rgba(255, 255, 255, 0.65);
		padding: 12px 16px;
		border-radius: 14px;
		box-shadow: 0 8px 24px rgba(28, 25, 48, 0.08);
	}

	.topic input {
		border: none;
		border-bottom: 2px solid rgba(28, 25, 48, 0.2);
		background: transparent;
		padding: 6px 2px;
		font-size: 14px;
		outline: none;
	}

	.grid {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr;
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

	button {
		border: none;
		border-radius: 12px;
		padding: 10px 18px;
		background: #ff8b5d;
		color: #1f1f26;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
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
</style>
