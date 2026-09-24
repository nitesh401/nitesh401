import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = { x: 0, y: 0 };

function keepProfileVisible() {
    const holder = document.getElementById('v-card-holder');
    if (!holder) return;
    holder.style.setProperty('opacity', '1', 'important');
    holder.style.setProperty('visibility', 'visible', 'important');
    holder.style.setProperty('transform', 'none', 'important');
}

keepProfileVisible();
window.setTimeout(keepProfileVisible, 250);
window.setTimeout(keepProfileVisible, 900);
window.setTimeout(keepProfileVisible, 1800);

function setupPortfolioMotion() {
    const video = document.getElementById('portfolio-background-video');
    if (video) {
        const updateVideoScale = () => {
            const progress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
            document.documentElement.style.setProperty('--video-scale', (1.02 + progress * 0.06).toFixed(3));
        };
        window.addEventListener('scroll', updateVideoScale, { passive: true });
        updateVideoScale();
        video.play().catch(() => {});
    }

    const title = document.getElementById('name-typewriter');
    if (title && !reduceMotion) {
        const text = title.dataset.text || title.textContent.trim();
        let index = 0;
        title.textContent = '';
        const typeNext = () => {
            title.textContent = text.slice(0, index);
            index += 1;
            if (index <= text.length) window.setTimeout(typeNext, 82);
        };
        typeNext();
    }
}

setupPortfolioMotion();

function setupScene(canvas, kind = 'hero') {
    if (!canvas || reduceMotion) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.15, 7.2);
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (error) {
        const context = canvas.getContext('2d');
        if (!context) return;
        const stars = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), size: Math.random() * 1.8 + .3, alpha: Math.random() * .7 + .2 }));
        const drawFallback = (time) => {
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(rect.width, 1);
            const height = Math.max(rect.height, 1);
            canvas.width = width * Math.min(window.devicePixelRatio, 1.5);
            canvas.height = height * Math.min(window.devicePixelRatio, 1.5);
            context.setTransform(Math.min(window.devicePixelRatio, 1.5), 0, 0, Math.min(window.devicePixelRatio, 1.5), 0, 0);
            context.clearRect(0, 0, width, height);
            context.fillStyle = '#07111f';
            context.fillRect(0, 0, width, height);
            stars.forEach((star) => { context.fillStyle = `rgba(217,236,255,${star.alpha})`; context.fillRect(star.x * width, star.y * height, star.size, star.size); });
            const radius = Math.min(height * .28, 190);
            const x = width * .76 + Math.sin(time * .0003) * 12;
            const y = height * .45;
            const glow = context.createRadialGradient(x - radius * .35, y - radius * .35, radius * .1, x, y, radius * 1.4);
            glow.addColorStop(0, 'rgba(112,205,255,.9)'); glow.addColorStop(.65, 'rgba(24,63,98,.95)'); glow.addColorStop(1, 'rgba(7,17,31,0)');
            context.fillStyle = glow; context.beginPath(); context.arc(x, y, radius * 1.4, 0, Math.PI * 2); context.fill();
            context.strokeStyle = 'rgba(255,105,71,.7)'; context.lineWidth = 2; context.beginPath(); context.ellipse(x, y, radius * 1.4, radius * .35, -.2, 0, Math.PI * 2); context.stroke();
            requestAnimationFrame(drawFallback);
        };
        requestAnimationFrame(drawFallback);
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    const group = new THREE.Group();
    scene.add(group);
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index += 1) {
        const radius = 5 + Math.random() * 13;
        const angle = Math.random() * Math.PI * 2;
        starPositions[index * 3] = Math.cos(angle) * radius;
        starPositions[index * 3 + 1] = (Math.random() - 0.5) * 8;
        starPositions[index * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    group.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xd9ecff, size: 0.025, transparent: true, opacity: 0.8 })));

    const planetGroup = new THREE.Group();
    planetGroup.position.set(1.55, 0.25, 0);
    group.add(planetGroup);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(1.35, 48, 32), new THREE.MeshStandardMaterial({ color: 0x183f62, roughness: 0.78, metalness: 0.08 }));
    planetGroup.add(planet);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.43, 40, 28), new THREE.MeshBasicMaterial({ color: 0x5bd5ff, transparent: true, opacity: 0.12, side: THREE.BackSide }));
    planetGroup.add(atmosphere);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 1.84, 96), new THREE.MeshBasicMaterial({ color: 0xff6947, transparent: true, opacity: 0.65, side: THREE.DoubleSide }));
    ring.rotation.x = Math.PI / 2.65;
    planetGroup.add(ring);
    planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd7a1 })));
    planetGroup.children[3].position.set(-1.5, 0.05, 0.3);
    scene.add(new THREE.AmbientLight(0x6e8ba8, 1.2));
    const sun = new THREE.PointLight(0xffb27e, 25, 18);
    sun.position.set(4, 3, 5);
    scene.add(sun);

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(rect.width, 1);
        const height = Math.max(rect.height, 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    const animate = (time) => {
        const seconds = time * 0.0005;
        group.rotation.y += (pointer.x * 0.08 - group.rotation.y) * 0.02;
        group.rotation.x += (-pointer.y * 0.05 - group.rotation.x) * 0.02;
        planetGroup.rotation.y = seconds * 0.3;
        ring.rotation.z = seconds * 0.12;
        planetGroup.position.y = 0.25 + Math.sin(seconds * 1.8) * 0.05;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
}

setupScene(document.getElementById('motion-canvas'));
const profileHolder = document.getElementById('v-card-holder');
if (profileHolder && 'MutationObserver' in window) {
    new MutationObserver(keepProfileVisible).observe(profileHolder, { attributes: true, attributeFilter: ['style', 'class'] });
}
document.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

const themeToggle = document.getElementById('portfolio-theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('portfolio-theme');
    if (savedTheme === 'light') document.body.classList.add('portfolio-light');
    themeToggle.addEventListener('click', () => {
        const light = document.body.classList.toggle('portfolio-light');
        localStorage.setItem('portfolio-theme', light ? 'light' : 'dark');
        themeToggle.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
        themeToggle.innerHTML = `<i class="fa fa-${light ? 'moon-o' : 'sun-o'}"></i>`;
    });
}
