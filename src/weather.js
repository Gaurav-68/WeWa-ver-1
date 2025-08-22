const API_KEY = "86ef3e45d7ff113afd94198a914da358"; // OpenWeather
const WEATHERAPI_KEY = "01f5af69b65d4c69b4993802250806";   // WeatherAPI

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("location-form");
    const locationInput = document.getElementById("location");
    const resultDiv = document.getElementById("weather-result");
    const iframe = document.querySelector('iframe');
    const weatherNavLinks = document.querySelectorAll(".weather-nav");

    let forecastData = [];
    let cityInfo = {};

    // Utility: Set nav active class
    function updateActiveNav(clickedLink) {
        weatherNavLinks.forEach(link => link.classList.remove("active"));
        clickedLink.classList.add("active");
    }

    // Fetch: Present Weather (Next 6 hrs)
    function displayPresentForecast() {
        if (!forecastData.length) return;
        const current = forecastData.slice(0, 6);
        resultDiv.innerHTML = `<h3>Current Weather (Next 6 Hours) for ${cityInfo.name}, ${cityInfo.country}</h3>`;
        current.forEach(item => {
            resultDiv.innerHTML += `
                <p><strong>${item.dt_txt}</strong>: ${item.main.temp}°C, ${item.weather[0].description}</p>
            `;
        });
    }

    // Fetch: Future Forecast (3-day Avg)
    function displayFutureForecast() {
        if (!forecastData.length) return;
        const daily = {};
        forecastData.forEach(item => {
            const date = item.dt_txt.split(" ")[0];
            if (!daily[date]) daily[date] = [];
            daily[date].push(item);
        });

        const sortedDates = Object.keys(daily).slice(1, 4); // skip today
        resultDiv.innerHTML = `<h3>3-Day Forecast for ${cityInfo.name}, ${cityInfo.country}</h3>`;
        sortedDates.forEach(date => {
            const avgTemp = (
                daily[date].reduce((sum, el) => sum + el.main.temp, 0) / daily[date].length
            ).toFixed(1);
            const desc = daily[date][0].weather[0].description;
            resultDiv.innerHTML += `<p><strong>${date}</strong>: Avg Temp: ${avgTemp}°C, ${desc}</p>`;
        });
    }

    // Fetch: Past Weather (last 3 days) via WeatherAPI
    async function displayPastForecast() {
        const location = cityInfo.name;
        if (!location) {
            showError("Please search for a location first.");
            return;
        }

        const today = new Date();
        const dates = [];

        for (let i = 1; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split("T")[0];
            dates.push(iso);
        }

        resultDiv.innerHTML = `<h3>Past Weather for ${cityInfo.name}, ${cityInfo.country}</h3>`;

        try {
            for (const date of dates) {
                const url = `https://api.weatherapi.com/v1/history.json?key=${WEATHERAPI_KEY}&q=${location}&dt=${date}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.error) {
                    resultDiv.innerHTML += `<p><strong>${date}</strong>: ${data.error.message}</p>`;
                    continue;
                }

                const temp = data.forecast.forecastday[0].day.avgtemp_c;
                const condition = data.forecast.forecastday[0].day.condition.text;
                resultDiv.innerHTML += `<p><strong>${date}</strong>: Avg Temp: ${temp}°C, ${condition}</p>`;
            }
        } catch (err) {
            showError("Failed to fetch past weather: " + err.message);
        }
    }

    // On form submit: Get location and forecast
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const location = locationInput.value.trim();
        if (!location) return;

        try {
            const geoURL = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`;
            const res = await fetch(geoURL);
            const geoData = await res.json();

            if (geoData.length === 0) {
                showError("Location not found.");
                return;
            }

            const { lat, lon, name, country } = geoData[0];
            cityInfo = { name, country, lat, lon };

            iframe.src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=${lat}&lon=${lon}&zoom=8`;

            const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
            const forecastRes = await fetch(forecastURL);
            const data = await forecastRes.json();
            forecastData = data.list;

            displayPresentForecast();
            updateActiveNav(weatherNavLinks[1]); // Default to "Present"
        } catch (err) {
            showError("Error fetching weather data: " + err.message);
        }
    });

    // Handle nav tab clicks (past / present / future)
    weatherNavLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const label = link.textContent.trim().toLowerCase();
            updateActiveNav(link);
            if (label === "past") displayPastForecast();
            else if (label === "present") displayPresentForecast();
            else if (label === "future") displayFutureForecast();
        });
    });
});

// Error modal support
const dialog = document.getElementById("error-dialog");
const dialogMessage = document.getElementById("dialog-message");
const dialogClose = document.getElementById("dialog-close");

function showError(message) {
    dialogMessage.textContent = message;
    dialog.classList.remove("hidden");
}

dialogClose.addEventListener("click", () => {
    dialog.classList.add("hidden");
});
