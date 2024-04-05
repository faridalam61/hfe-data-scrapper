const { v4: uuidv4 } = require('uuid');

const { default: puppeteer } = require("puppeteer");
const fs = require('fs');

const csvWriter = require('csv-writer').createObjectCsvWriter;

const config= {
    fileName: 'abcd.csv',
    url: 'https://tarrant.tx.networkofcare.org/pr/services/subcategory.aspx?cid=38920&k=Crisis+Intervention+Hotlines%2fHelplines&tax=RP-1500.1400'
};

(async () => {
    let browser;
    try {
        // Launch the browser
        browser = await puppeteer.launch({ headless: true, timeout:100000 });
        
        // Open a new page
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(100000);
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
            const currentPage = await page.url();
            // Collect data from the page
            const providerData = await agencyPage.evaluate(() => {
                let category = 'Social Service';
                let subCategory= 'Food Pantries';
                let orgName= '';
                let phone = '';
                let email= '';
                let address= '';
                let city= '';
                let state = '';
                let zip= '';
                let website = '';
                let keywords='Food Pantries';
                let description= '';
                let source = currentPage;

                try {
                    // Get organization name
                    const orgNameElement = document.querySelector('#agencyDetail > div.m10 > h2');
                    orgName = orgNameElement ? orgNameElement.innerText.trim() : '';
                } catch (error) {
                    console.error('Error while getting orgName:', error);
                }
                
                try {
                    // Get email
                    const emailElement = document.querySelector('#agencyDetail .sidebarList .email');
                    email = emailElement ? emailElement.innerText.trim() : '';
                } catch (error) {
                    console.error('Error while getting email:', error);
                }
                
                try {
                    // Get phone number
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
                
                try {
                    // Get address components
                    const mapMarkerIcon = document.querySelector('.fa-map-marker');
                    if (mapMarkerIcon) {
                        const parentSpan = mapMarkerIcon.parentElement;
                        const addressText = parentSpan.textContent.trim();
                        console.log('Raw Address Text:', addressText); // Output the raw address text
                        const addressLines = addressText.split('\n').map(line => line.trim());
                        console.log('Address Lines:', addressLines); // Output the address lines
                
                        address = addressLines[0] || '';
                        console.log('Address:', address); // Output the address
                
                        const cityStateZipLine = addressLines[1] || '';
                        const cityStateZipParts = cityStateZipLine.split(',').map(part => part.trim());
                        console.log('City, State, Zip Parts:', cityStateZipParts); // Output the parts of city, state, and zip
                
                        if (cityStateZipParts.length >= 3) {
                            city = cityStateZipParts[0];
                            state = cityStateZipParts[1].split(' ')[0]; // Extract the state part
                            zip = cityStateZipParts[1].split(' ')[1]; // Extract the zip part
                            console.log('City:', city); // Output the city
                            console.log('State:', state); // Output the state
                            console.log('Zip:', zip); // Output the zip
                        }
                    } else {
                        console.log('Map marker icon not found.');
                    }
                } catch (error) {
                    console.error('Error getting address:', error);
                }
                                
                
                try {
                    // Get website
                    const websiteElement = document.querySelector('#agencyDetail > div.m10 > h2 a');
                    website = websiteElement ? websiteElement.href : '';
                } catch (error) {
                    console.error('Error while getting website:', error);
                }
                
                try {
                    // Get description
                    const descriptionElement = document.querySelector('#agencyDetail .text-pre-line');
                    description = descriptionElement ? descriptionElement.innerText.trim() : '';
                } catch (error) {
                    console.error('Error while getting description:', error);
                }
                
                return { category, subCategory, orgName, phone, email, address, city, state, zip, website, keywords, description,source };
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

        console.log('Data saved to ',config.fileName);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the browser
        if (browser) {
            await browser.close();
        }
    }
})();
