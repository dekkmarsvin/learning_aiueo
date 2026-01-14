<script lang="ts">
	import type { NewsItem } from '../types';
	import { createEventDispatcher } from 'svelte';

	export let news: NewsItem[] = [];
	export let targetLang: 'tc' | 'en' = 'tc';

	const dispatch = createEventDispatcher<{
		select: { item: NewsItem };
	}>();

	function handleSelect(item: NewsItem) {
		dispatch('select', { item });
	}

	function formatDate(iso: string) {
		try {
			// Simplistic format: HH:mm
			const date = new Date(iso);
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return '';
		}
	}
</script>

<div class="news-list">
	{#each news as item}
		<button class="news-item" on:click={() => handleSelect(item)}>
			<div class="news-meta">
				<span class="news-source">{item.source}</span>
				<!-- <span class="news-time">{formatDate(item.publishedAt)}</span> -->
			</div>
			<div class="news-title-jp">{item.title}</div>
			{#if item.translatedTitle}
				<div class="news-title-trans">{item.translatedTitle}</div>
			{/if}
		</button>
	{/each}
	{#if news.length === 0}
		<div class="empty-state">
			ニュースを読み込んでいます... (Loading news...)
		</div>
	{/if}
</div>

<style>
	.news-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		overflow-y: auto;
		flex: 1;
		padding-right: 4px;
	}

	.news-item {
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.6);
		border-radius: 12px;
		padding: 12px;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.news-item:hover {
		background: rgba(255, 255, 255, 0.85);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.news-meta {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		color: #888;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.news-title-jp {
		font-size: 14px;
		font-weight: 700;
		color: #2c2c35;
		line-height: 1.5;
		font-family: 'Shippori Mincho', serif;
	}

	.news-title-trans {
		font-size: 12px;
		color: #666;
		margin-top: 2px;
		line-height: 1.4;
	}

	.empty-state {
		text-align: center;
		padding: 20px;
		color: #999;
		font-size: 13px;
	}
</style>
