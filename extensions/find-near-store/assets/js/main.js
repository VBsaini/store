document.addEventListener("DOMContentLoaded", function () {
  if (typeof L === "undefined") {
    console.error("Leaflet.js is not loaded. Please check the script tag.");
    return;
  }
  const countryDropdown = document.getElementById("country");
  const stateDropdown = document.getElementById("state");
  const findStoreBtn = document.getElementById("find-store-btn");
  const storeInfo = document.getElementById("store-info");
  const mapContainer = document.getElementById("map");

  let map;
  let marker;

  // Fetch data from the app.proxy endpoint
  fetch("https://test-locator.myshopify.com/apps/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const shopData = data || [];
      if (shopData.length === 0) {
        storeInfo.textContent = "No store locations found.";
        return;
      }

      // Populate the country dropdown
      const countries = [...new Set(shopData.map((loc) => loc.country))];
      countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countryDropdown.appendChild(option);
      });

      // Handle Country Selection
      countryDropdown.addEventListener("change", () => {
        const selectedCountry = countryDropdown.value;
        stateDropdown.innerHTML = '<option value="">Select State</option>';
        findStoreBtn.disabled = true;

        if (selectedCountry) {
          const states = [
            ...new Set(
              shopData
                .filter((loc) => loc.country === selectedCountry)
                .map((loc) => loc.state),
            ),
          ];
          stateDropdown.disabled = false;
          states.forEach((state) => {
            const option = document.createElement("option");
            option.value = state;
            option.textContent = state;
            stateDropdown.appendChild(option);
          });
        } else {
          stateDropdown.disabled = true;
        }
      });

      // Handle State Selection
      stateDropdown.addEventListener("change", () => {
        const selectedState = stateDropdown.value;
        findStoreBtn.disabled = !selectedState;
      });

      // Handle Find Store Button Click
      findStoreBtn.addEventListener("click", () => {
        const selectedCountry = countryDropdown.value;
        const selectedState = stateDropdown.value;
        const store = shopData.find(
          (loc) =>
            loc.country === selectedCountry && loc.state === selectedState,
        );

        if (store) {
          storeInfo.textContent = `Nearest store is located at ${store.address}, ${store.state}, ${store.country}.`;

          // Initialize the map
          if (!map) {
            map = L.map("map").setView(
              [
                parseFloat(store.coordinates.lat),
                parseFloat(store.coordinates.lng),
              ],
              12,
            );

            // Add OpenStreetMap tiles
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);
          } else {
            map.setView(
              [
                parseFloat(store.coordinates.lat),
                parseFloat(store.coordinates.lng),
              ],
              12,
            );
          }

          // Add a marker
          if (marker) {
            marker.remove(); // Remove the previous marker
          }
          marker = L.marker([
            parseFloat(store.coordinates.lat),
            parseFloat(store.coordinates.lng),
          ])
            .addTo(map)
            .bindPopup(
              `<strong>${store.storeName}</strong><br>${store.address}<br>${store.state}, ${store.country}`,
            )
            .openPopup();
        } else {
          storeInfo.textContent = "Store not found.";
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching store data:", error);
      storeInfo.textContent = "Failed to fetch store locations.";
    });
});
