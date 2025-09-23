/*
 * 파일 위치: server.js
 */
const express = require('express');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const app = express();
const PORT = 5000;

app.use(express.json());

// CORS 해결을 위한 미들웨어
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/api/jobkorea/crawl', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL 파라미터가 누락되었습니다.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('브라우저로 페이지 이동:', url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        const frames = page.frames();
        const jobkoreaFrame = frames.find(frame => frame.url().includes('Recruit/GI_Read_Comt_Ifrm'));

        if (!jobkoreaFrame) {
            return res.status(404).json({ error: '채용공고 iframe을 찾을 수 없습니다.' });
        }
        
        await jobkoreaFrame.waitForSelector('.artTplDetail');
        console.log("iframe 내부 콘텐츠 로딩 확인!");

        // 텍스트와 이미지 URL을 모두 추출
        const { text, imgUrls } = await jobkoreaFrame.evaluate(() => {
            const detailSections = document.querySelectorAll('.artTplDetail');
            let fullText = '';
            
            detailSections.forEach(section => {
                const unnecessarySelectors = ['script', 'style', 'a', '.hide', '.hide-txt'];
                unnecessarySelectors.forEach(selector => {
                    section.querySelectorAll(selector).forEach(el => el.remove());
                });
                fullText += section.textContent;
            });
            // 채용정보가 주로 담긴 이미지 URL 추출
            const imgUrls = Array.from(document.querySelectorAll('.tbRead img')).map(img => img.src);
            
            return {
                text: fullText.replace(/\s+/g, ' ').trim(),
                imgUrls: imgUrls
            };
        });

        let ocrText = '';
        if (imgUrls.length > 0) {
            console.log("이미지에서 텍스트 추출 시작...");
            // 각 이미지 URL에 대해 OCR을 실행
            const results = await Promise.all(imgUrls.map(imgUrl => 
                Tesseract.recognize(imgUrl, 'kor+eng', { logger: m => console.log(m.status) })
            ));
            ocrText = results.map(r => r.data.text).join(' ');
        }
        
        // HTML에서 추출한 텍스트와 이미지에서 추출한 텍스트를 병합
        const finalResult = text + ' ' + ocrText;

        if (finalResult.length < 50) {
            return res.status(404).json({ error: '크롤링된 텍스트가 너무 짧거나, 채용공고 내용을 찾을 수 없습니다.' });
        }

        console.log("크롤링된 최종 텍스트 길이:", finalResult.length);
        // 최종 텍스트만 프론트엔드로 전달
        res.json({ text: finalResult });

    } catch (error) {
        console.error('크롤링 중 오류 발생:', error);
        res.status(500).json({ error: '크롤링에 실패했습니다. URL을 확인하거나 다시 시도해 주세요.' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});