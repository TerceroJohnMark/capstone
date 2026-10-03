import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, addDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTjXNz-NIsV_8YtVbN1QHxxsKBKMB1NG0",
  authDomain: "capstonecomplaints-31b4e.firebaseapp.com",
  projectId: "capstonecomplaints-31b4e",
  storageBucket: "capstonecomplaints-31b4e.firebasestorage.app",
  messagingSenderId: "13932350614",
  appId: "1:13932350614:web:299b07b3e89b83b3b0c6b7"
};

// Admin Email set to your school account
const ADMIN_EMAIL = "2320801@ub.edu.ph";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmailSpan = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");
const adminTableBody = document.getElementById("adminTableBody");
const searchInput = document.getElementById("searchInput");
const deptFilter = document.getElementById("deptFilter");
const userTypeFilter = document.getElementById("userTypeFilter");
const statusFilter = document.getElementById("statusFilter");
const timeFilter = document.getElementById("timeFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const exportCsvBtn = document.getElementById("exportCsvBtn");

// Notification Elements
const notifBtn = document.getElementById("notifBtn");
const notifDropdown = document.getElementById("notifDropdown");
const notifBadge = document.getElementById("notifBadge");
const notifList = document.getElementById("notifList");
const markAllReadBtn = document.getElementById("markAllReadBtn");

let allComplaints = [];
let currentAdminEmail = "";

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.email !== ADMIN_EMAIL) {
      alert("Unauthorized access. Logged-in email does not match admin credentials.");
      window.location.href = "student.html";
      return;
    }
    currentAdminEmail = user.email;
    adminEmailSpan.textContent = user.email;
    loadAllComplaints();
    loadAdminNotifications();
  } else {
    window.location.href = "index.html";
  }
});

logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

// Toggle Notification Dropdown
notifBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  notifDropdown.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  notifDropdown.classList.add("hidden");
});

notifDropdown.addEventListener("click", (e) => {
  e.stopPropagation();
});

async function loadAllComplaints() {
  adminTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Loading database records...</td></tr>`;
  try {
    const querySnapshot = await getDocs(collection(db, "complaints"));
    allComplaints = [];
    querySnapshot.forEach((docSnap) => {
      allComplaints.push({ id: docSnap.id, ...docSnap.data() });
    });
    updateStatistics();
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error loading records:", error);
  }
}

async function loadAdminNotifications() {
  try {
    const q = query(collection(db, "notifications"), where("recipient", "==", ADMIN_EMAIL));
    const snapshot = await getDocs(q);
    let notifs = [];
    snapshot.forEach(docSnap => {
      notifs.push({ id: docSnap.id, ...docSnap.data() });
    });

    notifs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    notifList.innerHTML = "";
    const unreadCount = notifs.filter(n => !n.read).length;

    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount;
      notifBadge.classList.remove("hidden");
    } else {
      notifBadge.classList.add("hidden");
    }

    if (notifs.length === 0) {
      notifList.innerHTML = `<div class="p-4 text-center text-slate-400">No notifications</div>`;
      return;
    }

    notifs.forEach(n => {
      const item = document.createElement("div");
      item.className = `p-3 transition ${n.read ? 'bg-white text-slate-600' : 'bg-blue-50/60 text-slate-900 font-medium'}`;
      item.innerHTML = `
        <p class="text-xs">${escapeHtml(n.message)}</p>
        <span class="text-[10px] text-slate-400 mt-1 block">${n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
      `;
      notifList.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

markAllReadBtn.addEventListener("click", async () => {
  try {
    const q = query(collection(db, "notifications"), where("recipient", "==", ADMIN_EMAIL), where("read", "==", false));
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(d => updateDoc(doc(db, "notifications", d.id), { read: true }));
    await Promise.all(updatePromises);
    loadAdminNotifications();
  } catch (err) {
    console.error("Failed to mark notifications read:", err);
  }
});

function updateStatistics() {
  document.getElementById("statTotal").textContent = allComplaints.length;
  document.getElementById("statPending").textContent = allComplaints.filter(c => (c.status || "Pending") === "Pending").length;
  document.getElementById("statInProg").textContent = allComplaints.filter(c => c.status === "In Progress").length;
  document.getElementById("statResolved").textContent = allComplaints.filter(c => c.status === "Resolved").length;
}

function applyFiltersAndRender() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedDept = deptFilter.value;
  const selectedUserType = userTypeFilter.value;
  const selectedStatus = statusFilter.value;
  const selectedTime = timeFilter.value;
  const now = new Date();

  let filtered = allComplaints.filter(complaint => {
    const title = (complaint.title || "").toLowerCase();
    const desc = (complaint.description || "").toLowerCase();
    const submitter = (complaint.submittedBy || complaint.email || complaint.studentEmail || "").toLowerCase();
    
    const matchesSearch = !searchTerm || title.includes(searchTerm) || desc.includes(searchTerm) || submitter.includes(searchTerm);
    const matchesDept = selectedDept === "all" || complaint.department === selectedDept;
    const matchesUserType = selectedUserType === "all" || complaint.userType === selectedUserType;
    const matchesStatus = selectedStatus === "all" || complaint.status === selectedStatus;
    let matchesTime = true;
    if (complaint.createdAt?.toDate) {
      const complaintDate = complaint.createdAt.toDate();
      if (selectedTime === "today") {
        matchesTime = complaintDate.toDateString() === now.toDateString();
      } else if (selectedTime === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = complaintDate >= weekAgo;
      } else if (selectedTime === "month") {
        matchesTime = complaintDate.getMonth() === now.getMonth() && complaintDate.getFullYear() === now.getFullYear();
      }
    }
    return matchesSearch && matchesDept && matchesUserType && matchesStatus && matchesTime;
  });
  renderTable(filtered);
}

function renderTable(complaints) {
  adminTableBody.innerHTML = "";
  if (complaints.length === 0) {
    adminTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">No records match your filters.</td></tr>`;
    return;
  }
  complaints.forEach((data) => {
    const id = data.id;
    const dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "Just now";
    const priorityColor = data.priority === 'High' ? 'text-red-600 bg-red-50' : (data.priority === 'Medium' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50');
    const submitterEmail = data.submittedBy || data.email || data.studentEmail || "";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4">
        <strong class="text-slate-900">${escapeHtml(data.title || "Untitled")}</strong>
        <p class="text-xs text-slate-500 line-clamp-1">${escapeHtml(data.description || "")}</p>
        <p class="text-[11px] text-blue-600 font-medium mt-0.5">By: ${escapeHtml(submitterEmail || "Unknown")}</p>
      </td>
      <td class="p-4">
        <span class="block text-xs font-semibold text-slate-800">${escapeHtml(data.userType || "Student")} (${escapeHtml(data.yearLevel || "N/A")})</span>
        <span class="text-xs text-slate-500">${escapeHtml(data.department || "General")}</span>
      </td>
      <td class="p-4">
        <span class="block text-xs text-slate-700">${escapeHtml(data.category || "General")}</span>
        <span class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${priorityColor}">${escapeHtml(data.priority || "Medium")}</span>
      </td>
      <td class="p-4 text-xs text-slate-500">${dateStr}</td>
      <td class="p-4">
        <select data-id="${id}" data-email="${escapeHtml(submitterEmail)}" data-title="${escapeHtml(data.title || "Campus Report")}" data-category="${escapeHtml(data.category || "General")}" class="status-select border rounded px-2 py-1 text-xs font-medium ${data.status === 'Resolved' ? 'bg-green-50 text-green-700' : (data.status === 'In Progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}">
          <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${data.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${data.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
      </td>
      <td class="p-4">
        <button data-id="${id}" class="delete-btn bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-medium">Delete</button>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  document.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const selectEl = e.target;
      const docId = selectEl.getAttribute("data-id");
      const recipientEmail = selectEl.getAttribute("data-email");
      const reportTitle = selectEl.getAttribute("data-title");
      const reportCategory = selectEl.getAttribute("data-category");
      const newStatus = selectEl.value;
      
      const customRemark = prompt(
        `Enter a resolution note or action remark for this status update (${newStatus}):`, 
        `Your report status has been updated to ${newStatus} by the admin office.`
      );

      if (customRemark === null) {
        loadAllComplaints();
        return;
      }

      try {
        await updateDoc(doc(db, "complaints", docId), { 
          status: newStatus,
          resolutionNote: customRemark,
          updatedAt: new Date()
        });

        if (recipientEmail) {
          await addDoc(collection(db, "notifications"), {
            recipient: recipientEmail,
            message: `Your report "${reportTitle}" was updated to ${newStatus}.`,
            read: false,
            createdAt: serverTimestamp()
          });
        }

        emailjs.send("service_7n02kkx", "template_nku052t", {
          to_email: recipientEmail,
          to: recipientEmail,
          email: recipientEmail,
          title: reportTitle,
          category: reportCategory,
          status: newStatus,
          message: customRemark
        }).then(() => {
          alert(`Status updated to "${newStatus}" and email notification sent successfully!`);
        }).catch((emailErr) => {
          console.error("Failed to send email:", emailErr);
        });

        loadAllComplaints();
      } catch (err) {
        console.error(err);
        alert("Failed to update status.");
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const docId = e.target.getAttribute("data-id");
      if (confirm("Delete this report permanently?")) {
        try {
          await deleteDoc(doc(db, "complaints", docId));
          loadAllComplaints();
        } catch (err) {
          alert("Failed to delete record.");
        }
      }
    });
  });
}

[searchInput, deptFilter, userTypeFilter, statusFilter, timeFilter].forEach(el => {
  const evt = el.tagName === "INPUT" ? "input" : "change";
  el.addEventListener(evt, applyFiltersAndRender);
});

clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  deptFilter.value = "all";
  userTypeFilter.value = "all";
  statusFilter.value = "all";
  timeFilter.value = "all";
  applyFiltersAndRender();
});

exportCsvBtn.addEventListener("click", () => {
  if (allComplaints.length === 0) {
    alert("No records to export.");
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,Title,UserType,YearLevel,Department,Category,Priority,Status,Date\n";
  allComplaints.forEach(c => {
    let row = [
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${c.userType || ""}"`,
      `"${c.yearLevel || ""}"`,
      `"${c.department || ""}"`,
      `"${c.category || ""}"`,
      `"${c.priority || ""}"`,
      `"${c.status || ""}"`,
      `"${c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : ""}"`
    ].join(",");
    csvContent += row + "\r\n";
  });
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "campus_reports_detailed.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

function escapeHtml(str) {
  return str.replace(/[&<>'"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}