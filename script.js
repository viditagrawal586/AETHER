document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. BOOT SEQUENCE (UNCHANGED)
    // ==========================================
    const terminal = document.getElementById('terminal-output');
    const progBar = document.getElementById('progress-bar');
    const lines = ["MOUNTING SATELLITE INTERFACE...", "ENCRYPTING CHANNEL...", "AETHER V.2.0 ONLINE."];
    let step = 0;
    function runBoot() {
        if(step < lines.length) {
            terminal.innerText = `> ${lines[step]}`;
            progBar.style.width = `${((step + 1) / lines.length) * 100}%`;
            step++;
            setTimeout(runBoot, 1000);
        }
    }
    runBoot();

    // ==========================================
    // 2. THREE.JS GLOBE (UNCHANGED)
    // ==========================================
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const geometry = new THREE.SphereGeometry(10, 50, 50);
    const material = new THREE.PointsMaterial({ color: 0x00f2ff, size: 0.05, transparent: true, opacity: 0.4 });
    const globeDots = new THREE.Points(geometry, material);
    globeGroup.add(globeDots);

    camera.position.z = 12.5;
    let scrollVelocity = 0;
    let lastScrollPos = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        scrollVelocity = (currentScroll - lastScrollPos) * 0.05;
        const maxScroll = 2500;
        const scrollFactor = Math.min(currentScroll / maxScroll, 1);
        camera.position.z = 12.5 - (scrollFactor * 8.75);
        lastScrollPos = currentScroll;
    });

    function animate() {
        requestAnimationFrame(animate);
        const baseSpeed = 0.0008;
        globeGroup.rotation.y += baseSpeed + (scrollVelocity * 0.1);
        globeGroup.rotation.x += baseSpeed * 0.5;
        scrollVelocity *= 0.95;
        renderer.render(scene, camera);
    }
    animate();

    // ==========================================
    // 3. UI LOGIC (UPDATED)
    // ==========================================
    const processBtn = document.getElementById('processBtn');
    const detailsBtn = document.getElementById('detailsBtn');
    const previewContainer = document.getElementById('preview-container');
    const detailsModal = document.getElementById('details-modal');
    const closeModal = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');
    const consoleLog = document.getElementById('console-output');

    // Store the backend response here
    let latestPredictionData = { status: "N/A", confidence: "0%", mask: null };

    // Navigation Handlers
    document.getElementById('enter-btn').onclick = () => document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('team-link').onclick = (e) => { e.preventDefault(); document.getElementById('team-section').classList.add('active'); };
    document.getElementById('back-btn').onclick = () => document.getElementById('team-section').classList.remove('active');

    // File Upload Handling
    const fileInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('drop-zone');
    const previewImg = document.getElementById('preview-img');

    dropZone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewContainer.classList.add('active');
                processBtn.disabled = false;
                processBtn.innerText = "INITIATE ANALYSIS";
                detailsBtn.style.display = 'none';
                log("IMAGE BUFFERED. READY FOR X-RAY SCAN.");
            };
            reader.readAsDataURL(file);
        }
    };

    // --- MAIN CONNECTION LOGIC ---
    processBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Visual Updates
        processBtn.disabled = true;
        processBtn.innerText = "CONNECTING TO SERVER...";
        previewContainer.classList.add('scanning'); // Start green laser
        window.scrollBy({ top: 350, behavior: 'smooth' }); // Maintain scroll effect
        log("ESTABLISHING UPLINK TO PYTHON BACKEND...");

        // Prepare Data
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Fetch from Flask Backend
            const response = await fetch('http://127.0.0.1:5000/api/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Success Handling
            previewContainer.classList.remove('scanning');
            processBtn.innerText = "ANALYSIS COMPLETE";
            processBtn.disabled = false;
            detailsBtn.innerText = "OPEN TACTICAL MAP"; // Updated Text
            detailsBtn.style.display = 'block';

            // Store data AND the mask image
            latestPredictionData = {
                status: data.prediction,
                confidence: data.confidence,
                mask: data.mask_image
            };

            log(`SCAN COMPLETE. SERVER RESPONSE: ${latestPredictionData.status}`);

        } catch (error) {
            console.error("Connection Error:", error);
            previewContainer.classList.remove('scanning');
            processBtn.innerText = "CONNECTION FAILED";
            processBtn.disabled = false;
            log("ERROR: COULD NOT CONNECT TO BACKEND (Is server.py running?)");
        }
    };

    // --- MODAL LOGIC (Blockchain + Visuals) ---
    detailsBtn.onclick = () => {
        const status = latestPredictionData.status;
        const conf = latestPredictionData.confidence;

        // Handle Mask Image (Add Header for Base64)
        const maskSrc = latestPredictionData.mask ?
            "data:image/png;base64," + latestPredictionData.mask : "";

        const isSurvivor = status.toUpperCase().includes('SURVIVOR');
        const statusColor = isSurvivor ? '#ff3333' : '#fff';

        modalBody.innerHTML = `
            <p><strong>MISSION ID:</strong> AETHER-${Math.floor(Math.random()*10000)}</p>
            <p><strong>GRID REF:</strong> 28.6139° N, 77.2090° E</p>
            <hr style="border-color: #333; margin: 10px 0;">
            <p style="font-size: 1.2rem; color: ${statusColor}; text-shadow: 0 0 10px ${statusColor};">
                <strong>> STATUS: ${status.toUpperCase()}</strong>
            </p>
            <p><strong>AI CONFIDENCE:</strong> ${conf}</p>

            <hr style="border-color: #333; margin: 15px 0;">
//            <p style="margin-bottom: 10px;"><strong>> TACTICAL MAP (RED =   SURVIVOR):</strong></p>
            <div style="border: 1px solid #00f2ff; padding: 5px; display: inline-block; background: #000;">
                <img src="${maskSrc}" style="width: 100%; max-width: 300px; display: block;" alt="Waiting for AI Render...">
            </div>

            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="alert('> DEPLOYMENT SIGNAL SENT. DRONES EN ROUTE.')" class="action-btn" style="border-color: #ff3333; color: #ff3333;">
                    ⚠ DISPATCH DRONE RESCUE
                </button>
            </div>
        `;
        detailsModal.style.display = 'flex';

        // TRIGGER THE FAKE BLOCKCHAIN LOGS
        runBlockchainSimulation(isSurvivor);
    };

    closeModal.onclick = () => detailsModal.style.display = 'none';

    function log(msg) {
        const p = document.createElement('p');
        p.innerText = `> ${msg}`;
        consoleLog.prepend(p);
    }
});

// ==========================================
// 4. BLOCKCHAIN SIMULATION HELPER
// ==========================================
function runBlockchainSimulation(isSurvivor) {
    // Target the terminal div we added to index.html
    const terminal = document.getElementById('bc-logs');
    const container = document.getElementById('blockchain-terminal');

    if(!terminal || !container) return; // Safety check

    container.style.display = 'block';
    terminal.innerHTML = ""; // Clear old logs

    if (!isSurvivor) {
        terminal.innerHTML = `<span style="color: #666;">> NO SURVIVOR DETECTED. SMART CONTRACT IDLE.</span>`;
        return;
    }

    // Generate Fake Data
    const txHash = "0x" + Array(64).fill(0).map(()=>Math.floor(Math.random()*16).toString(16)).join('');
    const blockNum = Math.floor(Math.random() * (15000000 - 14000000) + 14000000);
    const gasUsed = Math.floor(Math.random() * (210000 - 50000) + 50000);

    // Sequence of Logs
    const steps = [
        { msg: "INITIALIZING SMART CONTRACT 'AetherRescue.sol'...", color: "#fff", delay: 0 },
        { msg: `> CONNECTING TO ETHEREUM MAINNET (Block ${blockNum})...`, color: "#aaa", delay: 400 },
        { msg: "> VERIFYING SURVIVOR COORDINATES ON-CHAIN...", color: "#aaa", delay: 800 },
        { msg: `> GAS ESTIMATE: ${gasUsed} Gwei`, color: "#aaa", delay: 1200 },
        { msg: `> TRANSACTION CONFIRMED: ${txHash.substring(0, 25)}...`, color: "#00ff41", delay: 1800 },
        { msg: "> RESCUE FUNDS RELEASED TO LOCAL NGO WALLET.", color: "#00f2ff", delay: 2200 }
    ];

    // Play Animation
    steps.forEach(step => {
        setTimeout(() => {
            terminal.innerHTML += `<div style="color: ${step.color}; margin-bottom: 3px;">${step.msg}</div>`;
            terminal.scrollTop = terminal.scrollHeight;
        }, step.delay);
    });
}