let activeUrl;
let activeTabId;

function formatPrice(price) {
    //formats price in yen with commas after every 3 digits
    price = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return price + '円';
}

function parsePrice(price) {
    price = price.substring(0, price.length-1); //removes yen sign
    price = price.replace(",", ""); //removes commas
    return Number(price) //converts to number
}

//links to wishlist page
document.querySelector("#btn-list").addEventListener("click", function() {
    chrome.tabs.create({url: "./cart/cart.html"});
});

function updateQty(qtyText, qty) {
    qtyText.innerText = qty.toString();

    const price = document.querySelector('main .price');
    const basePrice = parsePrice(price.getAttribute("data-price"));
    
    const newPrice = qty * basePrice;
    price.innerText = formatPrice(newPrice);
}

function changeQty(change) {
    const qtyText = document.querySelector('main .qty p');
    let qty = Number(qtyText.innerText);
    if (change === '+') {
        qty++;
    } else if (change === '-' && qty === 1) {
        return;
    } else if (change === '-') {
        qty--;
    }
    qtyText.innerText = qty.toString();

    const price = document.querySelector('main .price');
    const basePrice = parsePrice(price.getAttribute("data-price"));
    
    const newPrice = qty * basePrice;
    price.innerText = formatPrice(newPrice);
}

//qty buttons
document.querySelector('.btn-qty-add').addEventListener("click", function(event) {
    const qtyText = document.querySelector('main .qty p');
    let qty = Number(qtyText.innerText);
    if (qty === 1) {
        const subtractBtn = event.target.parentNode.querySelector(".btn-qty-subtract");
        subtractBtn.removeAttribute("disabled");
        subtractBtn.src = "/icons/subtract.png";
    }
    qty++;
    updateQty(qtyText, qty);
});

document.querySelector('.btn-qty-subtract').addEventListener("click", function(event) {
    const qtyText = document.querySelector('main .qty p');
    let qty = Number(qtyText.innerText);
    if (qty <= 1) return;

    qty--;
    updateQty(qtyText, qty);
    if (qty === 1) {
        const subtractBtn = event.target;
        subtractBtn.setAttribute("disabled", "");
        subtractBtn.src = "/icons/subtract-disabled.png";
    }
});

//for debug
/*
document.querySelector("#btn-clear").addEventListener("click", async function() {
    await chrome.storage.local.clear();
});
*/

function getBasicItemData() {
    let title = document.querySelector('.item_overview_detail h1').innerText;
    let stock = document.querySelector('.item_status .status .stock span').innerText;
    let price = document.querySelector('.item_price .inner .price').innerText;
    price = price.substring(0, price.indexOf('円')+1);
    const data = {title: title, stock: stock, price: price};
    return data;
}

function getItemId() {
    //gets item id from url
    let [itemId] = activeUrl.match(/pd\/[ 0-9]*\//);
    return itemId.substring(3, itemId.length-1);
}

//script to get current tab automatically runs when popup opened
async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);

    //only enables add button on animate website
    if (/www\.animate-onlineshop\.jp\/p/.test(tab.url)) {
        activeUrl = tab.url;
        activeTabId = tab.id;
        document.querySelector(".btn-add").removeAttribute("disabled");

        let data = {};
        chrome.scripting.executeScript(
            {
                target: {tabId: activeTabId},
                func: getBasicItemData,
            },
            (scriptRes) => {
                data = scriptRes[0].result;
                const itemId = getItemId();

                chrome.storage.local.get("items").then(async (res) => {
                    //checks if item already in cart
                    if (Object.keys(res).length > 0 && itemId in res.items) {
                        //displays already added message 
                        document.querySelector('.no-item-msg').setAttribute("hidden", "");
                        document.querySelector('.item-already-added-msg').removeAttribute("hidden");

                        //updates price and stock if changed
                        let changeFlag = false;
                        if (res.items[itemId].price != data.price) {
                            res.items[itemId].price = data.price;
                            changeFlag = true;
                        }
                        if (res.items[itemId].stock != data.stock) {
                            res.items[itemId].stock = data.stock;
                            changeFlag = true;
                        }
                        if (changeFlag) {
                            await chrome.storage.local.set(res);
                            document.querySelector('.item-updated-msg').removeAttribute("hidden");
                        }
                    } else {
                        //enable item to be added to cart
                        document.querySelector(".item-name").innerText = data.title;
                        const price = document.querySelector(".price");
                        price.innerText = data.price;
                        price.setAttribute("data-price", data.price);
                        
                        document.querySelector(".no-item-msg").setAttribute("hidden", "");
                        document.querySelector("main").removeAttribute("style");
                    }
                });
            }
        );
    } else {
        document.querySelector(".btn-add").setAttribute("disabled", "");
    }
    return tab;
}
getCurrentTab();

//gets item details off page
function getItemData() {
    let title = document.querySelector('.item_overview_detail h1').innerText;
    let price = document.querySelector('.item_price .inner .price').innerText;
    let img = document.querySelector('.item_images .item_image_selected ul li span img').src;
    let stock = document.querySelector('.item_status .status .stock span').innerText
    let release = document.querySelector('.item_status .release span').innerText

    //clean up price and release formatting
    price = price.substring(0, price.indexOf('円')+1);
    release = release.substring(0, release.indexOf('発売')-1);

    const data = {title: title, price: price, img: img, stock: stock, release: release};
    return data;
}

document.querySelector(".btn-add").addEventListener("click", function() {
    chrome.scripting.executeScript(
        {
          target: {tabId: activeTabId},
          func: getItemData,
        },
        (res) => {
            const data = res[0].result;
            data.url = activeUrl; //append url to data

            //get qty from popup
            const qty = document.querySelector(".qty p").innerText;
            data.qty = qty;

            //get item id from url
            let itemId = getItemId();

            //get items obj from storage then store item data
            chrome.storage.local.get("items").then(async (res) => {
                //inits items if empty
                if (Object.keys(res).length === 0) {
                    res.items = {};
                } 
                res.items[itemId] = data;
                await chrome.storage.local.set(res);

                //display success msg
                document.querySelector('.item-added-msg').removeAttribute("hidden");
                document.querySelector('main').setAttribute("style", "display:none;");
            });
        });
});
