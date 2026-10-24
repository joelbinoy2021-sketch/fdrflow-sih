import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, Landmark, FileCheck2, Clock3, RefreshCw, Search,
  Bell, Plus, Download, ChevronDown, ArrowUpRight, AlertTriangle,
  CheckCircle2, FileText, CalendarDays, ShieldCheck, Menu, X, Eye,
  Filter, WalletCards, Activity, History, Edit, Trash2, Printer,
  Building2, UploadCloud, UserCheck, LogOut, LogIn, Check, RotateCcw,
  KeyRound, User, Lock, ArrowRight, ShieldAlert, Award
} from 'lucide-react';
import './styles.css';
import { api, getToken, setToken, getStoredUser, setStoredUser } from './api';

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const dayDiff = (dateStr) => {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr + 'T23:59:59') - new Date()) / 86400000);
};

// ==========================================
// DEDICATED LOGIN PAGE COMPONENT
// ==========================================
function LoginPage({ onLogin, onQuickSwitch, loading, errorMsg }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    onLogin(username.trim(), password);
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        {/* Left Branding Column */}
        <div className="login-branding">
          <div>
            <div className="login-branding-badge">
              <Award size={14} /> SIH PROBLEM STATEMENT 26265
            </div>
            <h2>
              FDR<span>FLOW</span>
            </h2>
            <p>
              AICTE Regulation Bureau · Official Security Deposit & Fixed Deposit Receipt
              Lifecycle Portal.
            </p>

            <div className="login-features">
              <div className="login-feat">
                <ShieldCheck size={18} />
                <div>
                  <b>Multi-Tenant Role-Based Access</b>
                  <span>Strict data boundary separating Bureau Officers from Institutions</span>
                </div>
              </div>
              <div className="login-feat">
                <Clock3 size={18} />
                <div>
                  <b>Automated Maturity & Alert Engine</b>
                  <span>30, 15, and 7-day automated reminders avoiding duplicate alerts</span>
                </div>
              </div>
              <div className="login-feat">
                <RefreshCw size={18} />
                <div>
                  <b>Lifecycle Renewal & Replacement</b>
                  <span>Unbroken provenance linking new receipts to historical instruments</span>
                </div>
              </div>
              <div className="login-feat">
                <History size={18} />
                <div>
                  <b>Immutable Compliance Audit Trail</b>
                  <span>Forensic logging of reviews, discrepancies, and refund decisions</span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-disclaimer">
            <ShieldAlert size={14} />
            <span>Authorized AICTE & institutional access only. Prototype environment.</span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="login-form-area">
          <div className="login-form-head">
            <h3>Portal Sign In</h3>
            <p>Enter your credentials or choose a pre-configured evaluator persona.</p>
          </div>

          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Username / Bureau ID
              <input
                required
                type="text"
                placeholder="e.g. admin, reviewer, institute"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label>
              Password
              <input
                required
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <span className="loader-spinner" style={{ borderTopColor: '#fff' }} />
              ) : (
                <>
                  <LogIn size={16} /> Sign In to FDRFLOW
                </>
              )}
            </button>
          </form>

          {/* Evaluator Quick Access Personas */}
          <div className="login-divider">
            <span>OR 1-CLICK EVALUATOR ACCESS</span>
          </div>

          <div className="persona-cards">
            <div
              className="persona-card"
              onClick={() => onQuickSwitch('ADMIN')}
              title="Click to sign in instantly as Administrator"
            >
              <div className="persona-info">
                <b>👑 Administrator (AICTE HQ)</b>
                <span>Full portal management, record editing & forensic audit</span>
              </div>
              <span className="persona-badge role-admin">admin</span>
            </div>

            <div
              className="persona-card"
              onClick={() => onQuickSwitch('REVIEWER')}
              title="Click to sign in instantly as Verification Reviewer"
            >
              <div className="persona-info">
                <b>🔍 Regulation Reviewer (Bureau)</b>
                <span>Reviews receipts, flags discrepancies & approves releases</span>
              </div>
              <span className="persona-badge role-reviewer">reviewer</span>
            </div>

            <div
              className="persona-card"
              onClick={() => onQuickSwitch('INSTITUTION')}
              title="Click to sign in instantly as College Representative"
            >
              <div className="persona-info">
                <b>🏫 College User (North Valley Tech)</b>
                <span>Scoped college view, submit new FDRs, request renewals</span>
              </div>
              <span className="persona-badge role-institution">institute</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APPLICATION
// ==========================================
function App() {
  // Navigation & View State
  const [active, setActive] = useState('Overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Authentication State
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Data State
  const [records, setRecords] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [releaseRequests, setReleaseRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filters & Search
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [bankFilter, setBankFilter] = useState('All banks');
  const [ordering, setOrdering] = useState('-created_at');

  // Modals & Action State
  const [showAdd, setShowAdd] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [recordToAct, setRecordToAct] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('details');

  // Form States
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultMaturity = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const [addForm, setAddForm] = useState({
    institution_name: '',
    fdr_number: '',
    bank_name: '',
    amount: '',
    issue_date: todayStr,
    maturity_date: defaultMaturity,
    interest_rate: '6.50',
    remarks: '',
    file: null,
  });

  const [renewForm, setRenewForm] = useState({
    new_fdr_number: '',
    amount: '',
    bank_name: '',
    issue_date: todayStr,
    maturity_date: defaultMaturity,
    interest_rate: '7.00',
    remarks: '',
  });

  const [releaseForm, setReleaseForm] = useState({
    reason: '',
    beneficiary_account: '',
  });

  const [verifyForm, setVerifyForm] = useState({
    decision: 'Verified',
    remarks: '',
    verification_method: 'Official Bureau Review (Independent bank confirmation pending)',
  });

  const [editForm, setEditForm] = useState({
    institution_name: '',
    bank_name: '',
    amount: '',
    issue_date: '',
    maturity_date: '',
    interest_rate: '',
    remarks: '',
  });

  function notify(text, type = 'success') {
    setNotice({ text, type });
    setTimeout(() => setNotice({ text: '', type: 'info' }), 4000);
  }

  // Check token on initial load
  useEffect(() => {
    async function verifyExistingSession() {
      const token = getToken();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
        } catch (e) {
          console.warn('Session expired, showing login screen');
          api.logout();
          setCurrentUser(null);
        }
      }
    }
    verifyExistingSession();
  }, []);

  // Fetch Portal Data
  const refreshData = useCallback(async () => {
    if (!getToken() || !currentUser) return;
    setLoading(true);
    try {
      const [fdrsRes, statsRes, alertsRes, releasesRes] = await Promise.all([
        api.getFDRs({ search: query, status: statusFilter, bank: bankFilter, ordering }),
        api.getDashboardStats().catch(() => null),
        api.getAlerts().catch(() => []),
        api.getReleaseRequests().catch(() => []),
      ]);

      const fdrList = Array.isArray(fdrsRes) ? fdrsRes : fdrsRes.results || [];
      setRecords(fdrList);
      if (statsRes) setDashboardStats(statsRes);
      setAlerts(Array.isArray(alertsRes) ? alertsRes : alertsRes.results || []);
      setReleaseRequests(Array.isArray(releasesRes) ? releasesRes : releasesRes.results || []);

      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'REVIEWER') {
        const auditRes = await api.getAuditLogs().catch(() => []);
        setAuditLogs(Array.isArray(auditRes) ? auditRes : auditRes.results || []);
      }
    } catch (err) {
      console.error('Failed to load records from backend:', err);
      notify(err.message || 'Failed to load backend data.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, bankFilter, ordering, currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [refreshData, currentUser]);

  // Auth Handlers
  const handleLoginSubmit = async (username, password) => {
    setLoading(true);
    setAuthError('');
    try {
      const res = await api.login(username, password);
      setCurrentUser(res.user);
      notify(`Welcome back, ${res.user.first_name || res.user.username}!`);
    } catch (err) {
      setAuthError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (role) => {
    setLoading(true);
    setAuthError('');
    setShowRoleDropdown(false);
    try {
      const res = await api.quickSwitch(role);
      setCurrentUser(res.user);
      notify(`Signed in as ${role} persona.`);
    } catch (err) {
      setAuthError(err.message || 'Could not authenticate persona.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setRecords([]);
    setDashboardStats(null);
    setShowRoleDropdown(false);
    notify('Signed out successfully.');
  };

  // Add FDR Submission
  const handleAddFDR = async (e) => {
    e.preventDefault();
    if (!addForm.fdr_number || !addForm.bank_name || !addForm.amount) {
      notify('Please complete all required fields.', 'danger');
      return;
    }
    if (Number(addForm.amount) <= 0) {
      notify('Deposit amount must be a positive number.', 'danger');
      return;
    }
    if (new Date(addForm.maturity_date) <= new Date(addForm.issue_date)) {
      notify('Maturity date must be after the issue date.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const inst =
        currentUser?.role === 'INSTITUTION' && currentUser?.institution_name
          ? currentUser.institution_name
          : addForm.institution_name;

      formData.append('institution_name', inst);
      formData.append('fdr_number', addForm.fdr_number.trim());
      formData.append('bank_name', addForm.bank_name);
      formData.append('amount', addForm.amount);
      formData.append('issue_date', addForm.issue_date);
      formData.append('maturity_date', addForm.maturity_date);
      formData.append('interest_rate', addForm.interest_rate || '0');
      formData.append('remarks', addForm.remarks || '');
      if (addForm.file) {
        formData.append('document', addForm.file);
      }

      await api.createFDR(formData);
      notify('FDR registered successfully and submitted to verification queue.');
      setShowAdd(false);
      setAddForm({
        institution_name: '',
        fdr_number: '',
        bank_name: '',
        amount: '',
        issue_date: todayStr,
        maturity_date: defaultMaturity,
        interest_rate: '6.50',
        remarks: '',
        file: null,
      });
      refreshData();
      setActive('FDR Repository');
    } catch (err) {
      notify(err.message || 'Failed to submit FDR.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Verification Decision
  const handleVerifyDecision = async (e) => {
    e.preventDefault();
    if (!recordToAct) return;
    if (
      (verifyForm.decision === 'Discrepancy detected' || verifyForm.decision === 'Rejected') &&
      !verifyForm.remarks.trim()
    ) {
      notify(`Mandatory remarks required when recording '${verifyForm.decision}'.`, 'danger');
      return;
    }

    setLoading(true);
    try {
      await api.verifyFDR(recordToAct.id, verifyForm);
      notify(`FDR ${recordToAct.fdr_number} updated to '${verifyForm.decision}'.`);
      setShowVerifyModal(false);
      setSelected(null);
      setRecordToAct(null);
      refreshData();
    } catch (err) {
      notify(err.message || 'Verification update failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Renewal Submission
  const handleRenewFDR = async (e) => {
    e.preventDefault();
    if (!recordToAct) return;
    if (!renewForm.new_fdr_number || !renewForm.amount) {
      notify('New FDR number and amount are required.', 'danger');
      return;
    }

    setLoading(true);
    try {
      await api.renewFDR(recordToAct.id, {
        new_fdr_number: renewForm.new_fdr_number.trim(),
        amount: renewForm.amount,
        bank_name: renewForm.bank_name || recordToAct.bank_name,
        issue_date: renewForm.issue_date,
        maturity_date: renewForm.maturity_date,
        interest_rate: renewForm.interest_rate,
        remarks: renewForm.remarks,
      });
      notify(`FDR ${recordToAct.fdr_number} renewed as ${renewForm.new_fdr_number}.`);
      setShowRenewModal(false);
      setSelected(null);
      setRecordToAct(null);
      refreshData();
      setActive('Renewals');
    } catch (err) {
      notify(err.message || 'Renewal failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Release Request Submission
  const handleRequestRelease = async (e) => {
    e.preventDefault();
    if (!recordToAct) return;
    if (!releaseForm.reason.trim()) {
      notify('Please provide a justification for release request.', 'danger');
      return;
    }

    setLoading(true);
    try {
      await api.requestRelease(recordToAct.id, releaseForm);
      notify(`Security deposit release requested for FDR ${recordToAct.fdr_number}.`);
      setShowReleaseModal(false);
      setSelected(null);
      setRecordToAct(null);
      refreshData();
      setActive('Release Requests');
    } catch (err) {
      notify(err.message || 'Release request failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Review Release Request
  const handleReviewRelease = async (releaseReq, decision) => {
    const reason = window.prompt(
      `Enter remarks for ${decision} of release request:`,
      decision === 'Approved' ? 'Criteria fulfilled.' : ''
    );
    if (decision === 'Rejected' && !reason) {
      notify('Remarks are required for rejecting a release request.', 'danger');
      return;
    }

    setLoading(true);
    try {
      await api.reviewReleaseRequest(releaseReq.id, {
        decision,
        reviewer_remarks: reason || '',
      });
      notify(`Release request marked as ${decision}.`);
      refreshData();
    } catch (err) {
      notify(err.message || 'Action failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Edit FDR (Admin)
  const handleEditFDR = async (e) => {
    e.preventDefault();
    if (!recordToAct) return;
    setLoading(true);
    try {
      await api.updateFDR(recordToAct.id, editForm);
      notify(`FDR ${recordToAct.fdr_number} updated.`);
      setShowEditModal(false);
      setSelected(null);
      setRecordToAct(null);
      refreshData();
    } catch (err) {
      notify(err.message || 'Edit failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const url = api.exportCsvUrl();
    const token = getToken();
    const fullUrl = `${url}?token=${token}`;
    window.open(fullUrl, '_blank');
    notify('CSV report generated and downloading.');
  };

  const stats = useMemo(() => {
    if (dashboardStats) {
      return {
        total: dashboardStats.total_instruments,
        amount: dashboardStats.total_recorded_value,
        active: dashboardStats.active_count,
        pending: dashboardStats.pending_verification_count,
        discrepancies: dashboardStats.discrepancies_count,
        expiring: dashboardStats.expiring_30_days_count,
        matured: dashboardStats.matured_count,
        attention: dashboardStats.attention_items || [],
      };
    }
    return {
      total: records.length,
      amount: records.reduce((s, r) => s + Number(r.amount || 0), 0),
      active: records.filter((r) => r.status === 'Active').length,
      pending: records.filter((r) => r.verification_status === 'Pending verification').length,
      discrepancies: records.filter((r) => r.verification_status === 'Discrepancy detected').length,
      expiring: records.filter(
        (r) => dayDiff(r.maturity_date) >= 0 && dayDiff(r.maturity_date) <= 30
      ).length,
      matured: records.filter((r) => dayDiff(r.maturity_date) < 0).length,
      attention: records.filter(
        (r) =>
          r.verification_status === 'Discrepancy detected' ||
          r.verification_status === 'Pending verification' ||
          dayDiff(r.maturity_date) <= 7
      ),
    };
  }, [records, dashboardStats]);

  const nav = [
    ['Overview', LayoutDashboard],
    ['FDR Repository', Landmark],
    ['Verification Queue', FileCheck2],
    ['Maturity & Alerts', Clock3],
    ['Renewals', RefreshCw],
    ['Release Requests', WalletCards],
    ['Reports', Activity],
    ['Audit Trail', History],
  ];

  const statusClass = (s) =>
    s === 'Verified' || s === 'Active' || s === 'Approved'
      ? 'green'
      : s === 'Pending verification' ||
        s === 'Pending' ||
        s === 'Renewal required' ||
        s === 'Under Review'
      ? 'amber'
      : s === 'Discrepancy detected' || s === 'Matured' || s === 'Rejected'
      ? 'red'
      : 'gray';

  // RENDER DEDICATED LOGIN PAGE IF NOT AUTHENTICATED
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLoginSubmit}
        onQuickSwitch={handleQuickSwitch}
        loading={loading}
        errorMsg={authError}
      />
    );
  }

  const userRole = currentUser?.role || 'REVIEWER';
  const isReviewerOrAdmin = userRole === 'ADMIN' || userRole === 'REVIEWER';
  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Landmark size={23} />
          </div>
          <div>
            <strong>
              FDR<span>FLOW</span>
            </strong>
            <small>AICTE · Regulation Bureau</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileNav(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(([name, Icon]) => {
            if (name === 'Audit Trail' && !isReviewerOrAdmin) return null;
            return (
              <button
                key={name}
                className={`nav-item ${active === name ? 'selected' : ''}`}
                onClick={() => {
                  setActive(name);
                  setMobileNav(false);
                }}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === 'Verification Queue' && stats.pending > 0 && <em>{stats.pending}</em>}
                {name === 'Maturity & Alerts' && alerts.filter((a) => !a.is_read).length > 0 && (
                  <em>{alerts.filter((a) => !a.is_read).length}</em>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-note">
            <ShieldCheck size={18} />
            <div>
              <b>Secure workspace</b>
              <span>Role-based access active</span>
            </div>
          </div>
          <div
            className="profile"
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar">
              {currentUser?.first_name ? currentUser.first_name[0] : 'AR'}
            </div>
            <div className="profile-info">
              <b>
                {currentUser?.first_name
                  ? `${currentUser.first_name} ${currentUser.last_name || ''}`
                  : 'User'}
              </b>
              <span>
                {currentUser?.profile?.designation ||
                  (userRole === 'ADMIN'
                    ? 'Regulation Bureau'
                    : userRole === 'INSTITUTION'
                    ? 'Institution User'
                    : 'Verification Cell')}
              </span>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)} />}

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="top-left">
            <button className="hamburger" onClick={() => setMobileNav(true)}>
              <Menu size={20} />
            </button>
            <div className="crumb">
              Workspace <span>/</span> <b>{active}</b>
            </div>
          </div>

          <div className="top-actions">
            {/* Live Role Switcher Pill */}
            <div className="user-dropdown">
              <button
                className="role-picker"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                title="Switch active role or sign out"
              >
                <span className={`badge-role role-${userRole.toLowerCase()}`}>
                  {userRole}
                </span>
                <span>
                  {currentUser?.institution_name ||
                    (userRole === 'INSTITUTION' ? 'North Valley Institute' : 'AICTE HQ')}
                </span>
                <ChevronDown size={13} />
              </button>

              {showRoleDropdown && (
                <div className="role-dropdown-menu">
                  <div
                    style={{
                      padding: '6px 10px',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#94a3b8',
                    }}
                  >
                    SWITCH ACTIVE PERSONA
                  </div>
                  <button onClick={() => handleQuickSwitch('ADMIN')}>
                    <b>👑 Administrator</b>
                    <span>Full portal control, approvals & audit</span>
                  </button>
                  <button onClick={() => handleQuickSwitch('REVIEWER')}>
                    <b>🔍 Bureau Reviewer</b>
                    <span>Verify FDRs & flag discrepancies</span>
                  </button>
                  <button onClick={() => handleQuickSwitch('INSTITUTION')}>
                    <b>🏫 Institution User</b>
                    <span>North Valley Inst. (Scoped access)</span>
                  </button>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                  <button onClick={handleLogout} style={{ color: '#dc2626' }}>
                    <b>
                      <LogOut size={12} style={{ display: 'inline', marginRight: 4 }} /> Sign Out
                    </b>
                    <span>Return to portal login screen</span>
                  </button>
                </div>
              )}
            </div>

            <button
              className="icon-btn notification-btn"
              onClick={() => {
                setActive('Maturity & Alerts');
                notify('Showing maturity and alert records.');
              }}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {alerts.some((a) => !a.is_read) && <i />}
            </button>

            <button
              className="icon-btn"
              onClick={refreshData}
              title="Refresh live database data"
              disabled={loading}
            >
              <RotateCcw size={17} className={loading ? 'loader-spinner' : ''} />
            </button>

            <button
              className="icon-btn"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SECURITY DEPOSIT MANAGEMENT</div>
              <h1>
                {active === 'Overview'
                  ? `Good morning, ${currentUser?.first_name || 'Admin'}`
                  : active}
              </h1>
              <p>
                {active === 'Overview'
                  ? 'Live database status of security deposits, fixed deposit receipts, and regulatory compliance.'
                  : active === 'FDR Repository'
                  ? 'Search, review and manage institution-wise FDR records stored in Django backend.'
                  : active === 'Verification Queue'
                  ? 'Review submitted instruments and resolve discrepancies. Direct bank verification is not connected.'
                  : active === 'Maturity & Alerts'
                  ? 'Track upcoming maturities (30/15/7 days) and overdue instruments.'
                  : active === 'Renewals'
                  ? 'Monitor renewal and replacement instrument submissions linked to parent records.'
                  : active === 'Release Requests'
                  ? 'Track requests for discharge or refund of deposits with reviewer determinations.'
                  : active === 'Audit Trail'
                  ? 'Immutable audit log of all financial record modifications and verification actions.'
                  : 'Export and review FDR management records.'}
              </p>
            </div>

            <div className="heading-actions no-print">
              <button className="btn btn-secondary" onClick={handleExportCSV}>
                <Download size={16} /> Export CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                title="Print official report view"
              >
                <Printer size={16} /> Print View
              </button>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={17} /> Add new FDR
              </button>
            </div>
          </div>

          {/* OVERVIEW (DASHBOARD) TAB */}
          {active === 'Overview' && (
            <>
              <div className="stats-grid">
                <Stat
                  title="Total instruments"
                  value={stats.total.toLocaleString('en-IN')}
                  note={`${money(stats.amount)} total recorded value`}
                  icon={Landmark}
                  tone="blue"
                />
                <Stat
                  title="Active instruments"
                  value={stats.active.toLocaleString('en-IN')}
                  note="Currently within validity"
                  icon={CheckCircle2}
                  tone="green"
                />
                <Stat
                  title="Expiring in 30 days"
                  value={stats.expiring.toLocaleString('en-IN')}
                  note="Require timely follow-up"
                  icon={Clock3}
                  tone="amber"
                />
                <Stat
                  title="Need attention"
                  value={(stats.pending + stats.discrepancies).toLocaleString('en-IN')}
                  note="Pending verification / discrepancy"
                  icon={AlertTriangle}
                  tone="red"
                />
              </div>

              <div className="overview-grid">
                {/* Lifecycle Panel */}
                <section className="panel lifecycle-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Instrument lifecycle</h2>
                      <p>Current distribution across database records</p>
                    </div>
                    <button className="text-button" onClick={() => setActive('FDR Repository')}>
                      View repository <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="lifecycle-list">
                    <Lifecycle
                      label="Active"
                      count={stats.active}
                      total={stats.total}
                      color="bar-green"
                    />
                    <Lifecycle
                      label="Pending verification"
                      count={stats.pending}
                      total={stats.total}
                      color="bar-blue"
                    />
                    <Lifecycle
                      label="Discrepancies"
                      count={stats.discrepancies}
                      total={stats.total}
                      color="bar-red"
                    />
                    <Lifecycle
                      label="Matured / renewal required"
                      count={stats.matured}
                      total={stats.total}
                      color="bar-amber"
                    />
                  </div>
                  <div className="lifecycle-foot">
                    <div>
                      <span className="tiny-dot green-dot" /> {stats.active} active
                    </div>
                    <div>
                      <span className="tiny-dot amber-dot" /> {stats.expiring} expiring soon
                    </div>
                    <div>
                      <span className="tiny-dot red-dot" /> {stats.matured} matured
                    </div>
                  </div>
                </section>

                {/* Attention Panel */}
                <section className="panel attention-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Needs your attention</h2>
                      <p>Prioritized items requiring bureau action</p>
                    </div>
                    <span className="count-pill">{stats.attention.length} items</span>
                  </div>
                  <div className="attention-list">
                    {stats.attention.slice(0, 4).map((r) => {
                      const days =
                        r.days_remaining !== undefined ? r.days_remaining : dayDiff(r.maturity_date);
                      const isDiscrepancy =
                        r.verification === 'Discrepancy detected' ||
                        r.verification_status === 'Discrepancy detected';
                      const isMatured = days < 0;

                      return (
                        <button
                          className="attention-item"
                          key={r.id}
                          onClick={() => {
                            const fullRecord = records.find((x) => x.id === r.id) || r;
                            setSelected(fullRecord);
                          }}
                        >
                          <div
                            className={`attention-icon ${
                              isDiscrepancy || isMatured ? 'icon-red' : 'icon-amber'
                            }`}
                          >
                            {isDiscrepancy ? (
                              <AlertTriangle size={17} />
                            ) : days <= 7 ? (
                              <Clock3 size={17} />
                            ) : (
                              <FileCheck2 size={17} />
                            )}
                          </div>
                          <div className="attention-copy">
                            <b>{r.institution || r.institution_name}</b>
                            <span>
                              {isDiscrepancy
                                ? 'Discrepancy needs review'
                                : isMatured
                                ? 'Instrument matured / overdue'
                                : days <= 7
                                ? `Matures in ${days} days`
                                : 'Awaiting verification'}
                            </span>
                          </div>
                          <ArrowUpRight size={16} className="muted-arrow" />
                        </button>
                      );
                    })}
                    {stats.attention.length === 0 && (
                      <div
                        style={{
                          padding: '25px 0',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '11px',
                        }}
                      >
                        No pending discrepancies or urgent renewals.
                      </div>
                    )}
                  </div>
                  <button className="panel-link" onClick={() => setActive('Verification Queue')}>
                    Open review queue <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>

              {/* Recent Records Panel */}
              <RecordsPanel
                records={records.slice(0, 5)}
                onView={setSelected}
                onAll={() => setActive('FDR Repository')}
                statusClass={statusClass}
                loading={loading}
              />
            </>
          )}

          {/* FDR REPOSITORY TAB */}
          {active === 'FDR Repository' && (
            <RecordsPanel
              records={records}
              onView={setSelected}
              statusClass={statusClass}
              query={query}
              setQuery={setQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              bankFilter={bankFilter}
              setBankFilter={setBankFilter}
              ordering={ordering}
              setOrdering={setOrdering}
              full
              loading={loading}
              onAdd={() => setShowAdd(true)}
            />
          )}

          {/* VERIFICATION QUEUE TAB */}
          {active === 'Verification Queue' && (
            <div>
              <div className="info-banner">
                <ShieldCheck size={19} />
                <div>
                  <b>Verification is an official regulatory action</b>
                  <span>
                    Records are institution-submitted until an authorized bureau officer verifies
                    supporting instruments. Direct API integration with commercial banks is not
                    connected in this prototype.
                  </span>
                </div>
              </div>

              <RecordsPanel
                records={records.filter((r) => r.verification_status !== 'Verified')}
                onView={setSelected}
                statusClass={statusClass}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                full
                loading={loading}
                emptyTitle="Verification queue is clear"
                emptySub="All submitted FDR instruments have been reviewed."
              />
            </div>
          )}

          {/* MATURITY & ALERTS TAB */}
          {active === 'Maturity & Alerts' && (
            <div>
              <div className="alert-cards">
                <div className="alert-card">
                  <CalendarDays />
                  <div>
                    <b>{stats.expiring}</b>
                    <span>Due within 30 days</span>
                  </div>
                </div>
                <div className="alert-card">
                  <AlertTriangle />
                  <div>
                    <b>{stats.matured}</b>
                    <span>Matured / overdue</span>
                  </div>
                </div>
                <div className="alert-card">
                  <Bell />
                  <div>
                    <b>{alerts.length}</b>
                    <span>Active alerts generated</span>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ padding: '20px', marginBottom: '18px' }}>
                <div className="panel-head" style={{ marginBottom: '15px' }}>
                  <div>
                    <h2>Automated Maturity & Compliance Alerts</h2>
                    <p>Alerts generated from real-time database maturity date monitoring.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        await api.syncAlerts();
                        refreshData();
                        notify('Alerts synchronized with database.');
                      }}
                    >
                      <RotateCcw size={13} /> Re-sync
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        await api.markAllAlertsRead();
                        refreshData();
                        notify('All alerts marked read.');
                      }}
                    >
                      <Check size={13} /> Mark all read
                    </button>
                  </div>
                </div>

                <div className="alert-list">
                  {alerts.map((a) => (
                    <div className={`alert-row ${a.severity}`} key={a.id}>
                      <div className="alert-row-body">
                        <b>{a.title}</b>
                        <p>{a.message}</p>
                        <div className="alert-row-meta">
                          <span>
                            {a.institution_name} ({a.bank_name})
                          </span>
                          <span>•</span>
                          <span>{new Date(a.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                      {!a.is_read && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={async () => {
                            await api.markAlertRead(a.id);
                            refreshData();
                          }}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No active alerts. All FDR instruments are within standard operating validity.
                    </div>
                  )}
                </div>
              </div>

              {/* Records near maturity */}
              <RecordsPanel
                records={records.filter((r) => dayDiff(r.maturity_date) <= 30)}
                onView={setSelected}
                statusClass={statusClass}
                full
                loading={loading}
                emptyTitle="No instruments expiring soon"
                emptySub="No instruments with maturity dates within 30 days."
              />
            </div>
          )}

          {/* RENEWALS TAB */}
          {active === 'Renewals' && (
            <div>
              <div className="info-banner">
                <RefreshCw size={19} />
                <div>
                  <b>Continuous Deposit Lifecycle Tracking</b>
                  <span>
                    When an FDR reaches maturity or terms change, record a renewal. The system links
                    the new receipt to the historical instrument, preserving an unbroken compliance
                    audit trail.
                  </span>
                </div>
              </div>

              <RecordsPanel
                records={records.filter(
                  (r) =>
                    r.is_renewed || r.status === 'Renewal required' || dayDiff(r.maturity_date) <= 30
                )}
                onView={setSelected}
                statusClass={statusClass}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                full
                loading={loading}
                emptyTitle="No renewals pending"
                emptySub="No instruments currently flagged for replacement or renewal."
              />
            </div>
          )}

          {/* RELEASE REQUESTS TAB */}
          {active === 'Release Requests' && (
            <div>
              <div className="panel" style={{ padding: '20px', marginBottom: '18px' }}>
                <div className="panel-head" style={{ marginBottom: '15px' }}>
                  <div>
                    <h2>Security Deposit Release Requests</h2>
                    <p>
                      Formal requests for refund or release of joint security deposits upon
                      regulatory condition fulfillment.
                    </p>
                  </div>
                  {records.length > 0 && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        const eligible = records.find((r) => r.status !== 'Released');
                        if (eligible) {
                          setRecordToAct(eligible);
                          setShowReleaseModal(true);
                        } else {
                          notify('No eligible unreleased FDR available.', 'warning');
                        }
                      }}
                    >
                      <WalletCards size={16} /> Request Release
                    </button>
                  )}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>INSTRUMENT / INSTITUTION</th>
                        <th>AMOUNT</th>
                        <th>REASON / BENEFICIARY</th>
                        <th>STATUS</th>
                        <th>REQUESTED BY</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {releaseRequests.map((req) => (
                        <tr key={req.id}>
                          <td>
                            <div className="instrument-cell">
                              <div className="file-icon">
                                <FileText size={17} />
                              </div>
                              <div>
                                <b>{req.fdr_number}</b>
                                <span>
                                  {req.institution_name} ({req.bank_name})
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="amount-cell">{money(req.amount)}</td>
                          <td>
                            <div
                              style={{
                                maxWidth: 280,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              <b>{req.reason}</b>
                              <span
                                style={{ fontSize: '9px', color: '#64748b', display: 'block' }}
                              >
                                {req.beneficiary_account || 'Bank details on file'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${statusClass(req.status)}`}>
                              <i />
                              {req.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '10px', color: '#475569' }}>
                              {req.requested_by_name}
                            </span>
                            <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>
                              {new Date(req.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </td>
                          <td>
                            {isReviewerOrAdmin && req.status === 'Pending' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleReviewRelease(req, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleReviewRelease(req, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {req.status !== 'Pending' && (
                              <span style={{ fontSize: '10px', color: '#64748b' }}>
                                Reviewed by {req.reviewer_name || 'Bureau'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {releaseRequests.length === 0 && (
                        <tr>
                          <td colSpan="6">
                            <div className="empty-state" style={{ margin: 0, border: 'none' }}>
                              <div className="empty-icon">
                                <WalletCards size={27} />
                              </div>
                              <h3>No release requests submitted</h3>
                              <p>
                                When an institution fulfills endowment or compliance conditions, a
                                release request can be lodged here for bureau determination.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {active === 'Reports' && (
            <div>
              <div className="report-summary panel">
                <h2>FDR Portfolio Regulatory Summary</h2>
                <p>Comprehensive aggregate report of recorded security deposits.</p>

                <div className="report-metrics">
                  <div>
                    <span>Total instruments</span>
                    <b>{stats.total}</b>
                  </div>
                  <div>
                    <span>Total recorded value</span>
                    <b>{money(stats.amount)}</b>
                  </div>
                  <div>
                    <span>Active deposit value</span>
                    <b>
                      {money(
                        records
                          .filter((r) => r.status === 'Active')
                          .reduce((s, r) => s + Number(r.amount || 0), 0)
                      )}
                    </b>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', gap: '9px', marginTop: '15px' }}
                  className="no-print"
                >
                  <button className="btn btn-primary" onClick={handleExportCSV}>
                    <Download size={16} /> Download Full CSV Report
                  </button>
                  <button className="btn btn-secondary" onClick={() => window.print()}>
                    <Printer size={16} /> Print Official Summary
                  </button>
                </div>
              </div>

              {/* Records table inside reports for printable documentation */}
              <RecordsPanel
                records={records}
                onView={setSelected}
                statusClass={statusClass}
                full
                loading={loading}
              />
            </div>
          )}

          {/* AUDIT TRAIL TAB */}
          {active === 'Audit Trail' && isReviewerOrAdmin && (
            <div className="panel" style={{ padding: '20px' }}>
              <div className="panel-head" style={{ marginBottom: '18px' }}>
                <div>
                  <h2>Regulatory Compliance Audit Trail</h2>
                  <p>
                    Immutable forensic record of all submissions, verification actions, and status
                    updates.
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>ACTION</th>
                      <th>AFFECTED INSTRUMENT</th>
                      <th>ACTOR / ROLE</th>
                      <th>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ fontSize: '10px', color: '#475569' }}>
                            {new Date(log.created_at).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700 }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <b>{log.fdr_number || 'General System'}</b>
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', color: '#334155' }}>
                            {log.user_repr}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>{log.details}</span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}
                        >
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <footer className="footer no-print">
            <span>FDRFlow · SIH 2026 · Problem Statement 26265</span>
            <span>
              <ShieldCheck size={14} /> Prototype environment · No live bank transaction connection
            </span>
          </footer>
        </div>
      </main>

      {/* MODAL: ADD NEW FDR */}
      {showAdd && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">NEW INSTRUMENT</div>
                <h2>Register an FDR</h2>
                <p>Submit deposit receipt details for bureau verification.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowAdd(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleAddFDR}>
              <label>
                Institution name
                <input
                  required
                  value={
                    currentUser?.role === 'INSTITUTION' && currentUser?.institution_name
                      ? currentUser.institution_name
                      : addForm.institution_name
                  }
                  disabled={currentUser?.role === 'INSTITUTION' && !!currentUser?.institution_name}
                  onChange={(e) => setAddForm({ ...addForm, institution_name: e.target.value })}
                  placeholder="Enter registered institution name"
                />
              </label>

              <div className="form-row">
                <label>
                  Issuing bank
                  <select
                    required
                    value={addForm.bank_name}
                    onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })}
                  >
                    <option value="">Select bank</option>
                    {[
                      'State Bank of India',
                      'Canara Bank',
                      'Federal Bank',
                      'HDFC Bank',
                      'ICICI Bank',
                      'Union Bank of India',
                      'Punjab National Bank',
                      'Bank of Baroda',
                      'Axis Bank',
                      'Kotak Mahindra Bank',
                    ].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Deposit amount (₹)
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    placeholder="e.g. 500000"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  FDR / Instrument Reference No.
                  <input
                    required
                    value={addForm.fdr_number}
                    onChange={(e) => setAddForm({ ...addForm, fdr_number: e.target.value })}
                    placeholder="Bank reference / certificate number"
                  />
                </label>

                <label>
                  Interest rate (% p.a.)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="25"
                    value={addForm.interest_rate}
                    onChange={(e) => setAddForm({ ...addForm, interest_rate: e.target.value })}
                    placeholder="e.g. 6.75"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Issue date
                  <input
                    type="date"
                    required
                    value={addForm.issue_date}
                    onChange={(e) => setAddForm({ ...addForm, issue_date: e.target.value })}
                  />
                </label>

                <label>
                  Maturity date
                  <input
                    type="date"
                    required
                    value={addForm.maturity_date}
                    onChange={(e) => setAddForm({ ...addForm, maturity_date: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Supporting document (Receipt / Scan / PDF, max 5MB)
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={(e) => setAddForm({ ...addForm, file: e.target.files[0] || null })}
                />
              </label>

              <label>
                Purpose / Remarks
                <input
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })}
                  placeholder="e.g. Mandatory endowment deposit for B.Tech approval"
                />
              </label>

              <div className="form-note">
                <ShieldCheck size={16} />
                <span>
                  New records are logged as <b>Pending verification</b>. Bureau officers perform
                  independent physical & branch checks before marking instruments verified.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="loader-spinner" /> : <Plus size={16} />}
                  Submit FDR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD DETAILS & TABS */}
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="modal detail-modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">INSTRUMENT DOSSIER</div>
                <h2>{selected.fdr_number}</h2>
                <p>{selected.institution_name}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                <X size={19} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="tab-row">
              <button
                className={`tab-btn ${activeDetailTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveDetailTab('details')}
              >
                Details
              </button>
              <button
                className={`tab-btn ${activeDetailTab === 'verification' ? 'active' : ''}`}
                onClick={() => setActiveDetailTab('verification')}
              >
                Verification History ({selected.verification_logs?.length || 0})
              </button>
              <button
                className={`tab-btn ${activeDetailTab === 'releases' ? 'active' : ''}`}
                onClick={() => setActiveDetailTab('releases')}
              >
                Release Status
              </button>
            </div>

            {activeDetailTab === 'details' && (
              <>
                <div className="detail-amount">
                  <span>Deposit amount</span>
                  <strong>{money(selected.amount)}</strong>
                </div>

                <div className="detail-grid">
                  <Detail label="Issuing bank" value={selected.bank_name} />
                  <Detail label="Reference No." value={selected.fdr_number} />
                  <Detail label="Issue date" value={selected.issue_date} />
                  <Detail label="Maturity date" value={selected.maturity_date} />
                  <Detail label="Interest rate" value={`${selected.interest_rate}% p.a.`} />
                  <Detail
                    label="Time to maturity"
                    value={
                      dayDiff(selected.maturity_date) < 0
                        ? `${Math.abs(dayDiff(selected.maturity_date))} days overdue`
                        : `${dayDiff(selected.maturity_date)} days remaining`
                    }
                  />
                  <Detail
                    label="Instrument status"
                    value={
                      <span className={`status-badge ${statusClass(selected.status)}`}>
                        <i /> {selected.status}
                      </span>
                    }
                  />
                  <Detail
                    label="Verification"
                    value={
                      <span className={`status-badge ${statusClass(selected.verification_status)}`}>
                        <i /> {selected.verification_status}
                      </span>
                    }
                  />
                </div>

                {selected.remarks && (
                  <div style={{ margin: '10px 0', fontSize: '11px', color: '#64748b' }}>
                    <b>Remarks:</b> {selected.remarks}
                  </div>
                )}

                {selected.has_document && (
                  <div style={{ margin: '14px 0' }}>
                    <a
                      href={api.downloadDocumentUrl(selected.id)}
                      className="btn btn-secondary btn-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={13} /> Download Supporting Document
                    </a>
                  </div>
                )}
              </>
            )}

            {activeDetailTab === 'verification' && (
              <div className="history-timeline">
                {selected.verification_logs?.map((log) => (
                  <div className="history-card" key={log.id}>
                    <div className="history-meta">
                      <b>{log.decision}</b>
                      <span>{new Date(log.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#0f766e' }}>
                      Method: {log.verification_method}
                    </div>
                    <div className="history-remarks">{log.remarks}</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: 4 }}>
                      Verified by: {log.reviewer_name}
                    </div>
                  </div>
                ))}
                {(!selected.verification_logs || selected.verification_logs.length === 0) && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#94a3b8',
                      fontSize: '11px',
                    }}
                  >
                    No verification records yet. Instrument is awaiting initial review.
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'releases' && (
              <div className="history-timeline">
                {selected.release_requests?.map((rel) => (
                  <div className="history-card" key={rel.id}>
                    <div className="history-meta">
                      <b>Release Request ({rel.status})</b>
                      <span>{new Date(rel.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="history-remarks">
                      <b>Justification:</b> {rel.reason}
                    </div>
                    {rel.beneficiary_account && (
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: 3 }}>
                        Account: {rel.beneficiary_account}
                      </div>
                    )}
                    {rel.reviewer_remarks && (
                      <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: 4 }}>
                        <b>Reviewer Remarks:</b> {rel.reviewer_remarks}
                      </div>
                    )}
                  </div>
                ))}
                {(!selected.release_requests || selected.release_requests.length === 0) && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#94a3b8',
                      fontSize: '11px',
                    }}
                  >
                    No release or refund requests lodged for this instrument.
                  </div>
                )}
              </div>
            )}

            <div className="form-note" style={{ marginTop: '16px' }}>
              <ShieldCheck size={16} />
              <span>
                FDRFLOW prototype action log. Official bureau reviews and decisions are tracked
                under an immutable audit log.
              </span>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>

              {/* Renewal Action */}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setRecordToAct(selected);
                  setRenewForm({
                    new_fdr_number: `${selected.fdr_number}-R1`,
                    amount: selected.amount,
                    bank_name: selected.bank_name,
                    issue_date: todayStr,
                    maturity_date: defaultMaturity,
                    interest_rate: selected.interest_rate,
                    remarks: `Renewal of ${selected.fdr_number}`,
                  });
                  setShowRenewModal(true);
                }}
              >
                <RefreshCw size={14} /> Renew Instrument
              </button>

              {/* Request Release Action */}
              {selected.status !== 'Released' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setRecordToAct(selected);
                    setShowReleaseModal(true);
                  }}
                >
                  <WalletCards size={14} /> Request Release
                </button>
              )}

              {/* Admin Edit Action */}
              {isAdmin && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setRecordToAct(selected);
                    setEditForm({
                      institution_name: selected.institution_name,
                      bank_name: selected.bank_name,
                      amount: selected.amount,
                      issue_date: selected.issue_date,
                      maturity_date: selected.maturity_date,
                      interest_rate: selected.interest_rate,
                      remarks: selected.remarks || '',
                    });
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={14} /> Edit Record
                </button>
              )}

              {/* Reviewer / Admin Verification Action */}
              {isReviewerOrAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setRecordToAct(selected);
                    setShowVerifyModal(true);
                  }}
                >
                  <CheckCircle2 size={15} /> Record Bureau Decision
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERIFICATION & DISCREPANCY DETERMINATION */}
      {showVerifyModal && recordToAct && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setShowVerifyModal(false)}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">BUREAU VERIFICATION CELL</div>
                <h2>Review {recordToAct.fdr_number}</h2>
                <p>
                  {recordToAct.institution_name} · ₹
                  {Number(recordToAct.amount).toLocaleString('en-IN')}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowVerifyModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleVerifyDecision}>
              <label>
                Regulatory Determination
                <select
                  value={verifyForm.decision}
                  onChange={(e) => setVerifyForm({ ...verifyForm, decision: e.target.value })}
                >
                  <option value="Verified">Verified (Conforming deposit)</option>
                  <option value="Discrepancy detected">
                    Discrepancy detected (Requires rectification)
                  </option>
                  <option value="Rejected">Rejected (Non-compliant instrument)</option>
                </select>
              </label>

              <label>
                Verification method
                <input
                  required
                  value={verifyForm.verification_method}
                  onChange={(e) =>
                    setVerifyForm({ ...verifyForm, verification_method: e.target.value })
                  }
                  placeholder="e.g. Branch confirmation letter cross-checked"
                />
              </label>

              <label>
                Remarks / Discrepancy details
                <textarea
                  rows={3}
                  required={verifyForm.decision !== 'Verified'}
                  style={{
                    width: '100%',
                    border: '1px solid #dce5eb',
                    borderRadius: 7,
                    padding: 8,
                    fontSize: 11,
                  }}
                  value={verifyForm.remarks}
                  onChange={(e) => setVerifyForm({ ...verifyForm, remarks: e.target.value })}
                  placeholder={
                    verifyForm.decision === 'Verified'
                      ? 'Verified in compliance with regulation.'
                      : 'Specify discrepancy: e.g. Missing joint lien endorsement or branch seal.'
                  }
                />
              </label>

              <div className="form-note">
                <ShieldCheck size={16} />
                <span>
                  This decision will be immutably recorded in the verification history with your
                  officer ID and timestamp.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowVerifyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Record Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENEWAL / REPLACEMENT */}
      {showRenewModal && recordToAct && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setShowRenewModal(false)}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">LIFECYCLE MANAGEMENT</div>
                <h2>Renew FDR {recordToAct.fdr_number}</h2>
                <p>Register replacement certificate for {recordToAct.institution_name}</p>
              </div>
              <button className="icon-btn" onClick={() => setShowRenewModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleRenewFDR}>
              <div className="form-row">
                <label>
                  New FDR Number
                  <input
                    required
                    value={renewForm.new_fdr_number}
                    onChange={(e) =>
                      setRenewForm({ ...renewForm, new_fdr_number: e.target.value })
                    }
                    placeholder="New certificate reference"
                  />
                </label>

                <label>
                  Issuing Bank
                  <input
                    required
                    value={renewForm.bank_name}
                    onChange={(e) => setRenewForm({ ...renewForm, bank_name: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Renewed Amount (₹)
                  <input
                    required
                    type="number"
                    min="1"
                    value={renewForm.amount}
                    onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
                  />
                </label>

                <label>
                  Interest Rate (%)
                  <input
                    type="number"
                    step="0.01"
                    value={renewForm.interest_rate}
                    onChange={(e) =>
                      setRenewForm({ ...renewForm, interest_rate: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  New Issue Date
                  <input
                    type="date"
                    required
                    value={renewForm.issue_date}
                    onChange={(e) => setRenewForm({ ...renewForm, issue_date: e.target.value })}
                  />
                </label>

                <label>
                  New Maturity Date
                  <input
                    type="date"
                    required
                    value={renewForm.maturity_date}
                    onChange={(e) => setRenewForm({ ...renewForm, maturity_date: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Renewal justification / notes
                <input
                  value={renewForm.remarks}
                  onChange={(e) => setRenewForm({ ...renewForm, remarks: e.target.value })}
                  placeholder="e.g. Rollover of principal and accrued interest"
                />
              </label>

              <div className="form-note">
                <RefreshCw size={16} />
                <span>
                  The previous FDR ({recordToAct.fdr_number}) will be archived as
                  <b>Renewed</b> and securely linked to this new instrument.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRenewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RELEASE REQUEST */}
      {showReleaseModal && recordToAct && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setShowReleaseModal(false)}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">SECURITY DEPOSIT REFUND</div>
                <h2>Request Release of Deposit</h2>
                <p>
                  {recordToAct.fdr_number} · {recordToAct.institution_name}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowReleaseModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleRequestRelease}>
              <label>
                Justification for Release / Discharge
                <textarea
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid #dce5eb',
                    borderRadius: 7,
                    padding: 8,
                    fontSize: 11,
                  }}
                  value={releaseForm.reason}
                  onChange={(e) => setReleaseForm({ ...releaseForm, reason: e.target.value })}
                  placeholder="e.g. Mandatory 10-year lock-in completed; closure approval granted by Council."
                />
              </label>

              <label>
                Beneficiary refund bank account details
                <input
                  value={releaseForm.beneficiary_account}
                  onChange={(e) =>
                    setReleaseForm({ ...releaseForm, beneficiary_account: e.target.value })
                  }
                  placeholder="A/C number, Bank name, IFSC code, Account title"
                />
              </label>

              <div className="form-note">
                <ShieldCheck size={16} />
                <span>
                  Request will be routed to the AICTE Competent Authority for review. Funds will
                  only be discharged after official verification.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReleaseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Submit Release Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN EDIT FDR */}
      {showEditModal && recordToAct && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">ADMINISTRATIVE CORRECTION</div>
                <h2>Edit FDR {recordToAct.fdr_number}</h2>
                <p>Modify record fields under administrative privilege.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleEditFDR}>
              <label>
                Institution Name
                <input
                  required
                  value={editForm.institution_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, institution_name: e.target.value })
                  }
                />
              </label>

              <div className="form-row">
                <label>
                  Bank Name
                  <input
                    required
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                  />
                </label>

                <label>
                  Amount (₹)
                  <input
                    required
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Issue Date
                  <input
                    type="date"
                    required
                    value={editForm.issue_date}
                    onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                  />
                </label>

                <label>
                  Maturity Date
                  <input
                    type="date"
                    required
                    value={editForm.maturity_date}
                    onChange={(e) => setEditForm({ ...editForm, maturity_date: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Interest Rate (%)
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.interest_rate}
                    onChange={(e) => setEditForm({ ...editForm, interest_rate: e.target.value })}
                  />
                </label>
                <label>
                  Remarks
                  <input
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {notice.text && (
        <div className={`toast ${notice.type === 'danger' ? 'icon-red' : ''}`}>
          {notice.type === 'danger' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}

// Reusable Components
function Stat({ title, value, note, icon: Icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function Lifecycle({ label, count, total, color }) {
  return (
    <div className="lifecycle-row">
      <div className="lifecycle-label">
        <span>{label}</span>
        <b>{count}</b>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${color}`}
          style={{
            width: `${total ? Math.max((count / total) * 100, count ? 4 : 0) : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function RecordsPanel({
  records,
  onView,
  onAll,
  statusClass,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  bankFilter,
  setBankFilter,
  ordering,
  setOrdering,
  full = false,
  loading = false,
  emptyTitle,
  emptySub,
  onAdd,
}) {
  return (
    <section className="panel records-panel">
      <div className="panel-head records-head">
        <div>
          <h2>{full ? 'Security Deposit Instrument Records' : 'Recent Submissions'}</h2>
          <p>
            {full
              ? 'Complete repository with search, multi-field filtering and verification history'
              : 'Latest submissions across participating institutions'}
          </p>
        </div>
        {!full && (
          <button className="text-button" onClick={onAll}>
            View all records <ArrowUpRight size={15} />
          </button>
        )}
      </div>

      {full && (
        <div className="table-toolbar no-print">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search by institution, FDR reference, or bank..."
              value={query || ''}
              onChange={(e) => setQuery?.(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div className="filter-wrap">
              <Filter size={15} />
              <select
                value={statusFilter || 'All statuses'}
                onChange={(e) => setStatusFilter?.(e.target.value)}
              >
                <option>All statuses</option>
                <option>Active</option>
                <option>Matured</option>
                <option>Renewal required</option>
                <option>Pending verification</option>
                <option>Discrepancy detected</option>
                <option>Verified</option>
                <option>Released</option>
              </select>
            </div>

            {setBankFilter && (
              <div className="filter-wrap">
                <Building2 size={15} />
                <select
                  value={bankFilter || 'All banks'}
                  onChange={(e) => setBankFilter?.(e.target.value)}
                >
                  <option>All banks</option>
                  <option>State Bank of India</option>
                  <option>Canara Bank</option>
                  <option>Federal Bank</option>
                  <option>HDFC Bank</option>
                  <option>Union Bank of India</option>
                  <option>Punjab National Bank</option>
                  <option>Bank of Baroda</option>
                </select>
              </div>
            )}

            {setOrdering && (
              <div className="filter-wrap">
                <select
                  value={ordering || '-created_at'}
                  onChange={(e) => setOrdering?.(e.target.value)}
                >
                  <option value="-created_at">Sort: Newest First</option>
                  <option value="maturity_date">Sort: Maturity (Earliest)</option>
                  <option value="-amount">Sort: Amount (Highest)</option>
                  <option value="amount">Sort: Amount (Lowest)</option>
                  <option value="institution_name">Sort: Institution Name</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>INSTRUMENT / INSTITUTION</th>
              <th>AMOUNT</th>
              <th>MATURITY DATE</th>
              <th>VERIFICATION</th>
              <th>STATUS</th>
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const days = dayDiff(r.maturity_date);
              return (
                <tr key={r.id} onClick={() => onView(r)}>
                  <td>
                    <div className="instrument-cell">
                      <div className="file-icon">
                        <FileText size={17} />
                      </div>
                      <div>
                        <b>{r.fdr_number}</b>
                        <span>
                          {r.institution_name} · {r.bank_name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="amount-cell">{money(r.amount)}</td>
                  <td>
                    <div className="date-cell">
                      {new Date(r.maturity_date + 'T12:00:00').toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <span>
                        {days < 0
                          ? `${Math.abs(days)} days overdue`
                          : days === 0
                          ? 'Matures today'
                          : `${days} days left`}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${statusClass(r.verification_status)}`}>
                      <i />
                      {r.verification_status}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${statusClass(r.status)}`}>
                      <i />
                      {r.status}
                    </span>
                  </td>
                  <td className="no-print">
                    <button className="row-more" aria-label="View record">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {records.length === 0 && !loading && (
              <tr>
                <td colSpan="6">
                  <div className="no-results">
                    <Search size={22} />
                    <b>{emptyTitle || 'No matching instruments found'}</b>
                    <span>
                      {emptySub || 'Try adjusting your search criteria, filters, or add a new FDR.'}
                    </span>
                    {onAdd && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 10 }}
                        onClick={onAdd}
                      >
                        <Plus size={14} /> Add new FDR
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {loading && records.length === 0 && (
              <tr>
                <td colSpan="6">
                  <div style={{ textAlign: 'center', padding: '35px', color: '#64748b' }}>
                    <div className="loader-spinner" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 11 }}>Synchronizing with FDR database...</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-bottom no-print">
        <span>
          Showing <b>{records.length}</b> record{records.length === 1 ? '' : 's'} · Connected to
          Django SQLite Backend
        </span>
        <span>Click any row to open full instrument dossier & lifecycle controls</span>
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
