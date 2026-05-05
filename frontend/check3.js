import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Fake authentication in localStorage with correct email
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('google_id_token', 'fake-token');
    localStorage.setItem('user_email', 'kavinraja.250194@cse.ritchennai.edu.in');
  });

  await page.goto('http://localhost:5173/emails', { waitUntil: 'networkidle0' });
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("BODY TEXT:\n", text);
  
  const html = await page.evaluate(() => document.querySelector('.reminders-page')?.innerHTML || 'NO REMINDERS PAGE');
  console.log("REMINDERS HTML LENGTH:", html.length);
  
  await browser.close();
})();
