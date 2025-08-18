// Configuration for R2 endpoints
const R2_ENDPOINTS = {
    eeur: {
        name: 'Eastern Europe (EEUR)',
        dev: 'https://pub-d05abc361f464702803902df56b2d0a6.r2.dev',
        custom: 'https://eeur.fernandodilland.com',
        location: 'Central/Eastern Europe'
    },
    wnam: {
        name: 'Western North America (WNAM)',
        dev: 'https://pub-cee8fd8985024ceb9d4f09a07cde21a8.r2.dev',
        custom: 'https://wnam.fernandodilland.com',
        location: 'Western United States & Canada'
    },
    enam: {
        name: 'Eastern North America (ENAM)',
        dev: 'https://pub-c38737ea6ca1461ea21edb6f5265492b.r2.dev',
        custom: 'https://enam.fernandodilland.com',
        location: 'Eastern United States & Canada'
    },
    oc: {
        name: 'Oceania (OC)',
        dev: 'https://pub-01d9a0eba8d94cf8aa0400d1f14d675a.r2.dev',
        custom: 'https://oc.fernandodilland.com',
        location: 'Australia & New Zealand'
    },
    weur: {
        name: 'Western Europe (WEUR)',
        dev: 'https://pub-a6d5fe4addee4b6f8b599cfff80a3746.r2.dev',
        custom: 'https://weur.fernandodilland.com',
        location: 'Western Europe'
    },
    apac: {
        name: 'Asia Pacific (APAC)',
        dev: 'https://pub-4fa2598846c045b894b81acc3223f302.r2.dev',
        custom: 'https://apac.fernandodilland.com',
        location: 'Asia Pacific Region'
    }
};

// Global state
let currentTests = [];
let isTestRunning = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Test button
    const startTestBtn = document.getElementById('start-test');
    startTestBtn.addEventListener('click', startPingTests);
}

// Ping test functions
async function startPingTests() {
    if (isTestRunning) return;
    
    isTestRunning = true;
    const testScenario = document.getElementById('test-scenario').value;
    const testRegion = document.getElementById('test-region').value;
    
    // Disable test button
    const startBtn = document.getElementById('start-test');
    startBtn.disabled = true;
    const buttonText = startBtn.querySelector('.button-text');
    if (buttonText) {
        buttonText.textContent = 'Testing...';
    }
    
    // Clear previous results
    clearResults();
    
    try {
        // Determine which regions to test
        const regionsToTest = testRegion === 'all' ? Object.keys(R2_ENDPOINTS) : [testRegion];
        
        // Run tests in parallel for all regions
        if (testRegion === 'all') {
            // For all regions, run them in parallel but with staggered start times
            const testPromises = regionsToTest.map((region, index) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        runRegionTest(region, testScenario).then(resolve);
                    }, index * 500); // Stagger by 500ms
                });
            });
            
            await Promise.all(testPromises);
        } else {
            // For single region, run normally
            await runRegionTest(testRegion, testScenario);
        }
    } catch (error) {
        console.error('Test error:', error);
        showError('An error occurred during testing. Please try again.');
    } finally {
        // Re-enable test button
        startBtn.disabled = false;
        if (buttonText) {
            buttonText.textContent = 'Start Test';
        }
        isTestRunning = false;
    }
}

async function runRegionTest(regionKey, scenario) {
    const region = R2_ENDPOINTS[regionKey];
    if (!region) return;
    
    // Get ping count from input
    const pingCountInput = document.getElementById('ping-count');
    const pingCount = Math.min(Math.max(parseInt(pingCountInput.value) || 10, 1), 1000);
    
    // Determine the base URL based on scenario
    let baseUrl;
    let testFileName;
    
    switch (scenario) {
        case 'dev':
            baseUrl = region.dev;
            testFileName = 'test-without-cache.json'; // Dev links don't have cache
            break;
        case 'custom-no-cache':
            baseUrl = region.custom;
            testFileName = 'test-without-cache.json';
            break;
        case 'custom-cache':
            baseUrl = region.custom;
            testFileName = 'test-with-cache.json';
            break;
        default:
            throw new Error('Invalid test scenario');
    }
    
    const testUrl = `${baseUrl}/${testFileName}`;
    
    // Create result card
    const resultCard = createResultCard(region.name, scenario, testUrl, pingCount);
    const resultsContainer = document.querySelector('.results-container');
    
    // Remove no-results message if it exists
    const noResults = resultsContainer.querySelector('.no-results');
    if (noResults) {
        noResults.remove();
    }
    
    resultsContainer.appendChild(resultCard);
    
    // Run ping tests with custom count
    const pingResults = [];
    const progressBar = resultCard.querySelector('.progress-fill');
    const currentLatencyEl = resultCard.querySelector('.latency-current');
    const averageLatencyEl = resultCard.querySelector('.latency-average');
    const testDetailsEl = resultCard.querySelector('.test-details');
    
    for (let i = 0; i < pingCount; i++) {
        try {
            const startTime = performance.now();
            
            // Make request to the same URL to test real caching behavior
            const response = await fetch(testUrl, {
                method: 'GET'
            });
            
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            
            if (response.ok) {
                pingResults.push(latency);
                
                // Update current latency
                currentLatencyEl.textContent = `${latency}ms`;
                
                // Calculate and update average
                const average = Math.round(pingResults.reduce((a, b) => a + b, 0) / pingResults.length);
                averageLatencyEl.textContent = `${average}ms`;
                
                // Store average for sorting
                resultCard.dataset.averageLatency = average;
                
                // Add ping result to details (without cache status)
                const pingEl = document.createElement('div');
                pingEl.className = 'test-ping ping-success';
                pingEl.innerHTML = `
                    <span class="ping-number">${i + 1}:</span>
                    <span class="ping-latency">${latency}ms</span>
                `;
                testDetailsEl.appendChild(pingEl);
                
                // Update ping color based on latency
                updatePingColor(pingEl, latency);
                
                // Update progress
                progressBar.style.width = `${((i + 1) / pingCount) * 100}%`;
                
                // Sort results after each ping
                sortResultCards();
                
                // Update region colors based on performance
                updateRegionColors();
                
            } else {
                // Handle error
                const pingEl = document.createElement('div');
                pingEl.className = 'test-ping ping-error';
                pingEl.textContent = `${i + 1}: Error`;
                testDetailsEl.appendChild(pingEl);
            }
            
        } catch (error) {
            console.error(`Ping ${i + 1} failed:`, error);
            
            const pingEl = document.createElement('div');
            pingEl.className = 'test-ping ping-error';
            pingEl.textContent = `${i + 1}: Failed`;
            testDetailsEl.appendChild(pingEl);
        }
        
        // Wait 1 second before next test (except for the last one)
        if (i < pingCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Final results
    if (pingResults.length > 0) {
        const finalAverage = Math.round(pingResults.reduce((a, b) => a + b, 0) / pingResults.length);
        const minLatency = Math.min(...pingResults);
        const maxLatency = Math.max(...pingResults);
        
        // Update result card with final stats
        const resultSummary = resultCard.querySelector('.result-summary');
        const statsEl = document.createElement('div');
        statsEl.className = 'latency-stats';
        statsEl.innerHTML = `
            <small>Min: ${minLatency}ms | Max: ${maxLatency}ms | Success: ${pingResults.length}/${pingCount}</small>
        `;
        resultSummary.appendChild(statsEl);
        
        // Final sort
        sortResultCards();
        
        // Final region color update
        updateRegionColors();
    }
}

function createResultCard(regionName, scenario, testUrl, pingCount) {
    const scenarioNames = {
        'dev': 'Public Development (r2.dev)',
        'custom-no-cache': 'Custom Domain - No Cache',
        'custom-cache': 'Custom Domain - With Cache'
    };
    
    const card = document.createElement('div');
    card.className = 'result-card';
    card.id = `result-${regionName.replace(/[^a-zA-Z0-9]/g, '-')}-${scenario}`;
    card.dataset.averageLatency = '999999'; // Initialize with high value for sorting
    card.innerHTML = `
        <div class="result-header">
            <div class="result-title">${regionName}</div>
            <div class="result-summary">
                <div class="latency-display">
                    <span>Last: </span>
                    <span class="latency-current">-</span>
                </div>
                <div class="latency-display">
                    <span>Avg: </span>
                    <span class="latency-average">-</span>
                </div>
            </div>
        </div>
        <div class="test-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <small>Scenario: ${scenarioNames[scenario]} (${pingCount} pings)</small>
        </div>
        <div class="test-details"></div>
    `;
    
    return card;
}

function updatePingColor(pingElement, latency) {
    // Define thresholds for ping colors
    const excellent = 50;  // <= 50ms = green
    const good = 100;      // <= 100ms = yellow-green
    const fair = 200;      // <= 200ms = yellow
    const poor = 400;      // <= 400ms = orange
    // > 400ms = red
    
    let colorClass = '';
    if (latency <= excellent) {
        colorClass = 'ping-excellent';
    } else if (latency <= good) {
        colorClass = 'ping-good';
    } else if (latency <= fair) {
        colorClass = 'ping-fair';
    } else if (latency <= poor) {
        colorClass = 'ping-poor';
    } else {
        colorClass = 'ping-slow';
    }
    
    pingElement.classList.add(colorClass);
}

function updateRegionColors() {
    const resultCards = document.querySelectorAll('.result-card');
    if (resultCards.length < 2) return;
    
    // Get all averages and sort them
    const averages = Array.from(resultCards)
        .map(card => parseInt(card.dataset.averageLatency) || 999999)
        .filter(avg => avg !== 999999)
        .sort((a, b) => a - b);
    
    if (averages.length === 0) return;
    
    const fastest = averages[0];
    const slowest = averages[averages.length - 1];
    const range = slowest - fastest;
    
    resultCards.forEach(card => {
        const avgLatency = parseInt(card.dataset.averageLatency);
        if (avgLatency === 999999) return;
        
        // Calculate position in range (0 = fastest, 1 = slowest)
        const position = range === 0 ? 0 : (avgLatency - fastest) / range;
        
        // Remove existing color classes
        card.classList.remove('region-fastest', 'region-fast', 'region-medium', 'region-slow', 'region-slowest');
        
        // Assign color class based on position
        if (position === 0) {
            card.classList.add('region-fastest');
        } else if (position <= 0.25) {
            card.classList.add('region-fast');
        } else if (position <= 0.75) {
            card.classList.add('region-medium');
        } else if (position < 1) {
            card.classList.add('region-slow');
        } else {
            card.classList.add('region-slowest');
        }
    });
}

function sortResultCards() {
    const resultsContainer = document.querySelector('.results-container');
    if (!resultsContainer) return;
    
    const cards = Array.from(resultsContainer.querySelectorAll('.result-card'));
    if (cards.length < 2) return;
    
    // Sort by average latency (ascending - lowest first)
    cards.sort((a, b) => {
        const avgA = parseInt(a.dataset.averageLatency) || 999999;
        const avgB = parseInt(b.dataset.averageLatency) || 999999;
        return avgA - avgB;
    });
    
    // Re-append cards in sorted order
    cards.forEach(card => {
        resultsContainer.appendChild(card);
    });
}

function clearResults() {
    const resultsContainer = document.querySelector('.results-container');
    if (resultsContainer) {
        // Remove all existing result cards
        const existingCards = resultsContainer.querySelectorAll('.result-card');
        existingCards.forEach(card => card.remove());
        
        // Remove any error messages
        const errorMessages = resultsContainer.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());
        
        // Show the no-results message
        resultsContainer.innerHTML = '<div class="no-results">No tests have been run yet. Click "Start Test" to begin testing latency across different regions.</div>';
    }
}

function showError(message) {
    const resultsContainer = document.querySelector('.results-container');
    resultsContainer.innerHTML = `
        <div class="error-message" style="
            color: var(--danger-color);
            text-align: center;
            padding: 2rem;
            background: rgba(231, 76, 60, 0.1);
            border-radius: var(--border-radius-small);
            border: 1px solid var(--danger-color);
        ">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

// Export for debugging
window.R2PingTest = {
    startPingTests,
    R2_ENDPOINTS
};
