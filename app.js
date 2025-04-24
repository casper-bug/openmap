// Initialize the map
let map;
let currentLocationMarker;
let userPositionMarker;
let routePolyline;
let searchResults = [];
let deferredPrompt;
let watchId = null;

// Navigation state
const navigationState = {
    active: false,
    route: null,
    currentStepIndex: 0,
    userPosition: null,
    watchId: null,
    waypoints: [],
    remainingDistance: 0,
    remainingTime: 0,
    destination: null
};

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
const navigateBtn = document.getElementById('navigateBtn');
const themeToggle = document.getElementById('themeToggle');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const navigationStartPanel = document.getElementById('navigationStart');
const closeNavStartBtn = document.getElementById('closeNavStartBtn');
const startLocationInput = document.getElementById('startLocationInput');
const endLocationInput = document.getElementById('endLocationInput');
const useCurrentLocationBtn = document.getElementById('useCurrentLocationBtn');
const startNavigationBtn = document.getElementById('startNavigationBtn');
const navigationPanel = document.getElementById('navigationPanel');
const closeNavBtn = document.getElementById('closeNavBtn');
const stopNavBtn = document.getElementById('stopNavBtn');
const navDestinationName = document.getElementById('navDestinationName');

// Initialize the application
function initApp() {
    initMap();
    setupEventListeners();
    checkSavedTheme();
    checkGeolocationPermission();
    registerServiceWorker();
    listenForInstallPrompt();
}

// Initialize Leaflet map with current location
function initMap() {
    // Default coordinates (London)
    let defaultLat = 51.505;
    let defaultLng = -0.09;
    let defaultZoom = 13;

    // Try to get current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                defaultLat = position.coords.latitude;
                defaultLng = position.coords.longitude;
                defaultZoom = 15;
                createMap(defaultLat, defaultLng, defaultZoom);
                centerMapOnUserLocation();
            },
            (error) => {
                console.error('Error getting location:', error);
                createMap(defaultLat, defaultLng, defaultZoom);
            }
        );
    } else {
        createMap(defaultLat, defaultLng, defaultZoom);
    }
}

function createMap(lat, lng, zoom) {
    map = L.map('map').setView([lat, lng], zoom);
    
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
    
    // Navigate button
    navigateBtn.addEventListener('click', showNavigationStartPanel);
    
    // Navigation start panel
    closeNavStartBtn.addEventListener('click', () => {
        navigationStartPanel.classList.remove('open');
    });
    
    // Use current location button
    useCurrentLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    startLocationInput.value = "Current Location";
                    startLocationInput.dataset.lat = position.coords.latitude;
                    startLocationInput.dataset.lng = position.coords.longitude;
                },
                (error) => {
                    showNavigationAlert('Could not get current location');
                }
            );
        } else {
            showNavigationAlert('Geolocation not supported');
        }
    });
    
    // Start navigation button
    startNavigationBtn.addEventListener('click', startNavigationFromPanel);
    
    // Navigation panel
    closeNavBtn.addEventListener('click', stopNavigation);
    stopNavBtn.addEventListener('click', stopNavigation);
    
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
            showNavigationAlert('Bookmarks feature will be implemented');
            break;
        case 'Download Maps':
            showNavigationAlert('Map download feature will be implemented');
            break;
        case 'Route Planner':
            showNavigationAlert('Route planner feature will be implemented');
            break;
        case 'Navigation':
            showNavigationAlert('Navigation feature will be implemented');
            break;
        case 'Settings':
            showNavigationAlert('Settings feature will be implemented');
            break;
        case 'About':
            showNavigationAlert('Organic Maps PWA Clone\nVersion 1.0');
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
            showNavigationAlert('No results found');
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
        showNavigationAlert('Error performing search');
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
        if (layer instanceof L.Marker && layer === userPositionMarker) {
            return;
        }
        if (layer instanceof L.Marker && layer.options.icon?.options?.className === 'facility-marker') {
            return;
        }
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    // Add destination marker
    currentLocationMarker = L.marker([location.lat, location.lng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '<i class="fas fa-map-marker-alt"></i>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(map)
    .bindPopup(`<b>${location.name}</b><br>${location.address}`);
    
    // Update location info panel
    document.getElementById('locationTitle').textContent = location.name || location.display_name.split(',')[0];
    document.getElementById('locationAddress').textContent = location.address || location.display_name;
    locationInfoPanel.classList.add('open');
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
                
                if (userPositionMarker) {
                    map.removeLayer(userPositionMarker);
                }
                
                userPositionMarker = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        className: 'user-marker',
                        html: '<i class="fas fa-user"></i>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    }),
                    zIndexOffset: 1000
                }).addTo(map).bindPopup('Your position');
                
                // Show nearby facilities to user's location
                showNearbyFacilities(latitude, longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                showNavigationAlert('Could not get your location. Please check your permissions.');
            }
        );
    } else {
        showNavigationAlert('Geolocation is not supported by your browser.');
    }
}

// Navigation functions

function showNavigationStartPanel() {
    if (!currentLocationMarker) {
        showNavigationAlert('Please select a destination first');
        return;
    }
    
    // Set the end location (destination)
    endLocationInput.value = document.getElementById('locationTitle').textContent;
    navigationStartPanel.classList.add('open');
}

function startNavigationFromPanel() {
    const destination = {
        lat: currentLocationMarker.getLatLng().lat,
        lng: currentLocationMarker.getLatLng().lng,
        name: document.getElementById('locationTitle').textContent,
        address: document.getElementById('locationAddress').textContent
    };
    
    // Check if start location is set
    if (!startLocationInput.value) {
        showNavigationAlert('Please enter a start location');
        return;
    }
    
    // If using current location
    if (startLocationInput.value === "Current Location" && startLocationInput.dataset.lat) {
        const start = {
            lat: parseFloat(startLocationInput.dataset.lat),
            lng: parseFloat(startLocationInput.dataset.lng)
        };
        calculateRoute(start, destination);
    } else {
        // Geocode the entered address
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocationInput.value)}`)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    showNavigationAlert('Start location not found');
                    return;
                }
                const start = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                calculateRoute(start, destination);
            })
            .catch(error => {
                showNavigationAlert('Error finding start location');
            });
    }
}

function calculateRoute(start, destination) {
    // Use OSRM demo server for routing
    fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                startNavigation(data.routes[0], destination);
            } else {
                showNavigationAlert('No route found');
            }
        })
        .catch(error => {
            console.error('Routing error:', error);
            showNavigationAlert('Error calculating route');
        });
}

function startNavigation(route, destination) {
    // Close start panel
    navigationStartPanel.classList.remove('open');
    
    // Set navigation state
    navigationState.active = true;
    navigationState.route = route;
    navigationState.destination = destination;
    navigationState.currentStepIndex = 0;
    navigationState.remainingDistance = route.distance;
    navigationState.remainingTime = route.duration;
    
    // Show route on map
    showRoute(route);
    
    // Start position tracking
    startPositionTracking();
    
    // Show navigation panel
    showNavigationPanel();
}

function showRoute(route) {
    // Remove previous route if any
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    
    // Add new route
    routePolyline = L.geoJSON(route.geometry, {
        style: {
            color: '#4CAF50',
            weight: 5,
            opacity: 0.7
        }
    }).addTo(map);
    
    // Fit map to route bounds
    const bounds = routePolyline.getBounds();
    map.fitBounds(bounds, { padding: [50, 50] });
}

function startPositionTracking() {
    if (navigator.geolocation) {
        navigationState.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, heading, speed } = position.coords;
                navigationState.userPosition = {
                    lat: latitude,
                    lng: longitude,
                    heading: heading,
                    speed: speed
                };
                
                // Update user position marker
                if (!userPositionMarker) {
                    userPositionMarker = L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'user-marker',
                            html: '<i class="fas fa-user"></i>',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        }),
                        zIndexOffset: 1000
                    }).addTo(map).bindPopup('Your position');
                } else {
                    userPositionMarker.setLatLng([latitude, longitude]);
                }
                
                // Update navigation
                updateNavigation();
                
                // Auto-pan map to keep user visible
                map.panTo([latitude, longitude], {
                    animate: true,
                    duration: 0.5
                });
            },
            (error) => {
                console.error('Geolocation error:', error);
                handleTrackingError(error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );
    } else {
        showNavigationAlert('Geolocation is not supported by your browser.');
    }
}

function updateNavigation() {
    if (!navigationState.route || !navigationState.userPosition) return;
    
    // Convert to Turf.js format
    const userPoint = turf.point([
        navigationState.userPosition.lng,
        navigationState.userPosition.lat
    ]);
    
    const routeLine = turf.lineString(
        navigationState.route.geometry.coordinates.map(coord => [coord[0], coord[1]])
    );
    
    // Find nearest point on route
    const nearest = turf.nearestPointOnLine(routeLine, userPoint, { units: 'meters' });
    
    // Update remaining distance
    navigationState.remainingDistance = nearest.properties.dist;
    
    // Update UI
    updateNavigationUI();
    
    // Check if arrived
    if (navigationState.remainingDistance < 50) {
        showNavigationAlert('You have arrived at your destination');
        stopNavigation();
    }
}

function showNavigationPanel() {
    navDestinationName.textContent = navigationState.destination.name;
    navigationPanel.classList.add('open');
    updateNavigationUI();
}

function updateNavigationUI() {
    if (!navigationState.route) return;
    
    // Update progress
    const progress = (navigationState.route.distance - navigationState.remainingDistance) / 
        navigationState.route.distance * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    // Update distance and time
    document.getElementById('distanceRemaining').textContent = 
        formatDistance(navigationState.remainingDistance);
    
    const remainingTime = navigationState.remainingDistance / 
        (navigationState.userPosition?.speed || 10); // 10 m/s default if speed not available
    document.getElementById('timeRemaining').textContent = 
        `${Math.round(remainingTime / 60)} min`;
    
    // Update instructions (simplified for this example)
    document.getElementById('currentInstruction').textContent = 
        `Continue on route (${formatDistance(navigationState.remainingDistance)} remaining)`;
}

function stopNavigation() {
    navigationState.active = false;
    
    // Stop position tracking
    if (navigationState.watchId) {
        navigator.geolocation.clearWatch(navigationState.watchId);
        navigationState.watchId = null;
    }
    
    // Remove route from map
    if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
    }
    
    // Close navigation panel
    navigationPanel.classList.remove('open');
}

function handleTrackingError(error) {
    let message = 'Navigation error: ';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += 'Location access denied. Please enable location services.';
            break;
        case error.POSITION_UNAVAILABLE:
            message += 'Location information unavailable.';
            break;
        case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
        default:
            message += 'Unknown error occurred.';
    }
    
    showNavigationAlert(message);
    stopNavigation();
}

function formatDistance(meters) {
    if (meters < 50) return `${Math.round(meters)} meters`;
    if (meters < 1000) return `${Math.round(meters/10)*10} meters`;
    return `${(meters/1000).toFixed(1)} km`;
}

// Utility functions

function toggleMenu() {
    sideMenu.classList.toggle('open');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function checkSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
}

function checkGeolocationPermission() {
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({name: 'geolocation'}).then(result => {
            if (result.state === 'granted') {
                console.log('Geolocation permission granted');
            } else if (result.state === 'prompt') {
                console.log('Geolocation permission not yet decided');
            } else {
                console.log('Geolocation permission denied');
            }
        });
    }
}

function registerServiceWorker() {
    // Already registered in HTML
}

function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
}

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

function showNavigationAlert(message) {
    errorMessage.textContent = message;
    errorAlert.style.display = 'flex';
    
    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
