import axios from 'axios';
import * as cheerio from 'cheerio';

const main = async () => {
    console.log('Fetching Top Picks...');
    const topPicksRes = await axios.get('https://news.yahoo.co.jp/topics/top-picks');
    const $top = cheerio.load(topPicksRes.data);

    const firstPickup = $top('a[href*="/pickup/"]').first().attr('href');

    if (!firstPickup) {
        console.error('No pickup link found');
        return;
    }

    console.log(`Analyzing: ${firstPickup}`);
    const res = await axios.get(firstPickup);
    const $ = cheerio.load(res.data);

    const summary = $('.highLightSearchTarget').text().trim();
    if (summary) {
        console.log('Summary found:');
        console.log(summary);
    } else {
        console.log('No summary found with .highLightSearchTarget');
        // fallback check
        console.log('Body text sample: ' + $('body').text().substring(0, 100));
    }
};

main().catch(console.error);
