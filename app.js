// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTjXNz-NIsV_8YtVbN1QHxxsKBKMB1NG0",
  authDomain: "capstonecomplaints-31b4e.firebaseapp.com",
  projectId: "capstonecomplaints-31b4e",
  storageBucket: "capstonecomplaints-31b4e.firebasestorage.app",
  messagingSenderId: "13932350614",
  appId: "1:13932350614:web:299b07b3e89b83b3b0c6b7"
};

const ADMIN_EMAIL = "john.admin@gmail.com";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements - Auth & Screens
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const userEmailSpan = document.getElementById("userEmail");

const loginBtn = document.getElementById("loginBtn");
const toggleAuthMode = document.getElementById("toggleAuthMode");
const authToggleText = document.getElementById("authToggleText");
const loginCardTitle = document.querySelector(".login-card h1");
let isSignUpMode = false;
let allComplaints = []; 
let editingDocId = null; 

if (toggleAuthMode) {
  toggleAuthMode.addEventListener("click", (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
      if (loginCardTitle) loginCardTitle.textContent = "Create account";
      if (loginBtn) loginBtn.textContent = "Sign Up";
      if (authToggleText) authToggleText.textContent = "Already have an account?";
      toggleAuthMode.textContent = "Sign in";
    } else {
      if (loginCardTitle) loginCardTitle.textContent = "Welcome back";
      if (loginBtn) loginBtn.textContent = "Sign In";
      if (authToggleText) authToggleText.textContent = "Don't have an account?";
      toggleAuthMode.textContent = "Create account";
    }
    if (loginError) loginError.textContent = "";
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loginScreen) loginScreen.classList.add("hidden");
    if (appScreen) appScreen.classList.remove("hidden");
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    const isAdmin = user.email === ADMIN_EMAIL;
    loadComplaints(isAdmin);
  } else {
    if (loginScreen) loginScreen.classList.remove("hidden");
    if (appScreen) appScreen.classList.add("hidden");
    if (userEmailSpan) userEmailSpan.textContent = "User";
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = "";
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      if (loginError) loginError.textContent = error.message;
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  });
}

// DOM Elements - Dashboard & Modals
const loadingEl = document.getElementById("loading");
const emptyStateEl = document.getElementById("emptyState");
const complaintTable = document.getElementById("complaintTable");
const recordCountEl = document.getElementById("recordCount");
const footerCountEl = document.getElementById("footerCount");
const complaintModal = document.getElementById("complaintModal");
const openAddModalBtn = document.getElementById("openAddModal");
const closeModalBtn = document.getElementById("closeModal");
const cancelModalBtn = document.getElementById("cancelModal");
const complaintForm = document.getElementById("complaintForm");
const refreshBtn = document.getElementById("refreshBtn");
const clearFiltersBtn = document.getElementById("clearFilters");
const exportCsvBtn = document.getElementById("exportCsvBtn");

// Filter DOM Elements
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortSelect");

if (openAddModalBtn) {
  openAddModalBtn.addEventListener("click", () => {
    editingDocId = null;
    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.textContent = "Submit New Complaint";
    if (complaintForm) complaintForm.reset();
    if (complaintModal) complaintModal.classList.add("show");
  });
}

if (closeModalBtn) closeModalBtn.addEventListener("click", () => complaintModal.classList.remove("show"));
if (cancelModalBtn) cancelModalBtn.addEventListener("click", () => complaintModal.classList.remove("show"));

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    const currentUser = auth.currentUser;
    loadComplaints(currentUser && currentUser.email === ADMIN_EMAIL);
  });
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "all";
    if (priorityFilter) priorityFilter.value = "all";
    if (statusFilter) statusFilter.value = "all";
    if (sortFilter) sortFilter.value = "newest";
    const currentUser = auth.currentUser;
    applyFiltersAndRender(currentUser && currentUser.email === ADMIN_EMAIL);
  });
}

if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    if (allComplaints.length === 0) {
      alert("No complaints available to export.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Title,Category,Priority,Status,SubmittedBy\n";
    allComplaints.forEach(c => {
      let row = [
        `"${(c.title || "").replace(/"/g, '""')}"`,
        `"${c.category || ""}"`,
        `"${c.priority || ""}"`,
        `"${c.status || ""}"`,
        `"${c.submittedBy || ""}"`
      ].join(",");
      csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "campus_reports_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

if (complaintForm) {
  complaintForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById("complaintTitle");
    const categoryInput = document.getElementById("complaintCategory");
    const priorityInput = document.getElementById("complaintPriority");
    const descriptionInput = document.getElementById("complaintDescription");
    const statusInput = document.getElementById("complaintStatus");
    
    const currentUser = auth.currentUser;

    const complaintData = {
      title: titleInput ? titleInput.value.trim() : "",
      category: categoryInput ? categoryInput.value : "Facilities",
      priority: priorityInput ? priorityInput.value : "Medium",
      description: descriptionInput ? descriptionInput.value.trim() : "",
      status: statusInput ? statusInput.value : "Pending",
      submittedBy: currentUser ? currentUser.email : "Anonymous"
    };

    try {
      if (editingDocId) {
        complaintData.updatedAt = serverTimestamp();
        await updateDoc(doc(db, "complaints", editingDocId), complaintData);
      } else {
        complaintData.createdAt = serverTimestamp();
        await addDoc(collection(db, "complaints"), complaintData);
      }
      
      if (complaintModal) complaintModal.classList.remove("show");
      complaintForm.reset();
      editingDocId = null;
      
      loadComplaints(currentUser && currentUser.email === ADMIN_EMAIL);
    } catch (error) {
      console.error("Error saving complaint:", error);
      alert("Failed to save complaint: " + error.message);
    }
  });
}

async function loadComplaints(isAdmin = false) {
  if (loadingEl) loadingEl.style.display = "block";
  if (complaintTable) complaintTable.innerHTML = "";
  
  try {
    const querySnapshot = await getDocs(collection(db, "complaints"));
    allComplaints = [];
    querySnapshot.forEach((docSnap) => {
      allComplaints.push({ id: docSnap.id, ...docSnap.data() });
    });
    updateStatistics();
    applyFiltersAndRender(isAdmin);
  } catch (error) {
    console.error("Error loading complaints:", error);
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

function updateStatistics() {
  const total = allComplaints.length;
  const pending = allComplaints.filter(c => (c.status || "Pending").toLowerCase() === "pending").length;
  const inProgress = allComplaints.filter(c => (c.status || "").toLowerCase() === "in progress").length;
  const resolved = allComplaints.filter(c => (c.status || "").toLowerCase() === "resolved").length;

  if (document.getElementById("statTotal")) document.getElementById("statTotal").textContent = total;
  if (document.getElementById("statPending")) document.getElementById("statPending").textContent = pending;
  if (document.getElementById("statInProgress")) document.getElementById("statInProgress").textContent = inProgress;
  if (document.getElementById("statResolved")) document.getElementById("statResolved").textContent = resolved;
}

function applyFiltersAndRender(isAdmin) {
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCategory = categoryFilter ? categoryFilter.value : "all";
  const selectedPriority = priorityFilter ? priorityFilter.value : "all";
  const selectedStatus = statusFilter ? statusFilter.value : "all";
  const selectedSort = sortFilter ? sortFilter.value : "newest";

  let filtered = allComplaints.filter(complaint => {
    const title = (complaint.title || "").toLowerCase();
    const description = (complaint.description || "").toLowerCase();
    const category = (complaint.category || "").toLowerCase();
    const priority = (complaint.priority || "").toLowerCase();
    const status = (complaint.status || "").toLowerCase();
    const submitter = (complaint.submittedBy || "").toLowerCase();

    const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm) || submitter.includes(searchTerm);
    const matchesCategory = selectedCategory === "all" || category === selectedCategory.toLowerCase();
    const matchesPriority = selectedPriority === "all" || priority === selectedPriority.toLowerCase();
    const matchesStatus = selectedStatus === "all" || status === selectedStatus.toLowerCase();

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  filtered.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return selectedSort === "oldest" ? timeA - timeB : timeB - timeA;
  });

  renderTable(filtered, isAdmin);
}

[searchInput, categoryFilter, priorityFilter, statusFilter, sortFilter].forEach(element => {
  if (element) {
    const eventType = element.tagName === "INPUT" ? "input" : "change";
    element.addEventListener(eventType, () => {
      const currentUser = auth.currentUser;
      applyFiltersAndRender(currentUser && currentUser.email === ADMIN_EMAIL);
    });
  }
});

function renderTable(complaints, isAdmin) {
  if (!complaintTable) return;
  complaintTable.innerHTML = "";
  
  if (recordCountEl) recordCountEl.textContent = `${complaints.length} complaints`;
  if (footerCountEl) footerCountEl.textContent = `${complaints.length} complaints`;
  
  if (complaints.length === 0) {
    if (emptyStateEl) emptyStateEl.style.display = "block";
    return;
  } else {
    if (emptyStateEl) emptyStateEl.style.display = "none";
  }

  complaints.forEach((complaint) => {
    const tr = document.createElement("tr");
    const priorityClass = `priority-${(complaint.priority || 'medium').toLowerCase()}`;
    const statusClass = (complaint.status || 'pending').toLowerCase().replace(/\s+/g, '-');
    const isOwnerOrAdmin = isAdmin || (auth.currentUser && auth.currentUser.email === complaint.submittedBy);

    tr.innerHTML = `
      <td class="px-6 py-4">
        <strong class="text-gray-900 block">${escapeHtml(complaint.title || "Untitled")}</strong>
        <p class="text-gray-500 text-xs mt-0.5 line-clamp-1">${escapeHtml(complaint.description || "")}</p>
        <span class="text-gray-400 text-[11px]">By: ${escapeHtml(complaint.submittedBy || "Anonymous")}</span>
      </td>
      <td class="px-6 py-4 text-gray-600">${escapeHtml(complaint.category || "General")}</td>
      <td class="px-6 py-4"><span class="status ${priorityClass}">${escapeHtml(complaint.priority || "Medium")}</span></td>
      <td class="px-6 py-4"><span class="status ${statusClass}">${escapeHtml(complaint.status || "Pending")}</span></td>
      <td class="px-6 py-4">
        ${isOwnerOrAdmin ? `
          <div class="flex space-x-2">
            <button class="action edit edit-btn" data-id="${complaint.id}">Edit</button>
            <button class="action delete delete-btn" data-id="${complaint.id}">Delete</button>
          </div>
        ` : `<span class="text-gray-400 text-xs">View Only</span>`}
      </td>
    `;
    complaintTable.appendChild(tr);
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const docId = e.target.getAttribute("data-id");
      const complaintToEdit = allComplaints.find(c => c.id === docId);
      
      if (complaintToEdit) {
        editingDocId = docId;
        const modalTitle = document.getElementById("modalTitle");
        if (modalTitle) modalTitle.textContent = "Edit Complaint";
        
        document.getElementById("complaintTitle").value = complaintToEdit.title || "";
        document.getElementById("complaintCategory").value = complaintToEdit.category || "Facilities";
        document.getElementById("complaintPriority").value = complaintToEdit.priority || "Medium";
        document.getElementById("complaintDescription").value = complaintToEdit.description || "";
        document.getElementById("complaintStatus").value = complaintToEdit.status || "Pending";
        
        if (complaintModal) complaintModal.classList.add("show");
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const docId = e.target.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this complaint?")) {
        try {
          await deleteDoc(doc(db, "complaints", docId));
          loadComplaints(isAdmin);
        } catch (error) {
          console.error("Error deleting complaint:", error);
          alert("Failed to delete complaint.");
        }
      }
    });
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}