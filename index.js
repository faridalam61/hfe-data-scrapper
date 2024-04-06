const { v4: uuidv4 } = require('uuid');
const puppeteer = require("puppeteer");
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const config = {
    fileName: '12.csv',
    url: 'https://tarrant.tx.networkofcare.org/pr/services/subcategory.aspx?cid=38924&k=Water+Service+Payment+Assistance&tax=BV-8900.9300-950'
};

(async () => {
    let browser;
    try {
        // Launch the browser
        browser = await puppeteer.launch({ headless: true });
        
        // Open a new page
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(100000);

        // Navigate the page to the initial URL
        await page.goto(config.url);

        // Set screen size
        await page.setViewport({ width: 1280, height: 1024 });

        // Wait for loader to disappear
        await page.waitForSelector('.page-loader', { hidden: true });

        // Get all the anchor elements within the ul with id 'listAgencies'
        const agencyLinks = await page.evaluate(() => {
            const anchors = document.querySelectorAll('#listAgencies h4 > a');
            const links = Array.from(anchors).map(anchor => anchor.href);
            return links;
        });

        console.log("Found agency links:", agencyLinks);

        const data = [];

        // Iterate through each agency link
        for (const agencyLink of agencyLinks) {
            // Open a new page for each agency link
            const agencyPage = await browser.newPage();
            await agencyPage.goto(agencyLink);
            
            // Wait for loader to disappear
            await agencyPage.waitForSelector('.page-loader', { hidden: true });
            
            // Capture the source URL
            const currentPage = await agencyPage.url();

            // Collect data from the page
            const providerData = await agencyPage.evaluate(() => {
                let category = 'Financial Services';
                let subCategory = 'Water Service Payment Assistance';
                let orgName = '';
                let phone = '';
                let email = '';
                let address = '';
                let city = '';
                let state = '';
                let zip = '';
                let website = '';
                let keywords = 'Water Service Payment Assistance';
                let description = '';
                let source = currentPage;

                // Organization Name
                try {
                    const orgNameElement = document.querySelector('#agencyDetail > div.m10 > h2');
                    orgName = orgNameElement ? orgNameElement.innerText.trim() : '';
                } catch (error) {
                    console.error('Error while getting orgName:', error);
                }
                
                // Email
                try {
                    const emailElement = document.querySelector('#agencyDetail .sidebarList .email');
                    email = emailElement ? emailElement.innerText.trim() : '';
                } catch (error) {
                    console.error('Error while getting email:', error);
                }
                
                // Phone Number
                try {
                    const phoneIcon = document.querySelector('.fa-phone');
                    if (phoneIcon) {
                        const phoneNode = phoneIcon.nextSibling;
                        if (phoneNode && phoneNode.nodeType === Node.TEXT_NODE) {
                            phone = phoneNode.textContent.trim();
                        } else {
                            console.log('Phone number not found.');
                        }
                    } else {
                        console.log('Phone icon not found.');
                    }
                } catch (error) {
                    console.error('Error while getting phone number:', error);
                }
                
                // Address
                try {
                    const mapMarkerIcon = document.querySelector('.fa-map-marker');
                    if (mapMarkerIcon) {
                        const parentSpan = mapMarkerIcon.parentElement;
                        const addressText = parentSpan.textContent.trim();
                        const addressLines = addressText.split('\n').map(line => line.trim());
                        address = addressLines[0] || '';
                
                        const cityStateZipLine = addressLines.find(line => line.includes(',')) || '';
                
                        // Use regular expressions to extract city, state, and zip code
                        const cityStateZipMatch = cityStateZipLine.match(/([\w\s]+),\s(\w+)\s(\d+)/);
                        if (cityStateZipMatch) {
                            city = cityStateZipMatch[1];
                            state = cityStateZipMatch[2];
                            zip = cityStateZipMatch[3];
                        }
                    }
                } catch (error) {
                    console.error('Error getting address:', error);
                }
                                
                
                
                // Website
                try {
                    const websiteElement = document.querySelector('#agencyDetail > div.m10 > h2 a');
                    website = websiteElement ? websiteElement.href : '';
                } catch (error) {
                    console.error('Error while getting website:', error);
                }
                
                // Description
                try {
                    const descriptionElement = document.querySelector('#agencyDetail .text-pre-line');
                    description = descriptionElement ? descriptionElement.innerText.trim() : '';
                } catch (error) {
                    console.error('Error while getting description:', error);
                }
                
                return { category, subCategory, orgName, phone, email, address, city, state, zip, website, keywords, description, source };
            });

            // Add unique ID
            providerData.id = uuidv4();

            // Push collected data into an array
            data.push(providerData);

            // Close the agency page after extracting data
            await agencyPage.close();
        }

        // Save collected data into a CSV file
        const csvWriterInstance = csvWriter({
            path: config.fileName,
            header: [
                { id: 'id', title: 'ID' },
                { id: 'category', title: 'Category' },
                { id: 'subCategory', title: 'Subcategory' },
                { id: 'orgName', title: 'Organization Name' },
                { id: 'phone', title: 'Phone' },
                { id: 'email', title: 'Email' },
                { id: 'address', title: 'Address' },
                { id: 'city', title: 'City' },
                { id: 'state', title: 'State' },
                { id: 'zip', title: 'Zip' },
                { id: 'website', title: 'Website' },
                { id: 'keywords', title: 'Keywords' },
                { id: 'description', title: 'Description' },
                { id: 'source', title: 'Source' }
            ]
        });

        await csvWriterInstance.writeRecords(data);

        console.log('Data saved to ', config.fileName);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the browser
        if (browser) {
            await browser.close();
        }
    }
})();
