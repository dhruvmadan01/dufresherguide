// Supabase Database Connection Setup
const SUPABASE_URL = "https://ngeoncxzgrcytxumiedu.supabase.co";
const SUPABASE_KEY = "sb_publishable_noP7UCYW-GMfsiYplOmK1w_-Jx1pGVo";
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Global Application State
let selectedGender = "";
let selectedCollege = null;
let sharesCompleted = 0;

// DOM Elements
const screenWelcome = document.getElementById("welcome-screen");
const screenShare = document.getElementById("share-screen");
const screenResults = document.getElementById("results-screen");

const leadForm = document.getElementById("lead-form");
const inputName = document.getElementById("user-name");
const inputPhone = document.getElementById("user-phone");
const inputCollege = document.getElementById("user-college");
const collegeDropdown = document.getElementById("college-dropdown");
const inputGender = document.getElementById("user-gender");

const btnWhatsApp = document.getElementById("btn-whatsapp-share");
const btnUnlock = document.getElementById("btn-unlock-guides");
const shareCountText = document.getElementById("share-count-text");
const shareProgressBar = document.getElementById("share-progress-bar");

// 1. SCREEN SWITCHER
function showScreen(screen) {
  // Hide all screens
  [screenWelcome, screenShare, screenResults].forEach(s => {
    s.classList.remove("active");
    setTimeout(() => {
      if (!s.classList.contains("active")) {
        s.style.display = "none";
      }
    }, 300);
  });
  
  // Show active screen
  screen.style.display = "block";
  setTimeout(() => {
    screen.classList.add("active");
  }, 50);
}

// 2. COLLEGE AUTOCOMPLETE DROPDOWN
function setupAutocomplete() {
  inputCollege.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    collegeDropdown.innerHTML = "";
    
    if (!query) {
      collegeDropdown.classList.remove("open");
      return;
    }
    
    // Filter matching colleges
    const matches = DU_COLLEGES.filter(c => c.name.toLowerCase().includes(query));
    
    if (matches.length > 0) {
      matches.slice(0, 5).forEach(match => {
        const item = document.createElement("div");
        item.className = "search-dropdown-item";
        item.setAttribute("data-name", match.name);
        item.innerHTML = `
          <span>${match.name}</span>
          <span class="item-campus">${match.campus}</span>
        `;
        collegeDropdown.appendChild(item);
      });
      collegeDropdown.classList.add("open");
    } else {
      collegeDropdown.classList.remove("open");
    }
  });

  // Mousedown event delegation (triggers before focus blur)
  collegeDropdown.addEventListener("mousedown", (e) => {
    const item = e.target.closest(".search-dropdown-item");
    if (item) {
      const collegeName = item.getAttribute("data-name");
      const match = DU_COLLEGES.find(c => c.name === collegeName);
      if (match) {
        inputCollege.value = match.name;
        selectedCollege = match;
        collegeDropdown.classList.remove("open");
        validateField(document.getElementById("group-college"), true);
      }
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!inputCollege.contains(e.target) && !collegeDropdown.contains(e.target)) {
      collegeDropdown.classList.remove("open");
    }
  });
}

// Gender Pill Selection (using delegation on parent container)
const genderContainer = document.getElementById("gender-selector-container");
if (genderContainer) {
  genderContainer.addEventListener("click", (e) => {
    const pill = e.target.closest(".gender-box");
    if (pill) {
      const pills = genderContainer.querySelectorAll(".gender-box");
      pills.forEach(p => p.classList.remove("selected"));
      pill.classList.add("selected");
      selectedGender = pill.getAttribute("data-value");
      inputGender.value = selectedGender;
      validateField(document.getElementById("group-gender"), true);
    }
  });
}

// Form Field Validation Visuals
function validateField(groupEl, isValid) {
  if (isValid) {
    groupEl.classList.remove("invalid");
  } else {
    groupEl.classList.add("invalid");
  }
  return isValid;
}

// Form Submission & Lead Capture
function handleFormSubmit(e) {
  e.preventDefault();
  
  const nameVal = inputName.value.trim();
  const phoneVal = inputPhone.value.trim();
  const collegeVal = inputCollege.value.trim();
  
  // Admin bypass shortcut to go directly to sharing gate
  if (nameVal.toLowerCase() === "admin") {
    showScreen(screenShare);
    return;
  }
  
  const isNameValid = validateField(
    document.getElementById("group-name"),
    nameVal.length >= 2 && /^[a-zA-Z\s]+$/.test(nameVal)
  );
  
  const isPhoneValid = validateField(
    document.getElementById("group-phone"),
    /^[6-9]\d{9}$/.test(phoneVal)
  );
  
  let matchedCollege = DU_COLLEGES.find(c => c.name.toLowerCase() === collegeVal.toLowerCase());
  // Partial match fallback (e.g. if they typed "hindu" or "stephens")
  if (!matchedCollege && collegeVal.trim() !== "") {
    matchedCollege = DU_COLLEGES.find(c => c.name.toLowerCase().includes(collegeVal.toLowerCase()));
    if (matchedCollege) {
      inputCollege.value = matchedCollege.name;
    }
  }

  const isCollegeValid = validateField(
    document.getElementById("group-college"),
    !!matchedCollege
  );
  if (matchedCollege) {
    selectedCollege = matchedCollege;
  }
  
  const isGenderValid = validateField(
    document.getElementById("group-gender"),
    selectedGender !== ""
  );
  
  if (isNameValid && isPhoneValid && isCollegeValid && isGenderValid) {
    // Save lead to local storage
    const leadData = {
      name: nameVal,
      phone: phoneVal,
      college: selectedCollege.name,
      campus: selectedCollege.campus,
      gender: selectedGender,
      persona: "DU Fresher",
      timestamp: new Date().toISOString()
    };
    
    const currentLeads = JSON.parse(localStorage.getItem("du_leads") || "[]");
    currentLeads.push(leadData);
    localStorage.setItem("du_leads", JSON.stringify(currentLeads));

    // Async sync to Supabase leads table
    if (supabaseClient) {
      supabaseClient.from("leads").insert([
        {
          name: leadData.name,
          phone: leadData.phone,
          college: leadData.college,
          campus: leadData.campus,
          gender: leadData.gender,
          persona: leadData.persona
        }
      ]).then(({ error }) => {
        if (error) {
          console.warn("Supabase database insert alert (Make sure table 'leads' is created):", error);
        } else {
          console.log("Lead successfully captured in Supabase!");
        }
      }).catch(err => {
        console.warn("Supabase connection catch:", err);
      });
    }
    
    // Redirect to Viral Share screen first
    showScreen(screenShare);
  }
}

// 3. TABS SWITCHER FOR SURVIVAL GUIDE
document.querySelectorAll(".tab-link").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabId = btn.getAttribute("data-tab");
    
    // Set active tab button
    document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Show active tab panel
    document.querySelectorAll(".tab-content").forEach(panel => panel.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
  });
});

// 4. ATTENDANCE CALCULATOR
const calcTotal = document.getElementById("calc-total");
const calcAttended = document.getElementById("calc-attended");
const btnCalculate = document.getElementById("btn-calculate");
const calcPctDisplay = document.getElementById("calc-pct-display");
const calcVerdictDisplay = document.getElementById("calc-verdict-display");
const calcMsgDisplay = document.getElementById("calc-msg-display");

function runCalculator() {
  const total = parseInt(calcTotal.value) || 0;
  const attended = parseInt(calcAttended.value) || 0;
  
  if (total <= 0) {
    calcPctDisplay.textContent = "0.0%";
    calcVerdictDisplay.textContent = "Invalid Input";
    calcVerdictDisplay.className = "calc-status danger";
    calcMsgDisplay.textContent = "Total scheduled classes must be greater than zero.";
    return;
  }
  
  if (attended > total) {
    calcPctDisplay.textContent = "0.0%";
    calcVerdictDisplay.textContent = "Invalid Input";
    calcVerdictDisplay.className = "calc-status danger";
    calcMsgDisplay.textContent = "Attended classes cannot exceed total classes scheduled.";
    return;
  }
  
  const pct = (attended / total) * 100;
  calcPctDisplay.textContent = `${pct.toFixed(1)}%`;
  
  const DU_LIMIT = 0.6767;
  
  if (pct < 67.67) {
    calcVerdictDisplay.textContent = "BT Mode: Attendance Short! 🚨";
    calcVerdictDisplay.className = "calc-status danger";
    
    const needed = Math.ceil((DU_LIMIT * total - attended) / (1 - DU_LIMIT));
    calcMsgDisplay.textContent = `You are short of 67.67%. You must attend the next ${needed} classes consecutively without missing to be safe!`;
  } else {
    calcVerdictDisplay.textContent = "Chill Mode: You are Safe! ✅";
    calcVerdictDisplay.className = "calc-status safe";
    
    const bunks = Math.floor((attended - (DU_LIMIT * total)) / DU_LIMIT);
    if (bunks > 0) {
      calcMsgDisplay.textContent = `You can bunk the next ${bunks} classes consecutively and still stay above the 67.67% requirement.`;
    } else {
      calcMsgDisplay.textContent = `You are just barely safe! Do not miss the next class or you will drop below 67.67%.`;
      calcVerdictDisplay.className = "calc-status warn";
    }
  }
}

// Bind Events
leadForm.addEventListener("submit", handleFormSubmit);
btnCalculate.addEventListener("click", runCalculator);

// Initial Bindings
setupAutocomplete();

// 5. VIRAL SHARE GATE TRACKING
if (btnWhatsApp) {
  btnWhatsApp.addEventListener("click", () => {
    const url = "https://dufresherguide.vercel.app/";
    const text = `Hey! If you got into Delhi University, check out this ultimate First Day Survival Guide! It has the physical verification checklist, orientation hacks, and attendance bunk calculator. Unlock it here: ${url}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    
    sharesCompleted++;
    if (sharesCompleted > 1) sharesCompleted = 1;
    
    // Update tracker elements
    if (shareCountText) {
      shareCountText.textContent = `${sharesCompleted} / 1`;
    }
    if (shareProgressBar) {
      shareProgressBar.style.width = `${(sharesCompleted / 1) * 100}%`;
    }
    
    if (sharesCompleted >= 1) {
      btnWhatsApp.style.display = "none";
      if (btnUnlock) {
        btnUnlock.style.display = "inline-flex";
      }
    }
  });
}

if (btnUnlock) {
  btnUnlock.addEventListener("click", () => {
    showScreen(screenResults);
  });
}
