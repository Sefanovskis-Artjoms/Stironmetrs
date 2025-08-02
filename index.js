const {
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  statSync,
} = require("fs");
const { join } = require("path");
const { parse, unparse } = require("papaparse");
const { load } = require("cheerio");
const { launch } = require("puppeteer");
const { get } = require("request-promise");

const sleep = (maxMs, minMs = maxMs) =>
  new Promise((r) => setTimeout(r, Math.random() * (maxMs - minMs) + minMs));

async function fetchAndStoreRimiData() {
  let hasData = true;
  let pageCounter = 1;
  while (hasData) {
    await sleep(1000, 500);
    const html = await get(
      `https://www.rimi.lv/e-veikals/lv/produkti/alkoholiskie-dzerieni/c/SH-1?currentPage=${pageCounter}&pageSize=80&query=%3Arelevance%3AallCategories%3ASH-1%3AassortmentStatus%3AinAssortment`
    );
    const $ = load(html);
    hasData =
      $(
        "#main > section > div.cart-layout__body > div > div.cart-layout__main > div.distill > div > div.distill__grid > ul > li"
      ).length !== 0;
    if (!hasData) continue;
    writeFileSync(`./htmlFiles/rimiPages/page${pageCounter}.html`, html);
    pageCounter++;
  }
}

async function fetchAndStoreSAWData() {
  const categories = [
    "sidrs",
    "kokteili",
    "alus-alk",
    "sarkanvins",
    "dzirkstosais-vins",
    "bag-in-box-sartvins",
    "baltvins",
    "vermuts",
    "sartvins",
    "bag-in-box-sarkanvins",
    "stiprinats-vins",
    "sampanietis",
    "bag-in-box-baltvins",
    "karstvini-karstie-dzerieni",
    "rums",
    "dzins",
    "uzlejums",
    "absints",
    "viskijs",
    "degvins",
    "armanjaks",
    "mini",
    "konjaks",
    "likieris",
    "kalvadoss",
    "brendijs",
    "tekila",
    "grappa",
  ];

  let totalPageCounter = 1;
  for (const category of categories) {
    let categoryPageCounter = 1;
    let hasData = true;
    while (hasData) {
      // wait between 0.5 and 1.5 seconds before doing the request to avoid being banned
      await sleep(1000, 500);

      const pageLink = `https://www.spiritsandwine.lv/lv/${category}?page=${categoryPageCounter}`;

      const html = await get(pageLink);

      const $ = load(html);
      hasData = $(".product-container").length !== 0;

      if (!hasData) continue;
      writeFileSync(
        `./htmlFiles/spiritsAndWinePages/${totalPageCounter}-page_${category}-${categoryPageCounter}.html`,
        html
      );
      totalPageCounter++;
      categoryPageCounter++;
    }
  }
}

async function fetchAndStoreBarboraData() {
  const categories = [
    "alus-sidri-un-kokteili",
    "vini",
    "stiprie-alkoholiskie-dzerieni",
  ];

  let totalPageCounter = 1;
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  for (const category of categories) {
    let categoryPageCounter = 1;
    let hasData = true;
    while (hasData) {
      // wait between 0.5 and 1.5 seconds before doing the request to avoid being banned
      await page.goto(
        `https://www.barbora.lv/dzerieni/${category}?page=${categoryPageCounter}`
      );
      await sleep(4000);
      const html = await page.content();

      const $ = load(html);

      hasData = $(
        "#category-page-results-placeholder > div.tw-w-full > ul > li"
      );

      if (hasData.length === 0) {
        hasData = false;
        continue;
      }
      writeFileSync(
        `./htmlFiles/barboraPages/${totalPageCounter}-page_${category}-${categoryPageCounter}.html`,
        html
      );
      totalPageCounter++;
      categoryPageCounter++;
    }
  }
  await browser.close();
}

async function fetchAndStoreVynotekaData() {
  // Alkoholu kategorijas
  const categories = ["alus", "sidrs", "vins", "stiprie-alkoholiskie-dzerieni"];

  // Izmantoju virtuālo pārlūku, lai iegūtu datus
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://vynoteka.lv/`);

  // Apstrādāju pirmo popup logu kas prasa apstiprināt vecumu
  await page.waitForSelector(
    "div.modal__content div.age-confirmation__actions button"
  );
  await page.click("div.modal__content div.age-confirmation__actions button");
  await page.waitForSelector(
    "div.modal__content div.age-confirmation__actions button",
    { hidden: true }
  );

  // Apstrādāju Otro popup logu, kas
  await page.waitForSelector("div.modal__container");
  await page.click(
    "#app__header > div.app-header-middle > div > div > div:nth-child(2) > div > a"
  );
  await page.waitForSelector("div.modal__container", { hidden: true });

  // Izgūstu datus
  let totalPageCounter = 1;
  for (const category of categories) {
    let categoryPageCounter = 1;
    let hasData = true;
    while (hasData) {
      // Vynotēkas mājaslapai ir īpatnība, ja tiek sasniegta tukša lapa(pārsniegts esošo lapu skaits) tad lietotājs tiek pāradresēts atpakaļ uz pirmo lapu, tāpēc šeit kods skatās, vai esmu pāradresēts, lai konstatētu, ka ir noskrāpēti visi dati no vienas kategorijas
      const gotoUrl = `https://vynoteka.lv/${category}?page=${categoryPageCounter}`;
      await page.goto(gotoUrl);
      await page.waitForSelector(".product-card");
      // Pārbaudu vai notika pāradresācija
      if (page.url() !== gotoUrl) {
        hasData = false;
        continue;
      }

      // Patinu lapu uz pašu leju lai lazy loading nostrādātu
      await page.evaluate(async () => {
        window.scrollTo(0, document.body.scrollHeight - 1200);
        console.log(document.body.scrollHeight);
        console.log(document.body.scrollHeight - 800);
        await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for 2 seconds to let lazy loading finish
      });
      // Pagaidam no 0.5 līdz 1.5 sekundēm, lai neveiktu pārāk daudz pieprasījumus un mūs nenobanotu (Šoreiz gaidīšanai jānotiek pēc lapas tīšanas)
      await sleep(1000, 500);

      const html = await page.content();
      const $ = load(html);
      writeFileSync(
        `./htmlFiles/vynotekaPages/${totalPageCounter}-page_${category}-${categoryPageCounter}.html`,
        html
      );
      totalPageCounter++;
      categoryPageCounter++;
    }
  }
  await browser.close();
}

async function fetchAndStoreAlkOutletData() {
  const categories = [
    "stiprie",
    "vins-un-vina-dzerieni",
    "alus-sidri-kokteili",
  ];
  let totalPageCounter = 1;
  for (const category of categories) {
    let categoryPageCounter = 1;
    let hasData = true;
    while (hasData) {
      // wait between 1.5 and 0.5 seconds before doing the request to avoid being banned
      await sleep(1000, 500);

      const pageLink = `https://alkoutlet.lv/${category}.html?p=${categoryPageCounter}&product_list_limit=36`;

      const html = await get(pageLink);

      const $ = load(html);
      const currentPage = +$(
        "#maincontent .pages .item.current strong span:nth-child(2)"
      )
        .text()
        .trim();

      if (categoryPageCounter > 1 && currentPage === 1) {
        hasData = false;
        continue;
      }
      writeFileSync(
        `./htmlFiles/alkOutletPages/${totalPageCounter}-page_${category}-${categoryPageCounter}.html`,
        html
      );
      totalPageCounter++;
      categoryPageCounter++;
    }
  }
}

const getNameSpiritsVolumeFromName = function (displayName) {
  // Extract volume
  const volumeRegex =
    /(\d+(?:[\.,]\d+)?(?:[lL]|[mM][lL]))|(\d+x\d+(?:[\.,]\d+)?[lL])/;
  const volumeMatch = displayName.match(volumeRegex);
  // extract percentage
  const percentageRegex = /(\d+(?:[\.,]\d+)?)\s*%/;
  const percentageMatch = displayName.match(percentageRegex);

  if (!volumeMatch || !percentageMatch) return null;

  // Process volume
  let volume = volumeMatch[0].replace(",", "."); // Replace comma with dot for consistency

  // Handle the multiplier case
  if (volume.includes("x")) {
    const [multiplier, unitVolume] = volume.split("x").map(parseFloat);
    volume = (multiplier * unitVolume).toFixed(3); // Convert to liters
  }

  // Check if the volume is in milliliters and convert to liters
  if (volume.toLowerCase().includes("ml")) {
    volume = parseFloat(volume) / 1000; // Convert ml to liters
  }

  // Leave parseFloat() because it removes l letter for those usecases when it got left
  volume = parseFloat(volume);

  // Process alcohol percentage
  let [, spirits] = percentageMatch;
  spirits = parseFloat(spirits.replace(",", "."));

  // Return the original display name along with extracted values
  return {
    name: displayName,
    spirits,
    volume,
  };
};

async function extractRimiPageData(webPage) {
  const $ = load(webPage);
  const rawData = $(".card__details");
  const fineData = [];
  rawData.each((index, element) => {
    const wholePart = $(element).find(".price-tag span").text().trim();
    const decimalPart = $(element).find(".price-tag sup").text().trim();
    const price = parseFloat(`${wholePart}.${decimalPart}`);
    if (!price) return true;

    const displayName = $(element).find(".card__name").text().trim();
    const parsedData = getNameSpiritsVolumeFromName(displayName);
    if (!parsedData) return true;
    const { name, spirits, volume } = parsedData;

    fineData.push({ name, spirits, volume, price });
  });
  return fineData;
}

async function extractSAWPageData(webPage) {
  const $ = load(webPage);
  const rawData = $(".product-container");
  const fineData = [];

  rawData.each((index, element) => {
    // Extract the product name
    const name = $(element).find("h2.product-title").text().trim();

    // Extract the price (including sale prices)
    let price;
    const salePriceContainer = $(element).find(".product-price-sale");
    if (salePriceContainer.length > 0) {
      price = salePriceContainer.contents().first().text().trim();
    } else {
      price = $(element).find(".product-price").text().trim();
    }
    price = parseFloat(price.replace("€", "").trim());

    const details = $(element).find(".product-details").text().trim();

    const spiritsRegex = /,\s*(\d+(?:[\.,]\d+)?)%\s*/;
    const spiritsMatch = details.match(spiritsRegex);
    let spirits = spiritsMatch
      ? parseFloat(spiritsMatch[1].replace(",", "."))
      : null;

    const volumeRegex = /.+?,.+?,\s*(\d+(?:[\.,]\d+))\s*[lL]?/;
    const volumeMatch = details.match(volumeRegex);
    let volume = volumeMatch
      ? parseFloat(volumeMatch[1].replace(",", "."))
      : null;

    // Skip iteration if spirits, volume, or price is missing
    if (!spirits || !volume || !price) return;

    // Add the extracted data to the fineData array
    fineData.push({ name, spirits, volume, price });
  });

  return fineData;
}

async function extractBarboraPageData(webPage) {
  const $ = load(webPage);
  const rawData = $(
    "#category-page-results-placeholder > div.tw-w-full > ul > li"
  );
  const fineData = [];

  rawData.each((index, element) => {
    const displayName = $(element).find("div div a span").text();
    const parsedData = getNameSpiritsVolumeFromName(displayName);
    if (!parsedData) return;
    const { name, spirits, volume } = parsedData;

    const price = $(element)
      .find("div:nth-of-type(2) > div:first-of-type > meta")
      .attr("content");

    if (!price) return;
    fineData.push({ name, spirits, volume, price });
  });
  return fineData;
}

async function extractVynotekaPageData(webPage) {
  const $ = load(webPage);
  const rawData = $(".row--products-list .product-card");
  const fineData = [];

  rawData.each((index, element) => {
    let hasBadData = false;
    let spirits = $(element)
      .find(".product-card__description a span:nth-child(2)")
      .text()
      .trim()
      .replace("%", "")
      .replace(",", ".");
    spirits = Number(spirits);
    if (!spirits) hasBadData = true;

    const price = Number(
      $(element)
        .find(
          ".product-card__prices-row .col:nth-child(1) .product-price__current span.product-price__int"
        )
        .text()
        .trim() +
        "." +
        $(element)
          .find(
            ".product-card__prices-row .col:nth-child(1) .product-price__current  span.product-price__decimal"
          )
          .text()
          .trim()
    );
    if (!price) hasBadData = true;

    let displayName = $(element)
      .find(".product-card__description a span:nth-child(1)")
      .text();

    displayName = displayName.replace(/&nbsp;/g, " ").replace(/\n/g, " ");
    let name = displayName,
      volume = 0;

    // Regex to capture both volume and multipliers like 'x24 0,33 L', '20*0,5 L', or '0,5 L'
    const volumeRegex = /(\d+(?:[.,]\d+)?)\s*[Ll]/;
    const multiplierRegex = /(\d+)\*(\d+(?:,\d+)?)|\s*x(\d+)/;

    const volumeMatch = displayName.match(volumeRegex);
    const multiplierMatch = displayName.match(multiplierRegex);

    if (volumeMatch) {
      // Extract the volume and convert it to a float (replace comma with a period)
      let volumeString = volumeMatch[1].replace(",", ".");
      volume = parseFloat(volumeString);

      // Check if there is a multiplier (x24, 20*)
      if (multiplierMatch) {
        if (multiplierMatch[1] && multiplierMatch[2]) {
          // Handle the '*' case (e.g., 20*0,5 L)
          const multiplier = parseInt(multiplierMatch[1], 10);
          const vol = parseFloat(multiplierMatch[2].replace(",", "."));
          volume = multiplier * vol;
        } else if (multiplierMatch[3]) {
          // Handle the 'x' case (e.g., x24 0,33 L)
          const multiplier = parseInt(multiplierMatch[3], 10);
          volume = volume * multiplier; // Multiply the values
        }
      }
    } else {
      hasBadData = true;
    }
    if (!hasBadData) {
      fineData.push({ name, spirits, volume, price });
    }
    // else {
    //   console.log({ name, spirits, volume, price });
    // }
  });
  return fineData;
}

async function extractAlkOutletPageData(webPage) {
  const $ = load(webPage);
  const rawData = $(".product-item-info");
  const fineData = [];

  rawData.each((index, element) => {
    let hasBadData = false;

    const name = $(element).find("a.product-item-link").text().trim();
    const priceElement = $(element).find("[id^='product-price-']");
    const price = parseFloat(priceElement.attr("data-price-amount"));
    if (!price) hasBadData = true;
    const attributesText = $(element)
      .find(".product-item-attributes")
      .text()
      .trim();

    const [volumeStr, spiritsStr, pricePerLiterStr] = attributesText
      .split(",")
      .map((item) => item.trim());

    if (!volumeStr || !spiritsStr || !pricePerLiterStr) hasBadData = true;

    const volume = parseFloat(volumeStr?.replace("l", ""));
    const spirits = parseFloat(spiritsStr?.replace("%", ""));
    if (!volume || !spirits) hasBadData = true;

    if (!hasBadData) {
      fineData.push({ name, spirits, volume, price });
    }
  });

  return fineData;
}

async function extractAllPageData(fromWhere, how) {
  const files = readdirSync(fromWhere);
  const dataArrays = await Promise.all(
    files.map(async (file) => {
      // Use path.join for better cross-platform support
      const localWebPage = readFileSync(join(fromWhere, file));
      return await how(localWebPage);
    })
  );
  return dataArrays.flat();
}

async function storeData(
  folderFromWhere,
  toWhere,
  how,
  store,
  doDeleteHTMLfiles = true,
  deleteHTMLfilesFunc = deleteHTMLfiles
) {
  const data = await extractAllPageData(folderFromWhere, how);

  // Create a set to keep track of unique items
  const seen = new Set();

  // Filter out duplicates
  const uniqueData = data.filter((item) => {
    const uniqueKey = `${item.name}-${item.spirits}-${item.volume}-${item.price}`;
    if (seen.has(uniqueKey)) {
      return false;
    } else {
      seen.add(uniqueKey);
      return true;
    }
  });

  // Prepare CSV content
  const now = new Date();
  const currDate = now.toLocaleDateString("en-GB");
  const currTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timeEntry = `${currDate} ${currTime}`;
  const headers = "Name,Spirits,Volume,Price,Stirons,Store,Date\n";
  const rows = uniqueData
    .map(
      (item) =>
        `"${item.name}",${item.spirits},${item.volume},${item.price},${(
          (item.spirits * item.volume) /
          item.price
        ).toFixed(2)},"${store}" ,${timeEntry}`
    )
    .join("\n");

  const csvContent = headers + rows;

  // Write to CSV file
  writeFileSync(toWhere, csvContent, "utf-8");
  if (doDeleteHTMLfiles) deleteHTMLfilesFunc(folderFromWhere);
}

function sortStirons(fileFrom, fileTo = undefined) {
  const csvData = readFileSync(fileFrom, "utf-8");

  const parsed = parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  const records = parsed.data;

  records.sort((a, b) => {
    const indexA = parseFloat(a["Stirons"]);
    const indexB = parseFloat(b["Stirons"]);
    return indexB - indexA;
  });

  const output = unparse({
    fields: Object.keys(records[0] || ""),
    data: records,
  });
  if (fileTo) {
    writeFileSync(fileTo, output);
  } else {
    writeFileSync(fileFrom, output);
  }
}

function deleteHTMLfiles(pathToFolder) {
  const files = readdirSync(pathToFolder);
  files.forEach((file) => {
    const filePath = join(pathToFolder, file);
    if (statSync(filePath).isFile()) {
      unlinkSync(filePath);
    }
  });
}

async function stironsPipeline(
  doScrap,
  doExtract,
  scrapMethod,
  extractMethod,
  scrapDataPath,
  extractedDataPath,
  storeName
) {
  console.log(`Starting pipeline for ${storeName}`);
  if (doScrap) {
    await scrapMethod();
  }
  console.log(`Finished scraping for ${storeName}`);
  if (doExtract) {
    await storeData(scrapDataPath, extractedDataPath, extractMethod, storeName);
  }
  console.log(`Finished pipeline for ${storeName}`);
}

function combineCsvFiles(csvFolder, outputFilePath) {
  const allData = [];
  const files = readdirSync(csvFolder).filter((file) => file.endsWith(".csv"));

  files.forEach((file) => {
    const filePath = join(csvFolder, file);
    const csvContent = readFileSync(filePath, "utf-8");
    const parsed = parse(csvContent, { header: true, skipEmptyLines: true });

    allData.push(...parsed.data);
  });

  const headers = allData.length > 0 ? Object.keys(allData[0]) : [];
  const combinedCsv = unparse({ fields: headers, data: allData });
  writeFileSync(outputFilePath, combinedCsv, "utf-8");
}

async function main() {
  await Promise.all([
    // Rimi
    stironsPipeline(
      true,
      true,
      fetchAndStoreRimiData,
      extractRimiPageData,
      "./htmlFiles/rimiPages/",
      "./data/rimiData.csv",
      "rimi"
    ),
    // Spirits and wine
    stironsPipeline(
      true,
      true,
      fetchAndStoreSAWData,
      extractSAWPageData,
      "./htmlFiles/spiritsAndWinePages/",
      "./data/sawData.csv",
      "spirits and wine"
    ),
    // Barbora/Maxima
    stironsPipeline(
      true,
      true,
      fetchAndStoreBarboraData,
      extractBarboraPageData,
      "./htmlFiles/barboraPages/",
      "./data/barboraData.csv",
      "maxima"
    ),
    // Vynoteka
    stironsPipeline(
      true,
      true,
      fetchAndStoreVynotekaData,
      extractVynotekaPageData,
      "./htmlFiles/vynotekaPages/",
      "./data/vynotekaData.csv",
      "vynoteka"
    ),
    // Alkoutlet
    stironsPipeline(
      true,
      true,
      fetchAndStoreAlkOutletData,
      extractAlkOutletPageData,
      "./htmlFiles/alkOutletPages/",
      "./data/alkOutletData.csv",
      "alkoutlet"
    ),
  ]);
  combineCsvFiles("./data", "./finalData/data.csv");
  sortStirons("./finalData/data.csv");
}

main();
