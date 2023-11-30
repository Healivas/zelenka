const previousExchangeRates = {};
let exchangeRates = {};
const mult = 1.1;

async function fetchAllExchangeRates(pairs) {
  const exchangeRates = {};

  try {
    const response = await fetch(`https://api.binance.com/api/v1/ticker/24hr`);
    const data = await response.json();

    for (const pair of pairs) {
      const exchangeRate = data.find((rate) => rate.symbol === pair);
      if (exchangeRate) {
        exchangeRates[pair] = {
          lastPrice: exchangeRate.lastPrice,
          priceChangePercent: exchangeRate.priceChangePercent,
          priceChange: exchangeRate.priceChange,
          highPrice: exchangeRate.highPrice,
          lowPrice: exchangeRate.lowPrice,
          volume: exchangeRate.volume,
          quoteVolume: exchangeRate.quoteVolume,
        };
      }
    }
  } catch (error) {
    console.log("Error when getting exchange rates:", error);
  }

  return exchangeRates;
}

function updateExchangeRatesSocket() {
  const socketUrl = "wss://stream.binance.com:9443/ws/!ticker@arr";

  const socket = new WebSocket(socketUrl);

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      const rateElements = Array.from(document.querySelectorAll("[data-pair]"));
      if (rateElements.length === 0) {
        return;
      }
      for (const rate of data) {
        const pair = rate.s;
        const exchangeRate = {
          lastPrice: rate.c,
          priceChangePercent: rate.P,
          priceChange: rate.p,
          highPrice: rate.h,
          lowPrice: rate.l,
          volume: rate.v,
          quoteVolume: rate.q,
        };

        exchangeRates[pair] = exchangeRate;

        if (pair) {
          currentRate = exchangeRate;

          for (const rateElement of rateElements) {
            const pair = rateElement.dataset.pair;
            const exchangeRate = exchangeRates[pair];

            if (exchangeRate) {
              const priceElements = rateElement.querySelectorAll(".price");
              const percentElements = rateElement.querySelectorAll(".percent");
              const changeElements = rateElement.querySelectorAll(".change");
              const highElements = rateElement.querySelectorAll(".high");
              const lowElements = rateElement.querySelectorAll(".low");
              const volumeElements = rateElement.querySelectorAll(".volume");
              const quoteElements = rateElement.querySelectorAll(".quote");

              for (const priceElement of priceElements) {
                if (!isNaN(exchangeRate.lastPrice) && exchangeRate.lastPrice !== previousExchangeRates.lastPrice) {
                  const oldPrice = Number(priceElement.textContent);
                  const newPrice = Number(exchangeRate.lastPrice);
                  const formattedPrice = getPriceFormatted(newPrice, pair);
                  priceElement.textContent = formattedPrice;
                  if (oldPrice !== 0 && newPrice > oldPrice) {
                    priceElement.classList.add("green");
                    priceElement.classList.remove("red");
                  } else if (newPrice < oldPrice) {
                    priceElement.classList.add("red");
                    priceElement.classList.remove("green");
                  }
                }
              }

              for (const percentElement of percentElements) {
                if (!isNaN(exchangeRate.priceChangePercent) && exchangeRate.priceChangePercent !== previousExchangeRates.priceChangePercent) {
                  const formattedPercent = formatPercent(exchangeRate.priceChangePercent);
                  percentElement.innerHTML = `${formattedPercent}&nbsp;<span class="table__span">%</span>`;

                  if (exchangeRate.priceChangePercent < 0) {
                    percentElement.classList.add("red");
                    percentElement.classList.remove("green");
                  } else {
                    percentElement.classList.add("green");
                    percentElement.classList.remove("red");
                  }
                }
              }

              for (const changeElement of changeElements) {
                if (!isNaN(exchangeRate.priceChange) && exchangeRate.priceChange !== previousExchangeRates.priceChange) {
                  const formattedPrice = getPriceFormatted(formatNumber(exchangeRate.priceChange), pair);
                  changeElement.textContent = formattedPrice;

                  if (exchangeRate.priceChange < 0) {
                    changeElement.classList.add("red");
                    changeElement.classList.remove("green");
                  } else {
                    changeElement.classList.add("green");
                    changeElement.classList.remove("red");
                  }
                }
              }

              for (const highElement of highElements) {
                if (!isNaN(exchangeRate.highPrice) && exchangeRate.highPrice !== previousExchangeRates.highPrice) {
                  const formattedPrice = getPriceFormatted(formatNumber(exchangeRate.highPrice), pair);
                  highElement.textContent = formattedPrice;
                }
              }

              for (const lowElement of lowElements) {
                if (!isNaN(exchangeRate.lowPrice) && exchangeRate.lowPrice !== previousExchangeRates.lowPrice) {
                  const formattedPrice = getPriceFormatted(formatNumber(exchangeRate.lowPrice), pair);
                  lowElement.textContent = formattedPrice;
                }
              }

              for (const volumeElement of volumeElements) {
                if (!isNaN(exchangeRate.volume) && exchangeRate.volume !== previousExchangeRates.volume) {
                  volumeElement.textContent = formatPercent(exchangeRate.volume);
                }
              }

              for (const quoteElement of quoteElements) {
                if (!isNaN(exchangeRate.quoteVolume) && exchangeRate.quoteVolume !== previousExchangeRates.quoteVolume) {
                  quoteElement.textContent = formatPercent(exchangeRate.quoteVolume);
                }
              }

              previousExchangeRates[pair] = exchangeRate;
            }
          }
        }
      }
    } catch (error) {
      console.log("Error when receiving socket data:", error);
    }
  };

  socket.onopen = () => {
    console.log("webSocket connected");
  };

  socket.onclose = (event) => {
    console.log("WebSocket connection closed:", event);
    setTimeout(updateExchangeRatesSocket, 5000);
  };

  socket.onerror = (error) => {
    console.log("WebSocket error:", error);
    setTimeout(updateExchangeRatesSocket, 5000);
  };
}

function formatNumber(number) {
  return Number(number).toFixed(5);
}

function formatUSD(number) {
  return Number(number).toFixed(2);
}

function formatPercent(number) {
  return Number(number).toFixed(3);
}

function getPriceFormatted(price, pair) {
  if (pair.endsWith("USDT") || pair.endsWith("BUSD") || pair.endsWith("USDC")) {
    return formatUSD(price);
  } else {
    return formatNumber(price);
  }
}

async function updateExchangeRates() {
  const rateElements = Array.from(document.querySelectorAll("[data-pair]"));
  if (rateElements.length === 0) {
    return;
  }

  const pairs = rateElements.map((rateElement) => rateElement.dataset.pair);
  const exchangeRates = await fetchAllExchangeRates(pairs);

  for (const rateElement of rateElements) {
    const pair = rateElement.dataset.pair;
    const exchangeRate = exchangeRates[pair];

    if (exchangeRate) {
      const priceElements = rateElement.querySelectorAll(".price");
      const percentElements = rateElement.querySelectorAll(".percent");
      const changeElements = rateElement.querySelectorAll(".change");
      const highElements = rateElement.querySelectorAll(".high");
      const lowElements = rateElement.querySelectorAll(".low");
      const volumeElements = rateElement.querySelectorAll(".volume");
      const quoteElements = rateElement.querySelectorAll(".quote");

      for (const priceElement of priceElements) {
        if (!isNaN(exchangeRate.lastPrice) && exchangeRate.lastPrice !== previousExchangeRates.lastPrice) {
          const oldPrice = Number(priceElement.textContent);
          const newPrice = Number(exchangeRate.lastPrice);
          const formattedPrice = getPriceFormatted(newPrice, pair);
          priceElement.textContent = formattedPrice;
          if (oldPrice !== 0 && newPrice > oldPrice) {
            priceElement.classList.add("green");
            priceElement.classList.remove("red");
          } else if (newPrice < oldPrice) {
            priceElement.classList.add("red");
            priceElement.classList.remove("green");
          }
        }
      }

      for (const percentElement of percentElements) {
        if (!isNaN(exchangeRate.priceChangePercent) && exchangeRate.priceChangePercent !== previousExchangeRates.priceChangePercent) {
          const formattedPercent = formatPercent(exchangeRate.priceChangePercent);
          percentElement.innerHTML = `${formattedPercent}&nbsp;<span class="table__span">%</span>`;

          if (exchangeRate.priceChangePercent < 0) {
            percentElement.classList.add("red");
            percentElement.classList.remove("green");
          } else {
            percentElement.classList.add("green");
            percentElement.classList.remove("red");
          }
        }
      }

      for (const changeElement of changeElements) {
        if (!isNaN(exchangeRate.priceChange) && exchangeRate.priceChange !== previousExchangeRates.priceChange) {
          const formattedPrice = getPriceFormatted(formatNumber(exchangeRate.priceChange), pair);
          changeElement.textContent = formattedPrice;

          if (exchangeRate.priceChange < 0) {
            changeElement.classList.add("red");
            changeElement.classList.remove("green");
          } else {
            changeElement.classList.add("green");
            changeElement.classList.remove("red");
          }
        }
      }

      for (const highElement of highElements) {
        if (!isNaN(exchangeRate.highPrice) && exchangeRate.highPrice !== previousExchangeRates.highPrice) {
          const formattedPrice = getPriceFormatted(formatNumber(exchangeRate.highPrice), pair);
          highElement.textContent = formattedPrice;
        }
      }

      for (const lowElement of lowElements) {
        if (!isNaN(exchangeRate.lowPrice) && exchangeRate.lowPrice !== previousExchangeRates.lowPrice) {
          const formattedPrice = getPriceFormatted(formatNumber(exchangeRate.lowPrice), pair);
          lowElement.textContent = formattedPrice;
        }
      }

      for (const volumeElement of volumeElements) {
        if (!isNaN(exchangeRate.volume) && exchangeRate.volume !== previousExchangeRates.volume) {
          volumeElement.textContent = formatPercent(exchangeRate.volume);
        }
      }

      for (const quoteElement of quoteElements) {
        if (!isNaN(exchangeRate.quoteVolume) && exchangeRate.quoteVolume !== previousExchangeRates.quoteVolume) {
          quoteElement.textContent = formatPercent(exchangeRate.quoteVolume);
        }
      }

      previousExchangeRates[pair] = exchangeRate;
    }
  }

  updateExchangeRatesSocket();
}

updateExchangeRates();
