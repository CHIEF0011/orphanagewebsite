// ... existing code ...
export const STORAGE_KEY = 'homecare_state_v1';

const seed = () => ({
  children: [
    { id: crypto.randomUUID(), name: 'Amina K', gender: 'F', dob: '2014-03-11', status: 'Resident', admissionDate: '2021-06-01' },
    { id: crypto.randomUUID(), name: 'Brian O', gender: 'M', dob: '2012-11-22', status: 'Resident', admissionDate: '2020-09-15' },
    { id: crypto.randomUUID(), name: 'Chloe N', gender: 'F', dob: '2016-02-05', status: 'Resident', admissionDate: '2022-02-12' }
  ],
  staff: [
    { id: crypto.randomUUID(), name: 'Grace Mwangi', role: 'Caregiver', phone: '0700 111 222' },
    { id: crypto.randomUUID(), name: 'David Kim', role: 'Nurse', phone: '0700 333 444' }
  ],
  donations: [
    { id: crypto.randomUUID(), donor: 'Hope Foundation', type: 'Funds', amount: 1500, date: today(-20) },
    { id: crypto.randomUUID(), donor: 'Local Bakery', type: 'Goods', amount: 0, date: today(-10), note: 'Bread & snacks' },
    { id: crypto.randomUUID(), donor: 'J. Patel', type: 'Funds', amount: 800, date: today(-2) }
  ],
  inventory: [
    { id: crypto.randomUUID(), item: 'Rice (kg)', qty: 120, min: 60, category: 'Food', cost: 120 },
    { id: crypto.randomUUID(), item: 'Milk (L)', qty: 40, min: 50, category: 'Food', cost: 80 },
    { id: crypto.randomUUID(), item: 'Soap (bars)', qty: 25, min: 20, category: 'Hygiene', cost: 50 }
  ],
  adoptions: [],
  incidents: [],
  attendance: [],
  meals: [],
  finance: { expenses: [], budget: 12000 },
  health: [
    { id: crypto.randomUUID(), child: 'Amina K', type: 'Checkup', date: today(-5), notes: 'Routine health check', medicalBill: 500 },
    { id: crypto.randomUUID(), child: 'Brian O', type: 'Treatment', date: today(-2), notes: 'Fever treatment', medicalBill: 1200 }
  ],
  education: [
    { id: crypto.randomUUID(), child: 'Amina K', school: 'Moi Primary', grade: 'Grade 6', term: 'Term 2', date: today(-30), notes: 'School fees payment', fees: 8500 },
    { id: crypto.randomUUID(), child: 'Chloe N', school: 'Sunshine Academy', grade: 'Grade 2', term: 'Term 1', date: today(-15), notes: 'First term fees', fees: 12000 }
  ],
  announcements: [
    { id: crypto.randomUUID(), message: 'Clinic visit on Friday 10am', date: today(-1) }
  ],
  meta: { createdAt: new Date().toISOString(), settings: { currency: 'KES', orgName: 'HomeCare Orphanage', orgAddress: 'Nairobi, Kenya', logoUrl: '', primaryColor: '#111', secondaryColor: '#2f6feb', hoverColor: '#f2f2f2' } }
});

const today = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0,10);
};

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const s = seed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }
  try { return JSON.parse(raw); } catch { const s = seed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); return s; }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsert(collection, record, state) {
  const list = state[collection] || [];
  const idx = list.findIndex(x => x.id === record.id);
  if (idx >= 0) list[idx] = record; else list.unshift({ id: crypto.randomUUID(), ...record });
  state[collection] = list;
  saveState(state);
  return record;
}

export function removeById(collection, id, state) {
  state[collection] = (state[collection] || []).filter(x => x.id !== id);
  saveState(state);
}