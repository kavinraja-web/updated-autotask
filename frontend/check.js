import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
  );

  await page.goto('http://localhost:5173/reminders', { waitUntil: 'networkidle0' });
  const content = await page.content();
  console.log("BODY LENGTH:", content.length);
  console.log("HTML:", content.substring(0, 1500));
  await browser.close();
})();
