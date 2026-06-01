document.addEventListener("DOMContentLoaded", function () {
  const OPENROUTE_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNhMDYwMTM2OWY1YTQ3YWI5MTBhOGI3ZjlmOWRjMzNlIiwiaCI6Im11cm11cjY0In0=";
  const FUEL_PRICE_API_URL = "https://script.google.com/macros/s/AKfycbztxc2jyBLUPeK79K9t-2eTqYmss3sIk9GC82Wh7KP41-8Grzr6Dk-ktr0mveFwlaKMWg/exec";

  /* =========================
     VEHICLE KM/L AVERAGES
  ========================= */

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

  /* =========================
     FALLBACK FUEL PRICES
  ========================= */

  const FALLBACK_FUEL_PRICES = {
    unleaded: {
      display_name: "Unleaded 91",
      avg_price: 88.50,
      last_update: "Fallback"
    },

    premium: {
      display_name: "Premium 95",
      avg_price: 91.50,
      last_update: "Fallback"
    },

    diesel: {
      display_name: "Diesel",
      avg_price: 92.50,
      last_update: "Fallback"
    },

    premium_diesel: {
      display_name: "Premium Diesel",
      avg_price: 95.50,
      last_update: "Fallback"
    },

    kerosene: {
      display_name: "Kerosene",
      avg_price: 82.00,
      last_update: "Fallback"
    }
  };

  let fuelPrices = {
    ...FALLBACK_FUEL_PRICES
  };

  /* =========================
     DOM ELEMENTS
  ========================= */

  const tripForm =
    document.getElementById("tripForm");

  const vehicleTypeEl =
    document.getElementById("vehicleType");

  const fuelTypeEl =
    document.getElementById("fuelType");

  const kmPerLiterEl =
    document.getElementById("kmPerLiter");

  const allowanceLitersEl =
    document.getElementById("allowanceLiters");

  const fuelPriceEl =
    document.getElementById("fuelPrice");

  const tripTypeEl =
    document.getElementById("tripType");

  const resetAutoPriceBtn =
    document.getElementById("resetAutoPriceBtn");

  const originEl =
    document.getElementById("origin");

  const destinationEl =
    document.getElementById("destination");

  const costValue =
    document.getElementById("costValue");

  const litersValue =
    document.getElementById("litersValue");

  const distanceValue =
    document.getElementById("distanceValue");

  const priceValue =
    document.getElementById("priceValue");

  const detailsList =
    document.getElementById("detailsList");

  const errorBox =
    document.getElementById("errorBox");

  /* =========================
     FUEL BOARD
  ========================= */

  const boardUnleaded =
    document.getElementById("boardUnleaded");

  const boardPremium =
    document.getElementById("boardPremium");

  const boardDiesel =
    document.getElementById("boardDiesel");

  const boardPremiumDiesel =
    document.getElementById("boardPremiumDiesel");

  const boardKerosene =
    document.getElementById("boardKerosene");

  const boardUpdatedAt =
    document.getElementById("boardUpdatedAt");

  /* =========================
     INITIALIZE
  ========================= */

  showLoadingFuelBoard();
  loadFuelPricesFromSheet();

  /* =========================
     EVENT LISTENERS
  ========================= */

  vehicleTypeEl.addEventListener(
    "change",
    function () {
      kmPerLiterEl.value =
        VEHICLES[vehicleTypeEl.value] || "";
    }
  );

  fuelTypeEl.addEventListener(
    "change",
    applySelectedFuelPrice
  );

  resetAutoPriceBtn.addEventListener(
    "click",
    applySelectedFuelPrice
  );

  tripForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      hideError();

      try {

        const origin =
          originEl.value.trim();

        const destination =
          destinationEl.value.trim();

        const vehicleType =
          vehicleTypeEl.value;

        const fuelType =
          fuelTypeEl.value;

        const kmPerLiter =
          parseFloat(
            kmPerLiterEl.value
          );

        const allowanceLiters =
          parseFloat(
            allowanceLitersEl.value
          );

        const fuelPrice =
          parseFloat(
            fuelPriceEl.value
          );

        if (!origin)
          throw new Error(
            "Enter starting point."
          );

        if (!destination)
          throw new Error(
            "Enter destination."
          );

        if (!vehicleType)
          throw new Error(
            "Select vehicle type."
          );

        if (!fuelType)
          throw new Error(
            "Select fuel type."
          );

        if (
          !kmPerLiter ||
          kmPerLiter <= 0
        ) {
          throw new Error(
            "Enter valid km/L."
          );
        }

        if (
          isNaN(allowanceLiters)
        ) {
          throw new Error(
            "Invalid allowance."
          );
        }

        if (
          isNaN(fuelPrice) ||
          fuelPrice <= 0
        ) {
          throw new Error(
            "Enter valid fuel price."
          );
        }

        setLoadingResults();

        let distanceKm;

        const originCoords =
          await geocodePlace(origin);

        const destinationCoords =
          await geocodePlace(destination);

        distanceKm =
          await getDrivingDistanceKm(
            originCoords,
            destinationCoords
          );

        if (
          tripTypeEl.value ===
          "roundtrip"
        ) {
          distanceKm *= 2;
        }

        const baseLiters =
          distanceKm /
          kmPerLiter;

        const totalLiters =
          baseLiters +
          allowanceLiters;

        const totalCost =
          totalLiters *
          fuelPrice;

        costValue.textContent =
          formatPeso(totalCost);

        litersValue.textContent =
          totalLiters.toFixed(2) +
          " L";

        distanceValue.textContent =
          distanceKm.toFixed(2) +
          " km";

        priceValue.textContent =
          formatPeso(fuelPrice) +
          " / L";

        detailsList.innerHTML = `
          <li>Route: ${origin} to ${destination}</li>
          <li>Trip type: ${
            tripTypeEl.value ===
            "roundtrip"
              ? "Roundtrip"
              : "One-way"
          }</li>
          <li>Fuel efficiency used:
            ${kmPerLiter.toFixed(1)} km/L
          </li>
          <li>Estimated liters:
            ${totalLiters.toFixed(2)} L
          </li>
        `;

      } catch (error) {

        showError(
          error.message
        );

        resetResults();

      }

    }
  );

  /* =========================
     LOAD FUEL PRICES
  ========================= */

  async function loadFuelPricesFromSheet() {

    if (
      !FUEL_PRICE_API_URL.trim()
    ) {
      updateFuelBoard();
      return;
    }

    try {

      const response =
        await fetch(
          FUEL_PRICE_API_URL +
          "?t=" +
          Date.now()
        );

      const data =
        await response.json();

      if (
        !data.success ||
        !data.prices
      ) {
        throw new Error();
      }

      fuelPrices = {
        ...fuelPrices,
        ...data.prices
      };

      updateFuelBoard();

      applySelectedFuelPrice();

    } catch (error) {

      console.error(error);

      updateFuelBoard();

    }

  }

  function applySelectedFuelPrice() {

    const selectedFuel =
      fuelTypeEl.value;

    if (!selectedFuel)
      return;

    const fuelData =
      fuelPrices[selectedFuel];

    if (!fuelData)
      return;

    const avgPrice =
      Number(
        fuelData.avg_price
      );

    if (
      isNaN(avgPrice)
    ) {
      return;
    }

    fuelPriceEl.value =
      avgPrice.toFixed(2);

  }

  function updateFuelBoard() {

    boardUnleaded.textContent =
      getFuelBoardText(
        "unleaded"
      );

    boardPremium.textContent =
      getFuelBoardText(
        "premium"
      );

    boardDiesel.textContent =
      getFuelBoardText(
        "diesel"
      );

    boardPremiumDiesel.textContent =
      getFuelBoardText(
        "premium_diesel"
      );

    boardKerosene.textContent =
      getFuelBoardText(
        "kerosene"
      );

    boardUpdatedAt.textContent =
      "Average fuel prices.";

  }

  function getFuelBoardText(
    fuelKey
  ) {

    const fuel =
      fuelPrices[fuelKey];

    if (!fuel)
      return "Unavailable";

    const avg =
      Number(
        fuel.avg_price
      );

    if (isNaN(avg))
      return "Unavailable";

    return `₱${avg.toFixed(2)}`;

  }

  /* =========================
     PHOTON AUTOCOMPLETE
  ========================= */

  setupAutocomplete(
    "origin",
    "originSuggestions"
  );

  setupAutocomplete(
    "destination",
    "destinationSuggestions"
  );

  function setupAutocomplete(
    inputId,
    suggestionsId
  ) {

    const input =
      document.getElementById(
        inputId
      );

    const suggestionsBox =
      document.getElementById(
        suggestionsId
      );

    let debounce;

    input.addEventListener(
      "input",
      function () {

        clearTimeout(
          debounce
        );

        const query =
          input.value.trim();

        if (
          query.length < 3
        ) {
          suggestionsBox.style.display =
            "none";
          return;
        }

        debounce =
          setTimeout(
            async function () {

              try {

                const response =
                  await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(query + " Philippines")}&limit=5`
                  );

                const data =
                  await response.json();

                suggestionsBox.innerHTML =
                  "";

                data.features.forEach(
                  function (
                    feature
                  ) {

                    const props =
                      feature.properties;

                    const label =
                      [
                        props.name,
                        props.city,
                        props.state
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          ", "
                        );

                    const item =
                      document.createElement(
                        "div"
                      );

                    item.className =
                      "suggestion-item";

                    item.textContent =
                      label;

                    item.onclick =
                      function () {
                        input.value =
                          label;

                        suggestionsBox.style.display =
                          "none";
                      };

                    suggestionsBox.appendChild(
                      item
                    );

                  }
                );

                suggestionsBox.style.display =
                  "block";

              } catch (
                error
              ) {
                console.error(
                  error
                );
              }

            },
            300
          );

      }
    );

  }

  async function geocodePlace(
    place
  ) {

    const response =
      await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTE_API_KEY}&text=${encodeURIComponent(place)}`
      );

    const data =
      await response.json();

    if (
      !data.features ||
      !data.features.length
    ) {
      throw new Error(
        "Location not found."
      );
    }

    return data.features[0]
      .geometry
      .coordinates;
  }

  async function getDrivingDistanceKm(
    startCoords,
    endCoords
  ) {

    const response =
      await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization:
              OPENROUTE_API_KEY,
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            coordinates: [
              startCoords,
              endCoords
            ]
          })
        }
      );

    const data =
      await response.json();

    return (
      data.features[0]
        .properties
        .summary
        .distance / 1000
    );
  }

  function showLoadingFuelBoard() {
    boardUnleaded.textContent =
      "Loading...";
    boardPremium.textContent =
      "Loading...";
    boardDiesel.textContent =
      "Loading...";
    boardPremiumDiesel.textContent =
      "Loading...";
    boardKerosene.textContent =
      "Loading...";
  }

  function setLoadingResults() {
    costValue.textContent =
      "Calculating...";
    litersValue.textContent =
      "Calculating...";
    distanceValue.textContent =
      "Calculating...";
    priceValue.textContent =
      "Calculating...";
  }

  function resetResults() {
    costValue.textContent =
      "—";
    litersValue.textContent =
      "—";
    distanceValue.textContent =
      "—";
    priceValue.textContent =
      "—";
  }

  function formatPeso(value) {
    return new Intl.NumberFormat(
      "en-PH",
      {
        style: "currency",
        currency: "PHP"
      }
    ).format(value);
  }

  function showError(message) {
    errorBox.textContent =
      message;
    errorBox.classList.remove(
      "hidden"
    );
  }

  function hideError() {
    errorBox.textContent =
      "";
    errorBox.classList.add(
      "hidden"
    );
  }

});