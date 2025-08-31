import { loadState, saveState, upsert, removeById } from './data.js';
import dayjs from 'dayjs';

let state = loadState();
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const content = $('#content');
const modal = $('#modal');
const modalBody = $('#modalBody');
const modalTitle = $('#modalTitle');
const modalFooter = $('#modalFooter');

// Add openModal and closeModal functions
window.openModal = function(title, body, footer){
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  if(footer !== undefined){
    modalFooter.innerHTML = footer;
    modalFooter.style.display = 'flex';
  } else {
    modalFooter.style.display = 'none';
  }
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

window.closeModal = function(){
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function setRoute(route) {
  history.replaceState({}, '', `#${route}`);
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.route === route));
  render(route);
}
function getRoute() { return location.hash.replace('#','') || 'dashboard'; }

function fmtDate(d){ return dayjs(d).format('YYYY-MM-DD'); }
function age(dob){ const d = dayjs(dob); if(!d.isValid()) return 0; return dayjs().diff(d,'year'); }
const currency = () => state.meta?.settings?.currency || 'KES';
const money = (n)=> new Intl.NumberFormat('en-KE',{ style:'currency', currency: currency() }).format(+n||0);

// helpers: children select
const childNames = () => (state.children||[]).map(c=>c.name);
const childOptions = (selected='') => childNames().map(n=>`<option ${n===selected?'selected':''}>${n}</option>`).join('');

/* Enhanced Dashboard with Professional Analytics */
function renderDashboard(){
  const totalChildren = state.children.length;
  const totalStaff = state.staff.length;
  const funds = state.donations.filter(d=>d.type==='Funds').reduce((a,b)=>a+(+b.amount||0),0);
  const lowStock = state.inventory.filter(i=> i.qty <= i.min).length;

  // Advanced analytics
  const totalHealthBills = state.health?.reduce((sum, h) => sum + (+h.medicalBill || 0), 0) || 0;
  const totalEducationFees = state.education?.reduce((sum, e) => sum + (+e.fees || 0), 0) || 0;
  const totalMealsDaily = state.meals?.reduce((sum, m) => sum + (+m.amount || 0), 0) || 0;
  
  // Gender distribution
  const maleCount = state.children.filter(c => c.gender === 'M').length;
  const femaleCount = state.children.filter(c => c.gender === 'F').length;
  
  // Age groups
  const ageGroups = {
    '0-5': 0, '6-10': 0, '11-15': 0, '16+': 0
  };
  state.children.forEach(c => {
    const age = dayjs().diff(dayjs(c.dob), 'year');
    if (age <= 5) ageGroups['0-5']++;
    else if (age <= 10) ageGroups['6-10']++;
    else if (age <= 15) ageGroups['11-15']++;
    else ageGroups['16+']++;
  });

  // Monthly trends
  const currentMonth = dayjs().month();
  const monthlyData = Array.from({length: 6}, (_, i) => {
    const month = dayjs().month(currentMonth - 5 + i);
    const monthIndex = month.month();
    const year = month.year();
    
    const monthlyDonations = state.donations
      .filter(d => d.type === 'Funds' && dayjs(d.date).month() === monthIndex && dayjs(d.date).year() === year)
      .reduce((sum, d) => sum + (+d.amount || 0), 0);
    
    return { month: month.format('MMM'), amount: monthlyDonations };
  });

  content.innerHTML = `
    <h1>Dashboard Analytics</h1>
    
    <div class="dashboard-analytics">
      <div class="analytics-card stripe--blue">
        <div class="metric">${totalChildren}</div>
        <div class="label">Total Children</div>
        <div class="trend trend-up">
          ↗ ${state.children.filter(c => 
            dayjs().diff(dayjs(c.admissionDate), 'month') < 3
          ).length} new this quarter
        </div>
      </div>
      
      <div class="analytics-card stripe--green">
        <div class="metric">${totalStaff}</div>
        <div class="label">Active Staff</div>
        <div class="trend">
          · ${Math.round(totalChildren / totalStaff)}:1 child-to-staff ratio
        </div>
      </div>
      
      <div class="analytics-card stripe--orange">
        <div class="metric">${money(funds)}</div>
        <div class="label">Total Donations (YTD)</div>
        <div class="trend trend-up">
          ↗ ${monthlyData[5].amount > monthlyData[4].amount ? 'Increasing' : 'Stable'} trend
        </div>
      </div>
      
      <div class="analytics-card stripe--red">
        <div class="metric">${lowStock}</div>
        <div class="label">Inventory Alerts</div>
        <div class="trend">
          · ${state.inventory.length - lowStock} items in good stock
        </div>
      </div>
    </div>

    <div class="viz-grid">
      <div class="viz-card">
        <h3>Financial Overview</h3>
        <div class="chart-container">
          <canvas id="chartFinancial"></canvas>
        </div>
        <div class="quick-stats">
          <div class="stat-item">
            <div class="value">${money(totalHealthBills)}</div>
            <div class="description">Health Expenses</div>
          </div>
          <div class="stat-item">
            <div class="value">${money(totalEducationFees)}</div>
            <div class="description">Education Fees</div>
          </div>
          <div class="stat-item">
            <div class="value">${money(totalMealsDaily * 365)}</div>
            <div class="description">Annual Meals</div>
          </div>
        </div>
      </div>

      <div class="viz-card">
        <h3>Children Demographics</h3>
        <div class="chart-container">
          <canvas id="chartDemographics"></canvas>
        </div>
      </div>

      <div class="viz-card">
        <h3>Monthly Donation Trends</h3>
        <div class="chart-container">
          <canvas id="chartMonthly"></canvas>
        </div>
      </div>

      <div class="viz-card">
        <h3>Recent Activity</h3>
        <div style="max-height: 300px; overflow-y: auto;">
          ${state.donations.slice(0, 5).map(d => `
            <div class="row" style="justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
              <div>
                <strong>${d.donor}</strong>
                <div style="font-size: 12px; color: #666;">${d.type}</div>
              </div>
              <div style="text-align: right;">
                <div>${d.type === 'Funds' ? money(d.amount) : d.note || 'Goods'}</div>
                <div style="font-size: 12px; color: #666;">${fmtDate(d.date)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Initialize charts - safely check if Chart is available
  setTimeout(() => {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not available - charts will not render');
      return;
    }

    try {
      // Financial Overview
      const ctx1 = document.getElementById('chartFinancial');
      if (ctx1) {
        new Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels: ['Available Funds', 'Health Bills', 'Education Fees', 'Annual Meals'],
            datasets: [{
              data: [
                Math.max(0, funds - totalHealthBills - totalEducationFees - (totalMealsDaily * 365)),
                totalHealthBills,
                totalEducationFees,
                totalMealsDaily * 365
              ],
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#2f6feb'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      }

      // Demographics
      const ctx2 = document.getElementById('chartDemographics');
      if (ctx2) {
        new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: Object.keys(ageGroups),
            datasets: [{
              label: 'Children',
              data: Object.values(ageGroups),
              backgroundColor: ['#2f6feb', '#2fbf71', '#ff8a3d', '#ff4da6'],
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
          }
        });
      }

      // Monthly trends
      const ctx3 = document.getElementById('chartMonthly');
      if (ctx3) {
        new Chart(ctx3, {
          type: 'line',
          data: {
            labels: monthlyData.map(m => m.month),
            datasets: [{
              label: 'Monthly Donations',
              data: monthlyData.map(m => m.amount),
              borderColor: '#2f6feb',
              backgroundColor: 'rgba(47, 111, 235, 0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { callback: (v) => money(v) } }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }, 100);
}

/* Admissions */
function renderAdmissions(){
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="btnNewAdmission">New Admission</button>
      <div class="spacer"></div>
      <input class="input" id="admissionsFilter" placeholder="Filter by name...">
    </div>
    <div id="admissionsList" class="empty">Admissions are handled via Children > New.</div>
  `;
  $('#btnNewAdmission').addEventListener('click', showChildForm);
}

/* Children */
function renderChildren(){
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="btnNewChild">Add Child</button>
      <button class="btn" onclick="printElement('#childrenTable')">Print Table</button>
      <div class="spacer"></div>
      <input class="input" id="childrenSearch" placeholder="Search children">
      <select id="childrenFilter">
        <option value="">All</option>
        <option>Resident</option>
        <option>Discharged</option>
      </select>
    </div>
    <div class="card">
      <table class="table" id="childrenTable">
        <thead><tr>
          <th>Name</th><th>Gender</th><th>Age</th><th>Status</th><th>Admission</th><th></th>
        </tr></thead>
        <tbody id="childrenTbody">
          ${state.children.map(rowChild).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Total Children</strong></td>
            <td colspan="3"><strong>${state.children.length}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  $('#btnNewChild').addEventListener('click', showChildForm);
  $('#childrenSearch').addEventListener('input', filterChildren);
  $('#childrenFilter').addEventListener('change', filterChildren);
  content.addEventListener('click', onChildrenTableClick);
}
function rowChild(c){
  return `<tr data-id="${c.id}">
    <td>${c.name}</td>
    <td>${c.gender}</td>
    <td>${age(c.dob)}</td>
    <td><span class="badge">${c.status}</span></td>
    <td>${fmtDate(c.admissionDate)}</td>
    <td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td>
  </tr>`;
}
function filterChildren(){
  const q = ($('#childrenSearch')?.value||'').toLowerCase();
  const f = $('#childrenFilter')?.value||'';
  $('#childrenTbody').innerHTML = state.children
    .filter(c => (!q || c.name.toLowerCase().includes(q)) && (!f || c.status===f))
    .map(rowChild).join('') || `<tr><td colspan="6"><div class="empty">No matches.</div></td></tr>`;
}
function onChildrenTableClick(e){
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  const id = tr.dataset.id;
  if (e.target.matches('[data-edit]')) editChild(id);
  if (e.target.matches('[data-remove]')) {
    if (confirm('Remove this child?')) {
      removeById('children', id, state); saveState(state); renderChildren();
    }
  }
}

function showChildForm(existing){
  const c = existing || { name:'', gender:'M', dob:'', status:'Resident', admissionDate: dayjs().format('YYYY-MM-DD') };
  
  openModal(existing ? 'Edit Child Profile' : 'New Child Registration', `
    <div class="form-grid">
      <div class="form-group">
        <label>Full Name *</label>
        <input type="text" id="c_name" value="${c.name}" placeholder="Enter child's full name" required />
      </div>
      
      <div class="form-group">
        <label>Gender</label>
        <select id="c_gender" class="form-select">
          <option value="M" ${c.gender==='M'?'selected':''}>Male</option>
          <option value="F" ${c.gender==='F'?'selected':''}>Female</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Date of Birth *</label>
        <input type="date" id="c_dob" value="${c.dob}" required />
      </div>
      
      <div class="form-group">
        <label>Status</label>
        <select id="c_status" class="form-select">
          <option ${c.status==='Resident'?'selected':''}>Resident</option>
          <option ${c.status==='Discharged'?'selected':''}>Discharged</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Admission Date *</label>
        <input type="date" id="c_adm" value="${c.admissionDate||''}" required />
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" data-modal-close>Cancel</button>
    <button class="btn btn-primary" onclick="saveChildForm('${c.id || ''}')">
      ${existing ? 'Update Profile' : 'Register Child'}
    </button>
  `);
}

// Add save handler for child form
window.saveChildForm = function(existingId) {
  const record = {
    id: existingId || crypto.randomUUID(),
    name: $('#c_name').value.trim(),
    gender: $('#c_gender').value,
    dob: $('#c_dob').value,
    status: $('#c_status').value,
    admissionDate: $('#c_adm').value
  };
  
  if (!record.name || !record.dob || !record.admissionDate) {
    alert('Please fill all required fields');
    return;
  }
  
  upsert('children', record, state);
  closeModal();
  renderChildren();
}

function editChild(id){
  const c = state.children.find(x=>x.id===id); if (!c) return;
  showChildForm(c);
}

/* Staff */
function renderStaff(){
  const totalQty = (state.inventory||[]).reduce((a,i)=>a+(+i.qty||0),0);
  const totalValue = (state.inventory||[]).reduce((a,i)=>a+((+i.qty||0)*((+i.cost)||0)),0);
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="btnNewStaff">Add Staff</button>
      <button class="btn" onclick="printElement('#staffTable')">Print Table</button>
      <div class="spacer"></div>
      <input class="input" id="staffSearch" placeholder="Search staff">
    </div>
    <div class="card">
      <table class="table" id="staffTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="staffTbody">
          ${state.staff.map(rowStaff).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2"><strong>Total Staff</strong></td>
            <td colspan="2"><strong>${state.staff.length}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  $('#btnNewStaff').addEventListener('click', () => showStaffForm());
  $('#staffSearch').addEventListener('input', filterStaff);
  content.addEventListener('click', onStaffTableClick);
}

function rowStaff(s){
  return `<tr data-id="${s.id}">
    <td>${s.name}</td>
    <td>${s.role}</td>
    <td>${s.phone}</td>
    <td>
      <button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button>
      <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button>
    </td>
  </tr>`;
}

function filterStaff(){
  const q = ($('#staffSearch')?.value||'').toLowerCase();
  $('#staffTbody').innerHTML = state.staff
    .filter(s => !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
    .map(rowStaff).join('') || `<tr><td colspan="4"><div class="empty">No matches.</div></td></tr>`;
}

function onStaffTableClick(e){
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  const id = tr.dataset.id;
  if (e.target.matches('[data-edit]')) {
    showStaffForm(state.staff.find(s => s.id === id));
  }
  if (e.target.matches('[data-remove]')) {
    if (confirm('Remove this staff member?')) {
      removeById('staff', id, state); saveState(state); renderStaff();
    }
  }
}

function showStaffForm(existing){
  const s = existing || { name:'', role:'Caregiver', phone:'' };
  openModal(existing?'Edit Staff':'New Staff', `
    <div class="form-grid">
      <div class="form-group">
        <label>Name *</label>
        <input type="text" id="s_name" value="${s.name}" placeholder="Enter staff name" required />
      </div>
      <div class="form-group">
        <label>Role *</label>
        <input type="text" id="s_role" value="${s.role}" placeholder="e.g. Caregiver, Nurse, Teacher" required />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="tel" id="s_phone" value="${s.phone||''}" placeholder="e.g. 0700 123 456" />
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" data-modal-close>Cancel</button>
    <button class="btn btn-primary" onclick="saveStaffForm('${s.id || ''}')">
      ${existing ? 'Update Staff' : 'Add Staff'}
    </button>
  `);
}

// Add save handler for staff form
window.saveStaffForm = function(existingId) {
  const record = {
    id: existingId || crypto.randomUUID(),
    name: $('#s_name').value.trim(),
    role: $('#s_role').value.trim(),
    phone: $('#s_phone').value.trim()
  };
  
  if (!record.name || !record.role) {
    alert('Please fill all required fields');
    return;
  }
  
  upsert('staff', record, state);
  closeModal();
  renderStaff();
}

/* Inventory */
function renderInventory(){
  const totalQty = (state.inventory||[]).reduce((a,i)=>a+(+i.qty||0),0);
  const totalValue = (state.inventory||[]).reduce((a,i)=>a+((+i.qty||0)*((+i.cost)||0)),0);
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="btnNewInventory">Add Item</button>
      <button class="btn" onclick="printElement('#invTable')">Print Table</button>
      <div class="spacer"></div>
      <input class="input" id="invSearch" placeholder="Search items">
      <select id="invFilter"><option value="">All</option><option>Food</option><option>Hygiene</option><option>Clothing</option><option>Other</option></select>
    </div>
    <div class="card">
      <table class="table" id="invTable">
        <thead>
          <tr>
            <th>Item</th><th>Quantity</th><th>Minimum</th><th>Status</th><th>Category</th><th>Unit Cost</th><th>Total Value</th><th></th>
          </tr>
        </thead>
        <tbody id="invTbody">
          ${state.inventory.map(rowInventory).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Totals</strong></td><td><strong>${totalQty}</strong></td><td colspan="3"></td><td></td><td><strong>${money(totalValue)}</strong></td><td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  $('#btnNewInventory').addEventListener('click', () => showInventoryForm());
  $('#invSearch').addEventListener('input', filterInventory);
  $('#invFilter').addEventListener('change', filterInventory);
  content.addEventListener('click', onInventoryTableClick);
}

function rowInventory(i){
  const status = i.qty <= i.min ? 'Low Stock' : 'In Stock';
  const badgeClass = i.qty <= i.min ? 'badge badge--danger' : 'badge badge--success';
  return `<tr data-id="${i.id}">
    <td>${i.item}</td><td>${i.qty}</td><td>${i.min}</td>
    <td><span class="${badgeClass}">${status}</span></td><td>${i.category}</td>
    <td>${money(i.cost||0)}</td><td>${money((+i.qty||0)*((+i.cost)||0))}</td>
    <td>
      <button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button>
      <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button>
    </td>
  </tr>`;
}

function filterInventory(){
  const q = ($('#invSearch')?.value||'').toLowerCase();
  const f = $('#invFilter')?.value||'';
  $('#invTbody').innerHTML = state.inventory
    .filter(i => (!q || i.item.toLowerCase().includes(q)) && (!f || i.category===f))
    .map(rowInventory).join('') || `<tr><td colspan="6"><div class="empty">No matches.</div></td></tr>`;
}

function onInventoryTableClick(e){
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  const id = tr.dataset.id;
  if (e.target.matches('[data-edit]')) {
    showInventoryForm(state.inventory.find(i => i.id === id));
  }
  if (e.target.matches('[data-remove]')) {
    if (confirm('Remove this item?')) {
      removeById('inventory', id, state); saveState(state); renderInventory();
    }
  }
}

function showInventoryForm(existing){
  const i = existing || { item:'', qty:0, min:1, category:'Food', cost:0 };
  openModal(existing?'Edit Item':'New Item', `
    <div class="form-grid">
      <div class="form-group">
        <label>Item Name *</label>
        <input type="text" id="i_item" value="${i.item}" placeholder="Enter item name" required />
      </div>
      <div class="form-group">
        <label>Current Quantity *</label>
        <input type="number" id="i_qty" value="${i.qty}" min="0" required />
      </div>
      <div class="form-group">
        <label>Minimum Quantity *</label>
        <input type="number" id="i_min" value="${i.min}" min="0" required />
      </div>
      <div class="form-group">
        <label>Category *</label>
        <select id="i_cat" class="form-select">
          <option ${i.category==='Food'?'selected':''}>Food</option>
          <option ${i.category==='Hygiene'?'selected':''}>Hygiene</option>
          <option ${i.category==='Clothing'?'selected':''}>Clothing</option>
          <option ${i.category==='Medical'?'selected':''}>Medical</option>
          <option ${i.category==='Other'?'selected':''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Unit Cost (${currency()})</label>
        <input type="number" id="i_cost" value="${i.cost||0}" min="0" step="0.01" />
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" data-modal-close>Cancel</button>
    <button class="btn btn-primary" onclick="saveInventoryForm('${i.id || ''}')">
      ${existing ? 'Update Item' : 'Add Item'}
    </button>
  `);
}

// Add save handler for inventory form
window.saveInventoryForm = function(existingId) {
  const record = {
    id: existingId || crypto.randomUUID(),
    item: $('#i_item').value.trim(),
    qty: +$('#i_qty').value || 0,
    min: +$('#i_min').value || 1,
    category: $('#i_cat').value,
    cost: +$('#i_cost').value || 0
  };
  
  if (!record.item) {
    alert('Please enter item name');
    return;
  }
  
  upsert('inventory', record, state);
  closeModal();
  renderInventory();
}

/* Donations */
function renderDonations(){
  const list = state.donations || [];
  const totalFunds = list.filter(d=>d.type==='Funds').reduce((a,b)=>a+(+b.amount||0),0);
  content.innerHTML = `
    <div class="toolbar"><button class="btn primary" id="d_new">Add Donation</button><div class="spacer"></div>
    <button class="btn" onclick="printElement('#donTable')">Print Table</button></div>
    <div class="card"><table class="table" id="donTable"><thead><tr><th>Donor</th><th>Type</th><th>Amount</th><th>Date</th><th>Note</th><th></th></tr></thead>
    <tbody id="d_tbody">${list.map(d=>`<tr data-id="${d.id}"><td>${d.donor}</td><td>${d.type}</td><td>${d.type==='Funds'?money(d.amount):'-'}</td><td>${fmtDate(d.date)}</td><td>${d.note||''}</td><td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="2"><strong>Total Funds</strong></td><td><strong>${money(totalFunds)}</strong></td><td colspan="3"></td></tr></tfoot></table></div>`;
  $('#d_new').addEventListener('click', () => showDonationForm());
  $('#d_tbody').addEventListener('click', (e)=>{
    const tr = e.target.closest('tr[data-id]'); if(!tr) return; const id = tr.dataset.id;
    if(e.target.matches('[data-edit]')) showDonationForm(state.donations.find(x=>x.id===id));
    if(e.target.matches('[data-remove]')) { if(confirm('Remove donation?')) { removeById('donations', id, state); renderDonations(); } }
  });
}

function showDonationForm(existing){
  const d = existing || { donor:'', type:'Funds', amount:'', date:dayjs().format('YYYY-MM-DD'), note:'' };
  openModal(existing?'Edit Donation':'New Donation', `
    <div class="form-group">
      <label>Donor</label>
      <input class="input" id="d_donor" value="${d.donor}" />
    </div>
    <div class="form-group">
      <label>Type</label>
      <select class="input" id="d_type">
        <option ${d.type==='Funds'?'selected':''}>Funds</option>
        <option ${d.type==='Goods'?'selected':''}>Goods</option>
      </select>
    </div>
    <div class="form-group">
      <label>Amount (if Funds)</label>
      <input class="input" id="d_amount" type="number" value="${d.amount}" />
    </div>
    <div class="form-group">
      <label>Date</label>
      <input class="input" id="d_date" type="date" value="${d.date}" />
    </div>
    <div class="form-group">
      <label>Note</label>
      <input class="input" id="d_note" value="${d.note||''}" />
    </div>
  `, `<button class="btn" data-modal-close>Cancel</button><button class="btn primary" onclick="saveDonationForm('${d.id || ''}')">Save Donation</button>`);
  $('#d_amount').addEventListener('input', (e) => {
    const val = e.target.value;
    if (val && !/^\d+$/.test(val)) {
      e.target.value = val.slice(0, -1);
    }
  });
}

// Add donation save handler
window.saveDonationForm = function(existingId) {
  const record = {
    id: existingId || crypto.randomUUID(),
    donor: $('#d_donor').value.trim(),
    type: $('#d_type').value,
    amount: $('#d_type').value === 'Funds' ? +$('#d_amount').value || 0 : 0,
    date: $('#d_date').value,
    note: $('#d_note').value.trim()
  };
  
  if (!record.donor) {
    alert('Donor name required');
    return;
  }
  
  upsert('donations', record, state);
  closeModal();
  renderDonations();
}

/* Reports */
function renderReports(){
  const totalChildren = state.children.length;
  const avgAge = totalChildren ? Math.round(state.children.reduce((a,c)=>a+age(c.dob),0)/totalChildren) : 0;
  const funds = state.donations.filter(d=>d.type==='Funds').reduce((a,b)=>a+(+b.amount||0),0);
  const goodsCount = state.donations.filter(d=>d.type==='Goods').length;
  const lowStock = state.inventory.filter(i=>i.qty <= i.min);
  
  // Calculate additional metrics
  const totalHealthBills = state.health?.reduce((sum, h) => sum + (+h.medicalBill || 0), 0) || 0;
  const totalEducationFees = state.education?.reduce((sum, e) => sum + (+e.fees || 0), 0) || 0;
  const totalMealsDaily = state.meals?.reduce((sum, m) => sum + (+m.amount || 0), 0) || 0;
  const totalIncidents = state.incidents?.length || 0;
  const totalAttendance = state.attendance?.length || 0;

  content.innerHTML = `
    <div class="grid">
      <div class="card accent--blue">
        <div class="card-title">Children</div>
        <div class="kpi">${totalChildren}</div>
        <div class="muted">Average age: ${avgAge} years</div>
      </div>
      <div class="card accent--green">
        <div class="card-title">Donations</div>
        <div class="kpi">${money(funds)}</div>
        <div class="muted">${goodsCount} goods entries</div>
      </div>
      <div class="card accent--orange">
        <div class="card-title">Health & Education</div>
        <div class="kpi">${money(totalHealthBills + totalEducationFees)}</div>
        <div class="muted">Total expenses</div>
      </div>
      <div class="card accent--red">
        <div class="card-title">Incidents</div>
        <div class="kpi">${totalIncidents}</div>
        <div class="muted">Logged events</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-title">Comprehensive Report</div>
      <div class="row" style="gap:8px; flex-wrap:wrap;">
        <button class="btn" id="dm_export">Export JSON</button>
        <label class="btn"><input type="file" id="dm_import" accept="application/json" style="display:none;">Import JSON</label>
        <button class="btn" id="dm_reset">Reset to Sample Data</button>
        <button class="btn" id="dm_clear">Clear All Data</button>
      </div>
      <div class="muted" style="margin-top:8px;">Manage backups and storage. Warning: reset/clear will reload the app.</div>
    </div>
  `;

  // Charts
  renderReportsCharts();

  // Event listeners
  $('#dm_export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `homecare_report_${dayjs().format('YYYYMMDD_HHmm')}.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#dm_import').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    try { const json = JSON.parse(text); localStorage.setItem('homecare_state_v1', JSON.stringify(json)); location.reload(); }
    catch { alert('Invalid JSON file'); }
  });
  $('#dm_reset').addEventListener('click', ()=> { if(confirm('Reset to sample data?')) { localStorage.removeItem('homecare_state_v1'); location.reload(); } });
  $('#dm_clear').addEventListener('click', ()=> { if(confirm('Clear all data?')) { localStorage.removeItem('homecare_state_v1'); location.reload(); } });
}

function renderReportsCharts(){
  // Charts removed - empty function
}

/* Global search (simple across major collections) */
function globalSearch(q){
  if (!q) { render(getRoute()); return; }
  const inChildren = state.children.filter(c=> c.name.toLowerCase().includes(q.toLowerCase()));
  const inStaff = state.staff.filter(s=> s.name.toLowerCase().includes(q.toLowerCase()));
  const inDon = state.donations.filter(d=> d.donor.toLowerCase().includes(q.toLowerCase()));
  content.innerHTML = `
    <div class="card"><div class="card-title">Search Results</div>
      <div><strong>Children (${inChildren.length})</strong></div>
      ${inChildren.map(c=>`<div class="row" style="justify-content:space-between;"><div>${c.name}</div><div class="muted">${c.gender} • ${age(c.dob)} yrs</div></div>`).join('') || '<div class="muted">No matches.</div>'}
      <hr style="border:none;border-top:1px solid var(--line); margin:12px 0;">
      <div><strong>Staff (${inStaff.length})</strong></div>
      ${inStaff.map(s=>`<div class="row" style="justify-content:space-between;"><div>${s.name}</div><div class="muted">${s.role}</div></div>`).join('') || '<div class="muted">No matches.</div>'}
      <hr style="border:none;border-top:1px solid var(--line); margin:12px 0;">
      <div><strong>Donations (${inDon.length})</strong></div>
      ${inDon.map(d=>`<div class="row" style="justify-content:space-between;"><div>${d.donor}</div><div class="muted">${d.type} ${d.amount?`• ${money(d.amount)}`:''}</div></div>`).join('') || '<div class="muted">No matches.</div>'}
    </div>
  `;
}

/* Module */
function renderModule(name){
  content.innerHTML = `
    <div class="toolbar">
      <div class="card-title" style="margin:0;">${name}</div>
      <div class="spacer"></div>
      <button class="btn">New</button>
    </div>
    <div class="card"><div class="empty">No records yet in ${name}.</div></div>
  `;
}

/* Finance */
function renderFinance(){
  const totalFunds = state.donations.filter(d=>d.type==='Funds').reduce((a,b)=>a+(+b.amount||0),0);
  const expenses = state.finance?.expenses||[];
  const spent = expenses.reduce((a,b)=>a+(+b.amount||0),0);
  const bal = totalFunds - spent;
  content.innerHTML = `
    <div class="grid">
      <div class="card accent--green"><div class="card-title">Total Funds</div><div class="kpi">${money(totalFunds)}</div></div>
      <div class="card accent--orange"><div class="card-title">Expenses</div><div class="kpi">${money(spent)}</div></div>
      <div class="card accent--blue"><div class="card-title">Balance</div><div class="kpi">${money(bal)}</div></div>
    </div>
    <div class="grid" style="margin-top:16px;">
      <div class="card"><div class="card-title">Allocation</div><canvas id="chartFin" height="140"></canvas></div>
      <div class="card">
        <div class="card-title">Add Expense</div>
        <div class="row"><input id="ex_desc" class="input" placeholder="Description"><input id="ex_amt" class="input" type="number" placeholder="Amount"><button class="btn primary" id="ex_add">Add</button></div>
        <div id="ex_list" style="margin-top:10px;">${expenses.map(e=>`<div class="row" style="justify-content:space-between;"><div>${e.desc}</div><div class="muted">${money(e.amount)}</div></div>`).join('')||'<div class="muted">No expenses.</div>'}</div>
      </div>
    </div>
  `;
  $('#ex_add').addEventListener('click', ()=>{
    const desc = $('#ex_desc').value.trim(); const amt = +$('#ex_amt').value||0;
    if(!desc||!amt) return alert('Description and amount required');
    state.finance.expenses.unshift({ id: crypto.randomUUID(), desc, amount: amt, date: dayjs().format('YYYY-MM-DD') }); saveState(state); renderFinance();
  });
  
  // Safely initialize chart
  setTimeout(() => {
    const ctx = $('#chartFin');
    if (ctx && typeof Chart !== 'undefined') {
      try {
        new Chart(ctx, {
          type:'doughnut', 
          data: { 
            labels:['Funds','Expenses'], 
            datasets:[{ 
              data:[totalFunds, Math.max(0,spent)], 
              backgroundColor:['#2fbf71','#ff8a3d'] 
            }] 
          }, 
          options: { 
            plugins: { 
              legend: { 
                position:'bottom' 
              } 
            } 
          } 
        });
      } catch (error) {
        console.error('Error initializing finance chart:', error);
      }
    }
  }, 100);
}

/* Announcements */
function renderAnnouncements(){
  const list = state.announcements||[];
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="ann_add">New Announcement</button>
      <div class="spacer"></div>
    </div>
    <div class="card">
      ${list.map(a=>`<div class="row" style="justify-content:space-between;"><div>${a.message}</div><div class="muted">${fmtDate(a.date)}</div></div>`).join('') || '<div class="empty">No announcements.</div>'}
    </div>
  `;
  $('#ann_add').addEventListener('click', ()=>{
    openModal('New Announcement', `<label>Message<input id="an_msg" class="input" placeholder="Announcement"></label>`, `<button class="btn" data-modal-close>Cancel</button><button class="btn primary" id="an_save">Save</button>`);
    $('#an_save').addEventListener('click', ()=>{
      const msg = $('#an_msg').value.trim(); if(!msg) return alert('Message required');
      state.announcements.unshift({ id: crypto.randomUUID(), message: msg, date: dayjs().format('YYYY-MM-DD') }); saveState(state); closeModal(); renderAnnouncements();
    });
  });
}

/* Settings */
function renderSettings(){
  const cur = currency();
  const st = state.meta?.settings || {};
  const logoLS = localStorage.getItem('homecare_logo_url') || st.logoUrl || '';
  content.innerHTML = `
    <div class="card">
      <div class="card-title">Application Settings</div>
      <div class="grid">
        <label>Organization Name<input id="set_org" class="input" value="${st.orgName||''}"></label>
        <label>Address<input id="set_addr" class="input" value="${st.orgAddress||''}"></label>
        <label>Logo URL<input id="set_logo" class="input" value="${logoLS}" placeholder="https://..."></label>
        <label>Default Currency
          <select id="set_currency">
            <option value="KES" ${cur==='KES'?'selected':''}>Kenyan Shilling (KES)</option>
            <option value="USD" ${cur==='USD'?'selected':''}>US Dollar (USD)</option>
            <option value="EUR" ${cur==='EUR'?'selected':''}>Euro (EUR)</option>
            <option value="GBP" ${cur==='GBP'?'selected':''}>British Pound (GBP)</option>
          </select>
        </label>
        <label>Primary Color<input id="set_primary" type="color" class="input" value="${st.primaryColor||'#111'}"></label>
        <label>Secondary Color<input id="set_secondary" type="color" class="input" value="${st.secondaryColor||'#2f6feb'}"></label>
        <label>Hover Color<input id="set_hover" type="color" class="input" value="${st.hoverColor||'#f2f2f2'}"></label>
      </div>
      <div class="row" style="margin-top:12px; justify-content:flex-end;">
        <button class="btn primary" id="set_save">Save Settings</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-title">Data Management</div>
      <div class="data-mgmt">
        <div class="dm-actions">
          <button class="btn btn-secondary" id="dm_export">Export JSON</button>
          <label class="btn btn-secondary" style="text-align:center;"><input type="file" id="dm_import" accept="application/json" style="display:none;">Import JSON</label>
          <button class="btn btn-secondary" id="dm_reset">Reset to Sample Data</button>
          <button class="btn btn-primary" id="dm_clear">Clear All Data</button>
        </div>
        <div class="dm-note">Manage backups and storage. Warning: reset/clear will reload the app.</div>
      </div>
    </div>
  `;
  $('#set_save').addEventListener('click', ()=>{
    state.meta = state.meta || {}; state.meta.settings = state.meta.settings || {};
    state.meta.settings.currency = $('#set_currency').value;
    state.meta.settings.orgName = $('#set_org').value.trim();
    state.meta.settings.orgAddress = $('#set_addr').value.trim();
    state.meta.settings.logoUrl = $('#set_logo').value.trim();
    state.meta.settings.primaryColor = $('#set_primary').value;
    state.meta.settings.secondaryColor = $('#set_secondary').value;
    state.meta.settings.hoverColor = $('#set_hover').value;
    
    // Update CSS variables
    document.documentElement.style.setProperty('--primary', state.meta.settings.primaryColor);
    document.documentElement.style.setProperty('--secondary', state.meta.settings.secondaryColor);
    document.documentElement.style.setProperty('--hover', state.meta.settings.hoverColor);
    
    saveState(state); alert('Settings saved'); render(getRoute());
  });
  $('#dm_export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `homecare_export_${dayjs().format('YYYYMMDD_HHmm')}.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#dm_import').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    try { const json = JSON.parse(text); localStorage.setItem('homecare_state_v1', JSON.stringify(json)); location.reload(); }
    catch { alert('Invalid JSON file'); }
  });
  $('#dm_reset').addEventListener('click', ()=> { if(confirm('Reset to sample data?')) { localStorage.removeItem('homecare_state_v1'); location.reload(); } });
  $('#dm_clear').addEventListener('click', ()=> { if(confirm('Clear all data?')) { localStorage.removeItem('homecare_state_v1'); location.reload(); } });
}

/* Health */
function renderHealth(){
  const totalBills = state.health?.reduce((sum, h) => sum + (+h.medicalBill || 0), 0) || 0;
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="h_new">Add Health Record</button>
      <button class="btn" onclick="printElement('#healthTable')">Print Table</button>
      <div class="spacer"></div>
      <select id="h_childFilter"><option value="">All children</option>${childOptions('')}</select>
      <input class="input" id="h_search" placeholder="Search child/type">
    </div>
    <div class="card">
      <table class="table" id="healthTable">
        <thead><tr><th>Child</th><th>Type</th><th>Date</th><th>Medical Bill (KES)</th><th>Notes</th><th></th></tr></thead>
        <tbody id="h_tbody">${(state.health||[]).map(rowHealth).join('')}</tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Total Medical Bills</strong></td>
            <td colspan="3"><strong>${money(totalBills)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  $('#h_new').addEventListener('click', ()=> showHealthForm());
  $('#h_search').addEventListener('input', filterHealth);
  $('#h_tbody').addEventListener('click', onHealthClick);
}
function rowHealth(r){ 
  return `<tr data-id="${r.id}">
    <td>${r.child||''}</td>
    <td><span class="badge">${r.type||''}</span></td>
    <td>${fmtDate(r.date||dayjs())}</td>
    <td>${money(r.medicalBill||0)}</td>
    <td>${r.notes||''}</td>
    <td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td>
  </tr>`; 
}

/* Education */
function renderEducation(){
  const totalFees = state.education?.reduce((sum, e) => sum + (+e.fees || 0), 0) || 0;
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="e_new">Add Education Record</button>
      <button class="btn" onclick="printElement('#eduTable')">Print Table</button>
      <div class="spacer"></div>
      <select id="e_childFilter"><option value="">All children</option>${childOptions('')}</select>
      <input class="input" id="e_search" placeholder="Search child/school/grade">
    </div>
    <div class="card">
      <table class="table" id="eduTable">
        <thead><tr><th>Child</th><th>School</th><th>Grade</th><th>Term</th><th>Date</th><th>Fees (KES)</th><th>Notes</th><th></th></tr></thead>
        <tbody id="e_tbody">${(state.education||[]).map(rowEdu).join('')}</tbody>
        <tfoot>
          <tr>
            <td colspan="5"><strong>Total Education Fees</strong></td>
            <td colspan="3"><strong>${money(totalFees)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  $('#e_new').addEventListener('click', ()=> showEduForm());
  $('#e_search').addEventListener('input', filterEdu);
  $('#e_tbody').addEventListener('click', onEduClick);
}
function rowEdu(r){ 
  return `<tr data-id="${r.id}">
    <td>${r.child||''}</td>
    <td>${r.school||''}</td>
    <td>${r.grade||''}</td>
    <td>${r.term||''}</td>
    <td>${fmtDate(r.date||dayjs())}</td>
    <td>${money(r.fees||0)}</td>
    <td>${r.notes||''}</td>
    <td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td>
  </tr>`; 
}

/* Incidents */
function renderIncidents(){
  const totalIncidents = state.incidents?.length || 0;
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="in_new">Log Incident</button>
      <button class="btn" onclick="printElement('#incTable')">Print Table</button>
      <div class="spacer"></div>
      <select id="in_childFilter"><option value="">All children</option>${childOptions('')}</select>
      <select id="in_sev"><option value="">All severities</option><option>Low</option><option>Medium</option><option>High</option></select>
      <input class="input" id="in_search" placeholder="Search child/description">
    </div>
    <div class="card">
      <table class="table" id="incTable">
        <thead><tr><th>Date</th><th>Child</th><th>Severity</th><th>Description</th><th>Action Taken</th><th>Reporter</th><th></th></tr></thead>
        <tbody id="in_tbody">${(state.incidents||[]).map(rowInc).join('')}</tbody>
        <tfoot>
          <tr>
            <td colspan="5"><strong>Total Incidents</strong></td>
            <td colspan="2"><strong>${totalIncidents}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  $('#in_new').addEventListener('click', ()=> showIncForm());
  $('#in_search').addEventListener('input', filterInc);
  $('#in_sev').addEventListener('change', filterInc);
  $('#in_tbody').addEventListener('click', onIncClick);
}
function rowInc(r){ return `<tr data-id="${r.id}"><td>${fmtDate(r.date||dayjs())}</td><td>${r.child||''}</td><td><span class="badge">${r.severity||''}</span></td><td>${r.description||''}</td><td>${r.action||''}</td><td>${r.reporter||''}</td><td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td></tr>`; }

/* Adoption module */
function renderAdoption(){
  const list = state.adoptions || [];
  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="adopt_new">Record Adoption</button>
      <button class="btn" onclick="printElement('#adoptTable')">Print Table</button>
      <div class="spacer"></div>
      <select id="adopt_childFilter"><option value="">All children</option>${childOptions('')}</select>
      <input class="input" id="adopt_search" placeholder="Search parent/agency/child">
    </div>
    <div class="card">
      <table class="table" id="adoptTable">
        <thead><tr><th>Child</th><th>Adopting Parent</th><th>Contact</th><th>Date</th><th>Agency</th><th>Notes</th><th></th></tr></thead>
        <tbody id="adopt_tbody">${list.map(rowAdoption).join('')}</tbody>
        <tfoot><tr><td colspan="5"><strong>Total Adoptions</strong></td><td colspan="2"><strong>${list.length}</strong></td></tr></tfoot>
      </table>
    </div>`;
  $('#adopt_new').addEventListener('click', ()=> showAdoptionForm());
  $('#adopt_search').addEventListener('input', filterAdoption);
  $('#adopt_childFilter').addEventListener('change', filterAdoption);
  $('#adopt_tbody').addEventListener('click', onAdoptionClick);
}
function rowAdoption(a){
  return `<tr data-id="${a.id}">
    <td>${a.child||''}</td><td>${a.parent||''}</td><td>${a.contact||''}</td>
    <td>${fmtDate(a.date||dayjs())}</td><td>${a.agency||''}</td><td>${a.notes||''}</td>
    <td>
      <button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button>
      <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button>
    </td></tr>`;
}
function filterAdoption(){
  const q = ($('#adopt_search')?.value||'').toLowerCase();
  const child = $('#adopt_childFilter')?.value||'';
  $('#adopt_tbody').innerHTML = (state.adoptions||[])
    .filter(a=> (!child||a.child===child) && (!q||[a.parent,a.agency,a.child].some(v=>(v||'').toLowerCase().includes(q))))
    .map(rowAdoption).join('') || `<tr><td colspan="7"><div class="empty">No matches.</div></td></tr>`;
}
function onAdoptionClick(e){
  const tr = e.target.closest('tr[data-id]'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.matches('[data-edit]')) showAdoptionForm((state.adoptions||[]).find(x=>x.id===id));
  if (e.target.matches('[data-remove]')) { if(confirm('Remove record?')) { removeById('adoptions', id, state); renderAdoption(); } }
}
function showAdoptionForm(existing){
  const r = existing || { child:'', parent:'', contact:'', date: dayjs().format('YYYY-MM-DD'), agency:'', notes:'' };
  openModal(existing?'Edit Adoption Record':'Record Adoption', `
    <div class="form-grid">
      <div class="form-group"><label>Child<select id="ad_child">${childOptions(r.child)}</select></label></div>
      <div class="form-group"><label>Adopting Parent<input id="ad_parent" class="input" value="${r.parent}"></label></div>
      <div class="form-group"><label>Contact<input id="ad_contact" class="input" value="${r.contact}"></label></div>
      <div class="form-group"><label>Date<input id="ad_date" type="date" class="input" value="${r.date}"></label></div>
      <div class="form-group"><label>Agency<input id="ad_agency" class="input" value="${r.agency||''}"></label></div>
      <div class="form-group" style="grid-column:1/-1;"><label>Notes<textarea id="ad_notes" class="input" rows="3">${r.notes||''}</textarea></label></div>
    </div>
  `, `<button class="btn" data-modal-close>Cancel</button><button class="btn primary" id="ad_save">Save</button>`);
  $('#ad_save').addEventListener('click', ()=>{
    const rec = { id: r.id||crypto.randomUUID(), child: $('#ad_child').value, parent: $('#ad_parent').value.trim(), contact: $('#ad_contact').value.trim(), date: $('#ad_date').value, agency: $('#ad_agency').value.trim(), notes: $('#ad_notes').value.trim() };
    if(!rec.child || !rec.parent || !rec.date) return alert('Child, parent and date are required');
    upsert('adoptions', rec, state); closeModal(); renderAdoption();
  });
}

/* Meals */
function renderMeals(){
  const meals = state.meals||[];
  
  // Get daily consumption per child
  const dailyConsumption = {};
  meals.forEach(m => {
    const key = `${m.child}_${m.mealType}`;
    dailyConsumption[key] = (dailyConsumption[key] || 0) + (+m.amount || 0);
  });

  // Calculate periods based on daily consumption * factors
  const byChild = [...new Set(meals.map(m => m.child))].map(name => {
    const childMeals = meals.filter(m => m.child === name);
    const uniqueMeals = [...new Set(childMeals.map(m => m.mealType))];
    
    let daily = 0;
    uniqueMeals.forEach(mealType => {
      const key = `${name}_${mealType}`;
      daily += dailyConsumption[key] || 0;
    });

    const weekly = daily * 7;
    const monthly = daily * 30;
    const yearly = daily * 365;
    
    return { name, daily, weekly, monthly, yearly };
  });
  
  // Add children who have no meal records yet
  const childrenWithMeals = new Set(byChild.map(c => c.name));
  const childrenWithoutMeals = (state.children || []).filter(c => !childrenWithMeals.has(c.name));
  childrenWithoutMeals.forEach(c => {
    byChild.push({ name: c.name, daily: 0, weekly: 0, monthly: 0, yearly: 0 });
  });

  const totalDaily = meals.reduce((sum, m) => sum + (+m.amount || 0), 0) || 0;

  content.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="m_new">Add Daily Consumption</button>
      <button class="btn" onclick="printElement('#mealsSummary')">Print Summary</button>
      <div class="spacer"></div>
      <select id="m_childFilter"><option value="">All children</option>${childOptions('')}</select>
      <input class="input" id="m_search" placeholder="Search entries">
    </div>
    <div class="card">
      <div class="card-title">Meals & Nutrition – KES Consumption per Child</div>
      <table class="table" id="mealsSummary">
        <thead><tr><th>Child</th><th>Daily</th><th>Weekly</th><th>Monthly</th><th>Yearly</th></tr></thead>
        <tbody>
          ${byChild.map(r=>`<tr><td>${r.name}</td><td>${money(r.daily)}</td><td>${money(r.weekly)}</td><td>${money(r.monthly)}</td><td>${money(r.yearly)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>${money(totalDaily)}</strong></td>
            <td><strong>${money(totalDaily * 7)}</strong></td>
            <td><strong>${money(totalDaily * 30)}</strong></td>
            <td><strong>${money(totalDaily * 365)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-title">Entries</div>
      <table class="table" id="mealsTable">
        <thead><tr><th>Date</th><th>Child</th><th>Meal</th><th>Amount (KES)</th><th>Notes</th><th></th></tr></thead>
        <tbody id="m_tbody">
          ${meals.map(m=>`<tr data-id="${m.id}"><td>${fmtDate(m.date)}</td><td>${m.child}</td><td>${m.mealType||''}</td><td>${money(m.amount)}</td><td>${m.notes||''}</td><td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  $('#m_new').addEventListener('click', ()=> showMealForm());
  $('#m_childFilter').addEventListener('change', filterMeals);
  $('#m_search').addEventListener('input', filterMeals);
  $('#m_tbody').addEventListener('click', (e)=>{
    const tr = e.target.closest('tr[data-id]'); if(!tr) return;
    const id = tr.dataset.id;
    
    if (e.target.matches('[data-edit]')) {
      showMealForm((state.meals||[]).find(x=>x.id===id));
    }
    if (e.target.matches('[data-remove]')) {
      if(confirm('Remove entry?')) {
        removeById('meals', id, state);
        renderMeals();
      }
    }
  });
}
function showMealForm(existing){
  const r = existing || { child: childNames()[0]||'', mealType:'Breakfast', date: dayjs().format('YYYY-MM-DD'), amount:0, notes:'' };
  openModal(existing?'Edit Daily Consumption':'New Daily Consumption', `
    <div class="form-group">
      <label>Child<select id="m_child">${childOptions(r.child)}</select></label>
    </div>
    <div class="form-group">
      <label>Meal<select id="m_type">
        <option ${r.mealType==='Breakfast'?'selected':''}>Breakfast</option>
        <option ${r.mealType==='Lunch'?'selected':''}>Lunch</option>
        <option ${r.mealType==='Supper'?'selected':''}>Supper</option>
        <option ${r.mealType==='Snack'?'selected':''}>Snack</option>
        <option ${r.mealType==='Full Course'?'selected':''}>Full Course</option>
      </select></label>
    </div>
    <div class="form-group">
      <label>Date<input id="m_date" type="date" class="input" value="${r.date}"></label>
    </div>
    <div class="form-group">
      <label>Amount (KES)<input id="m_amt" type="number" class="input" value="${r.amount||0}"></label>
    </div>
    <div class="form-group">
      <label>Notes<textarea id="m_notes" class="input" rows="3">${r.notes}</textarea></label>
    </div>
  `, `
    <button class="btn" data-modal-close>Cancel</button>
    <button class="btn primary" id="m_save">Save</button>
  `);
  
  $('#m_save').addEventListener('click', ()=>{
    const rec = {
      id: r.id || crypto.randomUUID(),
      child: $('#m_child').value,
      mealType: $('#m_type').value,
      date: $('#m_date').value,
      amount: +$('#m_amt').value||0,
      notes: $('#m_notes').value.trim()
    };
    
    if(!rec.child || !rec.date) return alert('Child and date are required');
    upsert('meals', rec, state);
    closeModal();
    renderMeals();
  });
}
function filterMeals(){
  const child = $('#m_childFilter').value;
  const q = ($('#m_search')?.value||'').toLowerCase();
  
  const filtered = (state.meals||[]).filter(r=> 
    (!child||r.child===child) && (!q || [r.child,r.mealType,r.notes].some(v=>(v||'').toLowerCase().includes(q)))
  );
  
  $('#m_tbody').innerHTML = filtered.map(m=>`<tr data-id="${m.id}"><td>${fmtDate(m.date)}</td><td>${m.child}</td><td>${m.mealType||''}</td><td>${money(m.amount)}</td><td>${m.notes||''}</td><td><button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button> <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button></td></tr>`).join('') || 
    `<tr><td colspan="6"><div class="empty">No matches.</div></td></tr>`;
}

/* Attendance - Remove charts */
function renderAttendance(){
  const attendance = state.attendance || [];
  const today = dayjs().format('YYYY-MM-DD');
  
  const presentToday = attendance.filter(a => a.date === today && a.status === 'Present').length;
  const absentToday = attendance.filter(a => a.date === today && a.status === 'Absent').length;
  const lateToday = attendance.filter(a => a.date === today && a.status === 'Late').length;

  content.innerHTML = `
    <div class="grid">
      <div class="card accent--green">
        <div class="card-title">Present Today</div>
        <div class="kpi">${presentToday}</div>
      </div>
      <div class="card accent--red">
        <div class="card-title">Absent Today</div>
        <div class="kpi">${absentToday}</div>
      </div>
      <div class="card accent--orange">
        <div class="card-title">Late Today</div>
        <div class="kpi">${lateToday}</div>
      </div>
    </div>

    <div class="toolbar" style="margin-top:16px;">
      <button class="btn primary" id="att_new">Mark Attendance</button>
      <button class="btn" onclick="printElement('#attTable')">Print Report</button>
      <div class="spacer"></div>
      <select id="att_childFilter"><option value="">All children</option>${childOptions('')}</select>
      <input class="input" id="att_search" placeholder="Search records">
      <input class="input" type="date" id="att_date" value="${today}">
    </div>

    <div class="card">
      <table class="table" id="attTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>Child</th>
            <th>Status</th>
            <th>Time In</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="att_tbody">
          ${attendance.map(rowAttendance).join('')}
        </tbody>
      </table>
    </div>
  `;

  $('#att_new').addEventListener('click', ()=> showAttendanceForm());
  $('#att_search').addEventListener('input', filterAttendance);
  $('#att_childFilter').addEventListener('change', filterAttendance);
  $('#att_date').addEventListener('change', filterAttendance);
  $('#att_tbody').addEventListener('click', onAttendanceClick);
}

function rowAttendance(a){
  const statusClass = a.status === 'Present' ? 'badge badge--success' : 
                     a.status === 'Absent' ? 'badge badge--danger' : 'badge badge--warning';
  return `<tr data-id="${a.id}">
    <td>${fmtDate(a.date)}</td>
    <td>${a.child||''}</td>
    <td><span class="${statusClass}">${a.status}</span></td>
    <td>${a.timeIn||'--:--'}</td>
    <td>${a.notes||''}</td>
    <td>
      <button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button>
      <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button>
    </td>
  </tr>`;
}

function showAttendanceForm(existing){
  const r = existing || { 
    child: childNames()[0] || '', 
    date: dayjs().format('YYYY-MM-DD'), 
    status: 'Present', 
    timeIn: dayjs().format('HH:mm'), 
    notes: '' 
  };
  
  openModal(existing ? 'Edit Attendance' : 'Mark Attendance', `
    <div class="form-group">
      <label>Child<select id="att_child">${childOptions(r.child)}</select></label>
    </div>
    <div class="form-group">
      <label>Date<input id="att_date" type="date" class="input" value="${r.date}"></label>
    </div>
    <div class="form-group">
      <label>Status
        <select id="att_status">
          <option ${r.status === 'Present' ? 'selected' : ''}>Present</option>
          <option ${r.status === 'Absent' ? 'selected' : ''}>Absent</option>
          <option ${r.status === 'Late' ? 'selected' : ''}>Late</option>
        </select>
      </label>
    </div>
    <div class="form-group">
      <label>Time In<input id="att_timeIn" type="time" class="input" value="${r.timeIn}"></label>
    </div>
    <div class="form-group">
      <label>Notes<textarea id="att_notes" class="input" rows="3">${r.notes}</textarea></label>
    </div>
  `, `
    <button class="btn" data-modal-close>Cancel</button>
    <button class="btn primary" id="att_save">Save</button>
  `);
  
  $('#att_save').addEventListener('click', () => {
    const rec = {
      id: r.id || crypto.randomUUID(),
      child: $('#att_child').value,
      date: $('#att_date').value,
      status: $('#att_status').value,
      timeIn: $('#att_timeIn').value,
      notes: $('#att_notes').value.trim()
    };
    
    if(!rec.child || !rec.date) return alert('Child and date are required');
    upsert('attendance', rec, state);
    closeModal();
    renderAttendance();
  });
}

function filterAttendance(){
  const child = $('#att_childFilter').value;
  const date = $('#att_date').value;
  const q = $('#att_search').value.toLowerCase();
  
  const filtered = (state.attendance || []).filter(a => 
    (!child || a.child === child) &&
    (!date || a.date === date) &&
    (!q || a.child.toLowerCase().includes(q) || a.notes.toLowerCase().includes(q))
  );
  
  $('#att_tbody').innerHTML = filtered.map(rowAttendance).join('') || 
    `<tr><td colspan="6"><div class="empty">No attendance records found</div></td></tr>`;
}

function onAttendanceClick(e){
  const tr = e.target.closest('tr[data-id]');
  if(!tr) return;
  const id = tr.dataset.id;
  
  if (e.target.matches('[data-edit]')) {
    showAttendanceForm(state.attendance.find(a => a.id === id));
  }
  if (e.target.matches('[data-remove]')) {
    if(confirm('Remove attendance record?')) {
      removeById('attendance', id, state);
      renderAttendance();
    }
  }
}

/* Scheduling - Remove charts */
function renderScheduling(){
  const schedule = state.schedule || [];
  const today = dayjs().format('YYYY-MM-DD');
  
  const upcoming = schedule.filter(s => s.date >= today).slice(0, 10);

  content.innerHTML = `
    <div class="grid">
      <div class="card accent--blue">
        <div class="card-title">Total Events</div>
        <div class="kpi">${schedule.length}</div>
      </div>
      <div class="card accent--green">
        <div class="card-title">Upcoming</div>
        <div class="kpi">${upcoming.length}</div>
      </div>
      <div class="card accent--orange">
        <div class="card-title">Completed</div>
        <div class="kpi">${schedule.filter(s => s.status === 'Completed').length}</div>
      </div>
    </div>

    <div class="toolbar" style="margin-top:16px;">
      <button class="btn primary" id="sch_new">New Schedule</button>
      <button class="btn" onclick="printElement('#schTable')">Print Schedule</button>
      <div class="spacer"></div>
      <select id="sch_type"><option value="">All types</option><option>Activity</option><option>Meeting</option><option>Visit</option><option>Other</option></select>
      <input class="input" type="date" id="sch_date" value="${today}">
      <input class="input" id="sch_search" placeholder="Search events">
    </div>

    <div class="card">
      <table class="table" id="schTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
            <th>Title</th>
            <th>Assigned To</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="sch_tbody">
          ${schedule.map(rowSchedule).join('')}
        </tbody>
      </table>
    </div>
  `;

  $('#sch_new').addEventListener('click', ()=> showScheduleForm());
  $('#sch_search').addEventListener('input', filterSchedule);
  $('#sch_type').addEventListener('change', filterSchedule);
  $('#sch_date').addEventListener('change', filterSchedule);
  $('#sch_tbody').addEventListener('click', onScheduleClick);
}

function rowSchedule(s){
  const statusClass = s.status === 'Completed' ? 'badge badge--success' : 
                     s.status === 'Pending' ? 'badge badge--warning' : 'badge badge--info';
  return `<tr data-id="${s.id}">
    <td>${fmtDate(s.date)}</td>
    <td>${s.time || 'All Day'}</td>
    <td><span class="badge">${s.type}</span></td>
    <td>${s.title}</td>
    <td>${s.assignedTo || 'Everyone'}</td>
    <td><span class="${statusClass}">${s.status}</span></td>
    <td>
      <button class="btn icon-only" data-edit aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/></svg><span class="sr-only">Edit</span></button>
      <button class="btn icon-only" data-remove aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg><span class="sr-only">Delete</span></button>
    </td>
  </tr>`;
}

function showScheduleForm(existing){
  const r = existing || { 
    title: '', 
    type: 'Activity', 
    date: dayjs().format('YYYY-MM-DD'), 
    time: '', 
    assignedTo: '', 
    description: '', 
    status: 'Pending' 
  };
  
  openModal(existing ? 'Edit Schedule' : 'New Schedule', `
    <div class="form-group">
      <label>Title<input id="sch_title" class="input" value="${r.title}"></label>
    </div>
    <div class="form-group">
      <label>Type
        <select id="sch_type">
          <option ${r.type === 'Activity' ? 'selected' : ''}>Activity</option>
          <option ${r.type === 'Meeting' ? 'selected' : ''}>Meeting</option>
          <option ${r.type === 'Visit' ? 'selected' : ''}>Visit</option>
          <option ${r.type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </label>
    </div>
    <div class="form-group">
      <label>Date<input id="sch_date" type="date" class="input" value="${r.date}"></label>
    </div>
    <div class="form-group">
      <label>Time<input id="sch_time" type="time" class="input" value="${r.time}"></label>
    </div>
    <div class="form-group">
      <label>Assigned To<select id="sch_assignee">${childOptions(r.assignedTo)}<option value="">Everyone</option></select></label>
    </div>
    <div class="form-group">
      <label>Status
        <select id="sch_status">
          <option ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option ${r.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </label>
    </div>
    <div class="form-group">
      <label>Description<textarea id="sch_desc" class="input" rows="3">${r.description || ''}</textarea></label>
    </div>
  `, `
    <button class="btn" data-modal-close>Cancel</button>
    <button class="btn primary" id="sch_save">Save</button>
  `);
  
  $('#sch_save').addEventListener('click', () => {
    const rec = {
      id: r.id || crypto.randomUUID(),
      title: $('#sch_title').value.trim(),
      type: $('#sch_type').value,
      date: $('#sch_date').value,
      time: $('#sch_time').value,
      assignedTo: $('#sch_assignee').value,
      status: $('#sch_status').value,
      description: $('#sch_desc').value.trim()
    };
    
    if(!rec.title || !rec.date) return alert('Title and date are required');
    upsert('schedule', rec, state);
    closeModal();
    renderScheduling();
  });
}

function filterSchedule(){
  const type = $('#sch_type').value;
  const date = $('#sch_date').value;
  const q = $('#sch_search').value.toLowerCase();
  
  const filtered = (state.schedule || []).filter(s => 
    (!type || s.type === type) &&
    (!date || s.date === date) &&
    (!q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
  );
  
  $('#sch_tbody').innerHTML = filtered.map(rowSchedule).join('') || 
    `<tr><td colspan="7"><div class="empty">No schedule events found</div></td></tr>`;
}

function onScheduleClick(e){
  const tr = e.target.closest('tr[data-id]');
  if(!tr) return;
  const id = tr.dataset.id;
  
  if (e.target.matches('[data-edit]')) {
    showScheduleForm(state.schedule.find(s => s.id === id));
  }
  if (e.target.matches('[data-remove]')) {
    if(confirm('Remove schedule event?')) {
      removeById('schedule', id, state);
      renderScheduling();
    }
  }
}

function renderScheduleCharts(schedule){
  // Charts removed - empty function
}

function renderUpcomingCalendar(upcoming){
  const calendarEl = document.getElementById('upcomingCalendar');
  if (!calendarEl) return;
  
  // Group by date
  const groupedByDate = {};
  upcoming.forEach(event => {
    if (!groupedByDate[event.date]) {
      groupedByDate[event.date] = [];
    }
    groupedByDate[event.date].push(event);
  });
  
  const sortedDates = Object.keys(groupedByDate).sort();
  
  calendarEl.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
      ${sortedDates.slice(0, 7).map(date => `
        <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
          <div style="font-weight: 600; color: #111; margin-bottom: 8px;">
            ${dayjs(date).format('dddd, MMM D')}
          </div>
          <div style="font-size: 13px;">
            ${groupedByDate[date].map(e => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0;">
                <span>${e.title}</span>
                <span style="color: #6b7280; font-size: 11px;">${e.time || 'All day'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* Initialize */
function init(){
  // nav
  $$('.nav-item').forEach(btn => btn.addEventListener('click', ()=> setRoute(btn.dataset.route)));
  // modal close
  modal.addEventListener('click', (e)=> { 
    if (e.target.matches('[data-modal-close]') || e.target === $('.modal__backdrop')) closeModal(); 
  });
  
  // Apply theme colors from settings
  const st = state.meta?.settings || {};
  document.documentElement.style.setProperty('--primary', st.primaryColor || '#111');
  document.documentElement.style.setProperty('--secondary', st.secondaryColor || '#2f6feb');
  document.documentElement.style.setProperty('--hover', st.hoverColor || '#f2f2f2');
  
  // route
  render(getRoute());
  // NEW: toggles and global search
  $('#compactToggle')?.addEventListener('click', ()=> $('.sidebar')?.classList.toggle('compact'));
  $('#sidebarToggle')?.addEventListener('click', ()=> $('.sidebar')?.classList.toggle('hidden'));
  $('#globalSearch')?.addEventListener('input', (e)=> globalSearch(e.target.value));
}

// Ensure render function is defined and available globally
window.render = function(route) {
  switch(route){
    case 'dashboard': renderDashboard(); break;
    case 'admissions': renderAdmissions(); break;
    case 'children': renderChildren(); break;
    case 'adoption': renderAdoption(); break;
    case 'health': renderHealth(); break;
    case 'education': renderEducation(); break;
    case 'attendance': renderAttendance(); break;
    case 'incidents': renderIncidents(); break;
    case 'meals': renderMeals(); break;
    case 'inventory': renderInventory(); break;
    case 'staff': renderStaff(); break;
    case 'schedule': renderScheduling(); break;
    case 'donations': renderDonations(); break;
    case 'finance': renderFinance(); break;
    case 'reports': renderReports(); break;
    case 'announcements': renderAnnouncements(); break;
    case 'settings': renderSettings(); break;
    default: renderDashboard();
  }
};

// Ensure printElement is available globally
window.printElement = function(selector){
  const el = document.querySelector(selector); 
  if(!el) {
    console.error('Print element not found:', selector);
    return;
  }
  
  const st = state.meta?.settings || {};
  const logoUrl = localStorage.getItem('homecare_logo_url') || st.logoUrl || '';
  const header = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:48px; width:auto;">` : ''}
      <div>
        <div style="font-weight:700; font-size:18px;">${st.orgName||'HomeCare Orphanage'}</div>
        <div style="font-size:14px; color:#555;">${st.orgAddress||'Nairobi, Kenya'}</div>
      </div>
    </div>`;
    
  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(`<html><head><title>Print Report</title><style>
    body{font-family: "Noto Sans", Arial, sans-serif; padding:16px; color:#111; line-height:1.4;}
    table{width:100%; border-collapse:collapse; margin-top:10px;}
    th,td{border:1px solid #ddd; padding:8px; text-align:left; font-size:14px;}
    th{background:#f5f5f5; font-weight:600;}
    .header-info{margin-bottom:20px; border-bottom:2px solid #111; padding-bottom:10px;}
    h2{margin:0 0 10px 0; color:#111;}
    @media print {
      body { margin: 0; }
      .header-info { page-break-after: avoid; }
    }
  </style></head><body><div class="header-info">${header}</div><h2>Report</h2>${el.outerHTML}</body></html>`);
  
  w.document.close(); 
  w.focus(); 
  setTimeout(() => {
    w.print(); 
    w.close();
  }, 250);
};

// Also expose drawSpark globally
window.drawSpark = function(selector, data, stroke='#2f6feb'){
  const el = document.querySelector(selector); if(!el) return;
  const w = el.clientWidth || 300, h = el.clientHeight || 80, p = 6;
  const max = Math.max(...data,1), min = Math.min(...data,0);
  const x = (i)=> p + (i*(w-2*p))/(data.length-1);
  const y = (v)=> h - p - ((v-min)/(max-min||1))*(h-2*p);
  const d = data.map((v,i)=> `${i?'L':'M'}${x(i)},${y(v)}`).join(' ');
  el.innerHTML = `
    <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${stroke}" stop-opacity="0.25"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${d}" stroke="${stroke}" fill="none"/>
    <path d="${d} L ${x(data.length-1)},${h-p} L ${x(0)},${h-p} Z" fill="url(#grad)"/>
  `;
};

init();

window.addEventListener('hashchange', ()=> render(getRoute()));
document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') closeModal(); });