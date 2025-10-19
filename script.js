// Global variables
const colors = ['#4dabf7', '#ff6b6b', '#51cf66', '#ffd43b', '#ff66d9', '#66d9ff'];
let scene, camera, renderer;
let equations = [
    { equation: 'sin(x) + cos(y)', color: colors[0] },
    { equation: '', color: colors[1] }
];
let dimension = '3D';
let is2D = false;
let timeEnabled = false;
let timeValue = 0;
let isAnimating = false;
let animationId = null;
let resolution = 50;
let axisRange = 5;
let activeInput = null;

// Camera controls
let isDragging = false;
let isPanning = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 4 };
let cameraDistance = 12;
let cameraTarget = new THREE.Vector3(0, 0, 0);

// Initialize Three.js
function init() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    updateCameraPosition();
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 1.2);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.6);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0x4dabf7, 0.4);
    pointLight3.position.set(0, 10, 0);
    scene.add(pointLight3);
    
    const gridHelper = new THREE.GridHelper(axisRange * 4, 20, 0x3a3a6e, 0x2a2a4e);
    scene.add(gridHelper);
    
    setupControls();
    
    window.addEventListener('resize', onWindowResize);
    
    updateGraph();
    animate();
}

function updateCameraPosition() {
    const distance = axisRange * 2.4;
    cameraDistance = Math.max(distance, cameraDistance);
    
    const x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
    const y = cameraDistance * Math.cos(cameraRotation.phi);
    const z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
    
    camera.position.set(
        cameraTarget.x + x,
        cameraTarget.y + y,
        cameraTarget.z + z
    );
    camera.lookAt(cameraTarget);
}

function setupControls() {
    const canvas = renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isDragging = true;
        } else if (e.button === 1 || e.button === 2) {
            isPanning = true;
            e.preventDefault();
        }
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        if (isDragging) {
            cameraRotation.theta -= deltaX * 0.01;
            cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.phi - deltaY * 0.01));
            updateCameraPosition();
        } else if (isPanning) {
            const panSpeed = axisRange * 0.002;
            const right = new THREE.Vector3();
            const up = new THREE.Vector3(0, 1, 0);
            
            camera.getWorldDirection(right);
            right.cross(up).normalize();
            
            cameraTarget.add(right.multiplyScalar(-deltaX * panSpeed));
            cameraTarget.y += deltaY * panSpeed;
            
            updateCameraPosition();
        }
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        isPanning = false;
    });
    
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * 0.001;
        cameraDistance = Math.max(2, Math.min(axisRange * 10, cameraDistance * (1 + delta)));
        updateCameraPosition();
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        isPanning = false;
    });
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function setDimension(dim) {
    dimension = dim;
    is2D = dim === '2D';
    
    document.querySelectorAll('.btn-dimension').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === dim) {
            btn.classList.add('active');
        }
    });
    
    cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 4 };
    cameraDistance = axisRange * 2.4;
    cameraTarget = new THREE.Vector3(0, 0, 0);
    
    if (dim === '2D') {
        timeEnabled = false;
        equations = [
            { equation: 'sin(x)', color: colors[0] },
            { equation: '', color: colors[1] }
        ];
        document.getElementById('equation-label').textContent = '(y =)';
        document.getElementById('time-control').style.display = 'none';
        document.getElementById('color-dimension-section').style.display = 'none';
        cameraRotation.phi = Math.PI / 2;
    } else if (dim === '3D') {
        timeEnabled = false;
        equations = [
            { equation: 'sin(x) + cos(y)', color: colors[0] },
            { equation: '', color: colors[1] }
        ];
        document.getElementById('equation-label').textContent = '(z =)';
        document.getElementById('time-control').style.display = 'none';
        document.getElementById('color-dimension-section').style.display = 'none';
    } else if (dim === '4D') {
        timeEnabled = true;
        equations = [
            { equation: 'sin(x + t) + cos(y + t)', color: colors[0] },
            { equation: '', color: colors[1] }
        ];
        document.getElementById('equation-label').textContent = '(z =)';
        document.getElementById('time-control').style.display = 'block';
        document.getElementById('color-dimension-section').style.display = 'none';
    } else if (dim === '5D') {
        timeEnabled = true;
        equations = [
            { equation: 'sin(x + t) + cos(y + t)', color: colors[0] },
            { equation: '', color: colors[1] }
        ];
        document.getElementById('equation-label').textContent = '(z =)';
        document.getElementById('time-control').style.display = 'block';
        document.getElementById('color-dimension-section').style.display = 'block';
        document.getElementById('color-dimension').value = 'x^2 + y^2';
    }
    
    updateCameraPosition();
    updateResolution();
    renderEquationInputs();
    updateGraph();
}

function renderEquationInputs() {
    const container = document.getElementById('equations-container');
    container.innerHTML = '';
    
    equations.forEach((eq, idx) => {
        const row = document.createElement('div');
        row.className = 'equation-row';
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-indicator';
        colorDiv.style.backgroundColor = eq.color;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = eq.equation;
        input.placeholder = is2D ? 'sin(x)' : 'sin(x) + cos(y)';
        input.onfocus = () => { activeInput = input; };
        input.oninput = () => updateEquation(idx, input.value);
        
        row.appendChild(colorDiv);
        row.appendChild(input);
        
        if (equations.length > 2 && eq.equation.trim() !== '') {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove';
            removeBtn.textContent = '✕';
            removeBtn.onclick = () => removeEquation(idx);
            row.appendChild(removeBtn);
        }
        
        container.appendChild(row);
    });
}

function updateEquation(index, value) {
    equations[index].equation = value;
    
    const filledEquations = equations.filter(eq => eq.equation.trim() !== '');
    if (filledEquations.length === equations.length && equations.length < 6) {
        equations.push({ equation: '', color: colors[equations.length % colors.length] });
        renderEquationInputs();
    }
    
    updateGraph();
    if (document.getElementById('show-intersections').checked) {
        findAndDisplayIntersections();
    }
}

function removeEquation(index) {
    equations = equations.filter((_, i) => i !== index);
    if (equations.length < 2) {
        equations.push({ equation: '', color: colors[equations.length % colors.length] });
    }
    renderEquationInputs();
    updateGraph();
    if (document.getElementById('show-intersections').checked) {
        findAndDisplayIntersections();
    }
}

function toggleKeyboard() {
    const keyboard = document.getElementById('math-keyboard');
    const button = document.getElementById('keyboard-toggle');
    
    if (keyboard.style.display === 'none') {
        keyboard.style.display = 'block';
        button.textContent = 'Hide Math Keyboard ⌨️';
    } else {
        keyboard.style.display = 'none';
        button.textContent = 'Show Math Keyboard ⌨️';
    }
}

function insertSymbol(symbol) {
    if (!activeInput) {
        const inputs = document.querySelectorAll('#equations-container input[type="text"]');
        if (inputs.length > 0) {
            activeInput = inputs[0];
            activeInput.focus();
        } else {
            return;
        }
    }
    
    const start = activeInput.selectionStart;
    const end = activeInput.selectionEnd;
    const text = activeInput.value;
    
    activeInput.value = text.substring(0, start) + symbol + text.substring(end);
    activeInput.selectionStart = activeInput.selectionEnd = start + symbol.length;
    
    activeInput.focus();
    activeInput.dispatchEvent(new Event('input'));
}

function updateAxisRange() {
    axisRange = parseInt(document.getElementById('axis-range').value);
    document.getElementById('range-label').textContent = `-${
