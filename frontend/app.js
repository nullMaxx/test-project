(() => {
  const API_BASE = "/api/v1";

  const EXCHANGE_RATES = {
    "USD_EUR": 0.89,
    "USD_GBP": 0.75,
    "USD_UAH": 25.00,
    "EUR_USD": 1.18,
    "EUR_GBP": 0.88,
    "EUR_UAH": 30.00
  };

  const CURRENCY_SYMBOLS = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    UAH: "₴"
  };

  let currentUser = localStorage.getItem("finance_user") || "demo_user";
  let wallets = [];
  let operations = [];

  function initTheme() {
    const saved = localStorage.getItem("finance_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcons(saved);
  }

  function updateThemeIcons(theme) {
    const sun = document.getElementById("themeIconSun");
    const moon = document.getElementById("themeIconMoon");
    if (theme === "dark") {
      sun.style.display = "block";
      moon.style.display = "none";
    } else {
      sun.style.display = "none";
      moon.style.display = "block";
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const target = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", target);
    localStorage.setItem("finance_theme", target);
    updateThemeIcons(target);
  }

  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  async function apiRequest(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentUser}`,
      ...(options.headers || {})
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let detail = `Request failed: ${res.status}`;
      try {
        const errorData = await res.json();
        detail = errorData.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    return res.json();
  }

  async function ensureUserExists() {
    try {
      await apiRequest("/users/me");
    } catch {
      try {
        await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: currentUser })
        });
      } catch (err) {
        console.error("User initialization failed:", err);
      }
    }
    document.getElementById("currentUserName").textContent = currentUser;
  }

  async function loadWallets() {
    try {
      wallets = await apiRequest("/wallets");
      renderWallets();
      populateWalletDropdowns();
      await loadBalance();
    } catch (err) {
      console.error(err);
      document.getElementById("walletsGrid").innerHTML = `<div class="empty-state">No wallets available. Create one to get started.</div>`;
    }
  }

  async function loadBalance() {
    try {
      const balanceData = await apiRequest("/balance");
      const total = balanceData.total_balance ?? 0;
      document.getElementById("statTotalBalance").textContent = `$${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById("statWalletCount").textContent = `${wallets.length} active wallet${wallets.length === 1 ? "" : "s"}`;
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }

  function renderWallets() {
    const grid = document.getElementById("walletsGrid");
    if (!wallets.length) {
      grid.innerHTML = `<div class="empty-state">No wallets found. Click "New Wallet" above to create your first wallet.</div>`;
      return;
    }

    grid.innerHTML = wallets.map(w => {
      const sym = CURRENCY_SYMBOLS[w.currency] || "$";
      return `
        <div class="wallet-card">
          <div class="wallet-card-header">
            <span class="wallet-name">${escapeHtml(w.name)}</span>
            <span class="currency-badge">${w.currency}</span>
          </div>
          <div class="wallet-balance">${sym}${Number(w.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="wallet-meta">
            <span>ID: #${w.id}</span>
            <span>${w.currency} Account</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function populateWalletDropdowns() {
    const incomeSelect = document.getElementById("incomeWalletSelect");
    const expenseSelect = document.getElementById("expenseWalletSelect");
    const fromSelect = document.getElementById("transferFromSelect");
    const toSelect = document.getElementById("transferToSelect");
    const filterSelect = document.getElementById("filterWallet");

    const optionsHtml = wallets.map(w => `<option value="${escapeHtml(w.name)}" data-id="${w.id}" data-currency="${w.currency}">${escapeHtml(w.name)} (${w.currency} - ${Number(w.balance).toFixed(2)})</option>`).join("");
    const idOptionsHtml = wallets.map(w => `<option value="${w.id}" data-currency="${w.currency}">${escapeHtml(w.name)} (${w.currency})</option>`).join("");

    incomeSelect.innerHTML = optionsHtml;
    expenseSelect.innerHTML = optionsHtml;
    fromSelect.innerHTML = idOptionsHtml;
    toSelect.innerHTML = idOptionsHtml;

    if (toSelect.options.length > 1) {
      toSelect.selectedIndex = 1;
    }

    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = `<option value="">All Wallets</option>` + wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    filterSelect.value = currentFilter;

    updateTransferRatePreview();
  }

  async function loadOperations() {
    try {
      const walletId = document.getElementById("filterWallet").value;
      const dateFrom = document.getElementById("filterDateFrom").value;
      const dateTo = document.getElementById("filterDateTo").value;

      let query = [];
      if (walletId) query.push(`wallet_id=${encodeURIComponent(walletId)}`);
      if (dateFrom) query.push(`date_from=${encodeURIComponent(new Date(dateFrom).toISOString())}`);
      if (dateTo) query.push(`date_to=${encodeURIComponent(new Date(dateTo).toISOString())}`);

      const qs = query.length ? `?${query.join("&")}` : "";
      operations = await apiRequest(`/operations${qs}`);
      renderOperations();
      updateAnalytics();
    } catch (err) {
      console.error("Operations fetch error:", err);
      document.getElementById("transactionsTableBody").innerHTML = `<tr><td colspan="5" class="empty-state">Failed to load transactions.</td></tr>`;
    }
  }

  function renderOperations() {
    const tbody = document.getElementById("transactionsTableBody");
    const searchTerm = document.getElementById("filterSearch").value.trim().toLowerCase();
    const typeFilter = document.getElementById("filterType").value.trim().toLowerCase();

    const filtered = operations.filter(op => {
      if (typeFilter && op.type.toLowerCase() !== typeFilter) return false;
      if (searchTerm) {
        const desc = (op.category || op.description || "").toLowerCase();
        const type = (op.type || "").toLowerCase();
        if (!desc.includes(searchTerm) && !type.includes(searchTerm)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No matching transactions found.</td></tr>`;
      return;
    }

    const walletMap = new Map(wallets.map(w => [w.id, w.name]));

    tbody.innerHTML = filtered.map(op => {
      const walletName = walletMap.get(op.wallet_id) || `Wallet #${op.wallet_id}`;
      const sym = CURRENCY_SYMBOLS[op.currency] || "";
      const dateStr = new Date(op.created_at).toLocaleString();
      const typeLower = (op.type || "income").toLowerCase();

      let prefix = "+";
      let amountClass = "amount-income";
      if (typeLower === "expense") {
        prefix = "-";
        amountClass = "amount-expense";
      } else if (typeLower === "transfer") {
        prefix = "";
        amountClass = "amount-transfer";
      }

      return `
        <tr>
          <td>${dateStr}</td>
          <td><strong>${escapeHtml(walletName)}</strong></td>
          <td><span class="type-tag ${typeLower}">${op.type}</span></td>
          <td>${escapeHtml(op.category || op.description || "General")}</td>
          <td style="text-align: right;" class="amount-display ${amountClass}">
            ${prefix}${sym}${Number(op.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    }).join("");
  }

  function updateAnalytics() {
    let incomeSum = 0;
    let expenseSum = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    const categoryTotals = {};

    operations.forEach(op => {
      const amt = Number(op.amount) || 0;
      const t = (op.type || "").toLowerCase();
      if (t === "income") {
        incomeSum += amt;
        incomeCount++;
      } else if (t === "expense") {
        expenseSum += amt;
        expenseCount++;
        const cat = op.category || op.description || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    const netFlow = incomeSum - expenseSum;

    document.getElementById("statTotalIncome").textContent = `$${incomeSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("statIncomeCount").textContent = `${incomeCount} record${incomeCount === 1 ? "" : "s"}`;
    document.getElementById("statTotalExpenses").textContent = `$${expenseSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("statExpenseCount").textContent = `${expenseCount} record${expenseCount === 1 ? "" : "s"}`;

    const netEl = document.getElementById("statNetFlow");
    const netPrefix = netFlow >= 0 ? "+$" : "-$";
    netEl.textContent = `${netPrefix}${Math.abs(netFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    netEl.style.color = netFlow >= 0 ? "var(--success)" : "var(--danger)";

    renderCategoryBreakdown(categoryTotals, expenseSum);
  }

  function renderCategoryBreakdown(categories, totalExpense) {
    const list = document.getElementById("categoryBreakdownList");
    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    if (!entries.length || totalExpense <= 0) {
      list.innerHTML = `<div class="empty-state">No expense records yet</div>`;
      return;
    }

    list.innerHTML = entries.map(([name, amount]) => {
      const pct = Math.round((amount / totalExpense) * 100);
      return `
        <div class="category-item">
          <div class="category-info">
            <span>${escapeHtml(name)}</span>
            <span>$${amount.toFixed(2)} (${pct}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  function updateTransferRatePreview() {
    const fromSel = document.getElementById("transferFromSelect");
    const toSel = document.getElementById("transferToSelect");
    const rateInfo = document.getElementById("transferRateInfo");
    const rateVal = document.getElementById("transferRateValue");
    const estTarget = document.getElementById("transferEstTarget");
    const amountInput = document.getElementById("transferAmount");

    if (!fromSel.options.length || !toSel.options.length) {
      rateInfo.style.display = "none";
      return;
    }

    const fromCurr = fromSel.options[fromSel.selectedIndex]?.dataset.currency;
    const toCurr = toSel.options[toSel.selectedIndex]?.dataset.currency;
    const amt = parseFloat(amountInput.value) || 0;

    let rate = 1.0;
    if (fromCurr && toCurr && fromCurr !== toCurr) {
      rate = EXCHANGE_RATES[`${fromCurr}_${toCurr}`] || 1.0;
    }

    rateInfo.style.display = "block";
    rateVal.textContent = `1 ${fromCurr} = ${rate} ${toCurr}`;
    estTarget.textContent = `${(amt * rate).toFixed(2)} ${toCurr}`;
  }

  function exportCsv() {
    if (!operations.length) {
      showToast("No transactions to export", "error");
      return;
    }

    const walletMap = new Map(wallets.map(w => [w.id, w.name]));
    const headers = ["ID", "Date", "Wallet", "Type", "Category", "Amount", "Currency"];
    const rows = operations.map(op => [
      op.id,
      `"${new Date(op.created_at).toISOString()}"`,
      `"${walletMap.get(op.wallet_id) || op.wallet_id}"`,
      `"${op.type}"`,
      `"${(op.category || op.description || "").replace(/"/g, '""')}"`,
      op.amount,
      `"${op.currency}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${currentUser}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Transactions exported to CSV");
  }

  function setupModals() {
    document.querySelectorAll("[data-close]").forEach(btn => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-close");
        document.getElementById(modalId)?.classList.remove("active");
      });
    });

    document.getElementById("btnOpenCreateWallet").addEventListener("click", () => {
      document.getElementById("modalCreateWallet").classList.add("active");
    });

    document.getElementById("btnOpenIncomeModal").addEventListener("click", () => {
      if (!wallets.length) {
        showToast("Create a wallet first", "error");
        return;
      }
      document.getElementById("modalIncome").classList.add("active");
    });

    document.getElementById("btnOpenExpenseModal").addEventListener("click", () => {
      if (!wallets.length) {
        showToast("Create a wallet first", "error");
        return;
      }
      document.getElementById("modalExpense").classList.add("active");
    });

    document.getElementById("btnOpenTransferModal").addEventListener("click", () => {
      if (wallets.length < 2) {
        showToast("At least two wallets required for transfer", "error");
        return;
      }
      updateTransferRatePreview();
      document.getElementById("modalTransfer").classList.add("active");
    });

    document.getElementById("formCreateWallet").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("newWalletName").value.trim();
      const currency = document.getElementById("newWalletCurrency").value;
      const initial_balance = parseFloat(document.getElementById("newWalletInitialBalance").value) || 0;

      try {
        await apiRequest("/wallets", {
          method: "POST",
          body: JSON.stringify({ name, currency, initial_balance })
        });
        showToast(`Wallet "${name}" created`);
        document.getElementById("modalCreateWallet").classList.remove("active");
        e.target.reset();
        await loadWallets();
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    document.getElementById("formIncome").addEventListener("submit", async (e) => {
      e.preventDefault();
      const wallet_name = document.getElementById("incomeWalletSelect").value;
      const amount = parseFloat(document.getElementById("incomeAmount").value);
      const description = document.getElementById("incomeDescription").value.trim() || null;

      try {
        await apiRequest("/operations/income", {
          method: "POST",
          body: JSON.stringify({ wallet_name, amount, description })
        });
        showToast("Income added successfully");
        document.getElementById("modalIncome").classList.remove("active");
        e.target.reset();
        await loadWallets();
        await loadOperations();
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    document.getElementById("formExpense").addEventListener("submit", async (e) => {
      e.preventDefault();
      const wallet_name = document.getElementById("expenseWalletSelect").value;
      const amount = parseFloat(document.getElementById("expenseAmount").value);
      const description = document.getElementById("expenseDescription").value.trim() || null;

      try {
        await apiRequest("/operations/expense", {
          method: "POST",
          body: JSON.stringify({ wallet_name, amount, description })
        });
        showToast("Expense recorded");
        document.getElementById("modalExpense").classList.remove("active");
        e.target.reset();
        await loadWallets();
        await loadOperations();
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    document.getElementById("transferFromSelect").addEventListener("change", updateTransferRatePreview);
    document.getElementById("transferToSelect").addEventListener("change", updateTransferRatePreview);
    document.getElementById("transferAmount").addEventListener("input", updateTransferRatePreview);

    document.getElementById("formTransfer").addEventListener("submit", async (e) => {
      e.preventDefault();
      const from_wallet_id = parseInt(document.getElementById("transferFromSelect").value, 10);
      const to_wallet_id = parseInt(document.getElementById("transferToSelect").value, 10);
      const amount = parseFloat(document.getElementById("transferAmount").value);

      if (from_wallet_id === to_wallet_id) {
        showToast("Source and destination wallets must differ", "error");
        return;
      }

      try {
        await apiRequest("/operations/transfer", {
          method: "POST",
          body: JSON.stringify({ from_wallet_id, to_wallet_id, amount })
        });
        showToast("Transfer completed");
        document.getElementById("modalTransfer").classList.remove("active");
        e.target.reset();
        await loadWallets();
        await loadOperations();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  function setupAuthEvents() {
    const panel = document.getElementById("authPanel");
    document.getElementById("btnToggleAuth").addEventListener("click", () => {
      panel.classList.toggle("show");
    });
    document.getElementById("btnCloseAuth").addEventListener("click", () => {
      panel.classList.remove("show");
    });

    document.getElementById("btnSwitchUser").addEventListener("click", async () => {
      const login = document.getElementById("authLoginInput").value.trim();
      if (!login) {
        showToast("Please enter a username", "error");
        return;
      }
      currentUser = login;
      localStorage.setItem("finance_user", currentUser);
      await ensureUserExists();
      panel.classList.remove("show");
      showToast(`Switched user to ${login}`);
      await loadWallets();
      await loadOperations();
    });

    document.getElementById("btnRegisterUser").addEventListener("click", async () => {
      const login = document.getElementById("authLoginInput").value.trim();
      if (!login) {
        showToast("Please enter a username", "error");
        return;
      }
      try {
        await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login })
        });
        currentUser = login;
        localStorage.setItem("finance_user", currentUser);
        await ensureUserExists();
        panel.classList.remove("show");
        showToast(`User ${login} created and active`);
        await loadWallets();
        await loadOperations();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  function setupFilters() {
    document.getElementById("filterSearch").addEventListener("input", renderOperations);
    document.getElementById("filterType").addEventListener("change", renderOperations);
    document.getElementById("filterWallet").addEventListener("change", loadOperations);
    document.getElementById("filterDateFrom").addEventListener("change", loadOperations);
    document.getElementById("filterDateTo").addEventListener("change", loadOperations);

    document.getElementById("btnResetFilters").addEventListener("click", () => {
      document.getElementById("filterSearch").value = "";
      document.getElementById("filterType").value = "";
      document.getElementById("filterWallet").value = "";
      document.getElementById("filterDateFrom").value = "";
      document.getElementById("filterDateTo").value = "";
      loadOperations();
    });

    document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function init() {
    initTheme();
    document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
    setupModals();
    setupAuthEvents();
    setupFilters();

    await ensureUserExists();
    await loadWallets();
    await loadOperations();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
