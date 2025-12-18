// Puppeteer diagnosis script
// Run this on your Mac mini to test if puppeteer is working correctly

const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('=== Puppeteer Diagnosis Script ===\n');

  console.log('1. Checking Node version:');
  console.log('   Node:', process.version);
  console.log('   Platform:', process.platform);
  console.log('   Arch:', process.arch);
  console.log();

  console.log('2. Checking environment variables:');
  console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '⚠️  NOT SET');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log();

  let browser;
  try {
    console.log('3. Testing Chromium launch...');
    const config = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    };

    console.log('   Launch config:', JSON.stringify(config, null, 2));
    browser = await puppeteer.launch(config);
    console.log('   ✅ Chromium launched successfully');
    console.log('   Browser version:', await browser.version());
    console.log();

    console.log('4. Testing page navigation and rendering...');
    const page = await browser.newPage();

    // Capture console and errors
    const pageErrors = [];
    const pageConsole = [];
    page.on('console', (msg) => {
      pageConsole.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Test with a simple HTML page first
    console.log('   Testing simple HTML...');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #0066cc; }
          </style>
        </head>
        <body>
          <h1>Test PDF Generation</h1>
          <p>This is a test page to verify PDF generation works.</p>
          <script>
            console.log('Page loaded successfully');
            document.body.setAttribute('data-ready', 'true');
          </script>
        </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return document.body.getAttribute('data-ready') === 'true';
    }, { timeout: 5000 });

    console.log('   ✅ Page rendered successfully');
    console.log('   Page console logs:', pageConsole.length);
    if (pageErrors.length > 0) {
      console.log('   ⚠️  Page errors:', pageErrors);
    }
    console.log();

    console.log('5. Testing PDF generation...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    console.log('   ✅ PDF generated');
    console.log('   PDF size:', pdf.length, 'bytes');

    if (pdf.length < 1000) {
      console.log('   ⚠️  PDF seems too small, might be empty!');
    }
    console.log();

    // Test with Google Fonts
    console.log('6. Testing Google Fonts loading...');
    const page2 = await browser.newPage();
    await page2.goto('https://fonts.googleapis.com', { timeout: 10000 });
    console.log('   ✅ Can access Google Fonts');
    await page2.close();
    console.log();

    // Test accessing localhost
    console.log('7. Testing localhost access...');
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3100';
    console.log('   Base URL:', baseUrl);

    try {
      const page3 = await browser.newPage();
      await page3.goto(baseUrl, { timeout: 10000 });
      const title = await page3.title();
      console.log('   ✅ Can access application');
      console.log('   Page title:', title);
      await page3.close();
    } catch (error) {
      console.log('   ❌ Cannot access application:', error.message);
      console.log('   Make sure your application is running on Mac mini!');
    }
    console.log();

    await page.close();

    console.log('=== Summary ===');
    console.log('✅ All basic tests passed');
    console.log('\nNext steps:');
    console.log('1. Make sure NEXTAUTH_URL is set correctly on Mac mini');
    console.log('2. Test with an actual resume ID: node scripts/test-pdf-generation.js <resume-id>');

  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);

    console.log('\n=== Troubleshooting ===');
    console.log('If Chromium failed to launch:');
    console.log('1. Install Chrome manually: npx puppeteer browsers install chrome');
    console.log('2. Check system dependencies (macOS usually has all deps)');
    console.log('3. Try running with --no-sandbox flag');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testPuppeteer().catch(console.error);