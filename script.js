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
    pointLight3.position.set(0, axisRange * 2, 0);
    scene.add(pointLight3);
    
    const gridHelper = new THREE.GridHelper(axisRange * 4, Math.min(axisRange * 2, 40), 0x3a3a6e, 0x2a2a4e);
    if (is2D) {
        gridHelper.rotation.x = Math.PI / 2;
    }
    scene.add(gridHelper);
    
    renderAxes();
    renderAxisLabels();
    renderEquations();
}

function renderAxes() {
    const showAxes = document.getElementById('show-axes').checked;
    if (!showAxes) return;
    
    const axisLength = axisRange * 2;
    
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b, linewidth: 2 });
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axisLength, 0, 0),
        new THREE.Vector3(axisLength, 0, 0)
    ]);
    scene.add(new THREE.Line(xGeometry, xMaterial));
    
    if (is2D) {
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x51cf66, linewidth: 2 });
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        scene.add(new THREE.Line(yGeometry, yMaterial));
    } else {
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x51cf66, linewidth: 2 });
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -axisLength),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        scene.add(new THREE.Line(yGeometry, yMaterial));
        
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x4dabf7, linewidth: 2 });
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        scene.add(new THREE.Line(zGeometry, zMaterial));
    }
}

function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.fillStyle = color;
    context.font = 'Bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    const scale = axisRange * 0.15;
    sprite.scale.set(scale, scale * 0.5, 1);
    
    return sprite;
}

function renderAxisLabels() {
    const showValues = document.getElementById('show-values').checked;
    if (!showValues) return;
    
    const step = Math.max(1, Math.floor(axisRange / 5));
    const positions = [];
    for (let i = -axisRange; i <= axisRange; i += step) {
        positions.push(i);
    }
    
    positions.forEach(pos => {
        if (pos === 0) return;
        const sprite = createTextSprite(pos.toString(), '#ff6b6b');
        sprite.position.set(pos, -axisRange * 0.15, 0);
        scene.add(sprite);
    });
    
    if (is2D) {
        positions.forEach(pos => {
            if (pos === 0) return;
            const sprite = createTextSprite(pos.toString(), '#51cf66');
            sprite.position.set(-axisRange * 0.2, pos, 0);
            scene.add(sprite);
        });
    } else {
        positions.forEach(pos => {
            if (pos === 0) return;
            const sprite = createTextSprite(pos.toString(), '#51cf66');
            sprite.position.set(0, -axisRange * 0.15, pos);
            scene.add(sprite);
        });
        
        positions.forEach(pos => {
            if (pos === 0) return;
            const sprite = createTextSprite(pos.toString(), '#4dabf7');
            sprite.position.set(-axisRange * 0.2, pos, 0);
            scene.add(sprite);
        });
    }
}

function renderEquations() {
    const filledEquations = equations.filter(eq => eq.equation.trim() !== '');
    const res = is2D ? Math.min(resolution * 2, 200) : resolution;
    const colorDimension = document.getElementById('color-dimension')?.value;
    
    filledEquations.forEach(eq => {
        try {
            const parsedEq = math.compile(eq.equation);
            
            if (is2D) {
                const points = [];
                for (let i = 0; i < res; i++) {
                    const x = (i / res) * axisRange * 2 - axisRange;
                    const scope = { x, t: timeValue };
                    const y = parsedEq.evaluate(scope);
                    if (isFinite(y) && Math.abs(y) <= axisRange * 2) {
                        points.push(new THREE.Vector3(x, y, 0));
                    }
                }
                
                if (points.length > 1) {
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({ 
                        color: new THREE.Color(eq.color),
                        linewidth: 3
                    });
                    scene.add(new THREE.Line(geometry, material));
                }
            } else {
                const sphereSize = axisRange * 0.01;
                for (let i = 0; i < res; i++) {
                    for (let j = 0; j < res; j++) {
                        const x = (i / res) * axisRange * 2 - axisRange;
                        const y = (j / res) * axisRange * 2 - axisRange;
                        
                        const scope = { x, y, t: timeValue };
                        const z = parsedEq.evaluate(scope);
                        
                        if (!isFinite(z) || Math.abs(z) > axisRange * 2) continue;
                        
                        let color = eq.color;
                        if (colorDimension && colorDimension.trim() !== '') {
                            try {
                                const colorScope = { x, y, z, t: timeValue };
                                const colorValue = math.compile(colorDimension).evaluate(colorScope);
                                const normalized = ((colorValue % 10) + 10) % 10;
                                const hue = (normalized / 10) * 360;
                                color = `hsl(${hue}, 70%, 60%)`;
                            } catch (e) {
                                color = eq.color;
                            }
                        }
                        
                        const geometry = new THREE.SphereGeometry(sphereSize, 8, 8);
                        const material = new THREE.MeshStandardMaterial({ 
                            color: new THREE.Color(color),
                            metalness: 0.3,
                            roughness: 0.4
                        });
                        const sphere = new THREE.Mesh(geometry, material);
                        sphere.position.set(x, z, y);
                        scene.add(sphere);
                    }
                }
            }
        } catch (e) {
            console.error('Equation error:', e);
        }
    });
}

function findAndDisplayIntersections() {
    const showIntersections = document.getElementById('show-intersections').checked;
    const intersectionBox = document.getElementById('intersections-box');
    
    if (!showIntersections) {
        intersectionBox.style.display = 'none';
        updateGraph();
        return;
    }
    
    intersectionBox.style.display = 'block';
    
    const filledEquations = equations.filter(eq => eq.equation.trim() !== '');
    if (filledEquations.length < 2) {
        document.getElementById('intersection-count').textContent = '0';
        document.getElementById('intersection-list').innerHTML = '<div class="intersection-item">Need at least 2 equations</div>';
        updateGraph();
        return;
    }
    
    const intersections = [];
    
    try {
        for (let i = 0; i < filledEquations.length; i++) {
            for (let j = i + 1; j < filledEquations.length; j++) {
                const eq1 = math.compile(filledEquations[i].equation);
                const eq2 = math.compile(filledEquations[j].equation);
                
                if (is2D) {
                    const step = axisRange / 50;
                    for (let x = -axisRange; x <= axisRange; x += step) {
                        try {
                            const scope = { x, t: timeValue };
                            const y1 = eq1.evaluate(scope);
                            const y2 = eq2.evaluate(scope);
                            
                            if (isFinite(y1) && isFinite(y2)) {
                                const diff = Math.abs(y1 - y2);
                                if (diff < step * 2) {
                                    const isDuplicate = intersections.some(p => 
                                        Math.abs(p.x - x) < step * 3 && Math.abs(p.y - y1) < step * 3
                                    );
                                    
                                    if (!isDuplicate) {
                                        intersections.push({
                                            x: x,
                                            y: y1,
                                            z: null,
                                            equations: [i, j]
                                        });
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                } else {
                    const step = axisRange / 20;
                    for (let x = -axisRange; x <= axisRange; x += step) {
                        for (let y = -axisRange; y <= axisRange; y += step) {
                            try {
                                const scope = { x, y, t: timeValue };
                                const z1 = eq1.evaluate(scope);
                                const z2 = eq2.evaluate(scope);
                                
                                if (isFinite(z1) && isFinite(z2)) {
                                    const diff = Math.abs(z1 - z2);
                                    if (diff < step * 2) {
                                        const isDuplicate = intersections.some(p => 
                                            Math.abs(p.x - x) < step * 3 && 
                                            Math.abs(p.y - y) < step * 3 && 
                                            Math.abs(p.z - z1) < step * 3
                                        );
                                        
                                        if (!isDuplicate) {
                                            intersections.push({
                                                x: x,
                                                y: y,
                                                z: z1,
                                                equations: [i, j]
                                            });
                                        }
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Intersection error:', e);
    }
    
    const limitedIntersections = intersections.slice(0, 30);
    
    document.getElementById('intersection-count').textContent = limitedIntersections.length;
    
    const listContainer = document.getElementById('intersection-list');
    listContainer.innerHTML = '';
    
    if (limitedIntersections.length === 0) {
        listContainer.innerHTML = '<div class="intersection-item">No intersections found</div>';
    } else {
        limitedIntersections.forEach(point => {
            const div = document.createElement('div');
            div.className = 'intersection-item';
            
            if (is2D) {
                div.textContent = `x: ${point.x.toFixed(3)}, y: ${point.y.toFixed(3)}`;
            } else {
                div.textContent = `x: ${point.x.toFixed(3)}, y: ${point.y.toFixed(3)}, z: ${point.z.toFixed(3)}`;
            }
            
            if (timeEnabled) {
                div.textContent += `, t: ${timeValue.toFixed(2)}`;
            }
            
            listContainer.appendChild(div);
        });
    }
    
    updateGraph();
    limitedIntersections.forEach(point => {
        const geometry = new THREE.SphereGeometry(axisRange * 0.03, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0066,
            emissive: 0xff0066,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);
        
        if (is2D) {
            sphere.position.set(point.x, point.y, 0);
        } else {
            sphere.position.set(point.x, point.z, point.y);
        }
        
        scene.add(sphere);
    });
}

// Expose functions to global window object so HTML onclick can access them
window.setDimension = setDimension;
window.toggleKeyboard = toggleKeyboard;
window.insertSymbol = insertSymbol;
window.updateAxisRange = updateAxisRange;
window.updateTimeValue = updateTimeValue;
window.toggleAnimation = toggleAnimation;
window.updateResolution = updateResolution;
window.updateGraph = updateGraph;
window.findAndDisplayIntersections = findAndDisplayIntersections;

window.onload = () => {
    init();
    renderEquationInputs();
}; 10, 0);
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
    document.getElementById('range-label').textContent = `-${axisRange} to ${axisRange}`;
    cameraDistance = axisRange * 2.4;
    updateCameraPosition();
    updateGraph();
}

function updateTimeValue() {
    timeValue = parseFloat(document.getElementById('time-slider').value);
    document.getElementById('time-value').textContent = timeValue.toFixed(2);
    updateGraph();
    if (document.getElementById('show-intersections').checked) {
        findAndDisplayIntersections();
    }
}

function toggleAnimation() {
    isAnimating = !isAnimating;
    const btn = document.getElementById('animate-btn');
    
    if (isAnimating) {
        btn.textContent = '⏸ Stop Animation';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');
        animateTime();
    } else {
        btn.textContent = '▶ Animate';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
        if (animationId) cancelAnimationFrame(animationId);
    }
}

function animateTime() {
    if (!isAnimating) return;
    
    timeValue = (timeValue + 0.05) % (Math.PI * 4);
    document.getElementById('time-slider').value = timeValue;
    document.getElementById('time-value').textContent = timeValue.toFixed(2);
    updateGraph();
    if (document.getElementById('show-intersections').checked) {
        findAndDisplayIntersections();
    }
    
    animationId = requestAnimationFrame(animateTime);
}

function updateResolution() {
    resolution = parseInt(document.getElementById('resolution').value);
    const label = is2D ? 
        `${resolution * 2}×${resolution * 2}` : 
        `${resolution}×${resolution}×${resolution}`;
    document.getElementById('resolution-label').textContent = label;
    updateGraph();
}

function updateGraph() {
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 1.2);
    pointLight1.position.set(axisRange * 2, axisRange * 2, axisRange * 2);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.6);
    pointLight2.position.set(-axisRange * 2, -axisRange * 2, -axisRange * 2);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0x4dabf7, 0.4);
    pointLight3.position.set(0,// Global variables
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
    document.getElementById('range-label').textContent = `-${axisRange} to ${axisRange}`;
    cameraDistance = axisRange * 2.4;
    updateCameraPosition();
    updateGraph();
}

function updateTimeValue() {
    timeValue = parseFloat(document.getElementById('time-slider').value);
    document.getElementById('time-value').textContent = timeValue.toFixed(2);
    updateGraph();
    if (document.getElementById('show-intersections').checked) {
        findAndDisplayIntersections();
    }
}

function toggleAnimation() {
    isAnimating = !isAnimating;
    const btn = document.getElementById('animate-btn');
    
    if (isAnimating) {
        btn.textContent = '⏸ Stop Animation';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');
        animateTime();
    } else {
        btn.textContent = '▶ Animate';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
        if (animationId) cancelAnimationFrame(animationId);
    }
}

function animateTime() {
    if (!isAnimating) return;
    
    timeValue = (timeValue + 0.05) % (Math.PI * 4);
    document.getElementById('time-slider').value = timeValue;
    document.getElementById('time-value').textContent = timeValue.toFixed(2);
    updateGraph();
    if (document.getElementById('show-intersections').checked) {
        findAndDisplayIntersections();
    }
    
    animationId = requestAnimationFrame(animateTime);
}

function updateResolution() {
    resolution = parseInt(document.getElementById('resolution').value);
    const label = is2D ? 
        `${resolution * 2}×${resolution * 2}` : 
        `${resolution}×${resolution}×${resolution}`;
    document.getElementById('resolution-label').textContent = label;
    updateGraph();
}

function updateGraph() {
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 1.2);
    pointLight1.position.set(axisRange * 2, axisRange * 2, axisRange * 2);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.6);
    pointLight2.position.set(-axisRange * 2, -axisRange * 2, -axisRange * 2);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0x4dabf7, 0.4);
    pointLight3.position.set(0, axisRange * 2, 0);
    scene.add(pointLight3);
    
    const gridHelper = new THREE.GridHelper(axisRange * 4, Math.min(axisRange * 2, 40), 0x3a3a6e, 0x2a2a4e);
    if (is2D) {
        gridHelper.rotation.x = Math.PI / 2;
    }
    scene.add(gridHelper);
    
    renderAxes();
    renderAxisLabels();
    renderEquations();
}

function renderAxes() {
    const showAxes = document.getElementById('show-axes').checked;
    if (!showAxes) return;
    
    const axisLength = axisRange * 2;
    
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b, linewidth: 2 });
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axisLength, 0, 0),
        new THREE.Vector3(axisLength, 0, 0)
    ]);
    scene.add(new THREE.Line(xGeometry, xMaterial));
    
    if (is2D) {
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x51cf66, linewidth: 2 });
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        scene.add(new THREE.Line(yGeometry, yMaterial));
    } else {
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x51cf66, linewidth: 2 });
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -axisLength),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        scene.add(new THREE.Line(yGeometry, yMaterial));
        
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x4dabf7, linewidth: 2 });
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        scene.add(new THREE.Line(zGeometry, zMaterial));
    }
}

function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.fillStyle = color;
    context.font = 'Bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    const scale = axisRange * 0.15;
    sprite.scale.set(scale, scale * 0.5, 1);
    
    return sprite;
}

function renderAxisLabels() {
    const showValues = document.getElementById('show-values').checked;
    if (!showValues) return;
    
    const step = Math.max(1, Math.floor(axisRange / 5));
    const positions = [];
    for (let i = -axisRange; i <= axisRange; i += step) {
        positions.push(i);
    }
    
    positions.forEach(pos => {
        if (pos === 0) return;
        const sprite = createTextSprite(pos.toString(), '#ff6b6b');
        sprite.position.set(pos, -axisRange * 0.15, 0);
        scene.add(sprite);
    });
    
    if (is2D) {
        positions.forEach(pos => {
            if (pos === 0) return;
            const sprite = createTextSprite(pos.toString(), '#51cf66');
            sprite.position.set(-axisRange * 0.2, pos, 0);
            scene.add(sprite);
        });
    } else {
        positions.forEach(pos => {
            if (pos === 0) return;
            const sprite = createTextSprite(pos.toString(), '#51cf66');
            sprite.position.set(0, -axisRange * 0.15, pos);
            scene.add(sprite);
        });
        
        positions.forEach(pos => {
            if (pos === 0) return;
            const sprite = createTextSprite(pos.toString(), '#4dabf7');
            sprite.position.set(-axisRange * 0.2, pos, 0);
            scene.add(sprite);
        });
    }
}

function renderEquations() {
    const filledEquations = equations.filter(eq => eq.equation.trim() !== '');
    const res = is2D ? Math.min(resolution * 2, 200) : resolution;
    const colorDimension = document.getElementById('color-dimension')?.value;
    
    filledEquations.forEach(eq => {
        try {
            const parsedEq = math.compile(eq.equation);
            
            if (is2D) {
                const points = [];
                for (let i = 0; i < res; i++) {
                    const x = (i / res) * axisRange * 2 - axisRange;
                    const scope = { x, t: timeValue };
                    const y = parsedEq.evaluate(scope);
                    if (isFinite(y) && Math.abs(y) <= axisRange * 2) {
                        points.push(new THREE.Vector3(x, y, 0));
                    }
                }
                
                if (points.length > 1) {
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({ 
                        color: new THREE.Color(eq.color),
                        linewidth: 3
                    });
                    scene.add(new THREE.Line(geometry, material));
                }
            } else {
                const sphereSize = axisRange * 0.01;
                for (let i = 0; i < res; i++) {
                    for (let j = 0; j < res; j++) {
                        const x = (i / res) * axisRange * 2 - axisRange;
                        const y = (j / res) * axisRange * 2 - axisRange;
                        
                        const scope = { x, y, t: timeValue };
                        const z = parsedEq.evaluate(scope);
                        
                        if (!isFinite(z) || Math.abs(z) > axisRange * 2) continue;
                        
                        let color = eq.color;
                        if (colorDimension && colorDimension.trim() !== '') {
                            try {
                                const colorScope = { x, y, z, t: timeValue };
                                const colorValue = math.compile(colorDimension).evaluate(colorScope);
                                const normalized = ((colorValue % 10) + 10) % 10;
                                const hue = (normalized / 10) * 360;
                                color = `hsl(${hue}, 70%, 60%)`;
                            } catch (e) {
                                color = eq.color;
                            }
                        }
                        
                        const geometry = new THREE.SphereGeometry(sphereSize, 8, 8);
                        const material = new THREE.MeshStandardMaterial({ 
                            color: new THREE.Color(color),
                            metalness: 0.3,
                            roughness: 0.4
                        });
                        const sphere = new THREE.Mesh(geometry, material);
                        sphere.position.set(x, z, y);
                        scene.add(sphere);
                    }
                }
            }
        } catch (e) {
            console.error('Equation error:', e);
        }
    });
}

function findAndDisplayIntersections() {
    const showIntersections = document.getElementById('show-intersections').checked;
    const intersectionBox = document.getElementById('intersections-box');
    
    if (!showIntersections) {
        intersectionBox.style.display = 'none';
        updateGraph();
        return;
    }
    
    intersectionBox.style.display = 'block';
    
    const filledEquations = equations.filter(eq => eq.equation.trim() !== '');
    if (filledEquations.length < 2) {
        document.getElementById('intersection-count').textContent = '0';
        document.getElementById('intersection-list').innerHTML = '<div class="intersection-item">Need at least 2 equations</div>';
        updateGraph();
        return;
    }
    
    const intersections = [];
    
    try {
        for (let i = 0; i < filledEquations.length; i++) {
            for (let j = i + 1; j < filledEquations.length; j++) {
                const eq1 = math.compile(filledEquations[i].equation);
                const eq2 = math.compile(filledEquations[j].equation);
                
                if (is2D) {
                    const step = axisRange / 50;
                    for (let x = -axisRange; x <= axisRange; x += step) {
                        try {
                            const scope = { x, t: timeValue };
                            const y1 = eq1.evaluate(scope);
                            const y2 = eq2.evaluate(scope);
                            
                            if (isFinite(y1) && isFinite(y2)) {
                                const diff = Math.abs(y1 - y2);
                                if (diff < step * 2) {
                                    const isDuplicate = intersections.some(p => 
                                        Math.abs(p.x - x) < step * 3 && Math.abs(p.y - y1) < step * 3
                                    );
                                    
                                    if (!isDuplicate) {
                                        intersections.push({
                                            x: x,
                                            y: y1,
                                            z: null,
                                            equations: [i, j]
                                        });
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                } else {
                    const step = axisRange / 20;
                    for (let x = -axisRange; x <= axisRange; x += step) {
                        for (let y = -axisRange; y <= axisRange; y += step) {
                            try {
                                const scope = { x, y, t: timeValue };
                                const z1 = eq1.evaluate(scope);
                                const z2 = eq2.evaluate(scope);
                                
                                if (isFinite(z1) && isFinite(z2)) {
                                    const diff = Math.abs(z1 - z2);
                                    if (diff < step * 2) {
                                        const isDuplicate = intersections.some(p => 
                                            Math.abs(p.x - x) < step * 3 && 
                                            Math.abs(p.y - y) < step * 3 && 
                                            Math.abs(p.z - z1) < step * 3
                                        );
                                        
                                        if (!isDuplicate) {
                                            intersections.push({
                                                x: x,
                                                y: y,
                                                z: z1,
                                                equations: [i, j]
                                            });
                                        }
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Intersection error:', e);
    }
    
    const limitedIntersections = intersections.slice(0, 30);
    
    document.getElementById('intersection-count').textContent = limitedIntersections.length;
    
    const listContainer = document.getElementById('intersection-list');
    listContainer.innerHTML = '';
    
    if (limitedIntersections.length === 0) {
        listContainer.innerHTML = '<div class="intersection-item">No intersections found</div>';
    } else {
        limitedIntersections.forEach(point => {
            const div = document.createElement('div');
            div.className = 'intersection-item';
            
            if (is2D) {
                div.textContent = `x: ${point.x.toFixed(3)}, y: ${point.y.toFixed(3)}`;
            } else {
                div.textContent = `x: ${point.x.toFixed(3)}, y: ${point.y.toFixed(3)}, z: ${point.z.toFixed(3)}`;
            }
            
            if (timeEnabled) {
                div.textContent += `, t: ${timeValue.toFixed(2)}`;
            }
            
            listContainer.appendChild(div);
        });
    }
    
    updateGraph();
    limitedIntersections.forEach(point => {
        const geometry = new THREE.SphereGeometry(axisRange * 0.03, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0066,
            emissive: 0xff0066,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);
        
        if (is2D) {
            sphere.position.set(point.x, point.y, 0);
        } else {
            sphere.position.set(point.x, point.z, point.y);
        }
        
        scene.add(sphere);
    });
}

window.onload = () => {
    init();
    renderEquationInputs();
};
