if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
           .then(reg => console.log('Service Worker erfolgreich registriert!', reg))
           .catch(err => console.log('Service Worker Registrierung fehlgeschlagen:', err));
    });
}

const TOTAL_STATIONS = 18;
let currentView = "Hinweg";

let aktuelleFahrt = {
    datum: new Date().toLocaleDateString('de-DE'),
    type: "Hinweg",
    sitzPlatz:"",
    haltestellenProtokoll: [],
    dauer: "00:00"
};

let timerInterval = null;
let startZeitMilli = 0;
let fahrtZeitFormatiert = "00:00";

document.addEventListener("DOMContentLoaded",() => {
    ladeGlobalStats();
    generiereSitzplan();
    renderCustomChart();
    setupSwipeErkennung();
});

function ladeGlobalStats() {
    let streak = parseInt(localStorage.getItem('busStreak')) || 0;
    let rang = "Bus-Anfänger";

    if (streak >= 5) rang = "Stau-Bezwinger";
    if (streak >= 10) rang = "Logik-Ritter";
    if (streak >= 20) rang = "Endboss-Schredder";
    if (streak >= 50) rang = "Bus-Gott";

    document.getElementById('streakDisplay').innerHTML = `&#128293; Serie: ${streak} Tage`;
    document.getElementById('rankDisplay').innerHTML = `&#127942; Rang: ${rang}`;
}

function toggleFahrt(typ) {
    const suffix = typ === "Hinweg" ? "H" : "R";
    const btn = document.getElementById(`timerBtn${suffix}`);
    const inputArea = document.getElementById(`inputs${suffix}`);

    if (timerInterval === null) {
        aktuelleFahrt = {
            datum: new Date().toLocaleDateString('de-DE'),
            type: typ,
            sitzPlatz: "",
            haltestellenProtokoll: [],
            dauer: "00:00"
        };

        startZeitMilli = Date.now();
        btn.innerText = "Fahrt beenden";
        btn.style.backgroundColor = "var(--accent-red)";
        inputArea.classList.add('active');

        timerInterval = setInterval(() => {
            const vergangeneMilli = Date.now() - startZeitMilli;
            const gesamtSekunden = Math.floor(vergangeneMilli / 1000);
            const minuten = Math.floor(gesamtSekunden / 60);
            const sekunden = gesamtSekunden % 60;

            fahrtZeitFormatiert = `${minuten.toString().padStart(2, '0')}:${sekunden.toString().padStart(2, '0')}`;
            document.getElementById(`timerDisplay${suffix}`).innerText = fahrtZeitFormatiert;
        }, 1000);

    }

    else {
        clearInterval(timerInterval);
        timerInterval = null;

        btn.innerText = "Fahrt starten";
        btn.style.backgroundColor = "var(--accent-green)";
        inputArea.classList.remove('active');

        aktuelleFahrt.dauer = fahrtZeitFormatiert;
        fahrtSpeichernUndAbschliessen();


        document.getElementById(`timerDisplay${suffix}`).innerText = "00:00";
        document.getElementById(`bossHealth${suffix}`).style.width = "100%";
        document.getElementById(`encounterText${suffix}`).innerText = `Boss-HP: 100% (${TOTAL_STATIONS}/${TOTAL_STATIONS} Stationen)`;
    }
}

function erfasseHaltestelle(typ) {
    const suffix = typ === "Hinweg" ? "H" : "R";
    const gaesteInput = document.getElementById(`passagierInput${suffix}`);
    const stressInput = document.getElementById(`stressInput${suffix}`);
    const healthFill = document.getElementById(`bossHealth${suffix}`);
    const encounterText = document.getElementById(`encounterText${suffix}`);

    const anzahlGaeste = parseInt(gaesteInput.value) || 0;
    const stressLevel = parseInt(stressInput.value) || 0;

    aktuelleFahrt.haltestellenProtokoll.push({
        gaeste: anzahlGaeste,
        stress: stressLevel
    });

    const verbleibendeStationen = TOTAL_STATIONS - aktuelleFahrt.haltestellenProtokoll.length;
    const healthPercent = (verbleibendeStationen / TOTAL_STATIONS) * 100;

    healthFill.style.width = `${Math.max(0, healthPercent)}%`;

    if (verbleibendeStationen > 0) {
        encounterText.innerText = `Boss-HP: ${Math.round(healthPercent)}% (${verbleibendeStationen}/${TOTAL_STATIONS} Station)`;
    } else {
        encounterText.innerText = "Boss VERNICHTET! Ziel erreicht.";
        healthFill.style.width = "0%";
    }

    renderCustomChart();

    gaesteInput.value = '';
    stressInput.value = '0';
}

function fahrtSpeichernUndAbschliessen(){
    let historienArray = JSON.parse(localStorage.getItem('busHistorie')) || [];
    historienArray.push(aktuelleFahrt);
    localStorage.setItem('busHistorie', JSON.stringify(historienArray));

    const heute = new Date().toISOString().split('T')[0];
    let letzteFahrtDatum = localStorage.getItem('letzteFahrtDatum');

    if (letzteFahrtDatum !== heute) {
        let aktuelleStreak = parseInt(localStorage.getItem('busStreak')) || 0;
        localStorage.setItem('busStreak', aktuelleStreak + 1);
        localStorage.setItem('letzteFahrtDatum', heute);
    }

    ladeGlobalStats();
    alert(`Missions-Erfolg! Fahrtzeit: ${aktuelleFahrt.dauer}. Daten sicher gespeichert.`)
}

function generiereSitzplan(){
    const grid = document.getElementById('busGrid');
    grid.innerHTML = '';

    const layout = [
        ['VL', 'GANG', 'VR', 'X'],
        ['L2', 'GANG', 'R2', 'R2A'],
        ['L3', 'GANG', 'R3', 'R3A'],
        ['V4L', 'V4LA', 'V4R', 'V4RA'],
        ['L5', 'GANG', 'R5', 'r5A'],
        ['HL', 'HL2', 'HM', 'HR']
    ];

    layout.forEach(reihe => {
        reihe.forEach(platz => {
            if (platz === 'GANG'){
                const gangDiv = document.createElement('div');
                gangDiv.className = 'aisle-space';
                grid.appendChild(gangDiv);
            } else {
                const btn = document.createElement('button');
                btn.className = 'seat-btn';
                btn.innerText = platz === 'X' ? '' : platz;
                if (platz === 'X') btn.style.visibility = 'hidden';

                btn.onclick = () => {
                    document.querySelectorAll('.seat-btn').forEach(b => b.classList.remove('seat-btn-selected'));
                    btn.classList.add('seat-btn-selected');
                    aktuelleFahrt.sitzPlatz = platz;
                };

                grid.appendChild(btn);
            }
        });
    });
}

function renderCustomChart() {
    const canvas = document.getElementById('customChart');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#22222a';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        const y = canvas.height - 20 - (i * ((canvas.height - 30) / 4));
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 10, y);
        ctx.stroke();
    }

    ctx.fillStyle = '#8e8e93';
    ctx.font = '9px sans-serif';
    ctx.fillText('Stress', 2, 12);
    ctx.fillText('Gegner', 2, canvas.height - 5);

    if (aktuelleFahrt.haltestellenProtokoll.length === 0) {
        ctx.fillStyle = '#3a3a40';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Warte auf Daten der ersten Haltestelle...', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'start';
        return;
    }

    const punkte = aktuelleFahrt.haltestellenProtokoll;
    const abstandX = (canvas.width -40) / TOTAL_STATIONS;


    punkte.forEach((p, index) => {
        let x = 35 + (index * abstandX);
        let maxGegnerErwartet = 30;
        let balkenHoehe = (p.gaeste / maxGegnerErwartet) * (canvas.height -30);
        let y = canvas.height - 20 - balkenHoehe;

        ctx.fillStyle = 'rgba(58, 58, 64, 0.5)';
        ctx.fillRect(x, y, abstandX - 4, balkenHoehe);

        ctx.fillStyle = '#444';
        ctx.font = '8px sans-serif';
        ctx.fillText(index + 1, x+ (abstandX/4), canvas.height - 5);
    });

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'var(--accent-green)';

    punkte.forEach((p, index) => {
        let x = 35 + (index * abstandX) + (abstandX - 4) / 2;
        let y = canvas.height - 20 - (p.stress / 10) * (canvas.height -30);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

function setupSwipeErkennung(){
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeArea = document.getElementById('swipeArea');
    const cube = document.getElementById('appCube');

    function updateCubeView() {
        cube.classList.toggle('is-flipped', currentView === "Rückweg");
    }

    swipeArea.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    swipeArea.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;

        if (diffX < -60 && currentView === "Hinweg") {
            currentView = "Rückweg";
            updateCubeView();
        } else if (diffX > 60 && currentView === "Rückweg") {
            currentView = "Hinweg";
            updateCubeView();
        }
    }, { passive: true });

    updateCubeView();
}
