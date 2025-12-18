// Test PDF generation with actual resume data
// Usage: node scripts/test-pdf-generation.js <resume-id>

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPDFGeneration(resumeId) {
  if (!resumeId) {
    console.error('❌ Please provide a resume ID');
    console.log('Usage: node scripts/test-pdf-generation.js <resume-id>');
    process.exit(1);
  }

  console.log(`=== Testing PDF Generation for Resume ID: ${resumeId} ===\n`);

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3100';
  console.log('Base URL:', baseUrl);
  console.log();

  let browser;
  try {
    // Launch browser
    console.log('1. Launching Chromium...');
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
    browser = await puppeteer.launch(config);
    console.log('   ✅ Browser launched');
    console.log();

    // Create page
    console.log('2. Creating new page...');
    const page = await browser.newPage();

    // Track console messages and errors
    const pageErrors = [];
    const pageConsole = [];

    page.on('console', (msg) => {
      const text = msg.text();
      pageConsole.push(`[${msg.type()}] ${text}`);
      console.log(`   [Page ${msg.type()}]`, text);
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
      console.error('   [Page Error]', error.message);
    });

    page.on('requestfailed', (request) => {
      console.log('   [Failed Request]', request.url(), request.failure().errorText);
    });

    // Set viewport
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });
    console.log('   ✅ Page created with A4 viewport');
    console.log();

    // Build URL
    const printUrl = new URL(`/resume/print/${resumeId}`, baseUrl);
    console.log('3. Navigating to:', printUrl.toString());

    await page.goto(printUrl.toString(), {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000,
    });
    console.log('   ✅ Navigation complete');
    console.log();

    // Wait for fonts
    console.log('4. Waiting for fonts to load...');
    try {
      await page.waitForFunction(
        () => {
          if (document.fonts && document.fonts.ready) {
            return document.fonts.ready.then(() => true);
          }
          return true;
        },
        { timeout: 8000 }
      );
      console.log('   ✅ Fonts loaded');
    } catch (error) {
      console.log('   ⚠️  Font loading timeout, proceeding anyway');
    }
    console.log();

    // Wait for ready signal
    console.log('5. Waiting for page ready signal...');
    try {
      await page.waitForFunction(
        () => {
          return document.body.getAttribute('data-ready') === 'true';
        },
        { timeout: 5000 }
      );
      console.log('   ✅ Page ready signal received');
    } catch (error) {
      console.log('   ⚠️  Ready signal timeout');
    }
    console.log();

    // Extra delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check page content
    console.log('6. Checking page content...');
    const pageTitle = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log('   Page title:', pageTitle);
    console.log('   Body text length:', bodyText.length, 'characters');
    console.log('   First 200 characters:', bodyText.substring(0, 200).replace(/\n/g, ' '));
    console.log();

    if (pageTitle.includes('Not Found') || bodyText.includes('Resume not found')) {
      console.error('   ❌ Resume not found on page!');
      console.log();
      console.log('Please check:');
      console.log('1. The resume ID exists in your database');
      console.log('2. The database connection on Mac mini is working');
      console.log('3. Check server logs for any database errors');
      process.exit(1);
    }

    // Check for specific content elements
    const hasContent = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const name = document.querySelector('.name');
      const sections = document.querySelectorAll('.section');

      return {
        hasHeader: !!header,
        hasName: !!name,
        nameText: name ? name.textContent : '',
        sectionCount: sections.length,
        bodyOpacity: window.getComputedStyle(document.body).opacity,
      };
    });

    console.log('7. Page structure check:');
    console.log('   Has header:', hasContent.hasHeader ? '✅' : '❌');
    console.log('   Has name:', hasContent.hasName ? '✅' : '❌');
    console.log('   Name text:', hasContent.nameText);
    console.log('   Section count:', hasContent.sectionCount);
    console.log('   Body opacity:', hasContent.bodyOpacity);
    console.log();

    if (!hasContent.hasHeader || !hasContent.hasName) {
      console.error('   ⚠️  Page structure seems incomplete!');
    }

    // Take a screenshot for debugging
    console.log('8. Taking screenshot for debugging...');
    const screenshotPath = path.join(process.cwd(), `test-resume-${resumeId}-screenshot.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('   ✅ Screenshot saved to:', screenshotPath);
    console.log();

    // Generate PDF
    console.log('9. Generating PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      omitBackground: false,
    });
    console.log('   ✅ PDF generated');
    console.log('   PDF size:', pdf.length, 'bytes');
    console.log();

    // Save PDF
    const pdfPath = path.join(process.cwd(), `test-resume-${resumeId}.pdf`);
    fs.writeFileSync(pdfPath, pdf);
    console.log('   ✅ PDF saved to:', pdfPath);
    console.log();

    if (pdf.length < 5000) {
      console.log('   ⚠️  WARNING: PDF is very small (< 5KB), it might be empty!');
      console.log('   Check the PDF file and screenshot to verify content.');
    }

    // Summary
    console.log('=== Summary ===');
    console.log('✅ PDF generation completed');
    console.log('\nFiles generated:');
    console.log('  - PDF:', pdfPath);
    console.log('  - Screenshot:', screenshotPath);

    if (pageErrors.length > 0) {
      console.log('\n⚠️  Page errors detected:');
      pageErrors.forEach(error => console.log('  -', error));
    }

    console.log('\nIf PDF is empty on Mac mini, check:');
    console.log('1. Database connection (DATABASE_URL in .env)');
    console.log('2. NEXTAUTH_URL should point to Mac mini IP/domain');
    console.log('3. Google Fonts accessibility (internet connection)');
    console.log('4. Compare screenshot between working machine and Mac mini');

    await page.close();

  } catch (error) {
    console.error('\n❌ Error during PDF generation:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Get resume ID from command line
const resumeId = process.argv[2];
testPDFGeneration(resumeId);