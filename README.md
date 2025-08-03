# Stironmetrs

This is a web scraping project where, using Node.js, I scraped 5 major web stores that sell alcohol to scrape their data - price, volume and degrees. Then, scraped data is used to calculate its efficiency index - volume*degrees/price. Most of the sites are scraped with a simple fetch request, but some require a puppeteer(a browser imitation) to scrape the information and circumvent the lazy loading restrictions. In the end, all of the data is gathered in a single .csv and all of the data is sorted from the biggest index to the smallest. 
Typically, the script scrapes data for approximately 10k positions.
The original project idea was born in the university dormitories to settle an argument with a neighbour.

![results in a csv file after running a programm](https://github.com/Sefanovskis-Artjoms/Stironmetrs/blob/main/readem-imgs/1img.png)
