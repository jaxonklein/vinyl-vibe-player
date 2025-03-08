const puppeteer = require('puppeteer');
const readline = require('readline');

// Helper function to wait for manual input
function waitForUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function testSpotifyIntegration() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║ Starting Vinyl Vibe Spotify Login Test ║');
  console.log('╚════════════════════════════════════════╝');
  
  // Launch the browser with a larger window for better visibility
  const browser = await puppeteer.launch({
    headless: false, // Show the browser UI for manual interaction
    defaultViewport: null, // Use the default viewport size
    args: ['--window-size=1280,900'] // Start with a reasonable window size
  });
  
  try {
    // Open a new page
    const page = await browser.newPage();
    
    // Set up dialog handler to catch any alerts
    let alertsDetected = [];
    page.on('dialog', async dialog => {
      console.log(`📢 Alert detected: "${dialog.message()}"`); 
      alertsDetected.push(dialog.message());
      await dialog.dismiss();
    });
    
    // ---- STEP 1: Navigate to the app ----
    console.log('\n📱 STEP 1: Opening the Vinyl Vibe application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.container');
    
    // Take a screenshot to show the initial state
    await page.screenshot({ path: 'step1-initial-page.png' });
    console.log('✅ Successfully loaded the Vinyl Vibe application');
    
    // ---- STEP 2: Check for the Spotify auth button ----
    console.log('\n🔍 STEP 2: Looking for Spotify authentication button...');
    const spotifyAuthBtn = await page.$('#spotify-auth-btn');
    
    if (!spotifyAuthBtn) {
      throw new Error('Spotify authentication button not found on the page!');
    }
    console.log('✅ Found Spotify authentication button');
    
    // ---- STEP 3: Begin Spotify authentication ----
    console.log('\n🔑 STEP 3: Starting Spotify authentication process...');
    console.log('\n⚠️  MANUAL INTERACTION REQUIRED ⚠️');
    console.log('You will now need to:');
    console.log('1. Log in with your Spotify credentials when prompted');
    console.log('2. Authorize the application to access your Spotify account');
    console.log('\nPress Enter when you\'re ready to start the authentication process...');
    
    await waitForUserInput('Press Enter to continue...');
    
    // Click the Spotify auth button
    await spotifyAuthBtn.click();
    console.log('✅ Clicked on Spotify authentication button');
    console.log('⏳ Waiting for Spotify login page...');
    
    // Wait for redirection to Spotify login page
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Navigated to Spotify authentication page');
    
    // ---- STEP 4: Manual login ----
    console.log('\n👤 STEP 4: Please enter your Spotify credentials manually in the browser...');
    await waitForUserInput('When you have successfully logged in and authorized the app, press Enter to continue...');
    
    // ---- STEP 5: Wait for redirect back to our app ----
    console.log('\n⏳ STEP 5: Waiting for redirect back to Vinyl Vibe app...');
    try {
      await page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle2' });
      console.log('✅ Successfully redirected back to Vinyl Vibe app');
    } catch (error) {
      console.log('⚠️ Navigation timeout - checking if we\'re already back at the app...');
    }
    
    // Take a screenshot after login to show the authenticated state
    await page.screenshot({ path: 'step5-after-login.png' });
    
    // ---- STEP 6: Verify authentication success ----
    console.log('\n🔍 STEP 6: Verifying successful Spotify authentication...');
    
    // Check if we're on the app page
    const currentUrl = page.url();
    if (!currentUrl.includes('localhost:3000')) {
      throw new Error(`Not redirected back to app, current URL: ${currentUrl}`);
    }
    
    // Check for authentication success indicators
    const spotifyToken = await page.evaluate(() => {
      return localStorage.getItem('spotify_access_token');
    });
    
    if (spotifyToken) {
      console.log('✅ Found Spotify access token in localStorage');
    } else {
      console.log('⚠️ No Spotify access token found in localStorage');
    }
    
    // Make sure we properly check for Spotify connection
    console.log('\n🔍 Checking if Spotify connection is properly established...');
    // Check if we need to reconnect to Spotify
    const needToReconnect = await page.evaluate(() => {
      // Check localStorage for tokens
      const accessToken = localStorage.getItem('spotify_access_token');
      const refreshToken = localStorage.getItem('spotify_refresh_token');
      return !accessToken || !refreshToken;
    });
    
    if (needToReconnect) {
      console.log('⚠️ Spotify connection not found or expired. Reconnecting...');
      const spotifyAuthBtn = await page.$('#spotify-auth-btn');
      if (spotifyAuthBtn) {
        await spotifyAuthBtn.click();
        console.log('✅ Clicked on Spotify authentication button again');
        console.log('⏳ Waiting for Spotify login page...');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        console.log('✅ Navigated to Spotify authentication page');
        
        console.log('\n👤 Please enter your Spotify credentials manually in the browser...');
        await waitForUserInput('When you have successfully logged in and authorized the app, press Enter to continue...');
        
        try {
          await page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle2' });
          console.log('✅ Successfully redirected back to Vinyl Vibe app');
        } catch (error) {
          console.log('⚠️ Navigation timeout - checking if we\'re already back at the app...');
        }
      }
    } else {
      console.log('✅ Spotify connection already established');
    }
    
    // ---- STEP 7: Test adding a song ----
    console.log('\n🎵 STEP 7: Testing the "Add Song" functionality...');
    
    // Check for welcome card or look for an add button
    const welcomeCard = await page.$('.welcome-card');
    
    if (welcomeCard) {
      console.log('Found welcome card, clicking the Get Started button...');
      const getStartedBtn = await page.$('.welcome-card button');
      if (getStartedBtn) {
        await getStartedBtn.click();
        console.log('✅ Clicked Get Started button');
      }
    } else {
      // Look for add seed button if welcome card is not present
      const addSeedBtn = await page.$('.add-seed-btn');
      if (addSeedBtn) {
        await addSeedBtn.click();
        console.log('✅ Clicked Add Seed button');
      } else {
        console.log('⚠️ Could not find a way to add a new song');
      }
    }
    
    // Wait for the add seed modal to appear
    try {
      await page.waitForSelector('.add-seed-modal', { visible: true, timeout: 5000 });
      console.log('✅ Add seed modal appeared');
      
      // Type a song request
      const seedInput = await page.$('#seed-input');
      if (seedInput) {
        await seedInput.type('Classic rock songs with great guitar solos');
        console.log('✅ Entered song request');
        
        // Click the Generate button
        const generateButton = await page.$('.modal-buttons button:nth-child(2)');
        if (generateButton) {
          await generateButton.click();
          console.log('✅ Clicked Generate button');
          console.log('⏳ Waiting for recommendations to load...');
          
          // Wait for recommendations to appear
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not complete Add Song flow: ${error.message}`);
    }
    
    // Take a screenshot of the final state
    await page.screenshot({ path: 'step7-after-adding-song.png' });
    
    // ---- STEP 8: Check for the Spotify Player Ready popup ----
    console.log('\n🔍 STEP 8: Verifying Spotify player ready popup was removed...');
    
    if (alertsDetected.some(msg => msg.includes('Spotify player ready'))) {
      console.log('❌ FAIL: The "Spotify player ready" popup was detected!');
    } else {
      console.log('✅ SUCCESS: No "Spotify player ready" popup was detected');
    }
    
    // ---- STEP 9: Test playing a song (if possible) ----
    console.log('\n🎧 STEP 9: Testing song playback (if available)...');
    
    // Look for a play button
    const playButton = await page.$('.play-button, .player-controls button');
    if (playButton) {
      await playButton.click();
      console.log('✅ Clicked play button');
      console.log('⏳ Waiting to see if song starts playing...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('⚠️ Could not find a play button');
    }
    
    // ---- Final Results ----
    console.log('\n╔═══════════════════════════════════╗');
    console.log('║ Test Completed Successfully! 🎉 ║');
    console.log('╚═══════════════════════════════════╝');
    console.log('Screenshots saved to:');
    console.log('- step1-initial-page.png');
    console.log('- step5-after-login.png');
    console.log('- step7-after-adding-song.png');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    // Ask user if they want to close the browser
    const shouldClose = await waitForUserInput('\nTest completed. Close the browser? (y/n): ');
    
    if (shouldClose.toLowerCase() === 'y') {
      await browser.close();
      console.log('Browser closed');
    } else {
      console.log('Browser left open for manual inspection. Please close it manually when finished.');
    }
  }
}

// Run the test
testSpotifyIntegration().catch(console.error);
