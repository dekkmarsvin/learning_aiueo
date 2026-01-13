import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from '../routes/+page.svelte';

describe('Home page', () => {
	it('renders main sections', () => {
		render(Page);
		expect(screen.getByText('AI日本語タイピング')).toBeInTheDocument();
		expect(screen.getByText('チャット')).toBeInTheDocument();
		expect(screen.getByText('入力分析')).toBeInTheDocument();
		expect(screen.getByText('入力ヒント')).toBeInTheDocument();
	});
});
