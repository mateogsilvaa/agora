// Hemiciclo clásico: media corona dividida en cuñas por partido, de izquierda a derecha.
// seats: [{ color, title, dim, empty }] en orden; los escaños seguidos iguales forman una cuña.
const NS = 'http://www.w3.org/2000/svg';
const R = 1, INNER = 0.52, GAP = 0.012; // GAP: separación entre cuñas (radianes)

const el = (name, attrs) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
};

// Punto del arco: el ángulo va de π (izquierda) a 0 (derecha)
const at = (r, a) => `${(r * Math.cos(a)).toFixed(4)} ${(-r * Math.sin(a)).toFixed(4)}`;

function wedge(a0, a1) {
    const large = a0 - a1 > Math.PI ? 1 : 0;
    return `M ${at(R, a0)} A ${R} ${R} 0 ${large} 1 ${at(R, a1)} L ${at(INNER, a1)} A ${INNER} ${INNER} 0 ${large} 0 ${at(INNER, a0)} Z`;
}

// Agrupa escaños consecutivos con el mismo aspecto
function runs(seats) {
    const out = [];
    for (const s of seats) {
        const key = s.empty ? 'empty' : `${s.color}|${s.dim ? 1 : 0}`;
        const last = out[out.length - 1];
        if (last && last.key === key) { last.n++; if (s.title && !last.titles.includes(s.title)) last.titles.push(s.title); }
        else out.push({ key, n: 1, seat: s, titles: s.title ? [s.title] : [] });
    }
    return out;
}

export function hemicycle(seats, { label, center } = {}) {
    const svg = el('svg', { viewBox: '-1.04 -1.06 2.08 1.12', class: 'hemicycle', role: 'img' });
    if (label) svg.setAttribute('aria-label', label);
    // Fondo: la corona vacía
    svg.append(el('path', { d: wedge(Math.PI, 0), class: 'hemi-bg' }));

    const total = seats.length;
    if (total) {
        let a = Math.PI;
        for (const r of runs(seats)) {
            const span = (Math.PI * r.n) / total;
            const gap = total > 1 && span > GAP * 3 ? GAP / 2 : 0;
            const p = el('path', { d: wedge(a - gap, a - span + gap) });
            if (r.seat.empty) p.setAttribute('class', 'hemi-empty');
            else {
                p.style.fill = r.seat.color; // por estilo para que acepte var(--…)
                p.setAttribute('class', 'hemi-wedge' + (r.seat.dim ? ' dim' : ''));
            }
            const tt = el('title', {});
            tt.textContent = `${r.n} · ${r.titles.slice(0, 6).join(', ')}${r.titles.length > 6 ? '…' : ''}`;
            p.append(tt);
            svg.append(p);
            a -= span;
        }
        // Marca de la mayoría absoluta (la mitad del arco)
        svg.append(el('line', { x1: 0, y1: -1.04, x2: 0, y2: -(INNER - 0.06), class: 'hemi-majority' }));
    }
    svg.append(el('line', { x1: -1.03, y1: 0.012, x2: 1.03, y2: 0.012, class: 'hemi-base' }));
    if (center != null) {
        const tx = el('text', { x: 0, y: -0.08, class: 'hemi-center', 'text-anchor': 'middle' });
        tx.textContent = center;
        svg.append(tx);
    }
    return svg;
}

// Escaños de la cámara, agrupados por partido (en orden de creación) e independientes al final
export function chamberSeats(members, parties, { highlight } = {}) {
    const seats = [];
    const push = (m, color, partyId) => {
        for (let i = 0; i < (m.seats || 0); i++) {
            seats.push({ color, title: m.name, dim: highlight ? !highlight.has(partyId) : false });
        }
    };
    for (const p of parties) for (const m of members.filter(x => x.partyId === p.id)) push(m, p.color, p.id);
    for (const m of members.filter(x => !x.partyId || !parties.some(p => p.id === x.partyId))) push(m, '#8b8e94', null);
    return seats;
}
