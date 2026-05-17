(function () {
    const tokenKey = 'pequenoCesar.token';
    const tokenExpiresAtKey = 'pequenoCesar.tokenExpiresAt';
    const userKey = 'pequenoCesar.user';
    const authNoticeKey = 'pequenoCesar.authNotice';
    let inventarioCache = [];
    let recetasCache = [];
    let recetaIngredientesDraft = [];
    let clientesCache = [];
    let proveedoresCache = [];
    let ordenesCache = [];
    let reporteRecetasCache = [];
    let reportePedidosCache = [];
    let misPedidosCache = [];
    let cocinaPedidosCache = [];
    let dashboardProfitPedidosCache = [];
    let dashboardProfitDayFilter = '';
    let pedidoRecetasDraft = [];
    let ordenInsumosDraft = [];
     let empleadosCache = [];
     const tableState = {
        clientes: { sortKey: 'nombre', sortDirection: 'asc', page: 1, pageSize: 5 },
         empleados: { sortKey: 'nombres', sortDirection: 'asc', page: 1, pageSize: 5 },
         inventario: { sortKey: 'nombreInsumo', sortDirection: 'asc', page: 1, pageSize: 5 },
         proveedores: { sortKey: 'nombre', sortDirection: 'asc', page: 1, pageSize: 5 },
          recetas: { sortKey: 'nombre', sortDirection: 'asc', page: 1, pageSize: 5 },
          reporteRecetas: { sortKey: 'cantidad', sortDirection: 'desc', page: 1, pageSize: 5 },
          ordenes: { sortKey: 'nombreProveedor', sortDirection: 'asc', page: 1, pageSize: 5 },
          misPedidos: { sortKey: 'fechaHora', sortDirection: 'desc', page: 1, pageSize: 5 },
          cocinaPedidos: { sortKey: 'fechaHora', sortDirection: 'asc', page: 1, pageSize: 5 },
          reportePedidos: { sortKey: 'fechaHora', sortDirection: 'desc', page: 1, pageSize: 5 }
    };

    const $ = (selector) => document.querySelector(selector);
    const text = (selector, value) => {
        const element = $(selector);
        if (element) {
            element.textContent = value ?? '0';
        }
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    function getToken() {
        const expiresAt = Number(localStorage.getItem(tokenExpiresAtKey) || 0);
        if (expiresAt && Date.now() >= expiresAt) {
            sessionStorage.setItem(authNoticeKey, 'Sesion expirada. Inicia sesion nuevamente.');
            clearAuth();
            return null;
        }
        return localStorage.getItem(tokenKey);
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(userKey) || '{}');
        } catch (error) {
            clearAuth();
            return {};
        }
    }

    function normalizedUserRole(user) {
        const role = String(user?.rol || '').toUpperCase();
        return ['GERENTE', 'CAJERO', 'COCINA'].includes(role) ? role : '';
    }

    function isGerente(user) {
        const role = String(user?.rol || '').toUpperCase();
        return role === 'GERENTE';
    }

    function isCocina(user) {
        const role = String(user?.rol || '').toUpperCase();
        return role === 'COCINA';
    }

    function isAllowedRole(user, allowedRoles) {
        const role = String(user?.rol || '').toUpperCase();
        return allowedRoles.split(',').map((item) => item.trim().toUpperCase()).includes(role);
    }

    function applySidebarByRole(user) {
        const normalizedRole = normalizedUserRole(user) || 'PENDING';
        document.querySelectorAll('.sidebar').forEach((sidebar) => {
            sidebar.dataset.activeRole = normalizedRole;
        });
    }

    async function api(path, options = {}) {
        const headers = { Accept: 'application/json', ...(options.headers || {}) };
        const token = getToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(path, {
            method: options.method || 'GET',
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });

        let payload = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            payload = await response.json();
        }

        if (response.status === 401 && path !== '/api/auth/login') {
            logout('Sesion expirada. Inicia sesion nuevamente.');
            throw new Error('Sesion expirada. Inicia sesion nuevamente.');
        }
        if (!response.ok || payload?.success === false) {
            throw new Error(payload?.message || `Error HTTP ${response.status}`);
        }

        return payload?.data;
    }

    function showAlert(message, type = 'success') {
        if (window.Swal) {
            const iconByType = {
                success: 'success',
                danger: 'error',
                warning: 'warning',
                info: 'info'
            };

            window.Swal.fire({
                toast: true,
                position: 'top-end',
                icon: iconByType[type] || 'info',
                title: message,
                showConfirmButton: false,
                timer: 3200,
                timerProgressBar: true
            });
            return;
        }

        const alert = $('#appAlert');
        if (!alert) {
            return;
        }
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.classList.remove('d-none');
        window.setTimeout(() => alert.classList.add('d-none'), 4500);
    }

    function formData(form) {
        return Object.fromEntries(new FormData(form).entries());
    }

    function cleanEmptyStrings(object) {
        return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, value === '' ? null : value]));
    }

    function stockStatus(item) {
        const current = Number(item.stockActual || 0);
        const minimum = Number(item.stockMinimo || 0);
        if (current <= minimum) {
            return { label: 'Critico', className: 'status-critical' };
        }
        if (current <= minimum * 2) {
            return { label: 'Bajo', className: 'status-low' };
        }
        return { label: 'Normal', className: 'status-ok' };
    }

    function formatQuantity(value) {
        const quantity = Number(value ?? 0);
        return quantity.toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatCurrency(value) {
        const amount = Number(value ?? 0);
        return `S/ ${amount.toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function formatDate(value) {
        if (!value) {
            return '-';
        }

        return new Date(`${value}T00:00:00`).toLocaleDateString('es-PE');
    }

    function formatDateInput(value) {
        const date = value ? new Date(value) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateTime(value) {
        if (!value) {
            return '-';
        }

        return new Date(value).toLocaleString('es-PE', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    function cleanQuantity(value) {
        return Number(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    }

    function tipoAtencionLabel(value) {
        return String(value || '').toUpperCase() === 'DELIVERY' ? 'Delivery' : 'Local';
    }

    function firstWord(value) {
        return String(value || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    }

    function shortPersonName(parts, fallback) {
        const firstName = firstWord(parts?.nombres || parts?.nombre);
        const firstLastName = firstWord(parts?.apellidos || parts?.apellido);
        if (firstName || firstLastName) {
            return [firstName, firstLastName].filter(Boolean).join(' ');
        }

        const tokens = String(fallback || '').trim().split(/\s+/).filter(Boolean);
        if (tokens.length >= 4) {
            return `${tokens[0]} ${tokens[2]}`;
        }
        return tokens.slice(0, 2).join(' ') || '-';
    }

    function hasDeliveryContact(cliente) {
        return Boolean(String(cliente?.direccion || '').trim() && String(cliente?.celular || '').trim());
    }

    function compareTableValues(a, b) {
        const first = a ?? '';
        const second = b ?? '';
        const firstNumber = Number(first);
        const secondNumber = Number(second);
        if (!Number.isNaN(firstNumber) && !Number.isNaN(secondNumber) && first !== '' && second !== '') {
            return firstNumber - secondNumber;
        }

        return String(first).localeCompare(String(second), 'es', { numeric: true, sensitivity: 'base' });
    }

    function sortRows(rows, state, valueGetter) {
        return [...rows].sort((a, b) => {
            const result = compareTableValues(valueGetter(a, state.sortKey), valueGetter(b, state.sortKey));
            return state.sortDirection === 'asc' ? result : -result;
        });
    }

    function paginateRows(rows, state) {
        const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
        if (state.page > totalPages) {
            state.page = totalPages;
        }
        const start = (state.page - 1) * state.pageSize;
        return rows.slice(start, start + state.pageSize);
    }

    function renderPagination(selector, rowsCount, state, tableName) {
        const pagination = $(selector);
        if (!pagination) {
            return;
        }

        const totalPages = Math.max(1, Math.ceil(rowsCount / state.pageSize));
        pagination.innerHTML = `
            <button class="btn btn-sm btn-outline-dark" type="button" data-table-page="${tableName}" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>Anterior</button>
            <span>Pagina ${state.page} de ${totalPages}</span>
            <button class="btn btn-sm btn-outline-dark" type="button" data-table-page="${tableName}" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''}>Siguiente</button>
        `;
    }

    function updateSortIndicators(tableName) {
        const state = tableState[tableName];
        const sortNameByTable = {
            clientes: 'cliente',
            empleados: 'empleado',
            inventario: 'inventario',
            proveedores: 'proveedor',
            recetas: 'receta',
            reporteRecetas: 'reporte-receta',
            ordenes: 'orden',
            misPedidos: 'mis-pedido',
            cocinaPedidos: 'cocina-pedido',
            reportePedidos: 'reporte-pedido'
        };
        const datasetKeyByTable = {
            clientes: 'sortCliente',
            empleados: 'sortEmpleado',
            inventario: 'sortInventario',
            proveedores: 'sortProveedor',
            recetas: 'sortReceta',
            reporteRecetas: 'sortReporteReceta',
            ordenes: 'sortOrden',
            misPedidos: 'sortMisPedido',
            cocinaPedidos: 'sortCocinaPedido',
            reportePedidos: 'sortReportePedido'
        };
        const sortName = sortNameByTable[tableName];
        const datasetKey = datasetKeyByTable[tableName];
        document.querySelectorAll(`[data-sort-${sortName}]`).forEach((button) => {
            const key = button.dataset[datasetKey];
            const label = button.textContent.replace(/\s[↑↓]$/, '');
            button.textContent = key === state.sortKey ? `${label} ${state.sortDirection === 'asc' ? '↑' : '↓'}` : label;
        });
    }

    function roleValue(rol) {
        return String(rol || '').toUpperCase();
    }

    function roleLabel(rol) {
        const roles = {
            GERENTE: 'Gerente',
            CAJERO: 'Cajero',
            COCINA: 'Cocina'
        };
        return roles[roleValue(rol)] || rol || 'Sin rol';
    }

    function tamanoLabel(tamano) {
        const tamanos = {
            PERSONAL: 'Personal',
            MEDIANA: 'Mediana',
            FAMILIAR: 'Familiar'
        };
        return tamanos[String(tamano || '').toUpperCase()] || 'Personal';
    }

    function recetaPrecioPorTamano(receta, tamano) {
        const key = String(tamano || '').toUpperCase();
        if (key === 'MEDIANA') {
            return Number(receta?.precioMediana ?? receta?.precioPersonal ?? receta?.precio ?? 0);
        }
        if (key === 'FAMILIAR') {
            return Number(receta?.precioFamiliar ?? receta?.precioPersonal ?? receta?.precio ?? 0);
        }
        return Number(receta?.precioPersonal ?? receta?.precio ?? 0);
    }

    function eyeIcon(hidden) {
        if (hidden) {
            return `
                <svg viewBox="0 0 24 24" aria-hidden="true" class="eye-icon">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>`;
        }

        return `
            <svg viewBox="0 0 24 24" aria-hidden="true" class="eye-icon">
                <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M10.7 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-3.2 4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>`;
    }

    function clearAuth() {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(tokenExpiresAtKey);
        localStorage.removeItem(userKey);
    }

    function logout(message) {
        if (typeof message === 'string' && message.trim()) {
            sessionStorage.setItem(authNoticeKey, message);
        }
        clearAuth();
        if (!location.pathname.endsWith('/login')) {
            location.href = '/login';
        }
    }

    function showLoginNotice() {
        const message = sessionStorage.getItem(authNoticeKey);
        if (!message) {
            return;
        }
        sessionStorage.removeItem(authNoticeKey);
        if (message.startsWith('[object ')) {
            return;
        }
        const alert = $('#loginAlert');
        if (alert) {
            alert.textContent = message;
            alert.classList.remove('d-none');
        }
    }

    function applyPageRoleRestrictions(user) {
        const cocina = isCocina(user);
        if (document.body.dataset.page === 'inventario' && cocina) {
            document.body.classList.add('kitchen-readonly-page');
            $('#inventarioSubmitTop')?.classList.add('d-none');
            $('#inventarioForm')?.closest('.panel-card')?.classList.add('d-none');
        }
        if (document.body.dataset.page === 'recetas' && cocina) {
            document.body.classList.add('kitchen-readonly-page');
            $('#recetaSubmitTop')?.classList.add('d-none');
            $('#recetaForm')?.closest('.panel-card')?.classList.add('d-none');
            document.querySelectorAll('[data-sort-receta="precio"], [data-sort-receta="estado"]').forEach((item) => item.classList.add('d-none'));
        }
    }

    function initLogin() {
        const form = $('#loginForm');
        if (!form) {
            return;
        }
        if (getToken()) {
            location.href = '/dashboard';
            return;
        }
        showLoginNotice();

        const passwordInput = $('#contrasena');
        const togglePassword = $('#toggleLoginPassword');
        if (passwordInput && togglePassword) {
            togglePassword.innerHTML = eyeIcon(true);
            togglePassword.addEventListener('click', () => {
                const showPassword = passwordInput.type === 'password';
                passwordInput.type = showPassword ? 'text' : 'password';
                togglePassword.innerHTML = eyeIcon(!showPassword);
                togglePassword.setAttribute('aria-label', showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena');
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const alert = $('#loginAlert');
            alert?.classList.add('d-none');

            try {
                const data = await api('/api/auth/login', {
                    method: 'POST',
                    body: formData(form)
                });
                localStorage.setItem(tokenKey, data.token);
                localStorage.setItem(tokenExpiresAtKey, String(Date.now() + Number(data.expiresInMs || 0)));
                localStorage.setItem(userKey, JSON.stringify({
                    idEmpleado: data.idEmpleado,
                    nombre: data.nombre,
                    nombres: data.nombres,
                    apellidos: data.apellidos,
                    user: data.user,
                    rol: data.rol
                }));
                location.href = '/dashboard';
            } catch (error) {
                if (alert) {
                    alert.textContent = error.message;
                    alert.classList.remove('d-none');
                }
            }
        });
    }

    async function loadDashboard() {
        if (!$('#kpiTotalPedidos')) {
            return;
        }
        const role = normalizedUserRole(getUser());
        if (role === 'CAJERO') {
            await loadCajeroDashboard();
            return;
        }
        if (role === 'COCINA') {
            await loadCocinaDashboard();
            return;
        }
        if (role === 'GERENTE') {
            await loadGerenteDashboard();
        }
    }

    async function loadGerenteDashboard() {
        const data = await api('/api/reportes/dashboard');
        setDashboardKpis([
            ['Stock bajo', data.stockBajo, 'insumos en alerta'],
            ['Alertas', data.alertasPendientes, 'activas'],
            ['Pedidos del mes', data.pedidosMes, 'pedidos'],
            ['Total pedidos', data.totalPedidos, 'registrados']
        ]);
        renderGerenteReportShell();
        await loadDashboardReports();
    }

    async function loadCajeroDashboard() {
        const pedidos = await api('/api/pedidos');
        const ownPedidos = filterCurrentEmployeeOrders(pedidos);
        const abiertos = ownPedidos.filter((item) => String(item.estado || '').toLowerCase() !== 'entregado');
        const registrados = ownPedidos.filter((item) => String(item.estado || '').toLowerCase() === 'registrado');
        const listos = ownPedidos.filter((item) => String(item.estado || '').toLowerCase() === 'listo');
        const generado = ownPedidos.map((item) => Number(item.total || 0)).reduce((sum, value) => sum + value, 0);
        setDashboardKpis([
            ['Mis pedidos', ownPedidos.length, 'registrados'],
            ['Abiertos', abiertos.length, 'por atender'],
            ['Listos', listos.length, 'para entregar'],
            ['Generado', formatCurrency(generado), 'en pedidos']
        ]);
        setDashboardPanel('Mis pedidos recientes', 'Pedidos registrados por ti', buildPedidoDashboardRows(ownPedidos));
        renderCajeroProfitPanel(ownPedidos);
    }

    function filterCurrentEmployeeOrders(pedidos) {
        const user = getUser();
        if (user.idEmpleado) {
            return pedidos.filter((item) => item.idEmpleado === user.idEmpleado);
        }

        const currentName = String(user.nombre || `${user.nombres || ''} ${user.apellidos || ''}`).trim().toLowerCase();
        return pedidos.filter((item) => String(item.nombreEmpleado || '').trim().toLowerCase() === currentName);
    }

    function renderCajeroProfitPanel(pedidos) {
        text('#dashboardSecondaryTitle', 'Generado por mis pedidos');
        text('#dashboardSecondaryCaption', 'Total por dia');
        const list = $('#dashboardSecondaryList');
        if (!list) {
            return;
        }
        list.innerHTML = '<div id="dashboardCajeroGananciaChart" class="order-profit-chart" aria-label="Grafico de lo generado por el cajero"></div>';
        renderOrderProfitChart($('#dashboardCajeroGananciaChart'), pedidos);
    }

    async function loadCocinaDashboard() {
        const [inventario, recetas, pedidos] = await Promise.all([
            api('/api/inventario'),
            api('/api/recetas'),
            api('/api/pedidos')
        ]);
        const activos = inventario.filter((item) => String(item.estado || 'Activo').toLowerCase() === 'activo');
        const criticos = activos.filter((item) => Number(item.stockActual || 0) <= Number(item.stockMinimo || 0));
        const porVencer = activos.filter(isExpiringSoon);
        const recetasActivas = recetas.filter((item) => String(item.estado || 'Activo').toLowerCase() === 'activo');
        const pedidosCocina = pedidos
            .filter((item) => ['registrado', 'en preparación'].includes(String(item.estado || '').toLowerCase()))
            .sort((a, b) => new Date(a.fechaHora || 0) - new Date(b.fechaHora || 0));
        const registrados = pedidosCocina.filter((item) => String(item.estado || '').toLowerCase() === 'registrado');
        const enPreparacion = pedidosCocina.filter((item) => String(item.estado || '').toLowerCase() === 'en preparación');
        setDashboardKpis([
            ['Pedidos cocina', pedidosCocina.length, 'por preparar'],
            ['Registrados', registrados.length, 'nuevos pedidos'],
            ['En preparacion', enPreparacion.length, 'en proceso'],
            ['Insumos criticos', criticos.length, 'requieren stock']
        ]);
        setDashboardPanel('Cola de cocina', 'Pedidos pendientes ordenados por llegada', buildCocinaPedidoRows(pedidosCocina));
        renderCocinaInventoryPanel(criticos, porVencer, recetasActivas.length, activos.length);
    }

    function buildCocinaPedidoRows(pedidos) {
        return pedidos.slice(0, 6).map((item) => {
            const estado = String(item.estado || '').toLowerCase();
            const className = estado === 'registrado' ? 'danger' : 'warning';
            const nextLabel = estado === 'registrado' ? 'Tomar pedido' : 'Marcar listo';
            return `
                <article class="dashboard-list-item kitchen-order-item ${className}">
                    <div>
                        <strong>${escapeHtml(item.nombreCliente || 'Cliente')}</strong>
                        <span>${escapeHtml(item.detalleProductos || 'Sin detalle')}</span>
                        <small>${escapeHtml(formatDateTime(item.fechaHora))} · ${escapeHtml(tipoAtencionLabel(item.tipoAtencion))}</small>
                    </div>
                    <a class="btn btn-sm btn-dark" href="/cocina-pedidos">${nextLabel}</a>
                </article>
            `;
        });
    }

    function renderCocinaInventoryPanel(criticos, porVencer, recetasActivas, insumosActivos) {
        text('#dashboardSecondaryTitle', 'Estado de cocina');
        text('#dashboardSecondaryCaption', 'Inventario y accesos rapidos');
        const list = $('#dashboardSecondaryList');
        if (!list) {
            return;
        }

        const criticalRows = criticos.slice(0, 3).map((item) => `
            <article class="kitchen-supply-row danger">
                <strong>${escapeHtml(item.nombreInsumo)}</strong>
                <span>${escapeHtml(formatQuantity(item.stockActual))} ${escapeHtml(item.unidad || '')}</span>
                <small>Minimo ${escapeHtml(formatQuantity(item.stockMinimo))} ${escapeHtml(item.unidad || '')}</small>
            </article>
        `).join('');
        const expiringRows = porVencer.slice(0, 3).map((item) => `
            <article class="kitchen-supply-row warning">
                <strong>${escapeHtml(item.nombreInsumo)}</strong>
                <span>Vence ${escapeHtml(formatDate(item.fechaCaducidad))}</span>
                <small>${escapeHtml(formatQuantity(item.stockActual))} ${escapeHtml(item.unidad || '')}</small>
            </article>
        `).join('');

        list.innerHTML = `
            <div class="kitchen-dashboard-summary">
                <article><span>Recetas activas</span><strong>${escapeHtml(recetasActivas)}</strong></article>
                <article><span>Insumos activos</span><strong>${escapeHtml(insumosActivos)}</strong></article>
            </div>
            <div class="kitchen-dashboard-actions">
                <a class="dashboard-link-item" href="/cocina-pedidos"><strong>Pedidos cocina</strong><span>Gestionar preparacion</span></a>
                <a class="dashboard-link-item" href="/inventario"><strong>Agregar stock</strong><span>Reponer insumos</span></a>
                <a class="dashboard-link-item" href="/recetas"><strong>Ver recetas</strong><span>Consultar ingredientes</span></a>
            </div>
            <div class="kitchen-supply-list">
                ${criticalRows || '<p class="dashboard-empty">Sin insumos criticos.</p>'}
                ${expiringRows || ''}
            </div>
        `;
    }

    function setDashboardKpis(items) {
        const slots = [
            ['#kpiStockBajoLabel', '#kpiStockBajo', '#kpiStockBajoHelp'],
            ['#kpiAlertasLabel', '#kpiAlertas', '#kpiAlertasHelp'],
            ['#kpiPedidosMesLabel', '#kpiPedidosMes', '#kpiPedidosMesHelp'],
            ['#kpiTotalPedidosLabel', '#kpiTotalPedidos', '#kpiTotalPedidosHelp']
        ];
        items.forEach((item, index) => {
            const slot = slots[index];
            text(slot[0], item[0]);
            text(slot[1], item[1]);
            text(slot[2], item[2]);
        });
    }

    function setDashboardPanel(title, caption, rows) {
        text('#dashboardPrimaryTitle', title);
        text('#dashboardPrimaryCaption', caption);
        const list = $('#dashboardPrimaryList');
        if (!list) {
            return;
        }
        list.innerHTML = rows.length === 0
            ? '<p class="dashboard-empty">No hay pendientes por ahora.</p>'
            : rows.join('');
    }

    function setDashboardLinks(title, caption, links) {
        text('#dashboardSecondaryTitle', title);
        text('#dashboardSecondaryCaption', caption);
        const list = $('#dashboardSecondaryList');
        if (!list) {
            return;
        }
        list.innerHTML = links.map(([label, href, description]) => `
            <a class="dashboard-link-item" href="${escapeHtml(href)}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(description)}</span></a>
        `).join('');
    }

    function renderGerenteReportShell() {
        text('#dashboardPrimaryTitle', 'Ingredientes usados');
        text('#dashboardPrimaryCaption', 'Calculado desde recetas pedidas');
        text('#dashboardSecondaryTitle', 'Ganancia de pedidos');
        text('#dashboardSecondaryCaption', 'Total vendido por dia');

        const primary = $('#dashboardPrimaryList');
        const secondary = $('#dashboardSecondaryList');
        if (primary) {
            primary.innerHTML = `
                <form id="dashboardReportFilterForm" class="dashboard-report-filter">
                    <label>Inicio<input id="dashboardReportInicio" class="form-control" type="date"></label>
                    <label>Fin<input id="dashboardReportFin" class="form-control" type="date"></label>
                    <button class="btn btn-brand" type="submit">Filtrar</button>
                </form>
                <div class="dashboard-report-summary">
                    <article><span>Ingredientes</span><strong id="dashboardIngredientesDistintos">0</strong></article>
                    <article><span>Pedidos</span><strong id="dashboardPedidosCantidad">0</strong></article>
                    <article><span>Ganancia total</span><strong id="dashboardGananciaTotal">S/ 0.00</strong></article>
                </div>
                <div class="ingredient-chart-layout">
                    <div id="dashboardIngredientesChart" class="ingredient-pie-chart" aria-label="Grafico pastel de ingredientes"></div>
                    <div id="dashboardIngredientesLegend" class="ingredient-chart-legend"></div>
                </div>
            `;
        }
        if (secondary) {
            secondary.innerHTML = `
                <div id="dashboardGananciaChart" class="order-profit-chart" aria-label="Grafico de barras de ganancia de pedidos"></div>
            `;
        }
        initDashboardReportFilters();
        $('#dashboardReportFilterForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await loadDashboardReports();
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
    }

    function initDashboardReportFilters() {
        const inicioInput = $('#dashboardReportInicio');
        const finInput = $('#dashboardReportFin');
        if (!inicioInput || !finInput || inicioInput.value || finInput.value) {
            return;
        }
        const now = new Date();
        inicioInput.value = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
        finInput.value = formatDateInput(now);
    }

    async function loadDashboardReports() {
        const ingredientesChart = $('#dashboardIngredientesChart');
        const gananciaChart = $('#dashboardGananciaChart');
        if (!ingredientesChart || !gananciaChart) {
            return;
        }
        initDashboardReportFilters();
        const inicio = $('#dashboardReportInicio')?.value;
        const fin = $('#dashboardReportFin')?.value;
        const params = new URLSearchParams();
        if (inicio) {
            params.set('inicio', inicio);
        }
        if (fin) {
            params.set('fin', fin);
        }
        const query = params.toString();
        const [pedidos, ingredientes] = await Promise.all([
            api(`/api/reportes/pedidos${query ? `?${query}` : ''}`),
            api(`/api/reportes/ingredientes-usados${query ? `?${query}` : ''}`)
        ]);
        renderDashboardIngredientesReport(ingredientes, pedidos);
        renderDashboardGananciaReport(pedidos);
    }

    function renderDashboardIngredientesReport(ingredientes, pedidos) {
        const chart = $('#dashboardIngredientesChart');
        const legend = $('#dashboardIngredientesLegend');
        if (!chart || !legend) {
            return;
        }
        const totalGanancia = pedidos
            .map((item) => Number(item.total || 0))
            .reduce((sum, value) => sum + value, 0);
        text('#dashboardIngredientesDistintos', ingredientes.length);
        text('#dashboardPedidosCantidad', pedidos.length);
        text('#dashboardGananciaTotal', formatCurrency(totalGanancia));
        renderIngredientPieChart(chart, legend, ingredientes);
    }

    function renderDashboardGananciaReport(pedidos) {
        const chart = $('#dashboardGananciaChart');
        if (!chart) {
            return;
        }
        renderOrderProfitChart(chart, pedidos);
    }

    function renderIngredientDayChart(container, ingredientesPorDia) {
        if (ingredientesPorDia.length === 0) {
            container.innerHTML = '<p class="dashboard-empty">No hay ingredientes usados para graficar.</p>';
            return;
        }

        const rowsByDate = new Map();
        ingredientesPorDia.forEach((item) => {
            const date = item.fecha || 'Sin fecha';
            if (!rowsByDate.has(date)) {
                rowsByDate.set(date, []);
            }
            rowsByDate.get(date).push(item);
        });

        const max = Math.max(...ingredientesPorDia.map((item) => Number(item.cantidadUsada || 0)), 1);
        container.innerHTML = Array.from(rowsByDate.entries())
            .sort(([first], [second]) => first.localeCompare(second))
            .map(([date, rows]) => `
                <article class="ingredient-day-card">
                    <strong>${escapeHtml(formatDate(date))}</strong>
                    <div class="ingredient-day-bars">
                        ${rows
                            .sort((a, b) => Number(b.cantidadUsada || 0) - Number(a.cantidadUsada || 0))
                            .slice(0, 5)
                            .map((item) => {
                                const value = Number(item.cantidadUsada || 0);
                                const width = Math.max((value / max) * 100, 8);
                                return `
                                    <div class="ingredient-day-row">
                                        <span>${escapeHtml(item.nombreInsumo || '-')}</span>
                                        <div><em style="width: ${width}%"></em></div>
                                        <small>${escapeHtml(cleanQuantity(value))} ${escapeHtml(item.unidad || '')}</small>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                </article>
            `).join('');
    }

    function renderIngredientPieChart(chart, legend, ingredientes) {
        const rows = ingredientes
            .slice(0, 6)
            .map((item) => ({
                name: item.nombreInsumo || 'Ingrediente',
                value: Number(item.cantidadUsada || 0),
                unit: item.unidad || ''
            }))
            .filter((item) => item.value > 0);
        if (rows.length === 0) {
            chart.innerHTML = '<p class="dashboard-empty">No hay ingredientes para graficar.</p>';
            legend.innerHTML = '';
            return;
        }

        const colors = ['#ff6b35', '#2f80ed', '#27ae60', '#9b51e0', '#f2c94c', '#eb5757'];
        const total = rows.reduce((sum, item) => sum + item.value, 0);
        let cumulative = 0;
        const segments = rows.map((item, index) => {
            const start = cumulative;
            const percent = (item.value / total) * 100;
            cumulative += percent;
            return `${colors[index % colors.length]} ${start}% ${cumulative}%`;
        });

        chart.innerHTML = `
            <div class="pie-visual" style="background: conic-gradient(${segments.join(', ')})"></div>
        `;
        legend.innerHTML = rows.map((item, index) => {
            const percent = total === 0 ? 0 : (item.value / total) * 100;
            return `
                <div class="ingredient-legend-item">
                    <span style="background: ${colors[index % colors.length]}"></span>
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${escapeHtml(cleanQuantity(item.value))} ${escapeHtml(item.unit)} · ${percent.toFixed(1)}%</small>
                </div>
            `;
        }).join('');
    }

    function renderOrderProfitChart(container, pedidos) {
        dashboardProfitPedidosCache = pedidos;
        const totalsByDate = new Map();
        pedidos.forEach((pedido) => {
            const dateKey = String(pedido.fechaHora || '').slice(0, 10) || 'Sin fecha';
            totalsByDate.set(dateKey, (totalsByDate.get(dateKey) || 0) + Number(pedido.total || 0));
        });

        const rows = Array.from(totalsByDate.entries())
            .sort(([first], [second]) => first.localeCompare(second));
        if (rows.length === 0) {
            container.innerHTML = '<p class="dashboard-empty">No hay pedidos para graficar.</p>';
            return;
        }

        if (dashboardProfitDayFilter && !rows.some(([date]) => date === dashboardProfitDayFilter)) {
            dashboardProfitDayFilter = '';
        }
        const visibleRows = dashboardProfitDayFilter
            ? rows.filter(([date]) => date === dashboardProfitDayFilter)
            : rows;
        const max = Math.max(...visibleRows.map(([, total]) => total), 1);
        const controls = `
            <div class="order-profit-filters" aria-label="Filtrar ganancia por dia">
                <button class="${dashboardProfitDayFilter ? '' : 'active'}" type="button" data-dashboard-profit-day="">Todos</button>
                ${rows.map(([date]) => `
                    <button class="${dashboardProfitDayFilter === date ? 'active' : ''}" type="button" data-dashboard-profit-day="${escapeHtml(date)}">${escapeHtml(formatDate(date))}</button>
                `).join('')}
            </div>
        `;
        const bars = visibleRows.map(([date, total]) => {
            const height = Math.max((total / max) * 100, 8);
            return `
                <div class="order-profit-item">
                    <div class="order-profit-value">${escapeHtml(formatCurrency(total))}</div>
                    <div class="order-profit-track"><span style="height: ${height}%"></span></div>
                    <strong>${escapeHtml(formatDate(date))}</strong>
                </div>
            `;
        }).join('');
        container.innerHTML = `${controls}<div class="order-profit-bars">${bars}</div>`;
        container.querySelectorAll('[data-dashboard-profit-day]').forEach((button) => {
            button.addEventListener('click', () => {
                dashboardProfitDayFilter = button.dataset.dashboardProfitDay || '';
                renderOrderProfitChart(container, dashboardProfitPedidosCache);
            });
        });
    }

    function buildPedidoDashboardRows(pedidos) {
        return [...pedidos]
            .sort((a, b) => new Date(b.fechaHora || 0) - new Date(a.fechaHora || 0))
            .slice(0, 5)
            .map((item) => `
                <article class="dashboard-list-item">
                    <strong>${escapeHtml(item.nombreCliente || 'Cliente')}</strong>
                    <span>${escapeHtml(item.detalleProductos || 'Sin detalle')}</span>
                    <small>${escapeHtml(item.estado || '-')} · ${escapeHtml(formatCurrency(item.total))}</small>
                </article>
            `);
    }

    function buildCocinaDashboardRows(criticos, porVencer) {
        const criticalRows = criticos.slice(0, 4).map((item) => `
            <article class="dashboard-list-item danger">
                <strong>${escapeHtml(item.nombreInsumo)}</strong>
                <span>Stock critico: ${escapeHtml(cleanQuantity(item.stockActual || 0))} ${escapeHtml(item.unidad || '')}</span>
                <small>Minimo: ${escapeHtml(cleanQuantity(item.stockMinimo || 0))} ${escapeHtml(item.unidad || '')}</small>
            </article>
        `);
        const expirationRows = porVencer.slice(0, 3).map((item) => `
            <article class="dashboard-list-item warning">
                <strong>${escapeHtml(item.nombreInsumo)}</strong>
                <span>Vence el ${escapeHtml(formatDate(item.fechaCaducidad))}</span>
                <small>Stock: ${escapeHtml(cleanQuantity(item.stockActual || 0))} ${escapeHtml(item.unidad || '')}</small>
            </article>
        `);
        return [...criticalRows, ...expirationRows].slice(0, 5);
    }

    function isExpiringSoon(item) {
        if (!item.fechaCaducidad) {
            return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiration = new Date(`${item.fechaCaducidad}T00:00:00`);
        const days = (expiration - today) / 86400000;
        return days >= 0 && days <= 7;
    }

    function renderAlertNotifications(rows) {
        const list = $('#alertNotifications');
        const empty = $('#alertNotificationsEmpty');
        const count = $('#alertNotificationsCount');
        const badge = $('#alertNotificationsBadge');
        if (!list) {
            return;
        }

        const total = rows.length;
        if (count) {
            count.textContent = `${total} ${total === 1 ? 'pendiente' : 'pendientes'}`;
        }
        if (badge) {
            badge.textContent = String(total);
            badge.classList.toggle('d-none', total === 0);
        }
        empty?.classList.toggle('d-none', total > 0);
        list.innerHTML = rows.map((item) => {
            const product = item.nombreInsumo || 'Insumo sin nombre';
            const type = item.tipo || 'alerta';
            const unit = item.unidad || '';
            const current = `${cleanQuantity(item.stockActual || 0)} ${unit}`.trim();
            const minimum = `${cleanQuantity(item.stockMinimo || 0)} ${unit}`.trim();
            return `
                <article class="notification-item">
                    <div>
                        <h3>${escapeHtml(product)}</h3>
                        <p>${escapeHtml(type)} · Quedan <strong>${escapeHtml(current)}</strong></p>
                    </div>
                    <div class="notification-meta">
                        <span>Minimo: ${escapeHtml(minimum)}</span>
                        <span>${escapeHtml(formatDateTime(item.fechaHora))}</span>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function loadClientes() {
        const table = $('#clientesTable');
        if (!table) {
            return;
        }
        clientesCache = await api('/api/clientes');
        renderClientes();
    }

    function renderClientes() {
        const table = $('#clientesTable');
        if (!table) {
            return;
        }

        const gerente = isGerente(getUser());
        const query = ($('#clienteSearch')?.value || '').trim().toLowerCase();
        const rows = clientesCache.filter((item) => {
            const searchable = [
                item.nombre,
                item.apellido,
                item.dni,
                item.direccion,
                item.celular,
                formatDateTime(item.fechaCreacion),
                formatDateTime(item.fechaModificacion)
            ].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.clientes;
        const sortedRows = sortRows(rows, state, (item, key) => key === 'nombre' ? `${item.nombre || ''} ${item.apellido || ''}`.trim() : item[key]);
        const pageRows = paginateRows(sortedRows, state);
        text('#clienteResultCount', rows.length === 1 ? '1 registro' : `${rows.length} registros`);
        renderPagination('#clientePagination', rows.length, state, 'clientes');
        updateSortIndicators('clientes');

        if (rows.length === 0) {
            table.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">No hay clientes para mostrar.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item, index) => `
            <tr>
                <td><strong>${((state.page - 1) * state.pageSize) + index + 1}</strong></td>
                <td><strong>${escapeHtml(`${item.nombre || ''} ${item.apellido || ''}`.trim())}</strong></td>
                <td>${escapeHtml(item.dni)}</td>
                <td>${escapeHtml(item.direccion || 'Sin registrar')}</td>
                <td>${escapeHtml(item.celular || 'Sin registrar')}</td>
                <td>
                    <div class="employee-actions">
                        <button class="btn btn-sm btn-outline-dark" data-edit-cliente="${escapeHtml(item.idCliente)}"><span class="btn-icon">✎</span> Modificar</button>
                        ${gerente ? `<button class="btn btn-sm btn-outline-danger" data-delete-cliente="${escapeHtml(item.idCliente)}"><span class="btn-icon">×</span> Eliminar</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function resetClienteForm() {
        const form = $('#clienteForm');
        if (!form) {
            return;
        }

        form.reset();
        form.elements.idCliente.value = '';
        $('#clienteFormTitle') && ($('#clienteFormTitle').textContent = 'Nuevo cliente');
        $('#clienteSubmitButton') && ($('#clienteSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar cliente');
        $('#clienteSubmitTop') && ($('#clienteSubmitTop').innerHTML = '<span class="btn-icon">+</span> Registrar cliente');
        $('#cancelClienteEdit')?.classList.add('d-none');
    }

    function editCliente(id) {
        const cliente = clientesCache.find((item) => item.idCliente === id);
        const form = $('#clienteForm');
        if (!cliente || !form) {
            return;
        }

        form.elements.idCliente.value = cliente.idCliente;
        form.elements.nombre.value = cliente.nombre || '';
        form.elements.apellido.value = cliente.apellido || '';
        form.elements.dni.value = cliente.dni || '';
        form.elements.direccion.value = cliente.direccion || '';
        form.elements.celular.value = cliente.celular || '';
        $('#clienteFormTitle') && ($('#clienteFormTitle').textContent = 'Modificar cliente');
        $('#clienteSubmitButton') && ($('#clienteSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#clienteSubmitTop') && ($('#clienteSubmitTop').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#cancelClienteEdit')?.classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function loadInventario() {
        const table = $('#inventarioTable');
        if (!table) {
            return;
        }
        inventarioCache = await api('/api/inventario');
        renderInventario();
    }

    function renderInventario() {
        const table = $('#inventarioTable');
        if (!table) {
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const query = ($('#inventarioSearch')?.value || '').trim().toLowerCase();
        const rows = inventarioCache.filter((item) => {
            const status = stockStatus(item).label;
            const searchable = [
                item.nombreInsumo,
                item.stockActual,
                item.unidad,
                item.stockMinimo,
                item.fechaCaducidad,
                item.estado,
                status
            ].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.inventario;
        const sortedRows = sortRows(rows, state, (item, key) => key === 'nivel' ? stockStatus(item).label : item[key]);
        const pageRows = paginateRows(sortedRows, state);

        const resultLabel = rows.length === 1 ? '1 registro' : `${rows.length} registros`;
        text('#inventarioResultCount', resultLabel);
        renderPagination('#inventarioPagination', rows.length, state, 'inventario');
        updateSortIndicators('inventario');

        text('#inventarioTotal', inventarioCache.length);
        text('#inventarioCritico', inventarioCache.filter((item) => Number(item.stockActual || 0) <= Number(item.stockMinimo || 0)).length);
        text('#inventarioBajo', inventarioCache.filter((item) => {
            const current = Number(item.stockActual || 0);
            const minimum = Number(item.stockMinimo || 0);
            return current > minimum && current <= minimum * 2;
        }).length);
        text('#inventarioPorVencer', inventarioCache.filter((item) => {
            if (!item.fechaCaducidad) {
                return false;
            }
            const expiration = new Date(`${item.fechaCaducidad}T00:00:00`);
            const days = (expiration - today) / 86400000;
            return days >= 0 && days <= 7;
        }).length);

        if (rows.length === 0) {
            table.innerHTML = '<tr><td colspan="9" class="text-center text-secondary py-4">No hay insumos para mostrar.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item, index) => {
            const status = stockStatus(item);
            const estado = escapeHtml(item.estado || 'Activo');
            const nextEstado = estado.toLowerCase() === 'activo' ? 'Inactivo' : 'Activo';
            const estadoClass = estado.toLowerCase() === 'activo' ? 'status-ok' : 'status-critical';
            const cocina = isCocina(getUser());
            const actions = cocina ? `
                <div class="inventory-stock-action">
                    <button class="btn btn-sm btn-outline-success" type="button" data-open-stock-modal="${escapeHtml(item.idInsumo)}"><span class="btn-icon">+</span> Agregar stock</button>
                </div>
            ` : `
                <div class="employee-actions">
                    <button class="btn btn-sm btn-outline-secondary" data-update-inventario-estado="${escapeHtml(item.idInsumo)}" data-next-estado="${nextEstado}"><span class="btn-icon">↺</span> ${nextEstado}</button>
                    <button class="btn btn-sm btn-outline-dark" data-edit-inventario="${escapeHtml(item.idInsumo)}"><span class="btn-icon">✎</span> Modificar</button>
                    <button class="btn btn-sm btn-outline-danger" data-delete-inventario="${escapeHtml(item.idInsumo)}"><span class="btn-icon">×</span> Eliminar</button>
                </div>
            `;

            return `
                <tr>
                    <td><strong>${((state.page - 1) * state.pageSize) + index + 1}</strong></td>
                    <td><strong>${escapeHtml(item.nombreInsumo)}</strong></td>
                    <td>${escapeHtml(formatQuantity(item.stockActual))}</td>
                    <td>${escapeHtml(item.unidad)}</td>
                    <td>${escapeHtml(formatQuantity(item.stockMinimo))}</td>
                    <td>${escapeHtml(formatDate(item.fechaCaducidad))}</td>
                    <td><span class="status-pill ${status.className}">${status.label}</span></td>
                    <td><span class="status-pill ${estadoClass}">${estado}</span></td>
                    <td>
                        ${actions}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openInventarioStockModal(idInsumo) {
        const insumo = inventarioCache.find((item) => item.idInsumo === idInsumo);
        const modalElement = $('#inventarioStockModal');
        const form = $('#inventarioStockForm');
        const summary = $('#inventarioStockSummary');
        if (!insumo || !modalElement || !form || !summary || !window.bootstrap) {
            return;
        }

        form.reset();
        form.elements.idInsumo.value = insumo.idInsumo;
        const status = stockStatus(insumo);
        summary.innerHTML = `
            <div>
                <span>Insumo</span>
                <strong>${escapeHtml(insumo.nombreInsumo)}</strong>
            </div>
            <div>
                <span>Stock actual</span>
                <strong>${escapeHtml(formatQuantity(insumo.stockActual))} ${escapeHtml(insumo.unidad || '')}</strong>
            </div>
            <div>
                <span>Minimo</span>
                <strong>${escapeHtml(formatQuantity(insumo.stockMinimo))} ${escapeHtml(insumo.unidad || '')}</strong>
            </div>
            <div>
                <span>Nivel</span>
                <strong class="status-pill ${status.className}">${escapeHtml(status.label)}</strong>
            </div>
        `;
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
        $('#inventarioStockCantidad')?.focus();
    }

    async function loadRecetas() {
        const grid = $('#recetasGrid');
        if (!grid) {
            return;
        }

        const [recetas, inventario] = await Promise.all([
            api('/api/recetas'),
            api('/api/inventario')
        ]);
        recetasCache = recetas;
        inventarioCache = inventario;
        renderRecetaOptions();
        renderRecetaIngredientesDraft();
        renderRecetas();
    }

    function renderRecetaOptions() {
        const select = $('#recetaIngredienteSelect');
        if (!select) {
            return;
        }

        const insumos = inventarioCache.filter((item) => String(item.estado || 'Activo').toLowerCase() === 'activo');
        select.innerHTML = '<option value="">Seleccionar insumo</option>' + insumos.map((item) => `
            <option value="${escapeHtml(item.idInsumo)}">${escapeHtml(item.nombreInsumo)} (${escapeHtml(item.unidad)})</option>
        `).join('');
    }

    function renderRecetas() {
        const grid = $('#recetasGrid');
        if (!grid) {
            return;
        }

        const query = ($('#recetaSearch')?.value || '').trim().toLowerCase();
        const rows = recetasCache.filter((item) => {
            const searchable = [
                item.nombre,
                item.precioPersonal ?? item.precio,
                item.precioMediana,
                item.precioFamiliar,
                item.estado,
                ...(item.ingredientes || []).map((ingrediente) => ingrediente.nombreInsumo)
            ].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.recetas;
        const sortedRows = sortRows(rows, state, (item, key) => {
            if (key === 'cantidadIngredientes') {
                return (item.ingredientes || []).length;
            }
            return item[key];
        });
        const pageRows = paginateRows(sortedRows, state);

        text('#recetaResultCount', rows.length === 1 ? '1 registro' : `${rows.length} registros`);
        renderPagination('#recetaPagination', rows.length, state, 'recetas');
        updateSortIndicators('recetas');

        if (rows.length === 0) {
            grid.innerHTML = '<div class="text-center text-secondary py-4">No hay recetas para mostrar.</div>';
            return;
        }

        grid.innerHTML = pageRows.map((item) => {
            const ingredientes = item.ingredientes || [];
            const estado = escapeHtml(item.estado || 'Activo');
            const nextEstado = estado.toLowerCase() === 'activo' ? 'Inactivo' : 'Activo';
            const estadoClass = estado.toLowerCase() === 'activo' ? 'status-ok' : 'status-critical';
            const precioPersonal = item.precioPersonal ?? item.precio;
            const cocina = isCocina(getUser());
            const priceBlock = cocina ? '' : `
                <div class="recipe-card-prices">
                    <span>Personal: ${escapeHtml(formatCurrency(precioPersonal))}</span>
                    <span>Mediana: ${escapeHtml(formatCurrency(item.precioMediana ?? precioPersonal))}</span>
                    <span>Familiar: ${escapeHtml(formatCurrency(item.precioFamiliar ?? precioPersonal))}</span>
                </div>
            `;
            const statusPill = cocina ? '' : `<span class="status-pill ${estadoClass}">${estado}</span>`;
            const actions = cocina ? `
                <button class="btn btn-sm btn-outline-secondary" data-detalle-receta="${escapeHtml(item.idReceta)}"><span class="btn-icon">☰</span> Ver ingredientes</button>
            ` : `
                <button class="btn btn-sm btn-outline-secondary" data-detalle-receta="${escapeHtml(item.idReceta)}"><span class="btn-icon">☰</span> Ver ingredientes</button>
                <button class="btn btn-sm btn-outline-secondary" data-update-receta-estado="${escapeHtml(item.idReceta)}" data-next-estado="${nextEstado}"><span class="btn-icon">↺</span> ${nextEstado}</button>
                <button class="btn btn-sm btn-outline-dark" data-edit-receta="${escapeHtml(item.idReceta)}"><span class="btn-icon">✎</span> Modificar</button>
                <button class="btn btn-sm btn-outline-danger" data-delete-receta="${escapeHtml(item.idReceta)}"><span class="btn-icon">×</span> Eliminar</button>
            `;

            return `
                <article class="recipe-card recipe-list-card-item">
                    <div class="recipe-card-head">
                        <strong>${escapeHtml(item.nombre)}</strong>
                        ${statusPill}
                    </div>
                    ${priceBlock}
                    <small>${ingredientes.length} ingrediente${ingredientes.length === 1 ? '' : 's'}</small>
                    <div class="recipe-card-actions">
                        ${actions}
                    </div>
                </article>
            `;
        }).join('');
    }

    function showRecetaIngredientesDetalle(idReceta) {
        const receta = recetasCache.find((item) => item.idReceta === idReceta);
        const modalElement = $('#recetaIngredientesModal');
        const modalTitle = $('#recetaIngredientesModalTitle');
        const modalBody = $('#recetaIngredientesModalBody');
        if (!receta || !modalElement || !modalBody || !window.bootstrap) {
            return;
        }

        const ingredientes = receta.ingredientes || [];
        if (modalTitle) {
            modalTitle.textContent = `Ingredientes de ${receta.nombre || 'receta'}`;
        }
        modalBody.innerHTML = ingredientes.length === 0
            ? '<p class="text-secondary mb-0">Esta receta no tiene ingredientes registrados.</p>'
            : `
                <div class="table-responsive">
                    <table class="table app-table align-middle">
                        <thead><tr><th>Ingrediente</th><th>Personal</th><th>Mediana</th><th>Familiar</th><th>Unidad</th></tr></thead>
                        <tbody>${ingredientes.map((ingrediente) => {
                            const personal = ingrediente.cantidadPersonal ?? ingrediente.cantidad;
                            const mediana = ingrediente.cantidadMediana ?? personal;
                            const familiar = ingrediente.cantidadFamiliar ?? personal;
                            return `
                                <tr>
                                    <td><strong>${escapeHtml(ingrediente.nombreInsumo)}</strong></td>
                                    <td>${escapeHtml(formatQuantity(personal))}</td>
                                    <td>${escapeHtml(formatQuantity(mediana))}</td>
                                    <td>${escapeHtml(formatQuantity(familiar))}</td>
                                    <td>${escapeHtml(ingrediente.unidad)}</td>
                                </tr>
                            `;
                        }).join('')}</tbody>
                    </table>
                </div>
            `;
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    function renderRecetaIngredientesDraft() {
        const table = $('#recetaIngredientesTable');
        if (!table) {
            return;
        }

        if (recetaIngredientesDraft.length === 0) {
            table.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-3">Agrega al menos un ingrediente.</td></tr>';
            return;
        }

        table.innerHTML = recetaIngredientesDraft.map((item, index) => `
            <tr>
                <td><strong>${escapeHtml(item.nombreInsumo)}</strong></td>
                <td>${escapeHtml(formatQuantity(item.cantidadPersonal ?? item.cantidad))}</td>
                <td>${escapeHtml(formatQuantity(item.cantidadMediana ?? item.cantidad))}</td>
                <td>${escapeHtml(formatQuantity(item.cantidadFamiliar ?? item.cantidad))}</td>
                <td>${escapeHtml(item.unidad)}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-danger" data-remove-receta-ingrediente="${index}">Eliminar</button></td>
            </tr>
        `).join('');
    }

    function addRecetaIngrediente() {
        const select = $('#recetaIngredienteSelect');
        const cantidadPersonalInput = $('#recetaCantidadPersonal');
        const cantidadMedianaInput = $('#recetaCantidadMediana');
        const cantidadFamiliarInput = $('#recetaCantidadFamiliar');
        const idInsumo = select?.value;
        const cantidadPersonal = cantidadPersonalInput?.value;
        const cantidadMediana = cantidadMedianaInput?.value;
        const cantidadFamiliar = cantidadFamiliarInput?.value;
        if (!idInsumo || !cantidadPersonal || !cantidadMediana || !cantidadFamiliar
                || Number(cantidadPersonal) <= 0 || Number(cantidadMediana) <= 0 || Number(cantidadFamiliar) <= 0) {
            showAlert('Selecciona un insumo y cantidades mayores a 0 para cada tamano.', 'warning');
            return;
        }
        if (recetaIngredientesDraft.some((item) => item.idInsumo === idInsumo)) {
            showAlert('Ese ingrediente ya fue agregado a la receta.', 'warning');
            return;
        }

        const insumo = inventarioCache.find((item) => item.idInsumo === idInsumo);
        if (!insumo || String(insumo.estado || 'Activo').toLowerCase() !== 'activo') {
            showAlert('No puedes agregar un insumo inactivo a la receta.', 'warning');
            return;
        }

        recetaIngredientesDraft.push({
            idInsumo,
            nombreInsumo: insumo?.nombreInsumo || 'Insumo',
            unidad: insumo?.unidad || '',
            cantidad: cantidadPersonal,
            cantidadPersonal,
            cantidadMediana,
            cantidadFamiliar
        });
        [cantidadPersonalInput, cantidadMedianaInput, cantidadFamiliarInput].forEach((input) => {
            if (input) {
                input.value = '';
            }
        });
        if (select) {
            select.value = '';
        }
        renderRecetaIngredientesDraft();
    }

    async function loadPedidos() {
        const table = $('#pedidosTable');
        if (!table) {
            return;
        }
        const rows = await api('/api/pedidos');
        table.innerHTML = rows.map((item) => `
            <tr>
                <td><strong>${escapeHtml(item.nombreCliente || item.idCliente)}</strong><br><span class="text-secondary">${escapeHtml(tipoAtencionLabel(item.tipoAtencion))}</span><br><span class="text-secondary text-truncate-id">${escapeHtml(item.idPedido)}</span></td>
                <td><span class="badge text-bg-warning">${escapeHtml(item.estado)}</span></td>
                <td>S/ ${escapeHtml(item.total)}</td>
                <td>${escapeHtml(item.detalleProductos)}</td>
                <td>
                    <div class="input-group input-group-sm">
                        <select class="form-select" data-estado-select="${escapeHtml(item.idPedido)}">
                            <option value="en preparación">en preparación</option>
                            <option value="listo">listo</option>
                            <option value="entregado">entregado</option>
                        </select>
                        <button class="btn btn-outline-dark" data-update-pedido="${escapeHtml(item.idPedido)}">Aplicar</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function loadCocinaPedidos() {
        const table = $('#cocinaPedidosTable');
        if (!table) {
            return;
        }
        cocinaPedidosCache = (await api('/api/pedidos'))
            .filter((item) => ['registrado', 'en preparación'].includes(String(item.estado || '').toLowerCase()));
        renderCocinaPedidos();
    }

    function renderCocinaPedidos() {
        const table = $('#cocinaPedidosTable');
        if (!table) {
            return;
        }

        const query = ($('#cocinaPedidosSearch')?.value || '').trim().toLowerCase();
        const rows = cocinaPedidosCache.filter((item) => {
            const searchable = [
                formatDateTime(item.fechaHora),
                item.nombreCliente,
                tipoAtencionLabel(item.tipoAtencion),
                item.estado,
                item.detalleProductos
            ].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.cocinaPedidos;
        const sortedRows = sortRows(rows, state, (item, key) => {
            if (key === 'fechaHora') {
                return item.fechaHora ? new Date(item.fechaHora).getTime() : 0;
            }
            return item[key];
        });
        const pageRows = paginateRows(sortedRows, state);

        text('#cocinaPedidosCount', rows.length === 1 ? '1 pedido' : `${rows.length} pedidos`);
        renderPagination('#cocinaPedidosPagination', rows.length, state, 'cocinaPedidos');
        updateSortIndicators('cocinaPedidos');

        if (rows.length === 0) {
            table.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No hay pedidos pendientes para cocina.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item) => {
            const estado = String(item.estado || '').toLowerCase();
            const nextEstado = estado === 'registrado' ? 'en preparación' : 'listo';
            return `
                <tr>
                    <td>${escapeHtml(formatDateTime(item.fechaHora))}</td>
                    <td><strong>${escapeHtml(item.nombreCliente || '-')}</strong><br><span class="text-secondary">${escapeHtml(tipoAtencionLabel(item.tipoAtencion))}</span></td>
                    <td><span class="badge text-bg-warning">${escapeHtml(item.estado || '-')}</span></td>
                    <td>${escapeHtml(item.detalleProductos || '-')}<br><button class="btn btn-sm btn-outline-dark mt-2" type="button" data-detalle-cocina-pedido="${escapeHtml(item.idPedido)}">Ver ingredientes</button></td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-dark" type="button" data-update-cocina-pedido="${escapeHtml(item.idPedido)}" data-next-estado="${escapeHtml(nextEstado)}">Marcar ${escapeHtml(nextEstado)}</button></td>
                </tr>
            `;
        }).join('');
    }

    function showCocinaPedidoDetalle(idPedido) {
        const pedido = cocinaPedidosCache.find((item) => item.idPedido === idPedido);
        const modalElement = $('#cocinaPedidoDetalleModal');
        const modalBody = $('#cocinaPedidoDetalleBody');
        if (!pedido || !modalElement || !modalBody || !window.bootstrap) {
            return;
        }

        const detalles = pedido.detalles || [];
        const detalleRows = detalles.map((detalle) => `
            <article class="kitchen-recipe-detail">
                <div class="kitchen-recipe-head">
                    <strong>${escapeHtml(detalle.receta || 'Receta')}</strong>
                    <span>${escapeHtml(tamanoLabel(detalle.tamano))} x${escapeHtml(detalle.cantidad || 0)}</span>
                </div>
                <div class="table-responsive">
                    <table class="table app-table align-middle">
                        <thead><tr><th>Ingrediente</th><th>Por pizza</th><th>Total a usar</th><th>Unidad</th></tr></thead>
                        <tbody>${(detalle.ingredientes || []).map((ingrediente) => `
                            <tr>
                                <td><strong>${escapeHtml(ingrediente.nombreInsumo || '-')}</strong></td>
                                <td>${escapeHtml(formatQuantity(ingrediente.cantidadPorUnidad))}</td>
                                <td>${escapeHtml(formatQuantity(ingrediente.cantidadTotal))}</td>
                                <td>${escapeHtml(ingrediente.unidad || '')}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" class="text-center text-secondary py-3">Sin ingredientes.</td></tr>'}</tbody>
                    </table>
                </div>
            </article>
        `).join('');

        modalBody.innerHTML = `
            <div class="order-detail-summary mb-3">
                <p><span>Cliente</span><strong>${escapeHtml(pedido.nombreCliente || '-')}</strong></p>
                <p><span>Atencion</span><strong>${escapeHtml(tipoAtencionLabel(pedido.tipoAtencion))}</strong></p>
                <p><span>Estado</span><strong>${escapeHtml(pedido.estado || '-')}</strong></p>
                <p><span>Fecha</span><strong>${escapeHtml(formatDateTime(pedido.fechaHora))}</strong></p>
            </div>
            <div class="kitchen-recipe-detail-list">
                ${detalleRows || '<p class="dashboard-empty">Sin detalle de preparacion.</p>'}
            </div>
        `;
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    async function loadProveedores() {
        proveedoresCache = await api('/api/proveedores');
        renderProveedores();
    }

    function renderProveedores() {
        const table = $('#proveedoresTable');
        if (!table) {
            return;
        }

        const query = ($('#proveedorSearch')?.value || '').trim().toLowerCase();
        const rows = proveedoresCache.filter((item) => [item.nombre, item.ruc, item.telefono].join(' ').toLowerCase().includes(query));
        const state = tableState.proveedores;
        const sortedRows = sortRows(rows, state, (item, key) => item[key]);
        const pageRows = paginateRows(sortedRows, state);

        text('#proveedorResultCount', rows.length === 1 ? '1 registro' : `${rows.length} registros`);
        renderPagination('#proveedorPagination', rows.length, state, 'proveedores');
        updateSortIndicators('proveedores');
        if (rows.length === 0) {
            table.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No hay proveedores para mostrar.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item, index) => `
            <tr>
                <td><strong>${((state.page - 1) * state.pageSize) + index + 1}</strong></td>
                <td><strong>${escapeHtml(item.nombre)}</strong></td>
                <td>${escapeHtml(item.ruc)}</td>
                <td>${escapeHtml(item.telefono)}</td>
                <td class="text-center">
                    <div class="employee-actions">
                        <button class="btn btn-sm btn-outline-dark" data-edit-proveedor="${escapeHtml(item.idProveedor)}"><span class="btn-icon">✎</span> Modificar</button>
                        <button class="btn btn-sm btn-outline-danger" data-delete-proveedor="${escapeHtml(item.idProveedor)}"><span class="btn-icon">×</span> Eliminar</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function resetProveedorForm() {
        const form = $('#proveedorForm');
        if (!form) {
            return;
        }

        form.reset();
        form.elements.idProveedor.value = '';
        $('#proveedorFormTitle') && ($('#proveedorFormTitle').textContent = 'Nuevo proveedor');
        $('#proveedorSubmitButton') && ($('#proveedorSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar proveedor');
        $('#proveedorSubmitTop') && ($('#proveedorSubmitTop').innerHTML = '<span class="btn-icon">+</span> Registrar proveedor');
        $('#cancelProveedorEdit')?.classList.add('d-none');
    }

    function editProveedor(id) {
        const proveedor = proveedoresCache.find((item) => item.idProveedor === id);
        const form = $('#proveedorForm');
        if (!proveedor || !form) {
            return;
        }

        form.elements.idProveedor.value = proveedor.idProveedor;
        form.elements.nombre.value = proveedor.nombre || '';
        form.elements.ruc.value = proveedor.ruc || '';
        form.elements.telefono.value = proveedor.telefono || '';
        $('#proveedorFormTitle') && ($('#proveedorFormTitle').textContent = 'Modificar proveedor');
        $('#proveedorSubmitButton') && ($('#proveedorSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#proveedorSubmitTop') && ($('#proveedorSubmitTop').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#cancelProveedorEdit')?.classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function loadOrdenes() {
        const table = $('#ordenesTable');
        if (!table) {
            return;
        }
        ordenesCache = (await api('/api/ordenes')).filter((item) => String(item.estado || '').toLowerCase() !== 'recibida');
        renderOrdenes();
    }

    function renderOrdenes() {
        const table = $('#ordenesTable');
        if (!table) {
            return;
        }

        const query = ($('#ordenSearch')?.value || '').trim().toLowerCase();
        const rows = ordenesCache.filter((item) => {
            const searchable = [item.nombreProveedor, item.estado, item.detalleInsumos].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.ordenes;
        const sortedRows = sortRows(rows, state, (item, key) => item[key]);
        const pageRows = paginateRows(sortedRows, state);

        text('#ordenesResultCount', rows.length === 1 ? '1 orden' : `${rows.length} ordenes`);
        renderPagination('#ordenPagination', rows.length, state, 'ordenes');
        updateSortIndicators('ordenes');

        if (rows.length === 0) {
            table.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">No hay ordenes pendientes.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item) => `
            <tr>
                <td><strong>${escapeHtml(item.nombreProveedor || 'Sin proveedor')}</strong></td>
                <td><span class="badge text-bg-info">${escapeHtml(item.estado)}</span></td>
                <td><button class="btn btn-sm btn-outline-dark" type="button" data-detalle-orden="${escapeHtml(item.idOrden)}">Ver detalle</button></td>
                <td class="text-center">
                    <div class="employee-actions">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-pdf-orden="${escapeHtml(item.idOrden)}">PDF</button>
                        <button class="btn btn-sm btn-outline-dark" type="button" data-edit-orden="${escapeHtml(item.idOrden)}">Modificar</button>
                        <button class="btn btn-sm btn-outline-danger" type="button" data-delete-orden="${escapeHtml(item.idOrden)}">Eliminar</button>
                        <button class="btn btn-sm btn-outline-success" type="button" data-recibir-orden="${escapeHtml(item.idOrden)}">Recibir</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function loadPedidoSetup() {
        if (!$('#pedidoForm')) {
            return;
        }

        const [clientes, recetas] = await Promise.all([
            api('/api/clientes'),
            api('/api/recetas')
        ]);
        clientesCache = clientes;
        recetasCache = recetas;
        renderPedidoOptions();
        renderPedidoRecetasDraft();
    }

    async function loadOrdenCompraSetup() {
        if (!$('#ordenForm')) {
            return;
        }

        const [proveedores, inventario] = await Promise.all([
            api('/api/proveedores'),
            api('/api/inventario')
        ]);
        proveedoresCache = proveedores;
        inventarioCache = inventario;
        renderOrdenOptions();
        renderOrdenInsumosDraft();
        renderStockBajoList();
    }

    function renderPedidoOptions() {
        const recetaSelect = $('#pedidoRecetaSelect');
        if (recetaSelect) {
            const selectedReceta = recetaSelect.value;
            const recetasActivas = recetasCache.filter((item) => String(item.estado || 'Activo').toLowerCase() === 'activo');
            recetaSelect.innerHTML = '<option value="">Seleccionar receta</option>' + recetasActivas.map((item) => `
                <option value="${escapeHtml(item.idReceta)}">${escapeHtml(item.nombre)}</option>
            `).join('');
            if (recetasActivas.some((item) => item.idReceta === selectedReceta)) {
                recetaSelect.value = selectedReceta;
            }
        }
        renderPedidoPrecioPreview();
    }

    function renderPedidoPrecioPreview() {
        const precioInput = $('#pedidoRecetaPrecio');
        if (!precioInput) {
            return;
        }

        const idReceta = $('#pedidoRecetaSelect')?.value;
        const tamano = $('#pedidoRecetaTamano')?.value;
        const receta = recetasCache.find((item) => item.idReceta === idReceta);
        precioInput.value = receta && tamano ? formatCurrency(recetaPrecioPorTamano(receta, tamano)) : '';
    }

    function clearPedidoClienteSelection() {
        const clienteIdInput = $('#pedidoClienteId');
        const preview = $('#pedidoClientePreview');
        if (clienteIdInput) {
            clienteIdInput.value = '';
        }
        if (preview) {
            preview.innerHTML = '';
            preview.classList.add('d-none');
        }
    }

    function renderPedidoClientePreview(cliente) {
        const preview = $('#pedidoClientePreview');
        if (!preview || !cliente) {
            clearPedidoClienteSelection();
            return;
        }

        const delivery = $('#pedidoTipoAtencion')?.value === 'DELIVERY';
        preview.classList.remove('d-none');
        preview.innerHTML = `
            <div class="row g-2">
                <div class="col-md-6"><span class="text-secondary small d-block">Nombre</span><strong>${escapeHtml(cliente.nombre)}</strong></div>
                <div class="col-md-6"><span class="text-secondary small d-block">Apellido</span><strong>${escapeHtml(cliente.apellido)}</strong></div>
                ${delivery ? `
                    <div class="col-md-6"><span class="text-secondary small d-block">Telefono</span><strong>${escapeHtml(cliente.celular || 'Sin registrar')}</strong></div>
                    <div class="col-md-6"><span class="text-secondary small d-block">Direccion</span><strong>${escapeHtml(cliente.direccion || 'Sin registrar')}</strong></div>
                ` : ''}
            </div>
        `;
    }

    function findPedidoClienteBySelectedId() {
        const clienteId = $('#pedidoClienteId')?.value;
        return clientesCache.find((item) => item.idCliente === clienteId);
    }

    function personaReniecValue(persona, snakeKey, camelKey) {
        return persona?.[snakeKey] ?? persona?.[camelKey] ?? '';
    }

    async function fillClienteFromReniec(form) {
        const dni = (form?.elements?.dni?.value || '').trim();
        if (!/^\d{8}$/.test(dni) || form.dataset.reniecLastDni === dni) {
            return;
        }

        form.dataset.reniecLastDni = dni;
        try {
            const persona = await api(`/api/reniec/dni?numero=${encodeURIComponent(dni)}`);
            if ((form.elements.dni.value || '').trim() !== dni) {
                return;
            }
            const nombres = personaReniecValue(persona, 'first_name', 'firstName');
            const apellidoPaterno = personaReniecValue(persona, 'first_last_name', 'firstLastName');
            const apellidoMaterno = personaReniecValue(persona, 'second_last_name', 'secondLastName');
            form.elements.nombre.value = nombres;
            form.elements.apellido.value = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ');
            showAlert('Datos RENIEC completados.', 'info');
        } catch (error) {
            showAlert('No se encontraron datos RENIEC. Puedes completar el cliente manualmente.', 'warning');
        }
    }

    function bindReniecDniLookup(form) {
        const dniInput = form?.elements?.dni;
        if (!dniInput) {
            return;
        }

        dniInput.addEventListener('input', () => {
            if ((dniInput.value || '').trim().length < 8) {
                delete form.dataset.reniecLastDni;
            }
        });
        form.querySelector('[data-reniec-lookup]')?.addEventListener('click', () => fillClienteFromReniec(form));
    }

    function searchPedidoClienteByDni() {
        const dniInput = $('#pedidoClienteDni');
        const clienteIdInput = $('#pedidoClienteId');
        const dni = (dniInput?.value || '').trim();
        if (!/^\d{8}$/.test(dni)) {
            clearPedidoClienteSelection();
            showAlert('Ingresa un DNI valido de 8 digitos.', 'warning');
            return;
        }

        const cliente = clientesCache.find((item) => String(item.dni || '') === dni);
        if (!cliente) {
            clearPedidoClienteSelection();
            showAlert('No se encontro un cliente con ese DNI.', 'warning');
            return;
        }

        if (clienteIdInput) {
            clienteIdInput.value = cliente.idCliente;
        }
        renderPedidoClientePreview(cliente);
    }

    function openPedidoClienteModal() {
        const modalElement = $('#pedidoClienteModal');
        const form = $('#pedidoClienteQuickForm');
        if (!modalElement || !form || !window.bootstrap) {
            return;
        }

        form.reset();
        const dni = ($('#pedidoClienteDni')?.value || '').trim();
        if (/^\d{8}$/.test(dni)) {
            form.elements.dni.value = dni;
        }
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    function selectPedidoCliente(cliente) {
        const dniInput = $('#pedidoClienteDni');
        const clienteIdInput = $('#pedidoClienteId');
        if (dniInput) {
            dniInput.value = cliente?.dni || '';
        }
        if (clienteIdInput) {
            clienteIdInput.value = cliente?.idCliente || '';
        }
        renderPedidoClientePreview(cliente);
    }

    function bindPedidoClienteQuickForm() {
        const form = $('#pedidoClienteQuickForm');
        if (!form) {
            return;
        }

        bindReniecDniLookup(form);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            try {
                const cliente = await api('/api/clientes', {
                    method: 'POST',
                    body: cleanEmptyStrings(formData(form))
                });
                clientesCache = [cliente, ...clientesCache.filter((item) => item.idCliente !== cliente.idCliente)];
                selectPedidoCliente(cliente);
                window.bootstrap?.Modal.getInstance($('#pedidoClienteModal'))?.hide();
                showAlert('Cliente registrado y seleccionado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
    }

    function renderOrdenOptions() {
        const proveedorSelect = $('#ordenProveedorSelect');
        const insumoSelect = $('#ordenInsumoSelect');
        if (proveedorSelect) {
            proveedorSelect.innerHTML = '<option value="">Seleccionar proveedor</option>' + proveedoresCache.map((item) => `
                <option value="${escapeHtml(item.idProveedor)}">${escapeHtml(item.nombre)}</option>
            `).join('');
        }
        if (insumoSelect) {
            const insumosActivos = inventarioCache.filter((item) => String(item.estado || 'Activo').toLowerCase() === 'activo');
            insumoSelect.innerHTML = '<option value="">Seleccionar insumo</option>' + insumosActivos.map((item) => `
                <option value="${escapeHtml(item.idInsumo)}">${escapeHtml(item.nombreInsumo)} (${escapeHtml(item.unidad)})</option>
            `).join('');
        }
    }

    function renderStockBajoList() {
        const list = $('#stockBajoList');
        if (!list) {
            return;
        }

        const rows = inventarioCache.filter((item) => {
            const status = stockStatus(item).label;
            return status === 'Critico' || status === 'Bajo';
        }).slice(0, 5);

        if (rows.length === 0) {
            list.innerHTML = '<p class="text-secondary">No hay insumos con bajo stock.</p>';
            return;
        }

        list.innerHTML = rows.map((item) => `
            <p><strong>${escapeHtml(item.nombreInsumo)}</strong><br>Stock actual: ${escapeHtml(formatQuantity(item.stockActual))} ${escapeHtml(item.unidad)} | Minimo: ${escapeHtml(formatQuantity(item.stockMinimo))} ${escapeHtml(item.unidad)}</p>
        `).join('');
    }

    function renderPedidoRecetasDraft() {
        const table = $('#pedidoRecetasTable');
        if (!table) {
            return;
        }
        if (pedidoRecetasDraft.length === 0) {
            table.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-3">Agrega al menos una receta.</td></tr>';
            return;
        }
        table.innerHTML = pedidoRecetasDraft.map((item, index) => `
            <tr>
                <td><strong>${escapeHtml(item.nombre)}</strong></td>
                <td>${escapeHtml(tamanoLabel(item.tamano))}</td>
                <td>${escapeHtml(item.cantidad)}</td>
                <td>${escapeHtml(formatCurrency(item.precio))}</td>
                <td>${escapeHtml(formatCurrency(Number(item.precio || 0) * Number(item.cantidad || 0)))}</td>
                <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-remove-pedido-receta="${index}">Eliminar</button></td>
            </tr>
        `).join('');
    }

    function updatePedidoTotal() {
        const totalInput = $('#pedidoForm input[name="total"]');
        if (!totalInput) {
            return;
        }

        const total = pedidoRecetasDraft.reduce((sum, item) => sum + (Number(item.precio || 0) * Number(item.cantidad || 0)), 0);
        totalInput.value = total.toFixed(2);
    }

    function buildPedidoVoucherHtml(pedido, cliente, items) {
        const total = Number(pedido?.total ?? items.reduce((sum, item) => sum + (Number(item.precio || 0) * Number(item.cantidad || 0)), 0));
        const clienteNombre = shortPersonName({ nombre: cliente?.nombre, apellido: cliente?.apellido }, pedido?.nombreCliente || 'Cliente');
        const cajeroNombre = shortPersonName(getUser(), pedido?.nombreEmpleado || getUser()?.nombre || getUser()?.user);
        const isDelivery = String(pedido?.tipoAtencion || '').toUpperCase() === 'DELIVERY';
        const rows = items.map((item) => `
            <tr>
                <td>${escapeHtml(item.nombre)}<br><span>${escapeHtml(tamanoLabel(item.tamano))}</span></td>
                <td>${escapeHtml(item.cantidad)}</td>
                <td>${escapeHtml(formatCurrency(item.precio))}</td>
                <td>${escapeHtml(formatCurrency(Number(item.precio || 0) * Number(item.cantidad || 0)))}</td>
            </tr>
        `).join('');

        return `
            <div class="order-voucher">
                <div class="order-voucher-head">
                    <img src="/imagenes/logo.png" alt="Little Caesars">
                    <strong>Little Caesars</strong>
                    <span>Nro de pedido</span>
                    <em>${escapeHtml(pedido?.idPedido || '-')}</em>
                </div>
                <div class="order-voucher-meta">
                    <p><span>Fecha</span><strong>${escapeHtml(formatDateTime(pedido?.fechaHora || new Date().toISOString()))}</strong></p>
                    <p><span>Cliente</span><strong>${escapeHtml(clienteNombre)}</strong></p>
                    <p><span>DNI</span><strong>${escapeHtml(cliente?.dni || '-')}</strong></p>
                    <p><span>Atencion</span><strong>${escapeHtml(tipoAtencionLabel(pedido?.tipoAtencion))}</strong></p>
                    ${isDelivery ? `
                        <p><span>Telefono</span><strong>${escapeHtml(cliente?.celular || '-')}</strong></p>
                        <p><span>Direccion</span><strong>${escapeHtml(cliente?.direccion || '-')}</strong></p>
                    ` : ''}
                    <p><span>Cajero</span><strong>${escapeHtml(cajeroNombre)}</strong></p>
                </div>
                <table class="order-voucher-table">
                    <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="order-voucher-total"><span>Total</span><strong>${escapeHtml(formatCurrency(total))}</strong></div>
                <p class="order-voucher-note">Gracias por tu compra.</p>
                <button id="printPedidoVoucher" class="btn btn-dark" type="button">Descargar PDF</button>
            </div>
        `;
    }

    function loadImageDataUrl(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            image.onerror = reject;
            image.src = src;
        });
    }

    async function createPedidoVoucherPdf(pedido, cliente, items) {
        const jsPDF = window.jspdf?.jsPDF;
        if (!jsPDF) {
            throw new Error('No se pudo generar el PDF del voucher.');
        }

        const total = Number(pedido?.total ?? items.reduce((sum, item) => sum + (Number(item.precio || 0) * Number(item.cantidad || 0)), 0));
        const clienteNombre = shortPersonName({ nombre: cliente?.nombre, apellido: cliente?.apellido }, pedido?.nombreCliente || 'Cliente');
        const cajeroNombre = shortPersonName(getUser(), pedido?.nombreEmpleado || getUser()?.nombre || getUser()?.user);
        const isDelivery = String(pedido?.tipoAtencion || '').toUpperCase() === 'DELIVERY';
        const pageHeight = Math.max(160, 120 + (items.length * 16) + (isDelivery ? 14 : 0));
        const doc = new jsPDF({ unit: 'mm', format: [80, pageHeight], orientation: 'portrait' });
        let y = 8;

        try {
            const logoDataUrl = await loadImageDataUrl('/imagenes/logo.png');
            doc.addImage(logoDataUrl, 'PNG', 30, y, 20, 20);
            y += 26;
        } catch (error) {
            y += 4;
        }

        doc.setProperties({ title: `pedido-${pedido?.idPedido || 'ticket'}` });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Little Caesars', 40, y, { align: 'center' });
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Nro de pedido', 40, y, { align: 'center' });
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const pedidoLines = doc.splitTextToSize(String(pedido?.idPedido || '-'), 70);
        doc.text(pedidoLines, 40, y, { align: 'center' });
        y += pedidoLines.length * 4 + 2;
        doc.setFontSize(9);
        y += 5;
        doc.line(5, y, 75, y);
        y += 5;

        const addPair = (label, value) => {
            const valueLines = doc.splitTextToSize(String(value || '-'), 45);
            doc.setFont('helvetica', 'normal');
            doc.text(label, 5, y);
            doc.setFont('helvetica', 'bold');
            doc.text(valueLines, 75, y, { align: 'right' });
            y += Math.max(5, valueLines.length * 4 + 1);
        };

        addPair('Fecha', formatDateTime(pedido?.fechaHora || new Date().toISOString()));
        addPair('Cliente', clienteNombre);
        addPair('DNI', cliente?.dni || '-');
        addPair('Atencion', tipoAtencionLabel(pedido?.tipoAtencion));
        if (isDelivery) {
            addPair('Telefono', cliente?.celular || '-');
            addPair('Direccion', cliente?.direccion || '-');
        }
        addPair('Cajero', cajeroNombre);

        y += 2;
        doc.line(5, y, 75, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Producto', 5, y);
        doc.text('Cant.', 43, y, { align: 'right' });
        doc.text('Precio', 58, y, { align: 'right' });
        doc.text('Subt.', 75, y, { align: 'right' });
        y += 4;
        doc.setFont('helvetica', 'normal');

        items.forEach((item) => {
            const productLines = doc.splitTextToSize(`${item.nombre} ${tamanoLabel(item.tamano)}`, 35);
            doc.text(productLines, 5, y);
            doc.text(String(item.cantidad), 43, y, { align: 'right' });
            doc.text(formatCurrency(item.precio).replace('S/ ', ''), 58, y, { align: 'right' });
            doc.text(formatCurrency(Number(item.precio || 0) * Number(item.cantidad || 0)).replace('S/ ', ''), 75, y, { align: 'right' });
            y += Math.max(6, productLines.length * 4 + 2);
        });

        y += 2;
        doc.line(5, y, 75, y);
        y += 7;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL', 5, y);
        doc.text(formatCurrency(total), 75, y, { align: 'right' });
        y += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Gracias por tu compra.', 40, y, { align: 'center' });

        return {
            doc,
            fileName: `pedido-${String(pedido?.idPedido || Date.now()).slice(0, 8)}.pdf`
        };
    }

    async function downloadPedidoVoucherPdf(pedido, cliente, items) {
        try {
            const { doc, fileName } = await createPedidoVoucherPdf(pedido, cliente, items);
            doc.save(fileName);
        } catch (error) {
            showAlert(error.message, 'warning');
        }
    }

    async function showPedidoVoucher(pedido, cliente, items) {
        if (!window.Swal) {
            showAlert('Pedido registrado correctamente. No se pudo abrir el voucher.', 'warning');
            return;
        }

        let pdfUrl = '';
        let pdfDoc = null;
        let pdfFileName = '';
        let modalHtml = buildPedidoVoucherHtml(pedido, cliente, items);
        try {
            const pdf = await createPedidoVoucherPdf(pedido, cliente, items);
            pdfDoc = pdf.doc;
            pdfFileName = pdf.fileName;
            pdfUrl = URL.createObjectURL(pdfDoc.output('blob'));
            modalHtml = `
                <div class="order-voucher-pdf-preview">
                    <iframe src="${escapeHtml(pdfUrl)}" title="Comprobante de pedido"></iframe>
                    <button id="printPedidoVoucher" class="btn btn-dark" type="button">Descargar PDF</button>
                </div>
            `;
        } catch (error) {
            showAlert(error.message, 'warning');
        }

        window.Swal.fire({
            title: 'Pedido registrado',
            html: modalHtml,
            width: pdfUrl ? 760 : 620,
            confirmButtonText: 'Cerrar',
            customClass: { htmlContainer: 'order-voucher-container' },
            didOpen: () => {
                $('#printPedidoVoucher')?.addEventListener('click', () => {
                    if (pdfDoc) {
                        pdfDoc.save(pdfFileName);
                        return;
                    }
                    downloadPedidoVoucherPdf(pedido, cliente, items);
                });
            },
            willClose: () => {
                if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                }
            }
        });
    }

    function renderOrdenInsumosDraft() {
        const table = $('#ordenInsumosTable');
        if (!table) {
            return;
        }
        if (ordenInsumosDraft.length === 0) {
            table.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-3">Agrega al menos un insumo.</td></tr>';
            return;
        }
        table.innerHTML = ordenInsumosDraft.map((item, index) => `
            <tr>
                <td><strong>${escapeHtml(item.nombreInsumo)}</strong></td>
                <td>${escapeHtml(formatQuantity(item.cantidad))}</td>
                <td>${escapeHtml(item.unidad)}</td>
                <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-remove-orden-insumo="${index}">Eliminar</button></td>
            </tr>
        `).join('');
    }

    function ordenDetalleRows(orden) {
        return (orden?.insumos || []).map((item, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${escapeHtml(item.nombreInsumo)}</td>
                <td>${escapeHtml(formatQuantity(item.cantidad))}</td>
                <td>${escapeHtml(item.unidad)}</td>
            </tr>
        `).join('');
    }

    function showOrdenDetalle(idOrden) {
        const orden = ordenesCache.find((item) => item.idOrden === idOrden);
        const modalElement = $('#ordenDetalleModal');
        const modalBody = $('#ordenDetalleModalBody');
        if (!orden || !modalElement || !modalBody || !window.bootstrap) {
            return;
        }

        modalBody.innerHTML = `
            <div class="order-detail-summary mb-3">
                <p><span>Proveedor</span><strong>${escapeHtml(orden.nombreProveedor || '-')}</strong></p>
                <p><span>RUC</span><strong>${escapeHtml(orden.rucProveedor || '-')}</strong></p>
                <p><span>Telefono</span><strong>${escapeHtml(orden.telefonoProveedor || '-')}</strong></p>
                <p><span>Fecha</span><strong>${escapeHtml(formatDate(orden.fecha))}</strong></p>
                <p><span>Estado</span><strong>${escapeHtml(orden.estado)}</strong></p>
            </div>
            <div class="table-responsive">
                <table class="table app-table align-middle">
                    <thead><tr><th>#</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead>
                    <tbody>${ordenDetalleRows(orden)}</tbody>
                </table>
            </div>
        `;
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    async function createOrdenCompraPdf(idOrden) {
        const orden = ordenesCache.find((item) => item.idOrden === idOrden);
        const jsPDF = window.jspdf?.jsPDF;
        if (!orden || !jsPDF) {
            throw new Error('No se pudo generar el PDF de la orden.');
        }

        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const brand = [255, 96, 0];
        const ink = [17, 17, 17];
        const muted = [105, 105, 105];
        let y = 14;

        const setInk = () => doc.setTextColor(ink[0], ink[1], ink[2]);
        const setMuted = () => doc.setTextColor(muted[0], muted[1], muted[2]);
        const addFooter = () => {
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setMuted();
            doc.text('Documento generado por el sistema Pequeno Cesar', margin, pageHeight - 11);
            doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 11, { align: 'right' });
            setInk();
        };
        const tableHeader = () => {
            doc.setFillColor(245, 245, 245);
            doc.setDrawColor(225, 225, 225);
            doc.roundedRect(margin, y, pageWidth - (margin * 2), 10, 2, 2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            setMuted();
            doc.text('#', margin + 5, y + 6.5);
            doc.text('Insumo solicitado', margin + 18, y + 6.5);
            doc.text('Cantidad', 155, y + 6.5, { align: 'right' });
            doc.text('Unidad', pageWidth - margin - 6, y + 6.5, { align: 'right' });
            setInk();
            y += 12;
        };
        const ensureSpace = (height) => {
            if (y + height <= pageHeight - 28) {
                return;
            }
            addFooter();
            doc.addPage();
            y = 18;
            tableHeader();
        };

        doc.setFillColor(brand[0], brand[1], brand[2]);
        doc.rect(0, 0, pageWidth, 7, 'F');
        try {
            const logoDataUrl = await loadImageDataUrl('/imagenes/logo.png');
            doc.addImage(logoDataUrl, 'PNG', margin, y, 24, 24);
        } catch (error) {
            // El PDF sigue siendo valido si el logo no carga.
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        setInk();
        doc.text('Little Caesars', margin + 31, y + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setMuted();
        doc.text('Sistema de gestion de compras e inventario', margin + 31, y + 15);
        doc.text('Orden generada para reposicion de insumos', margin + 31, y + 20);

        doc.setFillColor(255, 248, 242);
        doc.setDrawColor(255, 210, 175);
        doc.roundedRect(139, y, 57, 24, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(brand[0], brand[1], brand[2]);
        doc.text('ORDEN DE COMPRA', 167.5, y + 7, { align: 'center' });
        doc.setFontSize(8);
        setMuted();
        doc.text('Fecha', 146, y + 15);
        setInk();
        doc.text(formatDate(orden.fecha), 190, y + 15, { align: 'right' });
        setMuted();
        doc.text('Estado', 146, y + 20);
        setInk();
        doc.text(String(orden.estado || '-').toUpperCase(), 190, y + 20, { align: 'right' });
        y += 34;

        doc.setDrawColor(225, 225, 225);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        setInk();
        doc.text('Datos del proveedor', margin, y);
        y += 5;
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 28, 2, 2, 'FD');

        const addInfo = (label, value, x, yy, width = 74) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            setMuted();
            doc.text(label, x, yy);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            setInk();
            doc.text(doc.splitTextToSize(String(value || '-'), width), x, yy + 5);
        };

        addInfo('Proveedor', orden.nombreProveedor, margin + 6, y + 8, 95);
        addInfo('RUC', orden.rucProveedor, 128, y + 8, 40);
        addInfo('Telefono', orden.telefonoProveedor, 128, y + 19, 40);
        y += 38;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        setInk();
        doc.text('Detalle de insumos solicitados', margin, y);
        y += 5;
        tableHeader();

        (orden.insumos || []).forEach((item, index) => {
            const lines = doc.splitTextToSize(item.nombreInsumo || '-', 102);
            const rowHeight = Math.max(9, lines.length * 4.5 + 4);
            ensureSpace(rowHeight);
            if (index % 2 === 0) {
                doc.setFillColor(253, 253, 253);
                doc.rect(margin, y - 4, pageWidth - (margin * 2), rowHeight, 'F');
            }
            doc.setDrawColor(235, 235, 235);
            doc.line(margin, y + rowHeight - 4, pageWidth - margin, y + rowHeight - 4);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            setInk();
            doc.text(String(index + 1), margin + 5, y + 2);
            doc.text(lines, margin + 18, y + 2);
            doc.text(formatQuantity(item.cantidad), 155, y + 2, { align: 'right' });
            doc.text(String(item.unidad || '-'), pageWidth - margin - 6, y + 2, { align: 'right' });
            y += rowHeight;
        });

        y += 10;
        ensureSpace(38);
        doc.setFillColor(255, 248, 242);
        doc.setDrawColor(255, 210, 175);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 18, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(brand[0], brand[1], brand[2]);
        doc.text('Observaciones', margin + 6, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(ink[0], ink[1], ink[2]);
        doc.text('Validar cantidades y estado de los insumos al momento de recepcion.', margin + 6, y + 12);
        y += 34;

        ensureSpace(22);
        doc.setDrawColor(160, 160, 160);
        doc.line(28, y, 82, y);
        doc.line(128, y, 182, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setMuted();
        doc.text('Solicitado por', 55, y + 6, { align: 'center' });
        doc.text('Recibido por', 155, y + 6, { align: 'center' });
        setInk();
        addFooter();

        return {
            doc,
            fileName: `orden-compra-${String(orden.idOrden || Date.now()).slice(0, 8)}.pdf`
        };
    }

    async function showOrdenCompraPdf(idOrden) {
        const modalElement = $('#ordenPdfModal');
        const modalBody = $('#ordenPdfModalBody');
        const downloadButton = $('#downloadOrdenPdf');
        if (!modalElement || !modalBody || !downloadButton || !window.bootstrap) {
            return;
        }

        let pdfUrl = '';
        try {
            const { doc, fileName } = await createOrdenCompraPdf(idOrden);
            pdfUrl = URL.createObjectURL(doc.output('blob'));
            modalBody.innerHTML = `<iframe class="order-pdf-frame" src="${escapeHtml(pdfUrl)}" title="Orden de compra PDF"></iframe>`;
            downloadButton.onclick = () => doc.save(fileName);
            const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
            modalElement.addEventListener('hidden.bs.modal', () => {
                if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                    pdfUrl = '';
                }
                modalBody.innerHTML = '';
                downloadButton.onclick = null;
            }, { once: true });
            modal.show();
        } catch (error) {
            showAlert(error.message, 'warning');
        }
    }

    function resetOrdenForm() {
        const form = $('#ordenForm');
        if (!form) {
            return;
        }

        form.reset();
        form.elements.idOrden.value = '';
        ordenInsumosDraft = [];
        renderOrdenInsumosDraft();
        $('#ordenSubmitButton') && ($('#ordenSubmitButton').textContent = 'Crear orden de compra');
        $('#cancelOrdenEdit')?.classList.add('d-none');
    }

    function editOrden(idOrden) {
        const orden = ordenesCache.find((item) => item.idOrden === idOrden);
        const form = $('#ordenForm');
        if (!orden || !form) {
            return;
        }

        form.elements.idOrden.value = orden.idOrden;
        form.elements.idProveedor.value = orden.idProveedor || '';
        ordenInsumosDraft = (orden.insumos || []).map((item) => ({
            idInsumo: item.idInsumo,
            nombreInsumo: item.nombreInsumo,
            unidad: item.unidad,
            cantidad: Number(item.cantidad || 0)
        }));
        renderOrdenInsumosDraft();
        $('#ordenSubmitButton') && ($('#ordenSubmitButton').textContent = 'Guardar cambios');
        $('#cancelOrdenEdit')?.classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function addPedidoReceta() {
        const select = $('#pedidoRecetaSelect');
        const tamanoSelect = $('#pedidoRecetaTamano');
        const cantidadInput = $('#pedidoRecetaCantidad');
        const idReceta = select?.value;
        const tamano = tamanoSelect?.value;
        const cantidad = Number(cantidadInput?.value || 0);
        if (!idReceta || !tamano || cantidad <= 0) {
            showAlert('Selecciona una receta, un tamano y una cantidad mayor a 0.', 'warning');
            return;
        }
        const receta = recetasCache.find((item) => item.idReceta === idReceta);
        if (!receta || String(receta.estado || 'Activo').toLowerCase() !== 'activo') {
            showAlert('No puedes agregar una receta inactiva al pedido.', 'warning');
            return;
        }
        pedidoRecetasDraft.push({ idReceta, nombre: receta.nombre, tamano, precio: recetaPrecioPorTamano(receta, tamano), cantidad });
        if (select) {
            select.value = '';
        }
        if (tamanoSelect) {
            tamanoSelect.value = '';
        }
        if (cantidadInput) {
            cantidadInput.value = '';
        }
        renderPedidoPrecioPreview();
        renderPedidoRecetasDraft();
        updatePedidoTotal();
    }

    function addOrdenInsumo() {
        const select = $('#ordenInsumoSelect');
        const cantidadInput = $('#ordenCantidad');
        const idInsumo = select?.value;
        const cantidad = Number(cantidadInput?.value || 0);
        if (!idInsumo || cantidad <= 0) {
            showAlert('Selecciona un insumo y una cantidad mayor a 0.', 'warning');
            return;
        }
        const insumo = inventarioCache.find((item) => item.idInsumo === idInsumo);
        if (!insumo || String(insumo.estado || 'Activo').toLowerCase() !== 'activo') {
            showAlert('No puedes pedir un insumo inactivo.', 'warning');
            return;
        }
        const existing = ordenInsumosDraft.find((item) => item.idInsumo === idInsumo);
        if (existing) {
            existing.cantidad += cantidad;
        } else {
            ordenInsumosDraft.push({ idInsumo, nombreInsumo: insumo.nombreInsumo, unidad: insumo.unidad, cantidad });
        }
        if (select) {
            select.value = '';
        }
        if (cantidadInput) {
            cantidadInput.value = '';
        }
        renderOrdenInsumosDraft();
    }

    async function loadAlertas() {
        const table = $('#alertasTable');
        const notificationCenter = $('#notificationCenter');
        if (!table && !notificationCenter) {
            return;
        }
        if (!isGerente(getUser())) {
            notificationCenter?.classList.add('d-none');
            return;
        }
        notificationCenter?.classList.remove('d-none');
        const rows = await api('/api/alertas/pendientes');
        if (table) {
            table.innerHTML = rows.map((item) => `
                <tr>
                    <td>${escapeHtml(item.tipo)}</td>
                    <td>${escapeHtml(item.nombreInsumo || '-')}</td>
                    <td>${escapeHtml(cleanQuantity(item.stockActual || 0))} ${escapeHtml(item.unidad || '')}</td>
                    <td><span class="badge text-bg-danger">${escapeHtml(item.estado)}</span></td>
                    <td>${escapeHtml(formatDateTime(item.fechaHora))}</td>
                </tr>
            `).join('');
        }
        renderAlertNotifications(rows);
    }

    function bindNotificationEvents() {
        const center = $('#notificationCenter');
        const bell = $('#notificationBell');
        const panel = $('#notificationPanel');
        if (!center || !bell) {
            return;
        }

        const positionPanel = () => {
            if (!panel || !center.classList.contains('sidebar-notification-center')) {
                return;
            }
            const rect = bell.getBoundingClientRect();
            panel.style.left = `${rect.right + 12}px`;
            panel.style.top = `${Math.max(12, rect.top)}px`;
        };

        bell.addEventListener('click', (event) => {
            event.stopPropagation();
            const open = center.classList.toggle('open');
            if (open) {
                positionPanel();
            }
            bell.setAttribute('aria-expanded', String(open));
        });

        window.addEventListener('resize', positionPanel);
        document.querySelector('.sidebar-nav-role[data-role-menu="GERENTE"]')?.addEventListener('scroll', positionPanel);

        document.addEventListener('click', (event) => {
            if (!center.contains(event.target instanceof Node ? event.target : null)) {
                center.classList.remove('open');
                bell.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function initReportesFilters() {
        const inicioInput = $('#reporteInicio');
        const finInput = $('#reporteFin');
        if (!inicioInput || !finInput || inicioInput.value || finInput.value) {
            return;
        }

        const now = new Date();
        inicioInput.value = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
        finInput.value = formatDateInput(now);
    }

    async function loadReportes() {
        const recetasTable = $('#reporteRecetasTable');
        const inventarioTable = $('#reporteInventarioTable');
        if (!recetasTable || !inventarioTable) {
            return;
        }

        initReportesFilters();
        const inicio = $('#reporteInicio')?.value;
        const fin = $('#reporteFin')?.value;
        const params = new URLSearchParams();
        if (inicio) {
            params.set('inicio', inicio);
        }
        if (fin) {
            params.set('fin', fin);
        }

        const data = await api(`/api/reportes/resumen?${params.toString()}`);
        text('#reporteTotalVendido', formatCurrency(data.totalVendido));
        text('#reporteCantidadPedidos', data.cantidadPedidos);
        text('#reportePromedioPedido', formatCurrency(data.promedioPedido));
        text('#reportePeriodo', `${formatDate(data.inicio)} - ${formatDate(data.fin)}`);

        reporteRecetasCache = data.recetasMasVendidas || [];
        tableState.reporteRecetas.page = 1;
        renderReporteRecetas();

        const inventario = data.inventarioCritico || [];
        inventarioTable.innerHTML = inventario.length === 0
            ? '<tr><td colspan="4" class="text-center text-secondary py-4">No hay insumos criticos.</td></tr>'
            : inventario.map((item) => `
                <tr>
                    <td><strong>${escapeHtml(item.nombreInsumo)}</strong><br><span class="text-secondary">Vence: ${escapeHtml(formatDate(item.fechaCaducidad))}</span></td>
                    <td>${escapeHtml(formatQuantity(item.stockActual))} ${escapeHtml(item.unidad)}</td>
                    <td>${escapeHtml(formatQuantity(item.stockMinimo))} ${escapeHtml(item.unidad)}</td>
                    <td><span class="status-pill status-critical">${escapeHtml(item.estadoStock)}</span></td>
                </tr>
            `).join('');
    }

    function renderReporteRecetas() {
        const table = $('#reporteRecetasTable');
        if (!table) {
            return;
        }

        const query = ($('#reporteRecetasSearch')?.value || '').trim().toLowerCase();
        const rows = reporteRecetasCache.filter((item) => {
            const searchable = [item.nombreReceta, tamanoLabel(item.tamano), item.cantidad, formatCurrency(item.totalVendido)].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.reporteRecetas;
        const sortedRows = sortRows(rows, state, (item, key) => {
            if (key === 'cantidad') {
                return Number(item.cantidad || 0);
            }
            if (key === 'totalVendido') {
                return Number(item.totalVendido || 0);
            }
            if (key === 'tamano') {
                return tamanoLabel(item.tamano);
            }
            return item[key];
        });
        const pageRows = paginateRows(sortedRows, state);

        renderPagination('#reporteRecetasPagination', rows.length, state, 'reporteRecetas');
        updateSortIndicators('reporteRecetas');

        table.innerHTML = rows.length === 0
            ? '<tr><td colspan="5" class="text-center text-secondary py-4">No hay ventas en el periodo.</td></tr>'
            : pageRows.map((item, index) => `
                <tr>
                    <td><strong>${((state.page - 1) * state.pageSize) + index + 1}</strong></td>
                    <td>${escapeHtml(item.nombreReceta)}</td>
                    <td>${escapeHtml(tamanoLabel(item.tamano))}</td>
                    <td>${escapeHtml(item.cantidad)}</td>
                    <td>${escapeHtml(formatCurrency(item.totalVendido))}</td>
                </tr>
            `).join('');
    }

    function initReportePedidosFilters() {
        const inicioInput = $('#reportePedidosInicio');
        const finInput = $('#reportePedidosFin');
        if (!inicioInput || !finInput || inicioInput.value || finInput.value) {
            return;
        }

        const today = formatDateInput(new Date());
        inicioInput.value = today;
        finInput.value = today;
    }

    function initMisPedidosFilters() {
        const inicioInput = $('#misPedidosInicio');
        const finInput = $('#misPedidosFin');
        if (!inicioInput || !finInput || inicioInput.value || finInput.value) {
            return;
        }

        const today = formatDateInput(new Date());
        inicioInput.value = today;
        finInput.value = today;
    }

    async function loadMisPedidos() {
        const table = $('#misPedidosTable');
        if (!table) {
            return;
        }

        initMisPedidosFilters();
        const inicio = $('#misPedidosInicio')?.value;
        const fin = $('#misPedidosFin')?.value;
        const desde = inicio ? new Date(`${inicio}T00:00:00`) : null;
        const hasta = fin ? new Date(`${fin}T23:59:59`) : null;
        const pedidos = filterCurrentEmployeeOrders(await api('/api/pedidos'));
        misPedidosCache = pedidos
            .filter((pedido) => {
                const fecha = pedido.fechaHora ? new Date(pedido.fechaHora) : null;
                return (!desde || (fecha && fecha >= desde)) && (!hasta || (fecha && fecha <= hasta));
            })
            .sort((a, b) => new Date(b.fechaHora || 0) - new Date(a.fechaHora || 0));

        const total = misPedidosCache.map((item) => Number(item.total || 0)).reduce((sum, value) => sum + value, 0);
        const abiertos = misPedidosCache.filter((item) => String(item.estado || '').toLowerCase() !== 'entregado').length;
        const entregados = misPedidosCache.filter((item) => String(item.estado || '').toLowerCase() === 'entregado').length;
        text('#misPedidosTotal', formatCurrency(total));
        text('#misPedidosCantidad', misPedidosCache.length);
        text('#misPedidosAbiertos', abiertos);
        text('#misPedidosEntregados', entregados);
        tableState.misPedidos.page = 1;
        renderMisPedidos();
    }

    function renderMisPedidos() {
        const table = $('#misPedidosTable');
        if (!table) {
            return;
        }

        const state = tableState.misPedidos;
        const sortedRows = getFilteredMisPedidosRows();
        const pageRows = paginateRows(sortedRows, state);

        text('#misPedidosCount', sortedRows.length === 1 ? '1 pedido' : `${sortedRows.length} pedidos`);
        renderPagination('#misPedidosPagination', sortedRows.length, state, 'misPedidos');
        updateSortIndicators('misPedidos');

        if (sortedRows.length === 0) {
            table.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">No tienes pedidos en el filtro seleccionado.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item) => {
            const estado = String(item.estado || '').toLowerCase();
            const entregaButton = estado === 'listo'
                ? `<button class="btn btn-sm btn-dark" type="button" data-entregar-mis-pedido="${escapeHtml(item.idPedido)}">Marcar entregado</button>`
                : '';
            return `
                <tr>
                    <td>${escapeHtml(formatDateTime(item.fechaHora))}</td>
                    <td><strong>${escapeHtml(item.nombreCliente || '-')}</strong><br><span class="text-secondary">${escapeHtml(tipoAtencionLabel(item.tipoAtencion))}</span></td>
                    <td><span class="badge text-bg-warning">${escapeHtml(item.estado || '-')}</span></td>
                    <td>${escapeHtml(item.detalleProductos || '-')}</td>
                    <td>${escapeHtml(formatCurrency(item.total))}</td>
                    <td class="text-center"><div class="d-flex justify-content-center gap-2 flex-wrap"><button class="btn btn-sm btn-outline-dark" type="button" data-detalle-mis-pedido="${escapeHtml(item.idPedido)}">Ver detalle</button>${entregaButton}</div></td>
                </tr>
            `;
        }).join('');
    }

    function getFilteredMisPedidosRows() {
        const query = ($('#misPedidosSearch')?.value || '').trim().toLowerCase();
        const rows = misPedidosCache.filter((item) => {
            const searchable = [
                formatDateTime(item.fechaHora),
                item.nombreCliente,
                tipoAtencionLabel(item.tipoAtencion),
                item.estado,
                item.detalleProductos,
                formatCurrency(item.total)
            ].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.misPedidos;
        return sortRows(rows, state, (item, key) => {
            if (key === 'total') {
                return Number(item.total || 0);
            }
            if (key === 'fechaHora') {
                return item.fechaHora ? new Date(item.fechaHora).getTime() : 0;
            }
            return item[key];
        });
    }

    function showMisPedidoDetalle(idPedido) {
        const pedido = misPedidosCache.find((item) => item.idPedido === idPedido);
        const modalElement = $('#misPedidoDetalleModal');
        const modalBody = $('#misPedidoDetalleBody');
        if (!pedido || !modalElement || !modalBody || !window.bootstrap) {
            return;
        }

        modalBody.innerHTML = `
            <div class="order-detail-summary mb-3">
                <p><span>Fecha</span><strong>${escapeHtml(formatDateTime(pedido.fechaHora))}</strong></p>
                <p><span>Cliente</span><strong>${escapeHtml(pedido.nombreCliente || '-')}</strong></p>
                <p><span>Atencion</span><strong>${escapeHtml(tipoAtencionLabel(pedido.tipoAtencion))}</strong></p>
                <p><span>Estado</span><strong>${escapeHtml(pedido.estado || '-')}</strong></p>
                <p><span>Total</span><strong>${escapeHtml(formatCurrency(pedido.total))}</strong></p>
            </div>
            <div class="panel-card shadow-none">
                <div class="panel-header"><h2>Productos</h2><span>Detalle registrado</span></div>
                <p class="mb-0">${escapeHtml(pedido.detalleProductos || 'Sin detalle.')}</p>
            </div>
        `;
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    function pedidoDetallesText(pedido) {
        if (pedido.detalleProductos) {
            return pedido.detalleProductos;
        }
        return (pedido.detalles || [])
            .map((item) => `${item.receta || '-'} ${tamanoLabel(item.tamano)} x${item.cantidad || 0}`)
            .join(', ');
    }

    function exportPedidosPdf({ title, fileName, rows, filters, includeVendedor }) {
        const jsPDF = window.jspdf?.jsPDF;
        if (!jsPDF) {
            showAlert('No se pudo generar el PDF.', 'warning');
            return;
        }
        if (rows.length === 0) {
            showAlert('No hay pedidos filtrados para exportar.', 'warning');
            return;
        }

        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        const brand = [255, 96, 0];
        const ink = [17, 17, 17];
        const muted = [105, 105, 105];
        let y = 14;

        const columns = includeVendedor
            ? [
                { label: 'Fecha', x: 12, width: 32 },
                { label: 'Cliente', x: 46, width: 42 },
                { label: 'Vendedor', x: 91, width: 42 },
                { label: 'Atencion', x: 136, width: 22 },
                { label: 'Estado', x: 162, width: 28 },
                { label: 'Total', x: 194, width: 22, align: 'right' },
                { label: 'Detalle', x: 220, width: 63 }
            ]
            : [
                { label: 'Fecha', x: 12, width: 34 },
                { label: 'Cliente', x: 50, width: 52 },
                { label: 'Atencion', x: 106, width: 24 },
                { label: 'Estado', x: 134, width: 30 },
                { label: 'Total', x: 168, width: 24, align: 'right' },
                { label: 'Detalle', x: 197, width: 86 }
            ];

        const setInk = () => doc.setTextColor(ink[0], ink[1], ink[2]);
        const setMuted = () => doc.setTextColor(muted[0], muted[1], muted[2]);
        const addFooter = () => {
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setMuted();
            doc.text('Documento generado por el sistema Pequeno Cesar', margin, pageHeight - 8);
            doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            setInk();
        };
        const addHeader = () => {
            doc.setFillColor(brand[0], brand[1], brand[2]);
            doc.rect(0, 0, pageWidth, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            setInk();
            doc.text('Little Caesars', margin, y);
            doc.setFontSize(13);
            doc.text(title, pageWidth - margin, y, { align: 'right' });
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            setMuted();
            doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, margin, y);
            y += 6;
            filters.forEach((filter) => {
                doc.text(filter, margin, y);
                y += 5;
            });
            y += 2;
        };
        const addTableHeader = () => {
            doc.setFillColor(245, 245, 245);
            doc.setDrawColor(225, 225, 225);
            doc.roundedRect(margin, y, pageWidth - (margin * 2), 9, 2, 2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            setMuted();
            columns.forEach((column) => doc.text(column.label, column.x, y + 6, { align: column.align || 'left' }));
            setInk();
            y += 11;
        };
        const ensureSpace = (height) => {
            if (y + height <= pageHeight - 20) {
                return;
            }
            addFooter();
            doc.addPage();
            y = 14;
            addTableHeader();
        };

        addHeader();
        const total = rows.map((item) => Number(item.total || 0)).reduce((sum, value) => sum + value, 0);
        doc.setFillColor(255, 248, 242);
        doc.setDrawColor(255, 210, 175);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 11, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(brand[0], brand[1], brand[2]);
        doc.text(`Pedidos: ${rows.length}`, margin + 5, y + 7);
        doc.text(`Total: ${formatCurrency(total)}`, pageWidth - margin - 5, y + 7, { align: 'right' });
        setInk();
        y += 16;
        addTableHeader();

        rows.forEach((pedido, index) => {
            const detail = pedidoDetallesText(pedido) || '-';
            const values = includeVendedor
                ? [formatDateTime(pedido.fechaHora), pedido.nombreCliente || '-', pedido.nombreVendedor || '-', tipoAtencionLabel(pedido.tipoAtencion), pedido.estado || '-', formatCurrency(pedido.total), detail]
                : [formatDateTime(pedido.fechaHora), pedido.nombreCliente || '-', tipoAtencionLabel(pedido.tipoAtencion), pedido.estado || '-', formatCurrency(pedido.total), detail];
            const cellLines = values.map((value, cellIndex) => doc.splitTextToSize(String(value || '-'), columns[cellIndex].width));
            const rowHeight = Math.max(8, Math.max(...cellLines.map((lines) => lines.length)) * 4 + 4);
            ensureSpace(rowHeight);
            if (index % 2 === 0) {
                doc.setFillColor(253, 253, 253);
                doc.rect(margin, y - 3.5, pageWidth - (margin * 2), rowHeight, 'F');
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setInk();
            cellLines.forEach((lines, cellIndex) => {
                const column = columns[cellIndex];
                doc.text(lines, column.x, y + 1, { align: column.align || 'left' });
            });
            y += rowHeight;
        });

        addFooter();
        doc.save(fileName);
    }

    function exportMisPedidosPdf() {
        exportPedidosPdf({
            title: 'Mis pedidos',
            fileName: `mis-pedidos-${formatDateInput(new Date())}.pdf`,
            rows: getFilteredMisPedidosRows(),
            filters: [
                `Desde: ${$('#misPedidosInicio')?.value || 'Todos'} | Hasta: ${$('#misPedidosFin')?.value || 'Todos'}`,
                `Busqueda: ${$('#misPedidosSearch')?.value || 'Sin busqueda'}`,
                `Cajero: ${getUser()?.nombre || getUser()?.user || 'Usuario'}`
            ],
            includeVendedor: false
        });
    }

    async function loadReportePedidosVendedores() {
        const select = $('#reportePedidosVendedor');
        if (!select) {
            return;
        }
        if (empleadosCache.length === 0) {
            empleadosCache = await api('/api/empleados');
        }
        const selected = select.value;
        const vendedores = empleadosCache
                .filter((item) => roleValue(item.rol) === 'CAJERO')
                .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es'));
        select.innerHTML = '<option value="">Todos</option>' + vendedores.map((item) => `
            <option value="${escapeHtml(item.idEmpleado)}">${escapeHtml(`${item.nombres || ''} ${item.apellidos || ''}`.trim())}</option>
        `).join('');
        if (vendedores.some((item) => item.idEmpleado === selected)) {
            select.value = selected;
        }
    }

    async function loadReportePedidos() {
        const table = $('#reportePedidosTable');
        if (!table) {
            return;
        }

        initReportePedidosFilters();
        await loadReportePedidosVendedores();
        const params = new URLSearchParams();
        const inicio = $('#reportePedidosInicio')?.value;
        const fin = $('#reportePedidosFin')?.value;
        const idEmpleado = $('#reportePedidosVendedor')?.value;
        if (inicio) {
            params.set('inicio', inicio);
        }
        if (fin) {
            params.set('fin', fin);
        }
        if (idEmpleado) {
            params.set('idEmpleado', idEmpleado);
        }

        reportePedidosCache = await api(`/api/reportes/pedidos?${params.toString()}`);
        tableState.reportePedidos.page = 1;
        renderReportePedidos();
    }

    function renderReportePedidos() {
        const table = $('#reportePedidosTable');
        if (!table) {
            return;
        }

        const state = tableState.reportePedidos;
        const sortedRows = getFilteredReportePedidosRows();
        const pageRows = paginateRows(sortedRows, state);

        text('#reportePedidosCount', sortedRows.length === 1 ? '1 pedido' : `${sortedRows.length} pedidos`);
        renderPagination('#reportePedidosPagination', sortedRows.length, state, 'reportePedidos');
        updateSortIndicators('reportePedidos');

        if (sortedRows.length === 0) {
            table.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">No hay pedidos para el filtro seleccionado.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item) => `
            <tr>
                <td>${escapeHtml(formatDateTime(item.fechaHora))}</td>
                <td><strong>${escapeHtml(item.nombreCliente || '-')}</strong><br><span class="text-secondary">${escapeHtml(tipoAtencionLabel(item.tipoAtencion))}</span></td>
                <td>${escapeHtml(item.nombreVendedor || '-')}</td>
                <td><span class="badge text-bg-warning">${escapeHtml(item.estado || '-')}</span></td>
                <td>${escapeHtml(formatCurrency(item.total))}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-dark" type="button" data-detalle-reporte-pedido="${escapeHtml(item.idPedido)}">Ver detalle</button></td>
            </tr>
        `).join('');
    }

    function getFilteredReportePedidosRows() {
        const query = ($('#reportePedidosSearch')?.value || '').trim().toLowerCase();
        const rows = reportePedidosCache.filter((item) => {
            const searchable = [
                formatDateTime(item.fechaHora),
                item.nombreCliente,
                item.nombreVendedor,
                tipoAtencionLabel(item.tipoAtencion),
                item.estado,
                pedidoDetallesText(item),
                formatCurrency(item.total)
            ].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.reportePedidos;
        return sortRows(rows, state, (item, key) => {
            if (key === 'total') {
                return Number(item.total || 0);
            }
            if (key === 'fechaHora') {
                return item.fechaHora ? new Date(item.fechaHora).getTime() : 0;
            }
            return item[key];
        });
    }

    function exportReportePedidosPdf() {
        const vendedorSelect = $('#reportePedidosVendedor');
        const vendedor = vendedorSelect?.selectedOptions?.[0]?.textContent || 'Todos';
        exportPedidosPdf({
            title: 'Reporte de pedidos',
            fileName: `reporte-pedidos-${formatDateInput(new Date())}.pdf`,
            rows: getFilteredReportePedidosRows(),
            filters: [
                `Desde: ${$('#reportePedidosInicio')?.value || 'Todos'} | Hasta: ${$('#reportePedidosFin')?.value || 'Todos'}`,
                `Vendedor: ${vendedor}`,
                `Busqueda: ${$('#reportePedidosSearch')?.value || 'Sin busqueda'}`
            ],
            includeVendedor: true
        });
    }

    function showReportePedidoDetalle(idPedido) {
        const pedido = reportePedidosCache.find((item) => item.idPedido === idPedido);
        const modalElement = $('#reportePedidoDetalleModal');
        const modalBody = $('#reportePedidoDetalleBody');
        if (!pedido || !modalElement || !modalBody || !window.bootstrap) {
            return;
        }

        const rows = (pedido.detalles || []).map((item, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${escapeHtml(item.receta)}</td>
                <td>${escapeHtml(tamanoLabel(item.tamano))}</td>
                <td>${escapeHtml(item.cantidad)}</td>
                <td>${escapeHtml(formatCurrency(item.precioUnitario))}</td>
                <td>${escapeHtml(formatCurrency(item.subtotal))}</td>
            </tr>
        `).join('');

        modalBody.innerHTML = `
            <div class="order-detail-summary mb-3">
                <p><span>Fecha</span><strong>${escapeHtml(formatDateTime(pedido.fechaHora))}</strong></p>
                <p><span>Cliente</span><strong>${escapeHtml(pedido.nombreCliente || '-')}</strong></p>
                <p><span>Vendedor</span><strong>${escapeHtml(pedido.nombreVendedor || '-')}</strong></p>
                <p><span>Atencion</span><strong>${escapeHtml(tipoAtencionLabel(pedido.tipoAtencion))}</strong></p>
                <p><span>Estado</span><strong>${escapeHtml(pedido.estado || '-')}</strong></p>
                <p><span>Total</span><strong>${escapeHtml(formatCurrency(pedido.total))}</strong></p>
            </div>
            <div class="table-responsive">
                <table class="table app-table align-middle">
                    <thead><tr><th>#</th><th>Receta</th><th>Tamano</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="6" class="text-center text-secondary py-4">Sin detalle.</td></tr>'}</tbody>
                </table>
            </div>
        `;
        window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    async function loadEmpleados() {
        const table = $('#empleadosTable');
        if (!table) {
            return;
        }
        empleadosCache = await api('/api/empleados');
        renderEmpleados();
    }

    function renderEmpleados() {
        const table = $('#empleadosTable');
        if (!table) {
            return;
        }
        const query = ($('#empleadoSearch')?.value || '').trim().toLowerCase();
        const rows = empleadosCache.filter((item) => {
            const searchable = [item.nombres, item.apellidos, item.user, roleLabel(item.rol), item.estado].join(' ').toLowerCase();
            return searchable.includes(query);
        });
        const state = tableState.empleados;
        const sortedRows = sortRows(rows, state, (item, key) => key === 'rol' ? roleLabel(item.rol) : item[key]);
        const pageRows = paginateRows(sortedRows, state);
        text('#empleadoResultCount', rows.length === 1 ? '1 registro' : `${rows.length} registros`);
        renderPagination('#empleadoPagination', rows.length, state, 'empleados');
        updateSortIndicators('empleados');

        if (rows.length === 0) {
            table.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No hay empleados para mostrar.</td></tr>';
            return;
        }

        table.innerHTML = pageRows.map((item, index) => {
            const estado = escapeHtml(item.estado || 'Activo');
            const nextEstado = estado.toLowerCase() === 'activo' ? 'Inactivo' : 'Activo';
            const statusClass = estado.toLowerCase() === 'activo' ? 'status-ok' : 'status-critical';

            return `
                <tr>
                    <td><strong>${((state.page - 1) * state.pageSize) + index + 1}</strong></td>
                    <td><strong>${escapeHtml(item.nombres)}</strong></td>
                    <td>${escapeHtml(item.apellidos)}</td>
                    <td>${escapeHtml(item.user)}</td>
                    <td>${escapeHtml(roleLabel(item.rol))}</td>
                    <td><span class="status-pill ${statusClass}">${estado}</span></td>
                    <td>
                        <div class="employee-actions">
                            <button class="btn btn-sm btn-outline-secondary" data-update-empleado-estado="${escapeHtml(item.idEmpleado)}" data-next-estado="${nextEstado}"><span class="btn-icon">↺</span> ${nextEstado}</button>
                            <button class="btn btn-sm btn-outline-dark" data-edit-empleado="${escapeHtml(item.idEmpleado)}"><span class="btn-icon">✎</span> Modificar</button>
                            <button class="btn btn-sm btn-outline-danger" data-delete-empleado="${escapeHtml(item.idEmpleado)}"><span class="btn-icon">×</span> Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function confirmAction(message) {
        if (!window.Swal) {
            return window.confirm(message);
        }

        const result = await window.Swal.fire({
            title: 'Confirmar accion',
            text: message,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff6000',
            cancelButtonColor: '#111111',
            confirmButtonText: 'Si, continuar',
            cancelButtonText: 'Cancelar'
        });

        return result.isConfirmed;
    }

    function resetEmpleadoForm() {
        const form = $('#empleadoForm');
        if (!form) {
            return;
        }
        form.reset();
        form.elements.idEmpleado.value = '';
        form.elements.contrasena.required = true;
        form.elements.contrasena.placeholder = 'Contrasena';
        $('#empleadoFormTitle') && ($('#empleadoFormTitle').textContent = 'Nuevo empleado');
        $('#empleadoSubmitButton') && ($('#empleadoSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar empleado');
        $('#empleadoSubmitTop') && ($('#empleadoSubmitTop').innerHTML = '<span class="btn-icon">+</span> Registrar empleado');
        $('#cancelEmpleadoEdit')?.classList.add('d-none');
    }

    function editEmpleado(id) {
        const empleado = empleadosCache.find((item) => item.idEmpleado === id);
        const form = $('#empleadoForm');
        if (!empleado || !form) {
            return;
        }
        form.elements.idEmpleado.value = empleado.idEmpleado;
        form.elements.nombres.value = empleado.nombres || '';
        form.elements.apellidos.value = empleado.apellidos || '';
        form.elements.user.value = empleado.user || '';
        form.elements.rol.value = roleValue(empleado.rol);
        form.elements.estado.value = empleado.estado || 'Activo';
        form.elements.contrasena.value = '';
        form.elements.contrasena.required = false;
        form.elements.contrasena.placeholder = 'Nueva contrasena opcional';
        $('#empleadoFormTitle') && ($('#empleadoFormTitle').textContent = 'Modificar empleado');
        $('#empleadoSubmitButton') && ($('#empleadoSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#empleadoSubmitTop') && ($('#empleadoSubmitTop').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#cancelEmpleadoEdit')?.classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function bindEmpleadoForm() {
        const form = $('#empleadoForm');
        if (!form) {
            return;
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = cleanEmptyStrings(formData(form));
            const id = data.idEmpleado;
            delete data.idEmpleado;

            if (id && !data.contrasena) {
                delete data.contrasena;
            }

            try {
                await api(id ? `/api/empleados/${id}` : '/api/empleados', {
                    method: id ? 'PUT' : 'POST',
                    body: data
                });
                resetEmpleadoForm();
                await loadEmpleados();
                showAlert(id ? 'Empleado actualizado correctamente.' : 'Empleado registrado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#cancelEmpleadoEdit')?.addEventListener('click', resetEmpleadoForm);
        $('#empleadoSearch')?.addEventListener('input', () => {
            tableState.empleados.page = 1;
            renderEmpleados();
        });
        $('#empleadoPageSize')?.addEventListener('change', (event) => {
            tableState.empleados.pageSize = Number(event.target.value);
            tableState.empleados.page = 1;
            renderEmpleados();
        });
        $('#toggleEmpleadoPassword') && ($('#toggleEmpleadoPassword').innerHTML = eyeIcon(true));
        $('#toggleEmpleadoPassword')?.addEventListener('click', () => {
            const input = $('#empleadoPassword');
            if (!input) {
                return;
            }
            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            $('#toggleEmpleadoPassword').innerHTML = eyeIcon(!showPassword);
            $('#toggleEmpleadoPassword').setAttribute('aria-label', showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena');
        });
    }

    function resetInventarioForm() {
        const form = $('#inventarioForm');
        if (!form) {
            return;
        }
        form.reset();
        form.elements.idInsumo.value = '';
        $('#inventarioFormTitle') && ($('#inventarioFormTitle').textContent = 'Nuevo insumo');
        $('#inventarioSubmitButton') && ($('#inventarioSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar insumo');
        $('#inventarioSubmitTop') && ($('#inventarioSubmitTop').innerHTML = '<span class="btn-icon">+</span> Registrar insumo');
        $('#cancelInventarioEdit')?.classList.add('d-none');
    }

    function editInventario(id) {
        const insumo = inventarioCache.find((item) => item.idInsumo === id);
        const form = $('#inventarioForm');
        if (!insumo || !form) {
            return;
        }

        form.elements.idInsumo.value = insumo.idInsumo;
        form.elements.nombreInsumo.value = insumo.nombreInsumo || '';
        form.elements.stockActual.value = insumo.stockActual ?? '';
        form.elements.unidad.value = insumo.unidad || '';
        form.elements.stockMinimo.value = insumo.stockMinimo ?? '';
        form.elements.fechaCaducidad.value = insumo.fechaCaducidad || '';
        $('#inventarioFormTitle') && ($('#inventarioFormTitle').textContent = 'Modificar insumo');
        $('#inventarioSubmitButton') && ($('#inventarioSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#inventarioSubmitTop') && ($('#inventarioSubmitTop').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#cancelInventarioEdit')?.classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function bindInventarioForm() {
        const form = $('#inventarioForm');
        if (!form) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = cleanEmptyStrings(formData(form));
            const id = data.idInsumo;
            delete data.idInsumo;

            try {
                await api(id ? `/api/inventario/${id}` : '/api/inventario', {
                    method: id ? 'PUT' : 'POST',
                    body: {
                        ...data,
                        stockActual: data.stockActual,
                        stockMinimo: data.stockMinimo
                    }
                });
                resetInventarioForm();
                await loadInventario();
                showAlert(id ? 'Insumo actualizado correctamente.' : 'Insumo registrado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#cancelInventarioEdit')?.addEventListener('click', resetInventarioForm);
        $('#inventarioSearch')?.addEventListener('input', () => {
            tableState.inventario.page = 1;
            renderInventario();
        });
        $('#inventarioPageSize')?.addEventListener('change', (event) => {
            tableState.inventario.pageSize = Number(event.target.value);
            tableState.inventario.page = 1;
            renderInventario();
        });
        $('#inventarioStockForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const stockForm = event.currentTarget;
            const data = cleanEmptyStrings(formData(stockForm));
            if (!data.cantidad || Number(data.cantidad) <= 0) {
                showAlert('Ingresa una cantidad mayor a 0.', 'warning');
                return;
            }

            try {
                await api(`/api/inventario/${data.idInsumo}/stock`, { method: 'PUT', body: { cantidad: data.cantidad } });
                window.bootstrap?.Modal.getInstance($('#inventarioStockModal'))?.hide();
                await loadInventario();
                showAlert('Stock agregado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
    }

    function resetRecetaForm() {
        const form = $('#recetaForm');
        if (!form) {
            return;
        }
        form.reset();
        form.elements.idReceta.value = '';
        form.elements.precioPersonal.value = '';
        form.elements.precioMediana.value = '';
        form.elements.precioFamiliar.value = '';
        recetaIngredientesDraft = [];
        renderRecetaIngredientesDraft();
        $('#recetaFormTitle') && ($('#recetaFormTitle').textContent = 'Nueva receta');
        $('#recetaSubmitButton') && ($('#recetaSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar receta');
        $('#recetaSubmitTop') && ($('#recetaSubmitTop').innerHTML = '<span class="btn-icon">+</span> Registrar receta');
        $('#cancelRecetaEdit')?.classList.add('d-none');
    }

    function editReceta(id) {
        const receta = recetasCache.find((item) => item.idReceta === id);
        const form = $('#recetaForm');
        if (!receta || !form) {
            return;
        }

        form.elements.idReceta.value = receta.idReceta;
        form.elements.nombre.value = receta.nombre || '';
        form.elements.precioPersonal.value = receta.precioPersonal ?? receta.precio ?? '';
        form.elements.precioMediana.value = receta.precioMediana ?? receta.precio ?? '';
        form.elements.precioFamiliar.value = receta.precioFamiliar ?? receta.precio ?? '';
        recetaIngredientesDraft = (receta.ingredientes || []).map((ingrediente) => {
            const cantidadPersonal = ingrediente.cantidadPersonal ?? ingrediente.cantidad;
            return {
                idInsumo: ingrediente.idInsumo,
                nombreInsumo: ingrediente.nombreInsumo,
                unidad: ingrediente.unidad,
                cantidad: cantidadPersonal,
                cantidadPersonal,
                cantidadMediana: ingrediente.cantidadMediana ?? cantidadPersonal,
                cantidadFamiliar: ingrediente.cantidadFamiliar ?? cantidadPersonal
            };
        });
        renderRecetaIngredientesDraft();
        $('#recetaFormTitle') && ($('#recetaFormTitle').textContent = 'Modificar receta');
        $('#recetaSubmitButton') && ($('#recetaSubmitButton').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#recetaSubmitTop') && ($('#recetaSubmitTop').innerHTML = '<span class="btn-icon">✓</span> Guardar cambios');
        $('#cancelRecetaEdit')?.classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function bindRecetaForm() {
        const form = $('#recetaForm');
        if (!form) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = cleanEmptyStrings(formData(form));
            const id = data.idReceta;
            delete data.idReceta;

            if (recetaIngredientesDraft.length === 0) {
                showAlert('Agrega al menos un ingrediente a la receta.', 'warning');
                return;
            }

            const inactiveIngredient = recetaIngredientesDraft.find((ingrediente) => {
                const insumo = inventarioCache.find((item) => item.idInsumo === ingrediente.idInsumo);
                return !insumo || String(insumo.estado || 'Activo').toLowerCase() !== 'activo';
            });
            if (inactiveIngredient) {
                showAlert(`El ingrediente ${inactiveIngredient.nombreInsumo} esta inactivo. Quitalo o activalo en inventario.`, 'warning');
                return;
            }

            try {
                await api(id ? `/api/recetas/${id}` : '/api/recetas', {
                    method: id ? 'PUT' : 'POST',
                    body: {
                        nombre: data.nombre,
                        precioPersonal: cleanQuantity(data.precioPersonal),
                        precioMediana: cleanQuantity(data.precioMediana),
                        precioFamiliar: cleanQuantity(data.precioFamiliar),
                        ingredientes: recetaIngredientesDraft.map((ingrediente) => ({
                            idInsumo: ingrediente.idInsumo,
                            cantidadPersonal: cleanQuantity(ingrediente.cantidadPersonal ?? ingrediente.cantidad),
                            cantidadMediana: cleanQuantity(ingrediente.cantidadMediana ?? ingrediente.cantidad),
                            cantidadFamiliar: cleanQuantity(ingrediente.cantidadFamiliar ?? ingrediente.cantidad)
                        }))
                    }
                });
                resetRecetaForm();
                await loadRecetas();
                showAlert(id ? 'Receta actualizada correctamente.' : 'Receta registrada correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#addRecetaIngrediente')?.addEventListener('click', addRecetaIngrediente);
        $('#cancelRecetaEdit')?.addEventListener('click', resetRecetaForm);
        $('#recetaSearch')?.addEventListener('input', () => {
            tableState.recetas.page = 1;
            renderRecetas();
        });
        $('#recetaPageSize')?.addEventListener('change', (event) => {
            tableState.recetas.pageSize = Number(event.target.value);
            tableState.recetas.page = 1;
            renderRecetas();
        });
    }

    function bindPedidoClienteForm() {
        const form = $('#pedidoForm');
        if (!form) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (pedidoRecetasDraft.length === 0) {
                showAlert('Agrega al menos una receta al pedido del cliente.', 'warning');
                return;
            }

            const data = cleanEmptyStrings(formData(form));

            if (!data.idCliente) {
                showAlert('Busca y selecciona un cliente por DNI antes de registrar el pedido.', 'warning');
                return;
            }

            const selectedCliente = findPedidoClienteBySelectedId();
            if (data.tipoAtencion === 'DELIVERY' && !hasDeliveryContact(selectedCliente)) {
                showAlert('El cliente no tiene direccion y celular registrados para delivery.', 'warning');
                return;
            }

            try {
                const voucherItems = pedidoRecetasDraft.map((item) => ({ ...item }));
                const pedidoRegistrado = await api('/api/pedidos', {
                    method: 'POST',
                    body: {
                        idCliente: data.idCliente,
                        tipoAtencion: data.tipoAtencion,
                        total: Number(data.total),
                        recetas: pedidoRecetasDraft.map((item) => ({
                            idReceta: item.idReceta,
                            cantidad: Number(item.cantidad),
                            tamano: item.tamano
                        }))
                    }
                });
                form.reset();
                clearPedidoClienteSelection();
                pedidoRecetasDraft = [];
                renderPedidoRecetasDraft();
                await loadPedidoSetup();
                showPedidoVoucher(pedidoRegistrado, selectedCliente, voucherItems);
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#addPedidoReceta')?.addEventListener('click', addPedidoReceta);
        $('#pedidoRecetaSelect')?.addEventListener('change', renderPedidoPrecioPreview);
        $('#pedidoRecetaTamano')?.addEventListener('change', renderPedidoPrecioPreview);
        $('#buscarPedidoCliente')?.addEventListener('click', searchPedidoClienteByDni);
        $('#openPedidoClienteModal')?.addEventListener('click', openPedidoClienteModal);
        bindPedidoClienteQuickForm();
        $('#pedidoClienteDni')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchPedidoClienteByDni();
            }
        });
        $('#pedidoClienteDni')?.addEventListener('input', () => {
            const selectedCliente = findPedidoClienteBySelectedId();
            const dni = ($('#pedidoClienteDni')?.value || '').trim();
            if (selectedCliente && String(selectedCliente.dni || '') !== dni) {
                clearPedidoClienteSelection();
            }
        });
        $('#pedidoTipoAtencion')?.addEventListener('change', () => {
            renderPedidoClientePreview(findPedidoClienteBySelectedId());
        });
    }

    function bindOrdenProveedorForm() {
        const form = $('#ordenForm');
        if (!form) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (ordenInsumosDraft.length === 0) {
                showAlert('Agrega al menos un insumo a la orden de compra.', 'warning');
                return;
            }

            const data = cleanEmptyStrings(formData(form));
            const id = data.idOrden;

            try {
                await api(id ? `/api/ordenes/${id}` : '/api/ordenes', {
                    method: id ? 'PUT' : 'POST',
                    body: {
                        idProveedor: data.idProveedor,
                        idEmpleado: data.idEmpleado,
                        insumos: ordenInsumosDraft.map((item) => ({
                            idInsumo: item.idInsumo,
                            cantidad: cleanQuantity(item.cantidad)
                        }))
                    }
                });
                resetOrdenForm();
                await Promise.allSettled([loadOrdenes(), loadOrdenCompraSetup()]);
                showAlert(id ? 'Orden de compra actualizada correctamente.' : 'Orden de compra creada correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#addOrdenInsumo')?.addEventListener('click', addOrdenInsumo);
        $('#cancelOrdenEdit')?.addEventListener('click', resetOrdenForm);
        $('#ordenSearch')?.addEventListener('input', () => {
            tableState.ordenes.page = 1;
            renderOrdenes();
        });
        $('#ordenPageSize')?.addEventListener('change', (event) => {
            tableState.ordenes.pageSize = Number(event.target.value);
            tableState.ordenes.page = 1;
            renderOrdenes();
        });
    }

    function bindClienteForm() {
        const form = $('#clienteForm');
        if (!form) {
            return;
        }

        bindReniecDniLookup(form);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = cleanEmptyStrings(formData(form));
            const id = data.idCliente;
            delete data.idCliente;

            try {
                await api(id ? `/api/clientes/${id}` : '/api/clientes', {
                    method: id ? 'PUT' : 'POST',
                    body: data
                });
                resetClienteForm();
                await loadClientes();
                showAlert(id ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#cancelClienteEdit')?.addEventListener('click', resetClienteForm);
        $('#clienteSearch')?.addEventListener('input', () => {
            tableState.clientes.page = 1;
            renderClientes();
        });
        $('#clientePageSize')?.addEventListener('change', (event) => {
            tableState.clientes.pageSize = Number(event.target.value);
            tableState.clientes.page = 1;
            renderClientes();
        });
     }

    function bindProveedorForm() {
        const form = $('#proveedorForm');
        if (!form) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = cleanEmptyStrings(formData(form));
            const id = data.idProveedor;
            delete data.idProveedor;

            try {
                await api(id ? `/api/proveedores/${id}` : '/api/proveedores', {
                    method: id ? 'PUT' : 'POST',
                    body: data
                });
                resetProveedorForm();
                await loadProveedores();
                showAlert(id ? 'Proveedor actualizado correctamente.' : 'Proveedor registrado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

        $('#cancelProveedorEdit')?.addEventListener('click', resetProveedorForm);
        $('#proveedorSearch')?.addEventListener('input', () => {
            tableState.proveedores.page = 1;
            renderProveedores();
        });
        $('#proveedorPageSize')?.addEventListener('change', (event) => {
            tableState.proveedores.pageSize = Number(event.target.value);
            tableState.proveedores.page = 1;
            renderProveedores();
        });
    }

    async function reloadAll() {
        const page = document.body.dataset.page;
        const loadersByPage = {
            dashboard: [loadDashboard, loadAlertas],
            clientes: [loadClientes],
            inventario: [loadInventario],
            pedidos: [loadPedidoSetup, loadPedidos],
            'mis-pedidos': [loadMisPedidos],
            'cocina-pedidos': [loadCocinaPedidos],
            ordenes: [loadOrdenCompraSetup, loadOrdenes],
            proveedores: [loadProveedores],
            reportes: [loadReportes],
            'reportes-pedidos': [loadReportePedidos],
            empleados: [loadEmpleados],
            recetas: [loadRecetas]
        };
        const loaders = [...(loadersByPage[page] || [loadDashboard, loadClientes, loadInventario, loadRecetas, loadPedidos, loadProveedores, loadOrdenes])];
        if ($('#notificationCenter') && !loaders.includes(loadAlertas)) {
            loaders.push(loadAlertas);
        }
        const results = await Promise.allSettled(loaders.map((loader) => loader()));
        const failed = results.find((result) => result.status === 'rejected');
        if (failed) {
            showAlert(failed.reason.message, 'warning');
        }
    }

    function bindForm(selector, path, afterSave, transformer = (data) => data) {
        const form = $(selector);
        if (!form) {
            return;
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await api(path, {
                    method: 'POST',
                    body: transformer(cleanEmptyStrings(formData(form)))
                });
                form.reset();
                await afterSave();
                showAlert('Registro guardado correctamente.');
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
    }

    function bindDashboardEvents() {
        $('#logoutButton')?.addEventListener('click', () => logout());
        $('#refreshButton')?.addEventListener('click', reloadAll);
        $('.sidebar-toggle')?.addEventListener('click', (event) => {
            const sidebar = event.currentTarget.closest('.sidebar');
            const expanded = sidebar?.classList.toggle('menu-open') || false;
            event.currentTarget.setAttribute('aria-expanded', String(expanded));
        });
        document.querySelectorAll('.sidebar-dropdown-toggle').forEach((button) => {
            const dropdown = button.closest('.sidebar-dropdown');
            button.setAttribute('aria-expanded', String(dropdown?.classList.contains('open')));
            button.addEventListener('click', () => {
                const expanded = dropdown?.classList.toggle('open') || false;
                button.setAttribute('aria-expanded', String(expanded));
            });
        });

        bindClienteForm();
        bindProveedorForm();
        bindInventarioForm();
        bindPedidoClienteForm();
        bindOrdenProveedorForm();
        bindEmpleadoForm();
        bindRecetaForm();
        bindNotificationEvents();
        $('#reportesFilterForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await loadReportes();
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
        $('#reportePedidosFilterForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await loadReportePedidos();
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
        $('#reportePedidosSearch')?.addEventListener('input', () => {
            tableState.reportePedidos.page = 1;
            renderReportePedidos();
        });
        $('#reportePedidosPageSize')?.addEventListener('change', (event) => {
            tableState.reportePedidos.pageSize = Number(event.target.value);
            tableState.reportePedidos.page = 1;
            renderReportePedidos();
        });
        $('#reportePedidosPdf')?.addEventListener('click', exportReportePedidosPdf);
        $('#reporteRecetasSearch')?.addEventListener('input', () => {
            tableState.reporteRecetas.page = 1;
            renderReporteRecetas();
        });
        $('#reporteRecetasPageSize')?.addEventListener('change', (event) => {
            tableState.reporteRecetas.pageSize = Number(event.target.value);
            tableState.reporteRecetas.page = 1;
            renderReporteRecetas();
        });
        $('#misPedidosFilterForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await loadMisPedidos();
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
        $('#misPedidosSearch')?.addEventListener('input', () => {
            tableState.misPedidos.page = 1;
            renderMisPedidos();
        });
        $('#misPedidosPageSize')?.addEventListener('change', (event) => {
            tableState.misPedidos.pageSize = Number(event.target.value);
            tableState.misPedidos.page = 1;
            renderMisPedidos();
        });
        $('#misPedidosPdf')?.addEventListener('click', exportMisPedidosPdf);
        $('#cocinaPedidosSearch')?.addEventListener('input', () => {
            tableState.cocinaPedidos.page = 1;
            renderCocinaPedidos();
        });
        $('#cocinaPedidosPageSize')?.addEventListener('change', (event) => {
            tableState.cocinaPedidos.pageSize = Number(event.target.value);
            tableState.cocinaPedidos.page = 1;
            renderCocinaPedidos();
        });

        document.addEventListener('click', async (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const pedidoButton = target?.closest('[data-update-pedido]');
            const clienteSortButton = target?.closest('[data-sort-cliente]');
            const empleadoSortButton = target?.closest('[data-sort-empleado]');
            const inventarioSortButton = target?.closest('[data-sort-inventario]');
            const proveedorSortButton = target?.closest('[data-sort-proveedor]');
            const recetaSortButton = target?.closest('[data-sort-receta]');
            const reporteRecetaSortButton = target?.closest('[data-sort-reporte-receta]');
            const ordenSortButton = target?.closest('[data-sort-orden]');
            const misPedidoSortButton = target?.closest('[data-sort-mis-pedido]');
            const cocinaPedidoSortButton = target?.closest('[data-sort-cocina-pedido]');
            const reportePedidoSortButton = target?.closest('[data-sort-reporte-pedido]');
            const tablePageButton = target?.closest('[data-table-page]');
            const ordenButton = target?.closest('[data-recibir-orden]');
            const ordenDetalleButton = target?.closest('[data-detalle-orden]');
            const ordenPdfButton = target?.closest('[data-pdf-orden]');
            const editOrdenButton = target?.closest('[data-edit-orden]');
            const deleteOrdenButton = target?.closest('[data-delete-orden]');
            const reportePedidoDetalleButton = target?.closest('[data-detalle-reporte-pedido]');
            const misPedidoDetalleButton = target?.closest('[data-detalle-mis-pedido]');
            const entregarMisPedidoButton = target?.closest('[data-entregar-mis-pedido]');
            const cocinaPedidoDetalleButton = target?.closest('[data-detalle-cocina-pedido]');
            const editClienteButton = target?.closest('[data-edit-cliente]');
            const clienteButton = target?.closest('[data-delete-cliente]');
            const editProveedorButton = target?.closest('[data-edit-proveedor]');
            const deleteProveedorButton = target?.closest('[data-delete-proveedor]');
            const empleadoEstadoButton = target?.closest('[data-update-empleado-estado]');
            const editEmpleadoButton = target?.closest('[data-edit-empleado]');
            const deleteEmpleadoButton = target?.closest('[data-delete-empleado]');
            const inventarioEstadoButton = target?.closest('[data-update-inventario-estado]');
            const editInventarioButton = target?.closest('[data-edit-inventario]');
            const deleteInventarioButton = target?.closest('[data-delete-inventario]');
            const openStockModalButton = target?.closest('[data-open-stock-modal]');
            const removeRecetaIngredienteButton = target?.closest('[data-remove-receta-ingrediente]');
            const recetaDetalleButton = target?.closest('[data-detalle-receta]');
            const recetaEstadoButton = target?.closest('[data-update-receta-estado]');
            const editRecetaButton = target?.closest('[data-edit-receta]');
            const deleteRecetaButton = target?.closest('[data-delete-receta]');
            const removePedidoRecetaButton = target?.closest('[data-remove-pedido-receta]');
            const removeOrdenInsumoButton = target?.closest('[data-remove-orden-insumo]');
            const updateCocinaPedidoButton = target?.closest('[data-update-cocina-pedido]');
            const pedidoId = pedidoButton?.dataset.updatePedido;
            const clienteSortKey = clienteSortButton?.dataset.sortCliente;
            const empleadoSortKey = empleadoSortButton?.dataset.sortEmpleado;
            const inventarioSortKey = inventarioSortButton?.dataset.sortInventario;
            const proveedorSortKey = proveedorSortButton?.dataset.sortProveedor;
            const recetaSortKey = recetaSortButton?.dataset.sortReceta;
            const reporteRecetaSortKey = reporteRecetaSortButton?.dataset.sortReporteReceta;
            const ordenSortKey = ordenSortButton?.dataset.sortOrden;
            const misPedidoSortKey = misPedidoSortButton?.dataset.sortMisPedido;
            const cocinaPedidoSortKey = cocinaPedidoSortButton?.dataset.sortCocinaPedido;
            const reportePedidoSortKey = reportePedidoSortButton?.dataset.sortReportePedido;
            const tablePageName = tablePageButton?.dataset.tablePage;
            const ordenId = ordenButton?.dataset.recibirOrden;
            const ordenDetalleId = ordenDetalleButton?.dataset.detalleOrden;
            const ordenPdfId = ordenPdfButton?.dataset.pdfOrden;
            const editOrdenId = editOrdenButton?.dataset.editOrden;
            const deleteOrdenId = deleteOrdenButton?.dataset.deleteOrden;
            const reportePedidoDetalleId = reportePedidoDetalleButton?.dataset.detalleReportePedido;
            const misPedidoDetalleId = misPedidoDetalleButton?.dataset.detalleMisPedido;
            const entregarMisPedidoId = entregarMisPedidoButton?.dataset.entregarMisPedido;
            const cocinaPedidoDetalleId = cocinaPedidoDetalleButton?.dataset.detalleCocinaPedido;
            const editClienteId = editClienteButton?.dataset.editCliente;
            const clienteId = clienteButton?.dataset.deleteCliente;
            const editProveedorId = editProveedorButton?.dataset.editProveedor;
            const deleteProveedorId = deleteProveedorButton?.dataset.deleteProveedor;
            const empleadoId = empleadoEstadoButton?.dataset.updateEmpleadoEstado;
            const editEmpleadoId = editEmpleadoButton?.dataset.editEmpleado;
            const deleteEmpleadoId = deleteEmpleadoButton?.dataset.deleteEmpleado;
            const inventarioEstadoId = inventarioEstadoButton?.dataset.updateInventarioEstado;
            const editInventarioId = editInventarioButton?.dataset.editInventario;
            const deleteInventarioId = deleteInventarioButton?.dataset.deleteInventario;
            const openStockModalId = openStockModalButton?.dataset.openStockModal;
            const removeRecetaIngredienteIndex = removeRecetaIngredienteButton?.dataset.removeRecetaIngrediente;
            const recetaDetalleId = recetaDetalleButton?.dataset.detalleReceta;
            const recetaEstadoId = recetaEstadoButton?.dataset.updateRecetaEstado;
            const editRecetaId = editRecetaButton?.dataset.editReceta;
            const deleteRecetaId = deleteRecetaButton?.dataset.deleteReceta;
            const removePedidoRecetaIndex = removePedidoRecetaButton?.dataset.removePedidoReceta;
            const removeOrdenInsumoIndex = removeOrdenInsumoButton?.dataset.removeOrdenInsumo;
            const cocinaPedidoId = updateCocinaPedidoButton?.dataset.updateCocinaPedido;
            try {
                if (clienteSortKey) {
                    const state = tableState.clientes;
                    state.sortDirection = state.sortKey === clienteSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = clienteSortKey;
                    state.page = 1;
                    renderClientes();
                }
                if (empleadoSortKey) {
                    const state = tableState.empleados;
                    state.sortDirection = state.sortKey === empleadoSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = empleadoSortKey;
                    state.page = 1;
                    renderEmpleados();
                }
                if (inventarioSortKey) {
                    const state = tableState.inventario;
                    state.sortDirection = state.sortKey === inventarioSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = inventarioSortKey;
                    state.page = 1;
                    renderInventario();
                }
                if (proveedorSortKey) {
                    const state = tableState.proveedores;
                    state.sortDirection = state.sortKey === proveedorSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = proveedorSortKey;
                    state.page = 1;
                    renderProveedores();
                }
                if (recetaSortKey) {
                    const state = tableState.recetas;
                    state.sortDirection = state.sortKey === recetaSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = recetaSortKey;
                    state.page = 1;
                    renderRecetas();
                }
                if (reportePedidoSortKey) {
                    const state = tableState.reportePedidos;
                    state.sortDirection = state.sortKey === reportePedidoSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = reportePedidoSortKey;
                    state.page = 1;
                    renderReportePedidos();
                }
                if (reporteRecetaSortKey) {
                    const state = tableState.reporteRecetas;
                    state.sortDirection = state.sortKey === reporteRecetaSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = reporteRecetaSortKey;
                    state.page = 1;
                    renderReporteRecetas();
                }
                if (ordenSortKey) {
                    const state = tableState.ordenes;
                    state.sortDirection = state.sortKey === ordenSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = ordenSortKey;
                    state.page = 1;
                    renderOrdenes();
                }
                if (misPedidoSortKey) {
                    const state = tableState.misPedidos;
                    state.sortDirection = state.sortKey === misPedidoSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = misPedidoSortKey;
                    state.page = 1;
                    renderMisPedidos();
                }
                if (cocinaPedidoSortKey) {
                    const state = tableState.cocinaPedidos;
                    state.sortDirection = state.sortKey === cocinaPedidoSortKey && state.sortDirection === 'asc' ? 'desc' : 'asc';
                    state.sortKey = cocinaPedidoSortKey;
                    state.page = 1;
                    renderCocinaPedidos();
                }
                if (tablePageName) {
                    const state = tableState[tablePageName];
                    if (state) {
                        state.page = Number(tablePageButton.dataset.page);
                        if (tablePageName === 'clientes') {
                            renderClientes();
                        } else if (tablePageName === 'empleados') {
                             renderEmpleados();
                        } else if (tablePageName === 'inventario') {
                            renderInventario();
                        } else if (tablePageName === 'proveedores') {
                            renderProveedores();
                        } else if (tablePageName === 'reportePedidos') {
                            renderReportePedidos();
                        } else if (tablePageName === 'reporteRecetas') {
                            renderReporteRecetas();
                        } else if (tablePageName === 'ordenes') {
                            renderOrdenes();
                        } else if (tablePageName === 'misPedidos') {
                            renderMisPedidos();
                        } else if (tablePageName === 'cocinaPedidos') {
                            renderCocinaPedidos();
                        } else {
                            renderRecetas();
                        }
                    }
                }
                if (pedidoId) {
                    const estado = document.querySelector(`[data-estado-select="${pedidoId}"]`).value;
                    await api(`/api/pedidos/${pedidoId}/estado`, { method: 'PUT', body: { estado } });
                    await loadPedidos();
                    showAlert('Estado actualizado.');
                }
                if (cocinaPedidoId) {
                    await api(`/api/pedidos/${cocinaPedidoId}/estado`, {
                        method: 'PUT',
                        body: { estado: updateCocinaPedidoButton.dataset.nextEstado }
                    });
                    await loadCocinaPedidos();
                    showAlert('Estado del pedido actualizado.');
                }
                if (ordenId) {
                    await api(`/api/ordenes/${ordenId}/recibir`, { method: 'PUT' });
                    await Promise.allSettled([loadOrdenes(), loadOrdenCompraSetup(), loadDashboard(), loadAlertas()]);
                    showAlert('Orden recibida y stock actualizado.');
                }
                if (ordenDetalleId) {
                    showOrdenDetalle(ordenDetalleId);
                }
                if (ordenPdfId) {
                    await showOrdenCompraPdf(ordenPdfId);
                }
                if (editOrdenId) {
                    editOrden(editOrdenId);
                }
                if (deleteOrdenId) {
                    const confirmed = await confirmAction('Esta seguro de eliminar esta orden de compra?');
                    if (!confirmed) {
                        return;
                    }
                    await api(`/api/ordenes/${deleteOrdenId}`, { method: 'DELETE' });
                    await loadOrdenes();
                    showAlert('Orden de compra eliminada.');
                }
                if (reportePedidoDetalleId) {
                    showReportePedidoDetalle(reportePedidoDetalleId);
                }
                if (misPedidoDetalleId) {
                    showMisPedidoDetalle(misPedidoDetalleId);
                }
                if (entregarMisPedidoId) {
                    await api(`/api/pedidos/${entregarMisPedidoId}/estado`, {
                        method: 'PUT',
                        body: { estado: 'entregado' }
                    });
                    await loadMisPedidos();
                    showAlert('Pedido marcado como entregado.');
                }
                if (cocinaPedidoDetalleId) {
                    showCocinaPedidoDetalle(cocinaPedidoDetalleId);
                }
                if (editClienteId) {
                    editCliente(editClienteId);
                }
                if (clienteId) {
                    if (!isGerente(getUser())) {
                        showAlert('Solo el gerente puede eliminar clientes.', 'warning');
                        return;
                    }
                    const confirmed = await confirmAction('Esta seguro de eliminar este cliente?');
                    if (!confirmed) {
                        return;
                    }
                    await api(`/api/clientes/${clienteId}`, { method: 'DELETE' });
                    await loadClientes();
                    showAlert('Cliente eliminado.');
                }
                if (editProveedorId) {
                    editProveedor(editProveedorId);
                }
                if (deleteProveedorId) {
                    const confirmed = await confirmAction('Esta seguro de eliminar este proveedor?');
                    if (!confirmed) {
                        return;
                    }
                    await api(`/api/proveedores/${deleteProveedorId}`, { method: 'DELETE' });
                    await loadProveedores();
                    showAlert('Proveedor eliminado.');
                }
                if (editInventarioId) {
                    editInventario(editInventarioId);
                }
                if (inventarioEstadoId) {
                    await api(`/api/inventario/${inventarioEstadoId}/estado`, {
                        method: 'PUT',
                        body: { estado: inventarioEstadoButton.dataset.nextEstado }
                    });
                    await loadInventario();
                    showAlert('Estado del insumo actualizado.');
                }
                if (openStockModalId) {
                    openInventarioStockModal(openStockModalId);
                }
                if (deleteInventarioId) {
                    const confirmed = await confirmAction('Esta seguro de eliminar este insumo?');
                    if (!confirmed) {
                        return;
                    }
                    await api(`/api/inventario/${deleteInventarioId}`, { method: 'DELETE' });
                    await Promise.allSettled([loadInventario(), loadDashboard(), loadAlertas()]);
                    showAlert('Insumo eliminado.');
                }
                if (removeRecetaIngredienteIndex !== undefined) {
                    recetaIngredientesDraft.splice(Number(removeRecetaIngredienteIndex), 1);
                    renderRecetaIngredientesDraft();
                }
                if (recetaDetalleId) {
                    showRecetaIngredientesDetalle(recetaDetalleId);
                }
                if (recetaEstadoId) {
                    await api(`/api/recetas/${recetaEstadoId}/estado`, {
                        method: 'PUT',
                        body: { estado: recetaEstadoButton.dataset.nextEstado }
                    });
                    await loadRecetas();
                    showAlert('Estado de la receta actualizado.');
                }
                if (editRecetaId) {
                    editReceta(editRecetaId);
                }
                if (deleteRecetaId) {
                    const confirmed = await confirmAction('Esta seguro de eliminar esta receta?');
                    if (!confirmed) {
                        return;
                    }
                    await api(`/api/recetas/${deleteRecetaId}`, { method: 'DELETE' });
                    await loadRecetas();
                    showAlert('Receta eliminada.');
                }
                if (removePedidoRecetaIndex !== undefined) {
                    pedidoRecetasDraft.splice(Number(removePedidoRecetaIndex), 1);
                    renderPedidoRecetasDraft();
                    updatePedidoTotal();
                }
                if (removeOrdenInsumoIndex !== undefined) {
                    ordenInsumosDraft.splice(Number(removeOrdenInsumoIndex), 1);
                    renderOrdenInsumosDraft();
                }
                if (editEmpleadoId) {
                    editEmpleado(editEmpleadoId);
                }
                if (empleadoId) {
                    await api(`/api/empleados/${empleadoId}/estado`, {
                        method: 'PUT',
                        body: { estado: empleadoEstadoButton.dataset.nextEstado }
                    });
                    await loadEmpleados();
                    showAlert('Estado del empleado actualizado.');
                }
                if (deleteEmpleadoId) {
                    const confirmed = await confirmAction('Esta seguro de eliminar este empleado?');
                    if (!confirmed) {
                        return;
                    }
                    await api(`/api/empleados/${deleteEmpleadoId}`, { method: 'DELETE' });
                    await loadEmpleados();
                    showAlert('Empleado eliminado.');
                }
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });

    }

    function initDashboard() {
        if (!document.body.dataset.page) {
            return;
        }
        if (!getToken()) {
            location.href = '/login';
            return;
        }
        const user = getUser();
        if (!normalizedUserRole(user)) {
            logout('Sesion expirada. Inicia sesion nuevamente.');
            return;
        }
        if (document.body.dataset.managerOnly === 'true' && !isGerente(user)) {
            location.href = '/dashboard';
            return;
        }
        if (document.body.dataset.rolesAllowed && !isAllowedRole(user, document.body.dataset.rolesAllowed)) {
            location.href = '/dashboard';
            return;
        }
        applySidebarByRole(user);
        applyPageRoleRestrictions(user);
        text('#userName', user.nombre || 'Usuario');
        text('#userRole', user.rol || 'Rol');
        bindDashboardEvents();
        reloadAll();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initLogin();
        initDashboard();
    });
})();
