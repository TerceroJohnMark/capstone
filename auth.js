import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTjXNz-NIsV_8YtVbN1QHxxsKBKMB1NG0",
  authDomain: "capstonecomplaints-31b4e.firebaseapp.com",
  projectId: "capstonecomplaints-31b4e",
  storageBucket: "capstonecomplaints-31b4e.firebasestorage.app",
  messagingSenderId: "13932350614",
  appId: "1:13932350614:web:299b07b3e89b83b3b0c6b7"
};

// Updated to your actual school admin email
const ADMIN_EMAIL = "2320801@ub.edu.ph";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const toggleAuthMode = document.getElementById("toggleAuthMode");
const authToggleText = document.getElementById("authToggleText");
const loginCardTitle = document.getElementById("loginCardTitle");

let isSignUpMode = false;

// Toggle between Sign In and Sign Up modes
if (toggleAuthMode) {
  toggleAuthMode.addEventListener("click", (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
      loginCardTitle.textContent = "Create Account";
      loginBtn.textContent = "Sign Up";
      authToggleText.textContent = "Already have an account?";
      toggleAuthMode.textContent = "Sign In";
    } else {
      loginCardTitle.textContent = "Welcome to CampusReport";
      loginBtn.textContent = "Sign In";
      authToggleText.textContent = "Don't have an account?";
      toggleAuthMode.textContent = "Create account";
    }
    loginError.textContent = "";
  });
}

// Redirect user automatically based on email role when logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.email === ADMIN_EMAIL) {
      window.location.href = "admin.html";
    } else {
      window.location.href = "student.html";
    }
  }
});

// Handle Form Submission
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      loginError.textContent = error.message;
    }
  });
} 