/* Moralis init code */
fetch("./config.json")
  .then(response => {
    return response.json();
  })
  .then(response => {
    const serverUrl = response.server_url;
    const appId = response.app_id;
    return Moralis.start({ serverUrl, appId });
  });


/* Authentication code */
async function login() {
  let user = Moralis.User.current();
  if (!user) {
    user = await Moralis.authenticate({
      signingMessage: "Log in using Moralis",
    })
      .then(function (user) {
        console.log("logged in user:", user);
        console.log(user.get("ethAddress"));
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

function generateTable(chain, tokenBalances) {
  const div = document.getElementById("display-balances");

  // create table
  const table = div.appendChild(document.createElement("table"));
  table.id = chain + "-balances";

  // create and fill thead
  const thead = table.createTHead();
  const row = thead.insertRow();
  const columnHeaders = ["Symbol", "Name", "Balance", "Price", "Value", "Token Address"]
  for (let header of columnHeaders) {
    const th = document.createElement("th");
    const text = document.createTextNode(header);
    th.appendChild(text);
    row.appendChild(th);
  }

  // fill table
  const insertOrder = ["symbol", "name", "balance", "price", "value"];
  for (let element in tokenBalances) {
    const row = table.insertRow();
    const tokenInfo = tokenBalances[element];
    for (let key of insertOrder) {
      const cell = row.insertCell();
      const text = document.createTextNode(tokenInfo[key]);
      cell.appendChild(text);
    }
    const cell = row.insertCell();
    const text = document.createTextNode(element);
    cell.appendChild(text);
  }
}

async function getNativeBalance() {
  // get values from inputs
  const chain = document.getElementById("chain").value;
  const address = document.getElementById("address").value;

  // fetch native balance from address
  const native = await Moralis.Web3API.account.getNativeBalance({"address": address, "chain": chain});
  console.log("Fetched native balance for chain: " + chain);

  // pull relevant values and assemble into 
  let nativeBalance = new Map()
  nativeBalance.set(address, {"name": null, "symbol": null, "balance": native.balance, "price": null, "value": null});
}

async function getTokenBalances(chain, address) {
  // fetch token balance from address
  const tokens = await Moralis.Web3API.account.getTokenBalances({"address": address, "chain": chain});
  console.log("Fetched all ERC20 balances for chain: " + chain);

  // create Map() to store token balances, populate with info from API call.
  let tokenBalances = new Map();
  for (const token of tokens) {
    let tokenInfo = {"name": token.name, "symbol": token.symbol, "balance": token.balance * Math.pow(10, (-1*token.decimals)), "price": null, "value": null};
    tokenBalances.set(token.token_address, tokenInfo);
  }
  
  // attempt to get price data for each token
  for (const token of tokens) {
    const price = await getTokenPrice(token, chain);
    try {
      let tokenInfo = tokenBalances.get(token.token_address);
      tokenInfo.price = price.usdPrice;
      tokenInfo.value = tokenInfo.price * tokenInfo.balance;
      // abbreviate value if below 1 cent.
      if (tokenInfo.value < 0.01) {
        tokenInfo.value = "< 0.01"
      }
      else {
        continue
      }
      tokenBalances.set(token.token_address, tokenInfo);
    }
    catch(error){
      console.log(error);
    }
  }

  console.log(tokenBalances);
  return Object.fromEntries(tokenBalances)
}

async function getTokenPrice(token, chain) {
  // slow down API call rate.
  await new Promise(resolve => setTimeout(resolve, 1200));
  console.log("Fetching price data for: " + token.name);
  const price = await Moralis.Web3API.token.getTokenPrice({"address": token.token_address, "chain": chain}).catch((err) => {console.log(err)});
  return price
}

async function fetchAll(){
  const chain = document.getElementById("chain").value;
  const address = document.getElementById("address").value;
  const tokenBalances = await getTokenBalances(chain, address);
  generateTable(chain, tokenBalances);
}

document.getElementById("btn-login").onclick = login;
document.getElementById("btn-logout").onclick = logOut;
document.getElementById("btn-get-erc20").onclick = fetchAll;