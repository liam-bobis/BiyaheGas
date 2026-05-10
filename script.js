document.addEventListener("DOMContentLoaded", function () {
  const OPENROUTE_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNhMDYwMTM2OWY1YTQ3YWI5MTBhOGI3ZjlmOWRjMzNlIiwiaCI6Im11cm11cjY0In0=";
  const FUEL_PRICE_API_URL = "https://script.google.com/macros/s/AKfycbxGpBDVQxAhXRRVQ5jeRyqo2o23XB0X6nc5tkj_8m1pUSGzvjW8Z0ViAQW3alaC240P/exec";

  const VEHICLES = {
    motorcycle: 35,
    tricycle: 22,
    micro: 18,
    hatchback: 15,
    sedan: 12,
    wagon: 11,
    coupe: 11,
    crossover: 10,
    mpv: 10,
    suv: 8,
    pickup: 7,
    offroader: 6,
    van: 8,
    minibus: 6,
    bus: 4,
    lighttruck: 6,
    truck: 4,
    heavytruck: 3
  };

  const FALLBACK_FUEL_PRICES = {
    unleaded: {
      display_name: "Unleaded / Regular 91",
      price_php_per_liter: 87.69,
      last_update: "Fallback"
    },
    premium: {
      display_name: "Premium Gasoline 95",
      price_php_per_liter: 90.00,
      last_update: "Fallback"
    },
    diesel: {
      display_name: "Diesel",
      price_php_per_liter: 92.20,
      last_update: "Fallback"
    },
    premium_diesel: {
      display_name: "Premium Diesel",
      price_php_per_liter: 94.00,
      last_update: "Fallback"
    },
    kerosene: {
      display_name: "Kerosene",
      price_php_per_liter: 80.00,
      last_update: "Fallback"
    }
  };

  let fuelPrices = {};

  const tripForm = document.getElementById("tripForm");
  const vehicleTypeEl = document.getElementById("vehicleType");
  const fuelTypeEl = document.getElementById("fuelType");
  const kmPerLiterEl = document.getElementById("kmPerLiter");
  const allowanceLitersEl = document.getElementById("allowanceLiters");
  const fuelPriceEl = document.getElementById("fuelPrice");
  const resetAutoPriceBtn = document.getElementById("resetAutoPriceBtn");

  const costValue = document.getElementById("costValue");
  const litersValue = document.getElementById("litersValue");
  const distanceValue = document.getElementById("distanceValue");
  const priceValue = document.getElementById("priceValue");
  const detailsList = document.getElementById("detailsList");
  const errorBox = document.getElementById("errorBox");

  const boardUnleaded = document.getElementById("boardUnleaded");
  const boardPremium = document.getElementById("boardPremium");
  const boardDiesel = document.getElementById("boardDiesel");
  const boardPremiumDiesel = document.getElementById("boardPremiumDiesel");
  const boardKerosene = document.getElementById("boardKerosene");
  const boardUpdatedAt = document.getElementById("boardUpdatedAt");

  showLoadingFuelBoard();
  loadFuelPricesFromSheet();

  vehicleTypeEl.addEventListener("change", function () {
    kmPerLiterEl.value = VEHICLES[vehicleTypeEl.value] || "";
  });

  fuelTypeEl.addEventListener("change", function () {
    applySelectedFuelPrice();
  });

  resetAutoPriceBtn.addEventListener("click", function () {
    applySelectedFuelPrice();
  });

  tripForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideError();

    try {
      const origin = document.getElementById("origin").value.trim();
      const destination = document.getElementById("destination").value.trim();
      const vehicleType = vehicleTypeEl.value;
      const fuelType = fuelTypeEl.value;
      const kmPerLiter = parseFloat(kmPerLiterEl.value);
      const allowanceLiters = parseFloat(allowanceLitersEl.value);
      const fuelPrice = parseFloat(fuelPriceEl.value);

      if (!origin) throw new Error("Please enter your starting point.");
      if (!destination) throw new Error("Please enter your destination.");
      if (!vehicleType) throw new Error("Please select a vehicle type.");
      if (!fuelType) throw new Error("Please select a fuel type.");
      if (!kmPerLiter || kmPerLiter <= 0) throw new Error("Please enter a valid km/L.");
      if (isNaN(allowanceLiters) || allowanceLiters < 0) throw new Error("Please enter a valid allowance.");
      if (isNaN(fuelPrice) || fuelPrice <= 0) throw new Error("Please enter a valid fuel price.");

      setLoadingResults();

      let distanceKm;

      if (OPENROUTE_API_KEY.trim() && !OPENROUTE_API_KEY.includes("PASTE_")) {
        const originCoords = await geocodePlace(origin);
        const destinationCoords = await geocodePlace(destination);
        distanceKm = await getDrivingDistanceKm(originCoords, destinationCoords);
      } else {
        distanceKm = 10;
      }

      const tripType = document.getElementById("tripType").value;

      if (tripType === "roundtrip") {
        distanceKm = distanceKm * 2;
      }

      const baseLiters = distanceKm / kmPerLiter;
      const totalLiters = baseLiters + allowanceLiters;
      const totalCost = totalLiters * fuelPrice;

      costValue.textContent = formatPeso(totalCost);
      litersValue.textContent = totalLiters.toFixed(2) + " L";
      distanceValue.textContent = distanceKm.toFixed(2) + " km";
      priceValue.textContent = formatPeso(fuelPrice) + " / L";

      const fuelName = fuelPrices[fuelType]?.display_name || fuelType;
      const vehicleName = vehicleTypeEl.options[vehicleTypeEl.selectedIndex].text;

      detailsList.innerHTML = `
        <li>Route: ${escapeHTML(origin)} to ${escapeHTML(destination)}</li>
        <li>Trip type: ${tripType === "roundtrip" ? "Round Trip" : "One Way"}</li>
        <li>Vehicle type: ${escapeHTML(vehicleName)}</li>
        <li>Fuel type: ${escapeHTML(fuelName)}</li>
        <li>Fuel efficiency used: ${kmPerLiter.toFixed(1)} km/L</li>
        <li>Base fuel needed: ${baseLiters.toFixed(2)} L</li>
        <li>Extra allowance added: ${allowanceLiters.toFixed(2)} L</li>
        <li>Fuel price used: ${formatPeso(fuelPrice)} / L</li>
        ${
          OPENROUTE_API_KEY.trim() && !OPENROUTE_API_KEY.includes("PASTE_")
            ? ""
            : "<li>Distance is using temporary 10 km because OpenRouteService key is blank.</li>"
        }
      `;
    } catch (error) {
      showError(
        error.message === "Failed to fetch"
          ? "Could not connect to the distance API or fuel price database. Use Live Server and check your API URLs."
          : error.message
      );

      resetResults();
    }
  });

  async function loadFuelPricesFromSheet() {
    if (!FUEL_PRICE_API_URL.trim() || FUEL_PRICE_API_URL.includes("PASTE_")) {
      fuelPrices = { ...FALLBACK_FUEL_PRICES };
      updateFuelBoard();
      return;
    }

    try {
      const response = await fetchWithTimeout(FUEL_PRICE_API_URL, 30000);
      const data = await response.json();

      if (!data.success || !data.prices) {
        throw new Error(data.message || "Fuel price database returned an error.");
      }

      fuelPrices = {
        ...FALLBACK_FUEL_PRICES,
        ...data.prices
      };

      updateFuelBoard();
      applySelectedFuelPrice();
    } catch (error) {
      console.error("Fuel price database error:", error);

      fuelPrices = { ...FALLBACK_FUEL_PRICES };
      updateFuelBoard();
    }
  }

  async function fetchWithTimeout(url, timeoutMs = 30000) {
    const controller = new AbortController();

    const timeout = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store"
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  function showLoadingFuelBoard() {
    boardUnleaded.textContent = "Loading...";
    boardPremium.textContent = "Loading...";
    boardDiesel.textContent = "Loading...";
    boardPremiumDiesel.textContent = "Loading...";
    boardKerosene.textContent = "Loading...";
    boardUpdatedAt.textContent = "Loading fuel prices...";
  }

  function applySelectedFuelPrice() {
    const selectedFuel = fuelTypeEl.value;

    if (!selectedFuel || !fuelPrices[selectedFuel]) {
      fuelPriceEl.value = "";
      return;
    }

    fuelPriceEl.value = Number(fuelPrices[selectedFuel].price_php_per_liter).toFixed(2);
  }

  function updateFuelBoard(customNote) {
    boardUnleaded.textContent = getBoardText("unleaded");
    boardPremium.textContent = getBoardText("premium");
    boardDiesel.textContent = getBoardText("diesel");
    boardPremiumDiesel.textContent = getBoardText("premium_diesel");
    boardKerosene.textContent = getBoardText("kerosene");

    const latestUpdate =
      fuelPrices.unleaded?.last_update ||
      fuelPrices.premium?.last_update ||
      fuelPrices.diesel?.last_update ||
      "Unknown";

    boardUpdatedAt.textContent =
      customNote || `Last update: ${latestUpdate}. Actual prices may vary by station.`;
  }

  function getBoardText(fuelType) {
    if (!fuelPrices[fuelType]) return "Unavailable";

    const price = Number(fuelPrices[fuelType].price_php_per_liter);
    if (isNaN(price) || price <= 0) return "Unavailable";

    return formatPeso(price) + " / L";
  }

  async function geocodePlace(place) {
    const query = place + ", Philippines";

    const url = new URL("https://api.openrouteservice.org/geocode/search");
    url.searchParams.set("api_key", OPENROUTE_API_KEY);
    url.searchParams.set("text", query);
    url.searchParams.set("size", "1");
    url.searchParams.set("boundary.country", "PH");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Location lookup failed. Check your OpenRouteService API key.");
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error("Location not found. Please use a more specific location.");
    }

    return data.features[0].geometry.coordinates;
  }

  async function getDrivingDistanceKm(startCoords, endCoords) {
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        "Authorization": OPENROUTE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coordinates: [startCoords, endCoords]
      })
    });

    if (!response.ok) {
      throw new Error("Route distance failed. Check your API key or use clearer locations.");
    }

    const data = await response.json();
    const meters = data.features[0].properties.summary.distance;

    return meters / 1000;
  }

  function setLoadingResults() {
    costValue.textContent = "Calculating...";
    litersValue.textContent = "Calculating...";
    distanceValue.textContent = "Calculating...";
    priceValue.textContent = "Calculating...";
  }

  function resetResults() {
    costValue.textContent = "—";
    litersValue.textContent = "—";
    distanceValue.textContent = "—";
    priceValue.textContent = "—";
  }

  function formatPeso(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2
    }).format(value);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function hideError() {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }
});

setupAutocomplete("origin", "originSuggestions");
setupAutocomplete("destination", "destinationSuggestions");

function setupAutocomplete(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const suggestionsBox = document.getElementById(suggestionsId);

  let debounce;

  input.addEventListener("input", function () {
    clearTimeout(debounce);

    const query = input.value.trim();

    if (query.length < 3) {
      suggestionsBox.style.display = "none";
      return;
    }

    debounce = setTimeout(async () => {
      try {
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;

        const response = await fetch(url);
        const data = await response.json();

        suggestionsBox.innerHTML = "";

        if (!data.features || data.features.length === 0) {
          suggestionsBox.style.display = "none";
          return;
        }

        data.features.forEach(feature => {
          const props = feature.properties;

          const nameParts = [
            props.name,
            props.city,
            props.state,
            props.country
          ].filter(Boolean);

          const label = nameParts.join(", ");

          const item = document.createElement("div");
          item.className = "suggestion-item";
          item.textContent = label;

          item.addEventListener("click", function () {
            input.value = label;
            suggestionsBox.style.display = "none";
          });

          suggestionsBox.appendChild(item);
        });

        suggestionsBox.style.display = "block";

      } catch (error) {
        console.error("Autocomplete error:", error);
      }
    }, 300);
  });

  document.addEventListener("click", function (event) {
    if (!input.contains(event.target) &&
        !suggestionsBox.contains(event.target)) {
      suggestionsBox.style.display = "none";
    }
  });
}