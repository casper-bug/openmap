// Initialize the map
let map;
let currentLocationMarker;
let searchResults = [];
let deferredPrompt;

// DOM Elements
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sideMenu = document.getElementById('sideMenu');
const searchInput = document.getElementById('searchInput');
const searchResultsPanel = document.getElementById('searchResults');
const closeResultsBtn = document.getElementById('closeResultsBtn');
const resultsList = document.getElementById('resultsList');
const locationBtn = document.getElementById('locationBtn');
const locationInfoPanel = document.getElementById('locationInfo');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const themeToggle = document.getElementById('themeToggle');

// Initialize the application
function initApp() {
    initMap();
    setupEventListeners();
    checkGeolocationPermission();
    registerServiceWorker();
    listenForInstallPrompt();
}

// Initialize Leaflet map
function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);
    
    // Use OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);
    
    // Add scale control
    L.control.scale({imperial: false}).addTo(map);
}

// Set up event listeners
function setupEventListeners() {
    // Menu toggle
    menuBtn.addEventListener('click', toggleMenu);
    closeMenuBtn.addEventListener('click', toggleMenu);
    
    // Search functionality
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    document.querySelector('.search-btn').addEventListener('click', performSearch);
    closeResultsBtn.addEventListener('click', () => {
        searchResultsPanel.classList.remove('open');
    });
    
    // Location button
    locationBtn.addEventListener('click', centerMapOnUserLocation);
    
    // Location info panel
    closeInfoBtn.addEventListener('click', () => {
        locationInfoPanel.classList.remove('open');
    });
    
    // Theme toggle
    themeToggle.addEventListener('change', toggleTheme);
    
    // Map click
    map.on('click', onMapClick);
    
    // Bottom navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // In a real app, you would switch views here
        });
    });
}

// Toggle side menu
function toggleMenu() {
    sideMenu.classList.toggle('open');
}

// Perform search (simulated)
function performSearch() {
    const query = searchInput.value.trim();
    if (query === '') return;
    
    // Simulate search results
    searchResults = [
        {
            id: 1,
            name: `${query} Cafe`,
            address: '123 Main St, City',
            lat: 51.505 + Math.random() * 0.01 - 0.005,
            lng: -0.09 + Math.random() * 0.01 - 0.005
        },
        {
            id: 2,
            name: `${query} Restaurant`,
            address: '456 Center Ave, City',
            lat: 51.505 + Math.random() * 0.01 - 0.005,
            lng: -0.09 + Math.random() * 0.01 - 0.005
        },
        {
            id: 3,
            name: `${query} Store`,
            address: '789 Market St, City',
            lat: 51.505 + Math.random() * 0.01 - 0.005,
            lng: -0.09 + Math.random() * 0.01 - 0.005
        }
    ];
    
    // Display results
    displaySearchResults();
}

// Display search results
function displaySearchResults() {
    resultsList.innerHTML = '';
    
    searchResults.forEach(result => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h5>${result.name}</h5>
            <p>${result.address}</p>
        `;
        item.addEventListener('click', () => {
            showLocationOnMap(result);
            searchResultsPanel.classList.remove('open');
        });
        resultsList.appendChild(item);
    });
    
    searchResultsPanel.classList.add('open');
}

// Show location on map
function showLocationOnMap(location) {
    map.setView([location.lat, location.lng], 16);
    
    // Clear previous markers
    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
    }
    
    // Add new marker
    currentLocationMarker = L.marker([location.lat, location.lng]).addTo(map)
        .bindPopup(`<b>${location.name}</b><br>${location.address}`)
        .openPopup();
    
    // Show location info
    document.getElementById('locationTitle').textContent = location.name;
    document.getElementById('locationAddress').textContent = location.address;
    locationInfoPanel.classList.add('open');
}

// Center map on user location
function centerMapOnUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
                
                // Clear previous marker
                if (currentLocationMarker) {
                    map.removeLayer(currentLocationMarker);
                }
                
                // Add new marker
                currentLocationMarker = L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup('Your location')
                    .openPopup();
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Could not get your location. Please check your permissions.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Handle map click
function onMapClick(e) {
    // In a real app, you might show information about the clicked location
    console.log('Map clicked at:', e.latlng);
}

// Toggle dark/light theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Check for saved theme preference
function checkSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
}

// Check geolocation permission
function checkGeolocationPermission() {
    // In a real app, you might check and request permissions here
}

// Register service worker
function registerServiceWorker() {
    // Already registered in the HTML file
}

// Listen for PWA install prompt
function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
}

// Show install prompt
function showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
        <p>Install Organic Maps PWA?</p>
        <button class="install-btn">Install</button>
        <button class="cancel-btn">Not Now</button>
    `;
    
    document.body.appendChild(prompt);
    
    prompt.querySelector('.install-btn').addEventListener('click', () => {
        deferredPrompt.prompt();
        prompt.remove();
    });
    
    prompt.querySelector('.cancel-btn').addEventListener('click', () => {
        prompt.remove();
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkSavedTheme();
    initApp();
});
