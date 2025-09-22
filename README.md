# Cloudflare R2 Ping Test Benchmark
Demo website: https://r2-ping.fernandodilland.com/

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/fernandodilland/cloudflare-r2-ping-test)

A comprehensive testing suite for Cloudflare R2 CDN caching behavior across multiple regions with different cache control headers.

This project is a static site built for Cloudflare Workers, with all source files located in the `src/` directory. The repository also includes `upload-test-files.py` to help you upload test files to your R2 buckets after configuring them (see setup instructions below).

## 🌐 Web Interface

This project now includes a beautiful web interface that allows you to test R2 bucket latency directly from your browser. The interface supports:

- **Real-time latency testing** across 6 global regions
- **Three test scenarios**: Public dev URLs, custom domains without cache, and custom domains with cache
- **AI-powered translations** using Chrome's built-in Translator API (Chrome 138+)
- **Responsive design** that works on desktop and mobile
- **Detailed analytics** with 10 ping tests per region and statistical analysis

### Live Testing

Visit the deployed website to test R2 latency from your location:
- **Main site**: [Deploy using Cloudflare Pages with the `src/` directory]

### Test Scenarios Available

1. **Public Development Links (r2.dev)** - Direct access to R2 buckets via development URLs
2. **Custom Domain without Cache** - Tests raw R2 performance through custom domains
3. **Custom Domain with Cache** - Tests performance with Cloudflare CDN caching enabled

### Supported Regions

- **Eastern Europe (EEUR)**: `eeur.fernandodilland.com`
- **Western North America (WNAM)**: `wnam.fernandodilland.com`
- **Eastern North America (ENAM)**: `enam.fernandodilland.com`
- **Oceania (OC)**: `oc.fernandodilland.com`
- **Western Europe (WEUR)**: `weur.fernandodilland.com`
- **Asia Pacific (APAC)**: `apac.fernandodilland.com`

## Run It Yourself

### 1. Create R2 Buckets in Different Regions

First, you need to create R2 buckets in Cloudflare for each region you want to test. Log into your Cloudflare dashboard and create buckets in the following regions:

**Supported Regions:**
- **Eastern Europe (EEUR)** - Example: `test-eeur`
- **Western North America (WNAM)** - Example: `test-wnam`
- **Eastern North America (ENAM)** - Example: `test-enam`
- **Oceania (OC)** - Example: `test-oc`
- **Western Europe (WEUR)** - Example: `test-weur`
- **Asia Pacific (APAC)** - Example: `test-apac`

**Steps to create buckets:**
1. Go to Cloudflare Dashboard → R2 Object Storage
2. Click "Create bucket"
3. Choose a name (e.g., `test-eeur` for Eastern Europe)
4. Select the appropriate region
5. Repeat for each region you want to test

### 1.1 Configure CORS Policy for R2 Buckets

To allow your web interface to access the JSON files via browser requests, you need to configure CORS (Cross-Origin Resource Sharing) for each R2 bucket:

**Steps to configure CORS:**
1. Go to Cloudflare Dashboard → R2 Object Storage
2. Select each bucket you created
3. Go to **Settings**
4. Under **CORS Policy**, click **Add**
5. Add the following example policy:

```
[
   {
      "AllowedOrigins": [
         "https://r2-ping.yourdomain.tld"
      ],
      "AllowedMethods": [
         "GET"
      ]
   }
]
```

> **Note:** Replace `r2-ping.yourdomain.tld` with the actual domain and subdomain where your web interface will be published.
> You can add multiple origins if needed, and adjust allowed methods according to your requirements.

### 2. Python Script for Uploading Files

#### Prerequisites

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Get Cloudflare R2 API Credentials:**
   - Go to Cloudflare Dashboard → R2 Object Storage
   - Click "Manage R2 API tokens"
   - Create a new R2 token with permissions:
     - `Object:Edit` for your buckets
     - Optionally scope to specific buckets
   - Note down:
     - Access Key ID
     - Secret Access Key
     - Your account-specific endpoint URL (format: `https://[account-id].r2.cloudflarestorage.com`)

#### Running the Upload Script

1. **Execute the script:**
   ```bash
   python upload-test-files.py
   ```

2. **Provide the required information when prompted:**
   - Cloudflare R2 Access Key ID
   - Cloudflare R2 Secret Access Key
   - R2 Endpoint URL
   - Bucket names for each region you created

3. **The script will:**
   - Upload `test-with-cache.json` with CDN caching headers: `public, s-maxage=31536000, max-age=0, must-revalidate`
   - Upload `test-without-cache.json` with no-cache headers: `no-store, no-cache, must-revalidate, max-age=0`
   - Provide a summary of successful and failed uploads

### 3. Cache Configuration for JSON Files

To properly test the caching behavior, you need to configure cache rules in Cloudflare for your JSON files.

#### Creating Cache Rules

1. **Navigate to Cache Rules:**
   - Go to Cloudflare Dashboard
   - Select your domain
   - Go to **Caching** → **Cache Rules**
   - Click **"Create rule"**

2. **Rule Configuration:**

   **Rule Name:** `JSON Files Cache Control` (or any name you prefer)

   **Expression:**
   ```
   (http.host in {"eeur.yourdomain.tld" "apac.yourdomain.tld" "enam.yourdomain.tld" "oc.yourdomain.tld" "weur.yourdomain.tld" "wnam.yourdomain.tld"} and http.request.uri.path.extension eq "json")
   ```
   
   > **Note:** Replace `yourdomain.tld` with your actual domain. Each subdomain should correspond to the domain/subdomain configured for each R2 bucket.

3. **Cache Settings:**

   **Edge TTL:**
   - Select **"Use cache-control header if present, bypass cache if not"**
   - ✅ This is the correct setting as it respects the cache-control headers set by our upload script

   **Browser TTL:**
   - Select **"Bypass cache"**
   - This ensures browsers never cache these test files, giving you consistent results

   **Cache Reserve Eligibility:**
   - You can leave this as default or configure based on your testing needs
   - For testing purposes, the default setting is usually fine

#### Why These Settings?

- **Edge TTL**: Respects the cache-control headers from our script, allowing us to test both cached and non-cached scenarios
- **Browser TTL**: Bypassed to ensure consistent testing without browser cache interference
- **Expression**: Targets only JSON files on your test subdomains, preventing interference with other site content

This configuration allows you to test how Cloudflare's CDN handles different cache-control headers across multiple regions while ensuring browsers don't interfere with your tests.

## 🚀 Deploying the Web Interface

### Using Cloudflare Pages

1. **Connect Repository**:
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project" → "Connect to Git"
   - Select this repository

2. **Configure Build Settings**:
   - **Build command**: Leave empty (static site)
   - **Build output directory**: `src`
   - **Root directory**: `/` (or leave empty)

3. **Environment Variables**: None required for basic functionality

4. **Custom Domain** (Optional):
   - After deployment, you can add a custom domain
   - Go to Pages → Your project → Custom domains

### Using Other Static Site Hosts

The `src/` directory contains a complete static website that can be deployed to:
- **Netlify**: Drag and drop the `src/` folder
- **Vercel**: Import the repository and set build directory to `src`
- **GitHub Pages**: Enable Pages and set source to `src/` directory
- **Any web server**: Upload contents of `src/` directory

### Local Development

To run locally for development:

```bash
# Navigate to the src directory
cd src

# Start a simple HTTP server (Python)
python -m http.server 8000

# Or using Node.js
npx serve .

# Or using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

### Translation Support

The web interface includes AI-powered translation support using Chrome's built-in Translator API:

- **Requirements**: Chrome 138+ (Stable)
- **Supported Languages**: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese
- **Offline Capability**: Translations work offline after initial model download
- **Privacy**: All translation happens locally in the browser

### Features

- **Real-time Latency Testing**: Measures actual response times from your browser
- **Statistical Analysis**: Runs 10 tests per region with min/max/average calculations
- **Visual Progress**: Real-time progress bars and result visualization
- **Mobile Responsive**: Works on all device sizes
- **Accessibility**: Full keyboard navigation and screen reader support
- **No External Dependencies**: Pure HTML/CSS/JavaScript with no CDN dependencies

---

## Checking Cache Functionality from Your Browser

After configuring the cache rules and uploading the JSON files, you can verify cache functionality by accessing the files from your browser:

Example URLs (replace `fernandodilland.com` with your domain):

- https://oc.yourdomain.tld/test-with-cache.json
- https://oc.yourdomain.tld/test-without-cache.json

Steps to check:

1. Open your browser and visit each URL for the uploaded JSON files.
2. Press `F12` to open DevTools and go to the "Network" tab.
3. Refresh the page at least twice (ideally more, to ensure consistent results).
4. Click on the request for the JSON file and review the "Response Headers".
5. Look for the `Cf-Cache-Status` header:
   - For `test-with-cache.json` it should show `HIT` (the file was served from Cloudflare cache).
   - For `test-without-cache.json` it should show `BYPASS` (the file was not cached by Cloudflare).

This will allow you to confirm that the cache configuration is working correctly for each case.
