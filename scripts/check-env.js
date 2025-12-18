// Environment variables check script
// Run this to verify your environment configuration

const fs = require('fs');
const path = require('path');

console.log('=== Environment Variables Check ===\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

console.log('1. .env file:', envExists ? '✅ Found' : '❌ Not found');

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('   Location:', envPath);
  console.log();
}

// Check required environment variables
const requiredVars = {
  'DATABASE_URL': {
    value: process.env.DATABASE_URL,
    description: 'PostgreSQL database connection string',
    required: true,
  },
  'NEXTAUTH_SECRET': {
    value: process.env.NEXTAUTH_SECRET,
    description: 'NextAuth secret key for session encryption',
    required: true,
  },
  'NEXTAUTH_URL': {
    value: process.env.NEXTAUTH_URL,
    description: 'Base URL for NextAuth callbacks',
    required: true,
    validate: (value) => {
      if (!value) return { valid: false, message: 'Not set' };

      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        return {
          valid: false,
          message: '⚠️  Using localhost - this will NOT work on Mac mini deployment!',
        };
      }

      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return {
          valid: false,
          message: '❌ Must start with http:// or https://',
        };
      }

      return { valid: true, message: '✅ Looks good' };
    },
  },
  'NODE_ENV': {
    value: process.env.NODE_ENV,
    description: 'Node environment (development/production)',
    required: false,
  },
};

console.log('2. Environment Variables:');
console.log();

let hasErrors = false;
let hasWarnings = false;

Object.entries(requiredVars).forEach(([name, config]) => {
  const value = config.value;
  const isSet = !!value;

  let status = '✅';
  let message = 'Set';

  if (config.required && !isSet) {
    status = '❌';
    message = 'NOT SET (Required!)';
    hasErrors = true;
  } else if (!isSet) {
    status = '⚠️ ';
    message = 'Not set (Optional)';
  } else if (config.validate) {
    const validation = config.validate(value);
    if (!validation.valid) {
      status = validation.message.includes('⚠️') ? '⚠️ ' : '❌';
      message = validation.message;
      if (validation.message.includes('❌')) {
        hasErrors = true;
      } else {
        hasWarnings = true;
      }
    } else {
      message = validation.message;
    }
  }

  console.log(`   ${status} ${name}`);
  console.log(`      ${config.description}`);
  console.log(`      Status: ${message}`);

  if (isSet && name !== 'NEXTAUTH_SECRET' && name !== 'DATABASE_URL') {
    // Show value for non-sensitive vars
    console.log(`      Value: ${value}`);
  } else if (isSet) {
    // Show partial value for sensitive vars
    const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 5);
    console.log(`      Value: ${maskedValue}`);
  }
  console.log();
});

// Check optional R2 variables
const r2Vars = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_PUBLIC_BASE_URL'];
const hasR2 = r2Vars.some(v => process.env[v]);

if (hasR2) {
  console.log('3. Cloudflare R2 Configuration:');
  console.log();

  r2Vars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    console.log(`   ${status} ${varName}:`, value ? 'Set' : 'Not set');
  });
  console.log();
}

// System information
console.log('4. System Information:');
console.log();
console.log('   Node version:', process.version);
console.log('   Platform:', process.platform);
console.log('   Architecture:', process.arch);
console.log('   Working directory:', process.cwd());
console.log();

// Network check
console.log('5. Network Check:');
console.log();

const dns = require('dns');
const url = require('url');

// Check Google Fonts accessibility
console.log('   Testing Google Fonts accessibility...');
dns.resolve('fonts.googleapis.com', (err) => {
  if (err) {
    console.log('   ❌ Cannot resolve fonts.googleapis.com');
    console.log('      This may cause font loading issues in PDF');
  } else {
    console.log('   ✅ Can resolve fonts.googleapis.com');
  }

  // Check NEXTAUTH_URL hostname
  if (process.env.NEXTAUTH_URL) {
    const parsed = url.parse(process.env.NEXTAUTH_URL);
    if (parsed.hostname && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      console.log(`   Testing ${parsed.hostname}...`);
      dns.resolve(parsed.hostname, (err) => {
        if (err) {
          console.log(`   ⚠️  Cannot resolve ${parsed.hostname}`);
          console.log('      Make sure the hostname is correct');
        } else {
          console.log(`   ✅ Can resolve ${parsed.hostname}`);
        }

        printSummary();
      });
    } else {
      printSummary();
    }
  } else {
    printSummary();
  }
});

function printSummary() {
  console.log();
  console.log('=== Summary ===');
  console.log();

  if (hasErrors) {
    console.log('❌ Configuration has ERRORS that must be fixed!');
    console.log();
    console.log('Critical issues:');
    console.log('1. Set all required environment variables in .env file');
    console.log('2. Fix NEXTAUTH_URL to use actual IP or domain (not localhost)');
    console.log();
  } else if (hasWarnings) {
    console.log('⚠️  Configuration has WARNINGS');
    console.log();
    console.log('Recommendations:');
    console.log('1. Update NEXTAUTH_URL to use actual IP or domain for Mac mini');
    console.log('2. Verify all settings before deployment');
    console.log();
  } else {
    console.log('✅ All checks passed!');
    console.log();
    console.log('Your environment configuration looks good.');
    console.log();
  }

  console.log('Next steps:');
  console.log('1. Run puppeteer test: pnpm test:puppeteer');
  console.log('2. Test PDF generation: pnpm test:pdf <resume-id>');
  console.log('3. Check detailed guide: cat scripts/PDF_TROUBLESHOOTING.md');
}