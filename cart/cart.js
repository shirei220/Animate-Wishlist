let items = {};
let total = 0;

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

function updateTotal() {
    const newTotal = formatPrice(total);
    document.querySelector(".total p").innerText = newTotal;
}

function calcPrice(event, qty) {
    const price = event.target.parentNode.parentNode.querySelector(".price");

    const basePrice = parsePrice(price.getAttribute("data-price"));
    const newPrice = basePrice * qty;
    const oldPrice = parsePrice(price.querySelector("p").innerText);

    price.querySelector("p").innerText = formatPrice(newPrice);
    total += (newPrice - oldPrice);
    updateTotal();
}

//updates qty in storage after a qty change
async function updateQty(event, newQty) {
    //get id data from tag
    const id = event.target.parentNode.parentNode.getAttribute("data-id");

    console.log(items[id]);

    //update in cached storage
    items[id].qty = newQty;

    //update local storage
    await chrome.storage.local.set({"items": items});
}

function incQty(event) {
    const qtyText = event.target.parentNode.querySelector("p");
    let qty = Number(qtyText.innerText);
    if (qty === 1) {
        const subtractBtn = event.target.parentNode.querySelector(".btn-qty-subtract")
        subtractBtn.removeAttribute("disabled");
        subtractBtn.src = "/icons/subtract.png";
    }
    qty++;
    qtyText.innerText = qty.toString();
    calcPrice(event, qty);
    updateQty(event, qty.toString());
}

function decQty(event) {
    const qtyText = event.target.parentNode.querySelector("p");
    let qty = Number(qtyText.innerText);
    if (qty > 1) {
        qty--;
        qtyText.innerText = qty.toString();
        calcPrice(event, qty);
        updateQty(event, qty.toString());
    }
    if (qty === 1) {
        const subtractBtn = event.target.parentNode.querySelector(".btn-qty-subtract")
        subtractBtn.setAttribute("disabled", "");
        subtractBtn.src = "/icons/subtract-disabled.png";
    }
}

async function removeItem(event) {
    if (confirm("Do you want to remove this item?")) {
        //get id data from tag
        const id = event.target.parentNode.parentNode.parentNode.getAttribute("data-id");
        //remove from cached storage
        delete items[id];
        //remove from actual storage by updating it
        await chrome.storage.local.set({"items": items});
        //refresh page
        location.reload();
    }
}

async function genCart() {
    //get item data from storage
    await chrome.storage.local.get("items").then((res) => {
        items = res.items;
    });

    //cancel if cart is empty and display msg
    if (items === undefined || items === null || Object.keys(items).length === 0) {
        document.querySelector('#cart-table').setAttribute("hidden", "");
        document.querySelector('.cart-empty-msg').removeAttribute("hidden");
        return;
    }
    //dynamically gen cart
    for (const item in items) {
        //init table row with template
        const tbody = document.querySelector(".tbody");
        const template = document.querySelector("#itemrow");

        //clone new row, fill values and insert into table
        const clone = template.content.cloneNode(true);
        clone.querySelector(".trow").setAttribute("data-id", item)
        clone.querySelector(".title a").innerText = items[item].title;
        clone.querySelector(".title a").href = items[item].url;
        clone.querySelector(".release p").innerText = items[item].release;
        clone.querySelector(".stock p").innerText = items[item].stock;
        clone.querySelector(".qty p").innerText = items[item].qty;

        //calc price based on qty
        const price = parsePrice(items[item].price) * Number(items[item].qty);
        clone.querySelector(".price p").innerText = formatPrice(price);
        clone.querySelector(".img img").src = items[item].img;
        
        clone.querySelector(".qty .btn-qty-add").addEventListener("click", incQty);
        const subtractBtn = clone.querySelector(".qty .btn-qty-subtract")
        if (items[item].qty === "1") {
            subtractBtn.setAttribute("disabled", "");
            subtractBtn.src = "/icons/subtract-disabled.png";
        }
        subtractBtn.addEventListener("click", decQty);

        clone.querySelector(".options img").addEventListener("click", removeItem);
        clone.querySelector(".price").setAttribute("data-price", items[item].price);

        tbody.appendChild(clone);
        total += price;
    }
    updateTotal();
}
genCart();

