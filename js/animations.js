var scene = new THREE.Scene();
scene.background = new THREE.Color(0x04040a);


var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const globeRadius = 500;
const globeSegments = 50;
const RINGS = 50;
const globeWidth = 4098 / 2
const globeHeight = 1968 / 2
const globe = new THREE.Group();
scene.add(globe);

var loader = new THREE.TextureLoader();
loader.load('image.jpg', function (texture) {
    var sphere = new THREE.SphereGeometry(globeRadius, globeSegments, RINGS);
    var material = new THREE.MeshLambertMaterial({ map: texture });
    var mesh = new THREE.Mesh(sphere, material);
    globe.add(mesh);
});

hemiLight = new THREE.HemisphereLight(0xfdffd9, 0x5359a3, 0.6);
scene.add(hemiLight);

ambLight = new THREE.AmbientLight(0xFFFFFF, 0.2);
scene.add(ambLight);

dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
				dirLight.color.setHSL( 0.1, 1, 0.95 );
				dirLight.position.set( - 1, 1.75, 1 );
				dirLight.position.multiplyScalar( 30 );
				scene.add( dirLight );

const camera = {
    object: null,
    orbitControls: null,
    angles: {
        current: {
            azimuthal: null,
            polar: null,
        },
        target: {
            azimuthal: null,
            polar: null,
        },
    },
    transition: {
        current: 0,
        target: 30,
    },
}

camera.object = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.object.position.z = 900;

// A state object to hold visual state.
const state = {
    users: [
        {
            id: 0,
            name: 'John Yang',
            geo: {
                lat: 31.2304,
                lng: 121.4737,
                name: 'Shanghai, CN',
            },
            date: '01.23.2018',
        },
        {
            id: 1,
            name: 'Emma S.',
            geo: {
                lat: 55.6761,
                lng: 12.5683,
                name: 'Denmark, CPH',
            },
            date: '09.20.2018',
        },
        {
            id: 2,
            name: 'Spencer S.',
            geo: {
                lat: 34.0522,
                lng: -118.2437,
                name: 'Los Angeles, CA',
            },
            date: '12.25.2018',
        },
    ],
    currentUserIndex: null,
    previousUserIndex: null,
    isGlobeAnimating: false,
    // Property to save our setInterval id to auto rotate the globe every n seconds
    autoRotateGlobeTimer: null,
}

camera.orbitControls = new THREE.OrbitControls(camera.object, renderer.domElement)
camera.orbitControls.enableKeys = false
camera.orbitControls.enablePan = false
camera.orbitControls.enableZoom = true
camera.orbitControls.enableDamping = false
camera.orbitControls.enableRotate = true
camera.object.position.z = 900;
camera.orbitControls.update()


state.autoRotateGlobeTimer = setInterval(() => {
    focusUser()
}, 10000)


function focusUser() {
    if (state.users.length > 0) {
        if (state.currentUserIndex === null) {
            // If there is no current user (when our page first loads), we'll pick one randomly.
            state.currentUserIndex = Math.floor(Math.random() * 1)
        } else {
            // If we already have an index (page has already been loaded/user already clicked next), we'll continue the sequence.
            state.previousUserIndex = state.currentUserIndex
            state.currentUserIndex = (state.currentUserIndex + 1) % state.users.length
        }

        focusGlobe()
    }
}

function focusGlobe() {
    // 1. We'll get the current user's lat/lng
    // 2. Set camera.angles.current
    // 3. Calculate and set camera.angles.target
    // 4. animate method will handle animating
    const { geo } = state.users[state.currentUserIndex]
    camera.angles.current.azimuthal = camera.orbitControls.getAzimuthalAngle()
    camera.angles.current.polar = camera.orbitControls.getPolarAngle()
    const { x, y } = convertLatLngToFlatCoords(geo.lat, geo.lng)
    const { azimuthal, polar } = returnCameraAngles(x, y)
    camera.angles.target.azimuthal = azimuthal
    camera.angles.target.polar = polar
    // Updating state here will make sure our animate method will rotate our globe to the next point.
    // It will also make sure we update & cache our popup DOM element so we can use it in our animateGlobeToNextLocation.
    state.isGlobeAnimating = true
}

var animate = function () {
    requestAnimationFrame(animate);
    renderer.render(scene, camera.object);
    if (state.isGlobeAnimating) {
        animateGlobeToNextLocation()
        camera.orbitControls.update()
    }

};

animate();

function animateGlobeToNextLocation() {
    const { current, target } = camera.transition
    if (current <= target) {
        const progress = easeInOutCubic(current / target)
        const {
            current: { azimuthal: currentAzimuthal, polar: currentPolar },
            target: { azimuthal: targetAzimuthal, polar: targetPolar },
        } = camera.angles
        var azimuthalDifference = (currentAzimuthal - targetAzimuthal) * progress
        azimuthalDifference = currentAzimuthal - azimuthalDifference
        camera.orbitControls.setAzimuthalAngle(azimuthalDifference)
        var polarDifference = (currentPolar - targetPolar) * progress
        polarDifference = currentPolar - polarDifference
        camera.orbitControls.setPolarAngle(polarDifference)
        camera.transition.current++
    } else {
        state.isGlobeAnimating = false
        camera.transition.current = 0
    }
}

function convertLatLngToSphereCoords(latitude, longitude) {
    const phi = (latitude * Math.PI) / 180
    const theta = ((longitude - 180) * Math.PI) / 180
    const x = -(globeRadius + -1) * Math.cos(phi) * Math.cos(theta)
    const y = (globeRadius + -1) * Math.sin(phi)
    const z = (globeRadius + -1) * Math.cos(phi) * Math.sin(theta)
    return new THREE.Vector3(x, y, z)
}

function convertFlatCoordsToSphereCoords(x, y) {
    // Calculate the relative 3d coordinates using Mercator projection relative to the radius of the globe.
    // Convert latitude and longitude on the 90/180 degree axis.
    let latitude = ((x - globeWidth) / globeWidth) * -180
    let longitude = ((y - globeHeight) / globeHeight) * -90
    latitude = (latitude * Math.PI) / 180 //(latitude / 180) * Math.PI
    longitude = (longitude * Math.PI) / 180 //(longitude / 180) * Math.PI // Calculate the projected starting point
    const radius = Math.cos(longitude) * globeRadius
    const targetX = Math.cos(latitude) * radius
    const targetY = Math.sin(longitude) * globeRadius
    const targetZ = Math.sin(latitude) * radius
    return {
        x: targetX,
        y: targetY,
        z: targetZ,
    }
}

function convertLatLngToFlatCoords(latitude, longitude) {
    // Reference: https://stackoverflow.com/questions/7019101/convert-pixel-location-to-latitude-longitude-vise-versa
    const x = Math.round((longitude + 180) * (globeWidth / 360)) * 2
    const y = Math.round((-1 * latitude + 90) * (globeHeight / 180)) * 2
    return { x, y }
}

// Returns a 2d position based off of the canvas width and height to position popups on the globe.
function getProjectedPosition(
    width,
    height,
    position,
    contentWidth,
    contentHeight
) {
    position = position.clone()
    var projected = position.project(camera.object)
    return {
        x: projected.x * width + width - contentWidth / 2,
        y: -(projected.y * height) + height - contentHeight - 10, // -10 for a small offset
    }
}

// Returns an object of the azimuthal and polar angles of a given a points x,y coord on the globe
function returnCameraAngles(x, y) {
    let targetAzimuthalAngle = ((x - globeWidth) / globeWidth) * Math.PI
    targetAzimuthalAngle = targetAzimuthalAngle + Math.PI / 2
    targetAzimuthalAngle += 0.3 // Add a small horizontal offset
    let targetPolarAngle = (y / (globeHeight * 2)) * Math.PI
    targetPolarAngle += 0.1 // Add a small vertical offset
    return {
        azimuthal: targetAzimuthalAngle,
        polar: targetPolarAngle,
    }
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}

function getRandomNumberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
