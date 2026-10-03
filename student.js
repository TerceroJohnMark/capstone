import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Conversation } from "https://esm.sh/@elevenlabs/client";

// ======================================================
// FIREBASE CONFIG
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyCTjXNz-NIsV_8YtVbN1QHxxsKBKMB1NG0",
  authDomain: "capstonecomplaints-31b4e.firebaseapp.com",
  projectId: "capstonecomplaints-31b4e",
  storageBucket: "capstonecomplaints-31b4e.firebasestorage.app",
  messagingSenderId: "13932350614",
  appId: "1:13932350614:web:299b07b3e89b83b3b0c6b7"
};

const ADMIN_EMAIL = "2320801@ub.edu.ph";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ======================================================
// DOM ELEMENTS
// ======================================================
const bannerEmail = document.getElementById("bannerEmail");
const logoutBtn = document.getElementById("logoutBtn");
const complaintList = document.getElementById("complaintList");
const searchMyReports = document.getElementById("searchMyReports");
const tabBtns = document.querySelectorAll(".tab-btn");

// ======================================================
// COMPLAINT MODAL
// ======================================================
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const complaintModal = document.getElementById("complaintModal");
const complaintForm = document.getElementById("complaintForm");

// ======================================================
// PROFILE MODAL
// ======================================================
const openProfileBtn = document.getElementById("openProfileBtn");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const closeProfileModalBtn = document.getElementById("closeProfileModalBtn");
const profileModal = document.getElementById("profileModal");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");

// ======================================================
// AI HANDBOOK CHAT
// ======================================================
const aiChatModal = document.getElementById("aiChatModal");
const openAiModalBtn = document.getElementById("openAiModalBtn");
const closeAiModal = document.getElementById("closeAiModal");
const aiChatForm = document.getElementById("aiChatForm");
const aiChatInput = document.getElementById("aiChatInput");
const aiChatMessages = document.getElementById("aiChatMessages");

// ======================================================
// NOTIFICATIONS
// ======================================================
const notifBtn = document.getElementById("notifBtn");
const notifDropdown = document.getElementById("notifDropdown");
const notifBadge = document.getElementById("notifBadge");
const notifList = document.getElementById("notifList");
const markAllReadBtn = document.getElementById("markAllReadBtn");

// ======================================================
// GLOBAL VARIABLES
// ======================================================
let myComplaints = [];
let currentFilter = "all";
let currentUserEmail = "";
let conversation = null;

// ======================================================
// AUTHENTICATION
// ======================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserEmail = user.email;
    if (bannerEmail) {
      bannerEmail.textContent = `Logged in as ${user.email}`;
    }
    if (profileEmailDisplay) {
      profileEmailDisplay.textContent = user.email;
    }
    loadStudentComplaints(user.email);
    loadStudentNotifications(user.email);
  } else {
    window.location.href = "index.html";
  }
});

// ======================================================
// LOGOUT
// ======================================================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      if (conversation) {
        try {
          await conversation.endSession();
        } catch (error) {
          console.warn("Error closing ElevenLabs session:", error);
        }
        conversation = null;
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}

// ======================================================
// NOTIFICATION DROPDOWN
// ======================================================
if (notifBtn) {
  notifBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle("hidden");
  });
}

document.addEventListener("click", () => {
  if (notifDropdown) {
    notifDropdown.classList.add("hidden");
  }
});

if (notifDropdown) {
  notifDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// ======================================================
// COMPLAINT MODAL
// ======================================================
if (openModalBtn) {
  openModalBtn.addEventListener("click", () => {
    complaintModal.classList.remove("hidden");
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    complaintModal.classList.add("hidden");
  });
}

if (cancelModalBtn) {
  cancelModalBtn.addEventListener("click", () => {
    complaintModal.classList.add("hidden");
  });
}

// ======================================================
// PROFILE MODAL
// ======================================================
if (openProfileBtn) {
  openProfileBtn.addEventListener("click", () => {
    profileModal.classList.remove("hidden");
  });
}

if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    profileModal.classList.add("hidden");
  });
}

if (closeProfileModalBtn) {
  closeProfileModalBtn.addEventListener("click", () => {
    profileModal.classList.add("hidden");
  });
}

// ======================================================
// ELEVENLABS AI HANDBOOK
// ======================================================
if (openAiModalBtn) {
  openAiModalBtn.addEventListener("click", async () => {
    aiChatModal.classList.remove("hidden");
    console.log("AI Handbook opened.");
    if (!conversation) {
      await initAiConversation();
    }
  });
}

// ======================================================
// CLOSE AI CHAT
// ======================================================
if (closeAiModal) {
  closeAiModal.addEventListener("click", async () => {
    aiChatModal.classList.add("hidden");
    if (conversation) {
      try {
        await conversation.endSession();
        console.log("ElevenLabs session ended.");
      } catch (error) {
        console.error("Error ending ElevenLabs session:", error);
      }
      conversation = null;
    }
  });
}

// ======================================================
// START ELEVENLABS CONVERSATION
// ======================================================
async function initAiConversation() {
  if (conversation) {
    console.log("ElevenLabs is already connected.");
    return;
  }
  try {
    console.log("Connecting to ElevenLabs...");
    conversation = await Conversation.startSession({
      agentId: "agent_3601m3ywvfb2f5ttrzw4rc32x031",
      connectionType: "websocket",
      overrides: {
        conversation: {
          text_only: true
        }
      },
      onConnect: () => {
        console.log("ElevenLabs connected successfully.");
      },
      onDisconnect: (details) => {
        console.warn("ElevenLabs disconnected:", details);
        conversation = null;
      },
      onMessage: (message) => {
        console.log("ElevenLabs message:", message);
        if (
          message &&
          typeof message.message === "string" &&
          message.message.trim() !== ""
        ) {
          appendAiMessage("AI", message.message);
        }
      },
      onError: (error) => {
        console.error("ElevenLabs conversation error:", error);
        conversation = null;
      }
    });
    console.log("ElevenLabs conversation started.");
  } catch (error) {
    console.error("Failed to connect to ElevenLabs:", error);
    conversation = null;
    appendAiMessage("AI", "Sorry, I could not connect to the handbook assistant. Please try again.");
  }
}

// ======================================================
// AI CHAT FORM
// ======================================================
if (aiChatForm) {
  aiChatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = aiChatInput.value.trim();
    if (!text) {
      return;
    }
    appendAiMessage("You", text);
    aiChatInput.value = "";
    try {
      if (!conversation) {
        console.log("No active ElevenLabs connection. Reconnecting...");
        await initAiConversation();
      }
      if (conversation) {
        console.log("Sending message to ElevenLabs:", text);
        await conversation.sendUserMessage(text);
      } else {
        appendAiMessage("AI", "The handbook assistant is currently unavailable. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send message to ElevenLabs:", error);
      conversation = null;
      appendAiMessage("AI", "Sorry, there was a connection problem. Please try again.");
    }
  });
}

// ======================================================
// DISPLAY AI MESSAGE
// ======================================================
function appendAiMessage(sender, text) {
  if (!aiChatMessages) {
    return;
  }
  const isUser = sender === "You";
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = `flex items-start space-x-3 ${isUser ? "justify-end" : ""}`;

  if (isUser) {
    bubbleDiv.innerHTML = `
      <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-xs shadow-xs max-w-[85%] text-sm leading-relaxed">
        ${escapeHtml(text)}
      </div>
      <div class="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
        You
      </div>
    `;
  } else {
    bubbleDiv.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
        AI
      </div>
      <div class="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-xs shadow-xs text-slate-700 max-w-[85%] text-sm leading-relaxed">
        ${escapeHtml(text)}
      </div>
    `;
  }
  aiChatMessages.appendChild(bubbleDiv);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// ======================================================
// COMPLAINT FORM SUBMISSION
// ======================================================
if (complaintForm) {
  complaintForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("cTitle").value;
    const userType = document.getElementById("cUserType").value;
    const yearLevel = document.getElementById("cYearLevel").value;
    const department = document.getElementById("cDepartment").value;
    const category = document.getElementById("cCategory").value;
    const priority = document.getElementById("cPriority").value;
    const description = document.getElementById("cDescription").value;

    try {
      await addDoc(collection(db, "complaints"), {
        title,
        userType,
        yearLevel,
        department,
        category,
        priority,
        description,
        status: "Pending",
        submittedBy: currentUserEmail,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        recipient: ADMIN_EMAIL,
        message: `New report submitted: "${title}" by ${currentUserEmail}`,
        read: false,
        createdAt: serverTimestamp()
      });

      if (window.emailjs) {
        window.emailjs.send("service_7n02kkx", "template_wjikfyd", {
          to_email: currentUserEmail,
          title,
          category,
          priority,
          status: "Pending",
          description
        }).catch((error) => {
          console.error("Failed to send email:", error);
        });
      }

      complaintForm.reset();
      complaintModal.classList.add("hidden");
      loadStudentComplaints(currentUserEmail);
      alert("Report submitted successfully! The admin office has been notified.");
    } catch (error) {
      console.error("Complaint submission error:", error);
      alert("Error submitting complaint: " + error.message);
    }
  });
}

// ======================================================
// LOAD STUDENT COMPLAINTS
// ======================================================
async function loadStudentComplaints(email) {
  complaintList.innerHTML = "<p class='text-slate-400 text-sm text-center py-6'>Loading your reports...</p>";
  try {
    const q = query(collection(db, "complaints"), where("submittedBy", "==", email));
    const querySnapshot = await getDocs(q);
    myComplaints = [];
    querySnapshot.forEach((docSnap) => {
      myComplaints.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    updatePersonalStats();
    filterAndRenderReports();
  } catch (error) {
    console.error("Error loading complaints:", error);
  }
}

// ======================================================
// LOAD STUDENT NOTIFICATIONS
// ======================================================
async function loadStudentNotifications(email) {
  try {
    const q = query(collection(db, "notifications"), where("recipient", "==", email));
    const snapshot = await getDocs(q);
    let notifs = [];
    snapshot.forEach((docSnap) => {
      notifs.push({
        id: docSnap.id,
        ...docSnap.data()
      });
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
      notifList.innerHTML = `
        <div class="p-4 text-center text-slate-400">
          No notifications
        </div>
      `;
      return;
    }

    notifs.forEach(n => {
      const item = document.createElement("div");
      item.className = `p-3 transition ${n.read ? "bg-white text-slate-600" : "bg-blue-50/60 text-slate-900 font-medium"}`;
      item.innerHTML = `
        <p class="text-xs">
          ${escapeHtml(n.message)}
        </p>
        <span class="text-[10px] text-slate-400 mt-1 block">
          ${n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
        </span>
      `;
      notifList.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading student notifications:", err);
  }
}

// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// ======================================================
if (markAllReadBtn) {
  markAllReadBtn.addEventListener("click", async () => {
    try {
      const q = query(
        collection(db, "notifications"),
        where("recipient", "==", currentUserEmail),
        where("read", "==", false)
      );
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(d =>
        updateDoc(doc(db, "notifications", d.id), { read: true })
      );
      await Promise.all(updatePromises);
      loadStudentNotifications(currentUserEmail);
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  });
}

// ======================================================
// PERSONAL STATISTICS
// ======================================================
function updatePersonalStats() {
  document.getElementById("statMyTotal").textContent = myComplaints.length;
  document.getElementById("statMyPending").textContent = myComplaints.filter(
    c => (c.status || "Pending") === "Pending"
  ).length;
  document.getElementById("statMyResolved").textContent = myComplaints.filter(
    c => c.status === "Resolved"
  ).length;
}

// ======================================================
// FILTER REPORTS
// ======================================================
function filterAndRenderReports() {
  const searchTerm = searchMyReports.value.toLowerCase().trim();
  let filtered = myComplaints.filter(c => {
    const title = (c.title || "").toLowerCase();
    const desc = (c.description || "").toLowerCase();
    const status = c.status || "Pending";
    const matchesSearch = !searchTerm || title.includes(searchTerm) || desc.includes(searchTerm);
    const matchesTab = currentFilter === "all" || status === currentFilter;
    return matchesSearch && matchesTab;
  });
  renderCards(filtered);
}

// ======================================================
// RENDER COMPLAINT CARDS
// ======================================================
function renderCards(reports) {
  complaintList.innerHTML = "";
  if (reports.length === 0) {
    complaintList.innerHTML = `
      <div class="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
        <p class="text-slate-500 text-sm font-medium">
          No reports found.
        </p>
        <p class="text-xs text-slate-400">
          Try changing your search or submit a new report using the button above.
        </p>
      </div>
    `;
    return;
  }

  reports.forEach(data => {
    const dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : "Recently";
    const status = data.status || "Pending";
    const statusColor =
      status === "Resolved"
        ? "bg-green-100 text-green-700"
        : status === "In Progress"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";
    const priorityColor =
      data.priority === "High"
        ? "text-red-600 bg-red-50"
        : "text-slate-600 bg-slate-100";

    let step1Active = "bg-amber-500 text-white";
    let step2Active = "bg-slate-200 text-slate-400";
    let step3Active = "bg-slate-200 text-slate-400";
    let line1 = "bg-slate-200";
    let line2 = "bg-slate-200";

    if (status === "In Progress") {
      step2Active = "bg-blue-500 text-white";
      line1 = "bg-blue-500";
    } else if (status === "Resolved") {
      step2Active = "bg-blue-500 text-white";
      step3Active = "bg-green-500 text-white";
      line1 = "bg-blue-500";
      line2 = "bg-green-500";
    }

    const card = document.createElement("div");
    card.className = "bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition space-y-4";
    card.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1.5 flex-1">
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-semibold">
              ${escapeHtml(data.category)}
            </span>
            <span class="text-xs ${priorityColor} px-2 py-0.5 rounded font-semibold">
              ${escapeHtml(data.priority)} Priority
            </span>
            <span class="text-xs text-slate-400">
              • ${dateStr}
            </span>
          </div>
          <h3 class="font-bold text-slate-800 text-base">
            ${escapeHtml(data.title)}
          </h3>
          <p class="text-slate-600 text-sm">
            ${escapeHtml(data.description)}
          </p>
        </div>
        <div class="self-end sm:self-center whitespace-nowrap">
          <span class="text-xs font-semibold px-3 py-1 rounded-full ${statusColor}">
            ${escapeHtml(status)}
          </span>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between max-w-md mx-auto px-4">
          <div class="flex flex-col items-center space-y-1">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step1Active}">
              1
            </div>
            <span class="text-[11px] font-medium text-slate-600">
              Submitted
            </span>
          </div>
          <div class="flex-1 h-1 mx-2 ${line1}"></div>
          <div class="flex flex-col items-center space-y-1">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step2Active}">
              2
            </div>
            <span class="text-[11px] font-medium text-slate-600">
              In Progress
            </span>
          </div>
          <div class="flex-1 h-1 mx-2 ${line2}"></div>
          <div class="flex flex-col items-center space-y-1">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step3Active}">
              3
            </div>
            <span class="text-[11px] font-medium text-slate-600">
              Resolved
            </span>
          </div>
        </div>
        ${
          data.resolutionNote
            ? `
              <div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                <strong class="text-slate-900 block mb-0.5">
                  Admin Remark / Action Note:
                </strong>
                ${escapeHtml(data.resolutionNote)}
              </div>
            `
            : ""
        }
      </div>
    `;
    complaintList.appendChild(card);
  });
}

// ======================================================
// SEARCH
// ======================================================
if (searchMyReports) {
  searchMyReports.addEventListener("input", filterAndRenderReports);
}

// ======================================================
// REPORT FILTER TABS
// ======================================================
tabBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    tabBtns.forEach(b => {
      b.classList.remove("bg-white", "text-blue-600", "shadow-sm");
      b.classList.add("text-slate-600");
    });
    const clickedBtn = e.currentTarget;
    clickedBtn.classList.add("bg-white", "text-blue-600", "shadow-sm");
    clickedBtn.classList.remove("text-slate-600");
    currentFilter = clickedBtn.getAttribute("data-filter");
    filterAndRenderReports();
  });
});

// ======================================================
// ESCAPE HTML
// ======================================================
function escapeHtml(str) {
  if (!str) {
    return "";
  }
  return String(str).replace(/[&<>'"]/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}