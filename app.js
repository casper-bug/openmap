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
    checkSavedTheme();
    checkGeolocationPermission();
    registerServiceWorker();
    listenForInstallPrompt();
}

// Initialize Leaflet map
function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);
    
    L.control.scale({imperial: false}).addTo(map);
}

// Set up event listeners
function setupEventListeners() {
    // Menu toggle
    menuBtn.addEventListener('click', toggleMenu);
    closeMenuBtn.addEventListener('click', toggleMenu);
    
    // Menu items functionality
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const text = item.querySelector('span').textContent;
            handleMenuItemClick(text);
            sideMenu.classList.remove('open');
        });
    });
    
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
        });
    });
}

// Handle menu item clicks
function handleMenuItemClick(menuText) {
    switch(menuText) {
        case 'Search':
            searchInput.focus();
            break;
        case 'Bookmarks':
            alert('Bookmarks feature will be implemented');
            break;
        case 'Download Maps':
            alert('Map download feature will be implemented');
            break;
        case 'Route Planner':
            alert('Route planner feature will be implemented');
            break;
        case 'Navigation':
            alert('Navigation feature will be implemented');
            break;
        case 'Settings':
            alert('Settings feature will be implemented');
            break;
        case 'About':
            alert('Organic Maps PWA Clone\nVersion 1.0');
            break;
    }
}

// Perform search using Nominatim
async function performSearch() {
    const query = searchInput.value.trim();
    if (query === '') return;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.length === 0) {
            alert('No results found');
            return;
        }
        
        searchResults = data.map(item => ({
            id: item.place_id,
            name: item.display_name.split(',')[0],
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type,
            class: item.class
        }));
        
        displaySearchResults();
        showNearbyFacilities(data[0].lat, data[0].lon);
    } catch (error) {
        console.error('Search error:', error);
        alert('Error performing search');
    }
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
    
    // Clear previous markers except user location and facilities
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer === currentLocationMarker) {
            return;
        }
        if (layer instanceof L.Marker && layer.options.icon?.options?.className === 'facility-marker') {
            return;
        }
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Add new marker if it's not a facility
    if (!location.icon) {
        currentLocationMarker = L.marker([location.lat, location.lng]).addTo(map)
            .bindPopup(`<b>${location.name}</b><br>${location.address}`);
    }
    
    // Show location info in bottom panel
    document.getElementById('locationTitle').textContent = location.name || location.display_name.split(',')[0];
    document.getElementById('locationAddress').textContent = location.address || location.display_name;
    locationInfoPanel.classList.add('open');
    
    // Update navigation button functionality
    const navButton = document.querySelector('.info-actions .action-btn');
    navButton.onclick = () => {
        alert(`Navigation to ${location.name || location.display_name.split(',')[0]} would start here`);
    };
}

// Show nearby facilities
function showNearbyFacilities(lat, lng) {
    // Define facility types to show
    const facilityTypes = [
        { class: 'amenity', type: 'restaurant', icon: 'utensils', color: 'red' },
        { class: 'amenity', type: 'cafe', icon: 'coffee', color: 'brown' },
        { class: 'amenity', type: 'pharmacy', icon: 'prescription-bottle', color: 'green' },
        { class: 'amenity', type: 'hospital', icon: 'hospital', color: 'blue' },
        { class: 'shop', type: 'supermarket', icon: 'shopping-cart', color: 'orange' },
        { class: 'amenity', type: 'bank', icon: 'money-bill-wave', color: 'darkgreen' },
        { class: 'amenity', type: 'fuel', icon: 'gas-pump', color: 'black' }
    ];

    // Search for each facility type
    facilityTypes.forEach(async (facility) => {
        try {
            const radius = 1000; // 1km radius
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&lat=${lat}&lon=${lng}&radius=${radius}&${facility.class}=${facility.type}`
            );
            const data = await response.json();
            
            data.forEach(item => {
                const icon = L.divIcon({
                    className: 'facility-marker',
                    html: `<i class="fas fa-${facility.icon}" style="color:${facility.color}"></i>`,
                    iconSize: [24, 24],
                    popupAnchor: [0, -12]
                });
                
                const marker = L.marker([item.lat, item.lon], { icon })
                    .addTo(map)
                    .bindPopup(`<b>${item.display_name.split(',')[0]}</b><br>${facility.type}`);
                    
                marker.on('click', () => {
                    const location = {
                        lat: item.lat,
                        lng: item.lon,
                        name: item.display_name.split(',')[0],
                        address: item.display_name,
                        icon: true
                    };
                    showLocationOnMap(location);
                });
            });
        } catch (error) {
            console.error(`Error fetching ${facility.type}:`, error);
        }
    });
}

// Handle map click
function onMapClick(e) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.log('Location not found');
                return;
            }
            
            const location = {
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                name: data.name || data.display_name.split(',')[0],
                address: data.display_name
            };
            
            showLocationOnMap(location);
        })
        .catch(error => {
            console.error('Reverse geocoding error:', error);
        });
}

// Center map on user location
function centerMapOnUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
                
                if (currentLocationMarker) {
                    map.removeLayer(currentLocationMarker);
                }
                
                currentLocationMarker = L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup('Your location')
                    .openPopup();
                    
                // Show nearby facilities to user's location
                showNearbyFacilities(latitude, longitude);
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
    // Permission check placeholder
}

// Register service worker
function registerServiceWorker() {
    // Already registered in HTML
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

// Toggle side menu
function toggleMenu() {
    sideMenu.classList.toggle('open');
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
