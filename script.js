// === משתנים גלובליים ===
let auth;
let db;
let storage;
let charts = {}; // אחסון של אובייקטי הגרפים
let adminEmail = null;
let currentUser = null;
let currentProjectId = null;
let currentProjectData = null;
let currentProjectMembers = [];
let currentFilter = "all";
let allTags = new Set();
let allProjects = [];
let userDashboardTasks = [];
let currentTaskView = "list"; // מצב תצוגת המשימות: "list", "kanban" או "assignee"
let currentDashboardView = "list"; // מצב תצוגת הדשבורד: "list" או "kanban"
let uploadedFiles = []; // מערך לאחסון הקבצים שהועלו
let calendar; // אובייקט לוח השנה
let sortableKanban = {}; // אובייקטים של לוחות קנבן

// מיפוי סטטוסים
const statusLabels = {
  'not-started': 'טרם התחילה',
  'in-progress': 'בתהליך',
  'waiting': 'ממתינה',
  'blocked': 'תקועה',
  'completed': 'הושלמה'
};

// מיפוי צבעים לסטטוסים (לשימוש בלוח שנה)
const statusColors = {
  'not-started': '#e9ecef',
  'in-progress': '#4895ef',
  'waiting': '#ff9e00',
  'blocked': '#e63946',
  'completed': '#0bb5a0'
};

// === אתחול האפליקציה ===
document.addEventListener('DOMContentLoaded', function() {
  // הפעלת אתחול Firebase בטעינת הדף
  initializeFirebase();

  // אירועי לחיצה - אימות
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('switch-to-register').addEventListener('click', switchToRegister);
  document.getElementById('login-mode-btn').addEventListener('click', switchToLogin);
  document.getElementById('register-btn').addEventListener('click', register);
  document.getElementById('logout-btn').addEventListener('click', logout);

  // אירועי לחיצה - ניווט
  document.getElementById('nav-projects').addEventListener('click', navigateToProjects);
  document.getElementById('nav-dashboard').addEventListener('click', navigateToDashboard);
  document.getElementById('nav-calendar').addEventListener('click', navigateToCalendar);
  document.getElementById('nav-stats').addEventListener('click', navigateToStats);
  document.getElementById('nav-activity').addEventListener('click', navigateToActivity);
  document.getElementById('nav-reminders').addEventListener('click', navigateToReminders);

  // אירועי לחיצה - פרויקטים
  document.getElementById('add-project-btn').addEventListener('click', showAddProjectModal);
  document.getElementById('add-from-template-btn').addEventListener('click', showTemplatesModal);
  document.getElementById('save-project-btn').addEventListener('click', saveProject);
  document.getElementById('cancel-project-btn').addEventListener('click', hideProjectModal);
  document.getElementById('save-as-template-btn').addEventListener('click', saveProjectAsTemplate);
  document.getElementById('create-from-template-btn').addEventListener('click', createFromTemplate);
  document.getElementById('cancel-template-btn').addEventListener('click', hideTemplatesModal);

  // אירועי לחיצה - חברי צוות
  document.getElementById('add-member-btn').addEventListener('click', showAddMemberModal);
  document.getElementById('add-member-confirm-btn').addEventListener('click', addMemberToProject);
  document.getElementById('cancel-member-btn').addEventListener('click', hideTeamMemberModal);
  document.getElementById('member-email').addEventListener('input', handleUserSearch);

  // אירועי לחיצה - משימות
  document.getElementById('add-task-btn').addEventListener('click', () => showAddTaskModal(false));
  document.getElementById('add-help-request-btn').addEventListener('click', () => showAddTaskModal(true));
  document.getElementById('save-task-btn').addEventListener('click', saveTask);
  document.getElementById('cancel-task-btn').addEventListener('click', hideTaskModal);
  document.getElementById('add-subtask-btn').addEventListener('click', addSubtask);
  document.getElementById('add-preceding-btn').addEventListener('click', addPrecedingTask);
  document.getElementById('add-following-btn').addEventListener('click', addFollowingTask);
  document.getElementById('add-reminder-to-task-btn').addEventListener('click', addReminderToTask);

  // אירועי לחיצה - תזכורות
  document.getElementById('add-reminder-btn').addEventListener('click', showAddReminderModal);
  document.getElementById('save-reminder-btn').addEventListener('click', saveReminder);
  document.getElementById('cancel-reminder-btn').addEventListener('click', hideReminderModal);

  // אירועי לחיצה - לוח שנה
  document.getElementById('today-calendar-btn').addEventListener('click', goToToday);
  document.getElementById('month-view-btn').addEventListener('click', () => changeCalendarView('dayGridMonth'));
  document.getElementById('week-view-btn').addEventListener('click', () => changeCalendarView('timeGridWeek'));
  document.getElementById('day-view-btn').addEventListener('click', () => changeCalendarView('timeGridDay'));

  // אירועי לחיצה - ייבוא/ייצוא
  document.getElementById('export-tasks-btn').addEventListener('click', exportTasks);
  document.getElementById('import-tasks-btn').addEventListener('click', showImportTasksModal);
  document.getElementById('import-tasks-btn').addEventListener('click', importTasks);
  document.getElementById('cancel-import-btn').addEventListener('click', hideImportTasksModal);
  document.getElementById('download-csv-template').addEventListener('click', downloadCsvTemplate);

  // אירועי לחיצה - בחירה מרובה
  document.getElementById('task-bulk-select').addEventListener('change', toggleBulkSelect);
  document.getElementById('bulk-status-change').addEventListener('change', changeBulkStatus);
  document.getElementById('bulk-assignee-change').addEventListener('change', changeBulkAssignee);
  document.getElementById('bulk-delete').addEventListener('click', deleteBulkTasks);

  // אירועי שינוי - תצוגת דשבורד
  const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
  viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', toggleView);
  });

  // אירועי צ'אט משימה
  document.getElementById('send-chat-message').addEventListener('click', sendChatMessage);
  document.getElementById('chat-message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });

  // טיפול בגרירת והעלאת קבצים
  setupFileUpload();

  // אירוע לתגיות
  document.getElementById('task-tag-input').addEventListener('keydown', handleTagInput);

  // אירוע לשינוי סטטוס משימה
  document.getElementById('task-status').addEventListener('change', handleStatusChange);

  // סגירת מודלים בX
  document.querySelectorAll('.modal-close').forEach(close => {
    close.addEventListener('click', function() {
      this.closest('.modal').style.display = 'none';
    });
  });

  // אירועי סינון דשבורד
  document.getElementById('dashboard-filter-project').addEventListener('change', filterDashboardTasks);
  document.getElementById('dashboard-sort-by').addEventListener('change', filterDashboardTasks);
  document.getElementById('dashboard-filter-tag').addEventListener('change', filterDashboardTasks);
  document.getElementById('dashboard-filter-status').addEventListener('change', filterDashboardTasks);

  // אירועי מיון משימות בפרויקט
  document.getElementById('task-sort-by').addEventListener('change', function() {
    loadTasks(currentProjectId);
  });

  document.getElementById('task-filter-tag').addEventListener('change', function() {
    loadTasks(currentProjectId);
  });

  document.getElementById('task-filter-status').addEventListener('change', function() {
    loadTasks(currentProjectId);
  });

  document.getElementById('task-filter-assignee').addEventListener('change', function() {
    if (currentTaskView === "list") {
      loadTasks(currentProjectId);
    } else if (currentTaskView === "assignee") {
      displayTasksByAssignee();
    }
  });

  // אירוע חזרה לרשימת פרויקטים
  document.getElementById('back-to-projects').addEventListener('click', backToProjects);

  // אירועי טאבים לסינון פרויקטים
  setupTabsListeners();

  // אירועי טאבים במודל משימה
  setupTaskModalTabs();

  // מתג מצב חשיכה
  document.getElementById('dark-mode-switch').addEventListener('change', toggleDarkMode);

  // חיפוש פרויקטים
  document.getElementById('search-projects').addEventListener('input', function() {
    const searchTerm = this.value.trim().toLowerCase();
    filterProjects(searchTerm);
  });

  // חיפוש משימות
  document.getElementById('search-tasks').addEventListener('input', function() {
    const searchTerm = this.value.trim().toLowerCase();
    filterDashboardTasks(searchTerm);
  });

  // סגירת מודלים בלחיצה מחוץ לתוכן
  setupModalClickOutside();
});

// === פונקציות אימות ===
function initializeFirebase() {
  showLoader();

  fetch('/api/firebase-config')
    .then(response => {
      if (!response.ok) {
        throw new Error('בעיה בטעינת תצורת Firebase: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('תצורת Firebase נטענה בהצלחה');

      // שמירת אימייל האדמין מהתשובה
      adminEmail = data.adminEmail;

      // אתחול Firebase עם תצורה שהתקבלה
      firebase.initializeApp(data.firebaseConfig);

      // קיצורי דרך לשירותים
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();

      // מעקב אחר התחברות המשתמש
      startAuthListener();
    })
    .catch(error => {
      console.error('שגיאה בטעינת תצורת Firebase:', error);
      showAuthError('שגיאה בטעינת הגדרות האפליקציה: ' + error.message);
      hideLoader();
    });
}

function startAuthListener() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // המשתמש מחובר - נבדוק אם הוא מורשה
      showLoader();

      // בדיקת סטטוס המשתמש
      db.collection('users').doc(user.uid).get()
        .then(doc => {
          let userData;

          if (doc.exists) {
            userData = doc.data();

            // לוגיקה לניהול סטטוס המשתמש
            if (user.email === adminEmail || (userData && userData.isAdmin)) {
              // המשתמש הוא המנהל או משתמש עם הרשאות מנהל
              currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: userData.displayName || user.email.split('@')[0],
                isAdmin: true
              };

              // עדכון ממשק המשתמש
              showApp();
              updateUserMenuForAdmin();
              loadProjects();
              checkDeadlines();
              hideLoader();
            } else if (userData.status === 'approved') {
              // המשתמש מאושר
              currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: userData.displayName || user.email.split('@')[0],
                isAdmin: false
              };

              // עדכון ממשק המשתמש
              showApp();
              loadProjects();
              checkDeadlines();
              hideLoader();
            } else if (userData.status === 'pending') {
              // המשתמש ממתין לאישור
              showAuthError('החשבון שלך ממתין לאישור מנהל המערכת. נסה שוב מאוחר יותר.');
              hideLoader();
              // ניתוק המשתמש
              auth.signOut();
            } else {
              // המשתמש נדחה או במצב לא תקין
              showAuthError('אין לך הרשאת גישה למערכת.');
              hideLoader();
              // ניתוק המשתמש
              auth.signOut();
            }
          } else {
            // אין מידע על המשתמש - יצירת רשומה עם סטטוס ממתין
            if (user.email === adminEmail) {
              // אם זה המנהל, ניצור רשומה עם הרשאות מנהל ואישור אוטומטי
              return db.collection('users').doc(user.uid).set({
                userId: user.uid,
                email: user.email,
                displayName: user.email.split('@')[0],
                isAdmin: true,
                status: 'approved',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                // קריאה רקורסיבית לאותה פונקציה כדי להמשיך את תהליך ההתחברות
                startAuthListener();
              });
            } else {
              // משתמש חדש שאינו מנהל
              return db.collection('users').doc(user.uid).set({
                userId: user.uid,
                email: user.email,
                displayName: user.email.split('@')[0],
                isAdmin: false,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                showAuthError('החשבון שלך ממתין לאישור מנהל המערכת. נסה שוב מאוחר יותר.');
                hideLoader();
                // ניתוק המשתמש
                auth.signOut();
              });
            }
          }
        })
        .catch(error => {
          hideLoader();
          console.error("Error checking user status:", error);
          showAuthError('שגיאה בבדיקת הרשאות: ' + error.message);
          // ניתוק המשתמש במקרה של שגיאה
          auth.signOut();
        });
    } else {
      // המשתמש לא מחובר
      currentUser = null;
      showLoginForm();
      hideLoader();
    }
  });
}

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAuthError('אנא הזן אימייל וסיסמה');
    return;
  }

  showLoader();
  auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      hideLoader();
      console.error("Login error:", error);
      showAuthError('שגיאה בהתחברות: ' + error.message);
    });
}

function register() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const displayName = document.getElementById('display-name').value.trim();

  if (!email || !password) {
    showAuthError('אנא הזן אימייל וסיסמה');
    return;
  }

  if (password.length < 6) {
    showAuthError('הסיסמה חייבת להכיל לפחות 6 תווים');
    return;
  }

  if (!displayName) {
    showAuthError('אנא הזן כינוי משתמש');
    return;
  }

  showLoader();

  // בדיקה אם האימייל הוא המנהל
  if (email === adminEmail) {
    // זהו המנהל - אפשר לו להירשם ישירות
    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        const user = userCredential.user;

        // יצירת רשומת משתמש מנהל בדאטאבייס
        return db.collection('users').doc(user.uid).set({
          userId: user.uid,
          email: email,
          displayName: displayName,
          isAdmin: true,
          status: 'approved',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        hideLoader();
        // המשתמש יעבור אוטומטית למסך הבא דרך מאזין האימות
      })
      .catch(error => {
        hideLoader();
        console.error("Registration error:", error);
        showAuthError('שגיאה בהרשמה: ' + error.message);
      });
  } else {
    // רישום משתמש רגיל
    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        const user = userCredential.user;

        // שמירת המידע על המשתמש עם סטטוס "ממתין לאישור"
        return db.collection('users').doc(user.uid).set({
          userId: user.uid,
          email: email,
          displayName: displayName,
          isAdmin: false,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        hideLoader();
        alert('נרשמת בהצלחה! הבקשה שלך ממתינה לאישור המנהל. תנותק מהמערכת עד לאישור.');
        // התנתקות אוטומטית עד לאישור
        return auth.signOut();
      })
      .catch(error => {
        hideLoader();
        console.error("Registration error:", error);
        showAuthError('שגיאה בהרשמה: ' + error.message);
      });
  }
}

function logout() {
  showLoader();
  auth.signOut()
    .catch(error => {
      hideLoader();
      console.error("Logout error:", error);
    });
}

function switchToRegister() {
  document.getElementById('display-name-container').style.display = 'block';
  document.getElementById('login-actions').style.display = 'none';
  document.getElementById('register-actions').style.display = 'flex';
  document.getElementById('auth-error').style.display = 'none';
}

function switchToLogin() {
  document.getElementById('display-name-container').style.display = 'none';
  document.getElementById('login-actions').style.display = 'flex';
  document.getElementById('register-actions').style.display = 'none';
  document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(message) {
  const errorElement = document.getElementById('auth-error');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('user-email').textContent = currentUser.displayName;
  document.getElementById('user-avatar').textContent = (currentUser.displayName.charAt(0) || "?").toUpperCase();
}

function showLoginForm() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('auth-error').style.display = 'none';
  // איפוס שדות הטופס
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  document.getElementById('display-name').value = '';
  document.getElementById('display-name-container').style.display = 'none';
  document.getElementById('login-actions').style.display = 'flex';
  document.getElementById('register-actions').style.display = 'none';
}

// === פונקציות ניווט ===
function navigateToProjects(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-projects');
  hideAllViews();
  document.getElementById('projects-view').classList.remove('hidden');
  loadProjects();
}

function navigateToDashboard(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-dashboard');
  hideAllViews();
  document.getElementById('dashboard-view').classList.remove('hidden');
  loadDashboard();
}

function navigateToCalendar(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-calendar');
  hideAllViews();
  document.getElementById('calendar-view').classList.remove('hidden');
  initCalendar();
}

function navigateToStats(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-stats');
  hideAllViews();
  document.getElementById('stats-view').classList.remove('hidden');
  loadStats();
}

function navigateToActivity(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-activity');
  hideAllViews();
  document.getElementById('activity-view').classList.remove('hidden');
  loadActivityLog();
}

function navigateToReminders(e) {
  if (e) e.preventDefault();
  hideAllViews();
  document.getElementById('reminders-view').classList.remove('hidden');
  loadReminders();
  // סגירת תפריט המשתמש
  document.querySelector('.user-menu-dropdown').classList.remove('show');
}

function hideAllViews() {
  document.getElementById('projects-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('calendar-view').classList.add('hidden');
  document.getElementById('stats-view').classList.add('hidden');
  document.getElementById('activity-view').classList.add('hidden');
  document.getElementById('project-detail-view').classList.add('hidden');
  document.getElementById('reminders-view').classList.add('hidden');
}

function setActiveNavItem(id) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

function backToProjects() {
  document.getElementById('projects-view').classList.remove('hidden');
  document.getElementById('project-detail-view').classList.add('hidden');
  setActiveNavItem('nav-projects');
}

// === לוח שנה ===
function initCalendar() {
  if (calendar) {
    calendar.refetchEvents();
    return;
  }

  const calendarEl = document.getElementById('calendar-container');

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: ''
    },
    locale: 'he',
    direction: 'rtl',
    firstDay: 0, // יום ראשון כיום ראשון בשבוע
    height: 'auto',
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    dayMaxEventRows: true,
    eventClick: function(info) {
      if (info.event.extendedProps.taskId) {
        openTaskDetails(info.event.extendedProps.taskId);
      }
    },
    events: function(fetchInfo, successCallback, failureCallback) {
      // טעינת משימות מהפיירסטור
      loadCalendarEvents(fetchInfo.start, fetchInfo.end)
        .then(events => {
          successCallback(events);
        })
        .catch(err => {
          console.error("Error loading calendar events:", err);
          failureCallback(err);
        });
    }
  });

  calendar.render();

  // עדכון רשימת הפרויקטים בסינון
  updateCalendarProjectFilter();
}

function loadCalendarEvents(start, end) {
  // המרת זמנים לפורמט של פיירסטור
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];
  const projectFilter = document.getElementById('calendar-filter-project').value;

  return new Promise((resolve, reject) => {
    // שליפת משימות מהפיירסטור
    let query = db.collection('tasks');

    // אם נבחר פרויקט ספציפי
    if (projectFilter !== 'all') {
      query = query.where('projectId', '==', projectFilter);
    } else {
      // אחרת, הראה משימות שהמשתמש אחראי עליהן או בפרויקטים שלו
      // לצערנו, פיירסטור לא תומך בOR, אז נצטרך לעשות שאילתות נפרדות ולאחד
      return Promise.all([
        // משימות שהמשתמש אחראי להן
        db.collection('tasks')
          .where('assigneeId', '==', currentUser.uid)
          .get(),

        // משימות בפרויקטים אישיים של המשתמש
        db.collection('projects')
          .where('userId', '==', currentUser.uid)
          .where('type', '==', 'personal')
          .get()
          .then(snapshot => {
            const projectIds = snapshot.docs.map(doc => doc.id);
            if (projectIds.length === 0) return { docs: [] };

            return db.collection('tasks')
              .where('projectId', 'in', projectIds)
              .get();
          })
      ]).then(([assignedTasks, personalTasks]) => {
        const allTasks = [...assignedTasks.docs, ...personalTasks.docs];

        // המרה לאירועי לוח שנה
        const events = [];
        const uniqueIds = new Set(); // למניעת כפילויות

        allTasks.forEach(doc => {
          if (!uniqueIds.has(doc.id)) {
            uniqueIds.add(doc.id);

            const task = doc.data();
            if (task.deadline) {
              // בדיקה אם התאריך בטווח
              if (task.deadline >= startDate && task.deadline <= endDate) {
                events.push(createCalendarEvent(doc.id, task));
              }
            }

            // אם יש תזכורות, הוסף גם אותן
            if (task.reminders && task.reminders.length > 0) {
              task.reminders.forEach(reminder => {
                if (reminder.date >= startDate && reminder.date <= endDate) {
                  events.push(createReminderEvent(doc.id, task, reminder));
                }
              });
            }
          }
        });

        resolve(events);
      }).catch(reject);
    }

    query.get()
      .then(snapshot => {
        const events = [];

        snapshot.forEach(doc => {
          const task = doc.data();
          if (task.deadline) {
            // בדיקה אם התאריך בטווח
            if (task.deadline >= startDate && task.deadline <= endDate) {
              events.push(createCalendarEvent(doc.id, task));
            }
          }

          // אם יש תזכורות, הוסף גם אותן
          if (task.reminders && task.reminders.length > 0) {
            task.reminders.forEach(reminder => {
              if (reminder.date >= startDate && reminder.date <= endDate) {
                events.push(createReminderEvent(doc.id, task, reminder));
              }
            });
          }
        });

        resolve(events);
      })
      .catch(reject);
  });
}

function createCalendarEvent(taskId, task) {
  // קביעת צבע האירוע לפי סטטוס
  const color = statusColors[task.status || 'not-started'];
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

  return {
    id: taskId,
    title: task.name,
    start: task.deadline,
    allDay: true,
    backgroundColor: isOverdue ? statusColors['blocked'] : color,
    borderColor: isOverdue ? statusColors['blocked'] : color,
    extendedProps: {
      taskId: taskId,
      description: task.description,
      status: task.status,
      isOverdue: isOverdue
    }
  };
}

function createReminderEvent(taskId, task, reminder) {
  return {
    id: `reminder-${taskId}-${reminder.id}`,
    title: `תזכורת: ${task.name}`,
    start: reminder.date + 'T' + (reminder.time || '09:00:00'),
    backgroundColor: '#4cc9f0',
    borderColor: '#4cc9f0',
    extendedProps: {
      taskId: taskId,
      description: reminder.note || task.description,
      isReminder: true
    }
  };
}

function updateCalendarProjectFilter() {
  const projectSelect = document.getElementById('calendar-filter-project');
  projectSelect.innerHTML = '<option value="all">כל הפרויקטים</option>';

  allProjects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.data.name;
    projectSelect.appendChild(option);
  });

  // הוספת מאזין אירועים
  projectSelect.addEventListener('change', function() {
    if (calendar) {
      calendar.refetchEvents();
    }
  });
}
function goToToday() {
  if (calendar) {
    calendar.today();
  }
}

function changeCalendarView(viewName) {
  if (calendar) {
    calendar.changeView(viewName);

    // עדכון כפתורי התצוגה
    document.querySelectorAll('#calendar-view .btn-group .btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (viewName === 'dayGridMonth') {
      document.getElementById('month-view-btn').classList.add('active');
    } else if (viewName === 'timeGridWeek') {
      document.getElementById('week-view-btn').classList.add('active');
    } else if (viewName === 'timeGridDay') {
      document.getElementById('day-view-btn').classList.add('active');
    }
  }
}

function openTaskDetails(taskId) {
  db.collection('tasks').doc(taskId).get()
    .then(doc => {
      if (doc.exists) {
        const task = doc.data();

        // פתח את הפרויקט הרלוונטי תחילה
        openProject(task.projectId, null, taskId);
      }
    })
    .catch(error => {
      console.error("Error opening task details:", error);
      showNotification('שגיאה', 'שגיאה בטעינת פרטי המשימה', 'danger');
    });
}

// === ניהול פרויקטים ===
function loadProjects() {
  showLoader();
  const projectsList = document.getElementById('projects-list');
  projectsList.innerHTML = '<div>טוען פרויקטים...</div>';

  // תחילה טען רק פרויקטים שהמשתמש הוא הבעלים שלהם
  db.collection('projects')
    .where('userId', '==', currentUser.uid)
    .get()
    .then(snapshot => {
      let allProjectsList = [];

      snapshot.forEach(doc => {
        const project = doc.data();
        allProjectsList.push({
          id: doc.id,
          data: project,
          role: 'owner',
          type: project.type || 'personal'
        });
      });

      // שמירת הפרויקטים במשתנה גלובלי
      allProjects = allProjectsList;

      // סינון לפי הסוג שנבחר אם צריך
      if (currentFilter !== "all") {
        allProjectsList = allProjectsList.filter(p => p.data.type === currentFilter);
      }

      // סינון לפי חיפוש אם קיים
      const searchTerm = document.getElementById('search-projects').value.trim().toLowerCase();
      if (searchTerm) {
        allProjectsList = filterProjectsBySearchTerm(allProjectsList, searchTerm);
      }

      // הצגת הפרויקטים
      displayProjects(allProjectsList);
      hideLoader();

      // רק אחרי שהצגת את הפרויקטים של המשתמש, נסה לטעון גם פרויקטים שהוא חבר בהם
      if (currentFilter === "all" || currentFilter === "team") {
        loadTeamProjects();
      }
    })
    .catch(error => {
      console.error("Error loading projects:", error);
      projectsList.innerHTML = '<div>שגיאה בטעינת פרויקטים. נסה שוב מאוחר יותר.</div>';
      hideLoader();
    });
}

function loadTeamProjects() {
  db.collection('project_members')
    .where('userId', '==', currentUser.uid)
    .get()
    .then(memberships => {
      if (memberships.empty) return;

      const projectIds = memberships.docs.map(doc => doc.data().projectId);

      // שליפת פרויקטים אחד אחד במקום ב-batch
      const promises = projectIds.map(projectId =>
        db.collection('projects').doc(projectId).get()
          .then(doc => {
            if (doc.exists) {
              const project = doc.data();
              // בדיקה שהפרויקט לא כבר ברשימה
              if (!allProjects.some(p => p.id === doc.id)) {
                allProjects.push({
                  id: doc.id,
                  data: project,
                  role: 'member',
                  type: project.type
                });
              }
            }
            return null;
          })
          .catch(error => {
            console.error("Error loading team project:", error);
            return null;
          })
      );

      Promise.all(promises)
        .then(() => {
          // סינון לפי הסוג שנבחר אם צריך
          let projectsToDisplay = allProjects;
          if (currentFilter !== "all") {
            projectsToDisplay = allProjects.filter(p => p.data.type === currentFilter);
          }

          // סינון לפי חיפוש אם קיים
          const searchTerm = document.getElementById('search-projects').value.trim().toLowerCase();
          if (searchTerm) {
            projectsToDisplay = filterProjectsBySearchTerm(projectsToDisplay, searchTerm);
          }

          // הצגת הפרויקטים המעודכנים
          displayProjects(projectsToDisplay);

          // עדכון הבוחר פרויקטים בדשבורד
          updateProjectsDropdown();

          // עדכון סינון לוח שנה
          if (calendar) {
            updateCalendarProjectFilter();
          }
        })
        .catch(error => {
          console.error("Error loading team projects:", error);
        });
    })
    .catch(error => {
      console.error("Error loading team memberships:", error);
    });
}

function displayProjects(projects) {
  const projectsList = document.getElementById('projects-list');

  if (projects.length === 0) {
    projectsList.innerHTML = '<div style="text-align: center; padding: 20px;">אין פרויקטים. לחץ על "פרויקט חדש" כדי להתחיל.</div>';
    return;
  }

  projectsList.innerHTML = '';

  projects.forEach(project => {
    const { id, data, role, type } = project;

    // הצגת תאריך בפורמט מקומי
    let deadlineText = 'אין תאריך יעד';
    let isOverdue = false;

    if (data.deadline) {
      const date = new Date(data.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      deadlineText = date.toLocaleDateString('he-IL');

      if (date < today) {
        isOverdue = true;
      }
    }

    // יצירת כרטיס פרויקט
    const projectCard = document.createElement('div');
    projectCard.className = 'card project-card';
    projectCard.style.borderRight = `5px solid ${isOverdue ? 'var(--danger)' : 'var(--primary)'}`;

    // אינדיקטור סוג פרויקט
    const typeIndicator = document.createElement('div');
    typeIndicator.className = `project-type-indicator ${data.type === 'personal' ? 'personal-project' : 'team-project'}`;
    typeIndicator.textContent = data.type === 'personal' ? 'אישי' : 'צוותי';
    projectCard.appendChild(typeIndicator);

    // תוכן הכרטיס
    const cardContent = document.createElement('div');
    cardContent.className = 'project-card-content';
    cardContent.innerHTML = `
      <h3 class="project-card-title">${data.name}</h3>
      <div class="project-card-description">${data.description || 'אין תיאור'}</div>
      <div class="project-card-footer">
        <div>
          <div><i class="fas fa-calendar-alt"></i> ${deadlineText}</div>
          ${role === 'owner' ? '<span class="badge badge-owner">מנהל</span>' : '<span class="badge badge-member">חבר</span>'}
        </div>
        ${role === 'owner' ?
          `<button class="btn btn-sm btn-danger delete-project" data-id="${id}">
            <i class="fas fa-trash"></i>
           </button>` : ''}
      </div>
    `;
    projectCard.appendChild(cardContent);

    // אירוע לחיצה על כרטיס פרויקט
    projectCard.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-project')) {
        openProject(id, role);
      }
    });

    // אירוע מחיקת פרויקט
    const deleteButton = projectCard.querySelector('.delete-project');
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) {
          deleteProject(id);
        }
      });
    }

    projectsList.appendChild(projectCard);
  });
}

function filterProjectsBySearchTerm(projects, searchTerm) {
  return projects.filter(project => {
    const nameMatch = project.data.name && project.data.name.toLowerCase().includes(searchTerm);
    const descMatch = project.data.description && project.data.description.toLowerCase().includes(searchTerm);
    return nameMatch || descMatch;
  });
}

function filterProjects(searchTerm) {
  let filteredProjects = [...allProjects];

  // סינון לפי סוג אם נבחר
  if (currentFilter !== "all") {
    filteredProjects = filteredProjects.filter(p => p.data.type === currentFilter);
  }

  // סינון לפי מונח חיפוש
  if (searchTerm) {
    filteredProjects = filterProjectsBySearchTerm(filteredProjects, searchTerm);
  }

  displayProjects(filteredProjects);
}

function openProject(projectId, userRole, taskIdToShow = null) {
  console.log('Starting openProject with id:', projectId);
  showLoader();

  currentProjectId = projectId;

  try {
    // שינוי תצוגה
    hideAllViews();
    document.getElementById('project-detail-view').classList.remove('hidden');

    // טעינת פרטי הפרויקט
    db.collection('projects').doc(projectId).get()
      .then(doc => {
        console.log('Received doc:', doc.exists);
        if (!doc.exists) {
          hideLoader();
          showNotification('שגיאה', 'הפרויקט לא נמצא', 'danger');
          return;
        }

        const project = doc.data();
        console.log('Project data received:', project);
        currentProjectData = project;

        // הצגת תאריך בפורמט מקומי
        let deadlineText = 'אין תאריך יעד';
        let deadlineClass = '';

        if (project.deadline) {
          const date = new Date(project.deadline);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          deadlineText = date.toLocaleDateString('he-IL');

          if (date < today) {
            deadlineClass = 'text-danger';
          }
        }

        // הצגת פרטי הפרויקט
        const projectDetail = document.getElementById('project-detail');
        projectDetail.innerHTML = `
          <h2 style="margin-bottom: 15px;">${project.name}</h2>
          <div style="background-color: var(--light); padding: 15px; border-radius: var(--radius); margin-bottom: 20px;">
            <p style="margin-bottom: 15px;">${project.description || 'אין תיאור'}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
              <div>
                <strong><i class="fas fa-tag"></i> סוג פרויקט:</strong>
                <span class="badge ${project.type === 'personal' ? 'personal-project' : 'team-project'}" style="margin-right: 5px;">
                  ${project.type === 'personal' ? 'אישי' : 'צוותי'}
                </span>
              </div>
              <div>
                <strong><i class="fas fa-calendar-alt"></i> תאריך יעד:</strong>
                <span class="${deadlineClass}">${deadlineText}</span>
              </div>
            </div>
          </div>
        `;

        // הוספת כפתור עריכה רק למי שיצר את הפרויקט
        if (project.userId === currentUser.uid) {
          console.log('Adding edit button for project owner');
          const editButton = document.createElement('button');
          editButton.className = 'btn';
          editButton.innerHTML = '<i class="fas fa-edit"></i> ערוך פרויקט';
          editButton.addEventListener('click', function() {
            showEditProjectModal(projectId, project);
          });
          projectDetail.appendChild(editButton);
        }

        // הצגת חברי צוות רק בפרויקטים צוותיים
        const teamMembersSection = document.getElementById('team-members-section');
        if (project.type === 'team') {
          teamMembersSection.classList.remove('hidden');
        } else {
          teamMembersSection.classList.add('hidden');
        }

        // הגדרת התצוגה של הטאבים לפי סוג פרויקט
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
          const view = btn.getAttribute('data-view');
          // הצג את כל הכפתורים בפרויקט צוותי, רק "רשימה" ו-"קנבן" בפרויקט אישי
          if (view === 'assignee' && project.type !== 'team') {
            btn.style.display = 'none';
          } else {
            btn.style.display = 'block';
          }
        });

        // איפוס תצוגת הטאבים
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        document.querySelector('.view-toggle-btn[data-view="list"]').classList.add('active');
        currentTaskView = "list";

        if (project.type === 'team') {
          loadProjectMembers(projectId);

          // הצגת כפתור הוספת חברים רק לבעל הפרויקט
          const addMemberBtn = document.getElementById('add-member-btn');
          if (project.userId === currentUser.uid) {
            addMemberBtn.style.display = 'block';
          } else {
            addMemberBtn.style.display = 'none';
          }
        }

        // עדכון הסינון לפי תגיות
        updateProjectTaskTagsDropdown(projectId);

        // טעינת המשימות של הפרויקט
        document.getElementById('tasks-list-view').classList.remove('hidden');
        document.getElementById('tasks-kanban-view').classList.add('hidden');
        document.getElementById('tasks-by-assignee-view').classList.add('hidden');
        loadTasks(projectId, taskIdToShow);

        // טעינת גרף התקדמות הפרויקט
        loadProjectProgressChart(projectId);

        console.log('Project loaded successfully');
      })
      .catch(function(error) {
        console.error('Error in openProject:', error);
        hideLoader();
        document.getElementById('projects-view').classList.remove('hidden');
        document.getElementById('project-detail-view').classList.add('hidden');
        showNotification('שגיאה', 'שגיאה בטעינת פרטי הפרויקט: ' + (error.message || 'בעיה לא ידועה'), 'danger');
      });
  } catch (e) {
    console.error('Unexpected error in openProject function:', e);
    hideLoader();
    document.getElementById('projects-view').classList.remove('hidden');
    document.getElementById('project-detail-view').classList.add('hidden');
    showNotification('שגיאה', 'שגיאה בפתיחת הפרויקט: ' + (e.message || 'בעיה לא ידועה'), 'danger');
  }
}

function showAddProjectModal() {
  document.getElementById('project-modal-title').textContent = 'פרויקט חדש';
  document.getElementById('project-name').value = '';
  document.getElementById('project-description').value = '';
  document.getElementById('project-deadline').value = '';
  document.getElementById('project-type').value = 'personal';
  document.getElementById('project-type').disabled = false;
  document.getElementById('project-id').value = '';

  document.getElementById('project-modal').style.display = 'block';
}

function showEditProjectModal(projectId, project) {
  document.getElementById('project-modal-title').textContent = 'עריכת פרויקט';
  document.getElementById('project-name').value = project.name || '';
  document.getElementById('project-description').value = project.description || '';
  document.getElementById('project-deadline').value = project.deadline || '';
  document.getElementById('project-type').value = project.type || 'personal';
  document.getElementById('project-id').value = projectId;

  // בעריכת פרויקט קיים לא ניתן לשנות את סוג הפרויקט
  document.getElementById('project-type').disabled = true;

  document.getElementById('project-modal').style.display = 'block';
}

function hideProjectModal() {
  document.getElementById('project-modal').style.display = 'none';
}

function saveProject() {
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();
  const deadline = document.getElementById('project-deadline').value;
  const type = document.getElementById('project-type').value;
  const projectId = document.getElementById('project-id').value;

  if (!name) {
    alert('אנא הזן שם לפרויקט');
    return;
  }

  showLoader();

  const projectData = {
    name,
    description,
    deadline,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  let savePromise;
  let actionType;

  if (projectId) {
    // עדכון פרויקט קיים - אין לשנות את הסוג
    savePromise = db.collection('projects').doc(projectId).update(projectData);
    actionType = 'ערך פרויקט';
  } else {
    // יצירת פרויקט חדש
    projectData.userId = currentUser.uid;
    projectData.type = type;
    projectData.ownerEmail = currentUser.email;
    projectData.ownerName = currentUser.displayName || currentUser.email.split('@')[0];
    projectData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    savePromise = db.collection('projects').add(projectData);
    actionType = 'יצר פרויקט';
  }

  savePromise
    .then((result) => {
      hideLoader();
      hideProjectModal();

      // רישום פעילות
      const idToLog = projectId || (result ? result.id : null);
      if (idToLog) {
        logActivity(actionType, idToLog, `${actionType} "${name}"`);
      }

      showNotification('הפרויקט נשמר', 'הפרויקט נשמר בהצלחה', 'success');

      if (projectId) {
        // אם זו עריכת פרויקט קיים
        openProject(projectId);
      } else {
        // אם זה פרויקט חדש
        loadProjects();
      }
    })
    .catch(error => {
      hideLoader();
      console.error("Error saving project:", error);
      showNotification('שגיאה', 'שגיאה בשמירת פרויקט: ' + error.message, 'danger');
    });
}

function deleteProject(projectId) {
  if (!confirm('האם אתה בטוח שברצונך למחוק פרויקט זה? כל המשימות וחברי הצוות יימחקו.')) {
    return;
  }

  showLoader();

  // ראשית מחיקת כל המשימות השייכות לפרויקט
  db.collection('tasks')
    .where('projectId', '==', projectId)
    .get()
    .then(snapshot => {
      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      return batch.commit();
    })
    .then(() => {
      // מחיקת חברי הצוות מהפרויקט (אם יש)
      return db.collection('project_members')
        .where('projectId', '==', projectId)
        .get();
    })
    .then(snapshot => {
      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      return batch.commit();
    })
    .then(() => {
      // מחיקת הפרויקט עצמו
      return db.collection('projects').doc(projectId).delete();
    })
    .then(() => {
      hideLoader();
      // רישום פעילות
      logActivity('מחק פרויקט', projectId);

      showNotification('הפרויקט נמחק', 'הפרויקט ותכולתו נמחקו בהצלחה', 'success');

      // בדיקה אם הפרויקט הנוכחי נמחק
      if (currentProjectId === projectId) {
        hideAllViews();
        document.getElementById('projects-view').classList.remove('hidden');
        setActiveNavItem('nav-projects');
        currentProjectId = null;
      }

      // רענון רשימת הפרויקטים
      loadProjects();
    })
    .catch(error => {
      hideLoader();
      console.error("Error deleting project:", error);
      showNotification('שגיאה', 'שגיאה במחיקת פרויקט: ' + error.message, 'danger');
    });
}

// === תבניות פרויקטים ===
function showTemplatesModal() {
  // טעינת תבניות פרויקטים מהפיירסטור
  db.collection('project_templates')
    .where('userId', '==', currentUser.uid)
    .get()
    .then(snapshot => {
      const templatesList = document.getElementById('templates-list');

      if (snapshot.empty) {
        templatesList.innerHTML = '<div>אין תבניות פרויקטים. שמור פרויקט כתבנית כדי ליצור חדש.</div>';
        document.getElementById('create-from-template-btn').disabled = true;
      } else {
        templatesList.innerHTML = '';

        snapshot.forEach(doc => {
          const template = doc.data();
          const templateItem = document.createElement('div');
          templateItem.className = 'template-item';
          templateItem.dataset.id = doc.id;

          templateItem.innerHTML = `
            <div class="template-title">${template.name}</div>
            <div class="template-details">
              <div>${template.description || 'אין תיאור'}</div>
              <div>סוג: ${template.type === 'personal' ? 'אישי' : 'צוותי'}</div>
              <div>נוצר: ${template.createdAt ? new Date(template.createdAt.toDate()).toLocaleDateString('he-IL') : 'לא ידוע'}</div>
            </div>
          `;

          // אירוע בחירת תבנית
          templateItem.addEventListener('click', function() {
            // הסרת בחירה קודמת
            templatesList.querySelectorAll('.template-item').forEach(item => {
              item.classList.remove('selected');
            });

            // סימון התבנית הנוכחית
            this.classList.add('selected');

            // הפעלת כפתור היצירה
            document.getElementById('create-from-template-btn').disabled = false;
          });

          templatesList.appendChild(templateItem);
        });
      }

      document.getElementById('template-modal').style.display = 'block';
    })
    .catch(error => {
      console.error("Error loading templates:", error);
      showNotification('שגיאה', 'שגיאה בטעינת תבניות פרויקטים', 'danger');
    });
}

function hideTemplatesModal() {
  document.getElementById('template-modal').style.display = 'none';
}

function saveProjectAsTemplate() {
  if (!currentProjectId || !currentProjectData) {
    showNotification('שגיאה', 'אין פרויקט פעיל לשמירה כתבנית', 'danger');
    return;
  }

  if (!confirm('האם לשמור את הפרויקט הנוכחי כתבנית?')) {
    return;
  }

  showLoader();

  // יצירת אובייקט התבנית מהפרויקט הנוכחי
  const templateData = {
    name: currentProjectData.name,
    description: currentProjectData.description,
    type: currentProjectData.type,
    userId: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    sourceProjectId: currentProjectId
  };

  // שמירת התבנית בפיירסטור
  db.collection('project_templates')
    .add(templateData)
    .then(docRef => {
      // שמירת כל המשימות של הפרויקט כחלק מהתבנית
      return db.collection('tasks')
        .where('projectId', '==', currentProjectId)
        .get()
        .then(snapshot => {
          const batch = db.batch();

          snapshot.forEach(doc => {
            const taskData = doc.data();

            // שמירת המשימה עם קישור לתבנית
            const templateTaskRef = db.collection('template_tasks').doc();
            batch.set(templateTaskRef, {
              name: taskData.name,
              description: taskData.description,
              status: taskData.status || 'not-started',
              tags: taskData.tags || [],
              templateId: docRef.id,
              isHelpRequest: taskData.isHelpRequest || false,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });

          return batch.commit();
        });
    })
    .then(() => {
      hideLoader();
      showNotification('תבנית נשמרה', 'הפרויקט נשמר בהצלחה כתבנית', 'success');
    })
    .catch(error => {
      hideLoader();
      console.error("Error saving project as template:", error);
      showNotification('שגיאה', 'שגיאה בשמירת תבנית: ' + error.message, 'danger');
    });
}

function createFromTemplate() {
  const selectedTemplate = document.querySelector('.template-item.selected');

  if (!selectedTemplate) {
    showNotification('שגיאה', 'לא נבחרה תבנית', 'danger');
    return;
  }

  const templateId = selectedTemplate.dataset.id;
  showLoader();

  // קבלת פרטי התבנית
  db.collection('project_templates').doc(templateId).get()
    .then(doc => {
      if (!doc.exists) {
        throw new Error('התבנית לא נמצאה');
      }

      const templateData = doc.data();

      // יצירת פרויקט חדש מהתבנית
      const newProjectData = {
        name: templateData.name + ' (עותק)',
        description: templateData.description,
        type: templateData.type,
        userId: currentUser.uid,
        ownerEmail: currentUser.email,
        ownerName: currentUser.displayName || currentUser.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdFromTemplate: templateId
      };

      return db.collection('projects').add(newProjectData);
    })
    .then(projectRef => {
      // קבלת המשימות מהתבנית
      return db.collection('template_tasks')
        .where('templateId', '==', templateId)
        .get()
        .then(snapshot => {
          const batch = db.batch();

          snapshot.forEach(doc => {
            const taskData = doc.data();

            // יצירת משימה חדשה מהתבנית
            const newTaskRef = db.collection('tasks').doc();
            batch.set(newTaskRef, {
              name: taskData.name,
              description: taskData.description,
              status: taskData.status || 'not-started',
              tags: taskData.tags || [],
              projectId: projectRef.id,
              createdBy: currentUser.uid,
              isHelpRequest: taskData.isHelpRequest || false,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });

          return batch.commit().then(() => projectRef.id);
        });
    })
    .then(newProjectId => {
      hideLoader();
      hideTemplatesModal();
      showNotification('פרויקט נוצר', 'פרויקט חדש נוצר בהצלחה מהתבנית', 'success');

      // פתיחת הפרויקט החדש
      openProject(newProjectId);
    })
    .catch(error => {
    hideLoader();
      console.error("Error creating from template:", error);
      showNotification('שגיאה', 'שגיאה ביצירת פרויקט מתבנית: ' + error.message, 'danger');
    });
}

// === ניהול חברי צוות ===
function loadProjectMembers(projectId) {
  console.log('Starting loadProjectMembers with id:', projectId);

  const membersList = document.getElementById('team-members-list');
  if (!membersList) {
    console.error('Error: team-members-list element not found!');
    return;
  }

  membersList.innerHTML = '<div>טוען חברי צוות...</div>';

  db.collection('project_members')
    .where('projectId', '==', projectId)
    .get()
    .then(snapshot => {
      console.log('Members data received, count:', snapshot.size);

      if (snapshot.empty && (!currentProjectData || currentProjectData.userId !== currentUser.uid)) {
        membersList.innerHTML = '<div>אין חברי צוות נוספים בפרויקט.</div>';
        currentProjectMembers = [];
        return;
      }

      membersList.innerHTML = '';
      currentProjectMembers = [];

      // הוספת בעל הפרויקט
      if (currentProjectData) {
        console.log('Adding project owner to members list');
        currentProjectMembers.push({
          userId: currentProjectData.userId,
          email: currentProjectData.ownerEmail || currentUser.email,
          displayName: currentProjectData.ownerName || currentUser.displayName || currentUser.email.split('@')[0],
          role: 'owner'
        });

        const ownerItem = document.createElement('div');
        ownerItem.className = 'member-item';
        ownerItem.innerHTML = `
          <div>
            <strong>${currentProjectData.ownerName || currentUser.displayName || currentUser.email.split('@')[0]}</strong>
            <div>${currentProjectData.ownerEmail || currentUser.email}</div>
            <span class="badge badge-owner">מנהל פרויקט</span>
          </div>
        `;
        membersList.appendChild(ownerItem);
      }

      // הוספת שאר חברי הצוות
      console.log('Adding other team members');
      snapshot.forEach(doc => {
        const member = doc.data();
        const memberId = doc.id;

        currentProjectMembers.push({
          userId: member.userId,
          email: member.email,
          displayName: member.displayName,
          role: member.role
        });

        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        memberItem.innerHTML = `
          <div>
            <strong>${member.displayName}</strong>
            <div>${member.email}</div>
          </div>
        `;

        // אפשרות הסרת חבר צוות רק לבעל הפרויקט
        if (currentProjectData && currentProjectData.userId === currentUser.uid) {
          const removeButton = document.createElement('button');
          removeButton.className = 'btn btn-sm btn-danger';
          removeButton.innerHTML = '<i class="fas fa-user-minus"></i>';
          removeButton.addEventListener('click', function() {
            if (confirm(`האם להסיר את ${member.displayName} מהפרויקט?`)) {
              removeTeamMember(memberId, member.displayName);
            }
          });
          memberItem.appendChild(removeButton);
        }

        membersList.appendChild(memberItem);
      });

      // עדכון דרופדאון אחראים למשימות
      updateAssigneeDropdown();

      console.log('Finished loading members');
    })
    .catch(error => {
      console.error("Error loading team members:", error);
      membersList.innerHTML = '<div>שגיאה בטעינת חברי צוות.</div>';
    });
}

function updateAssigneeDropdown() {
  const assigneeFilter = document.getElementById('task-filter-assignee');
  if (!assigneeFilter) return;

  assigneeFilter.innerHTML = '<option value="all">כל האחראים</option>';
  assigneeFilter.innerHTML += '<option value="none">ללא אחראי</option>';

  // הוספת כל חברי הצוות לרשימה
  currentProjectMembers.forEach(member => {
    const option = document.createElement('option');
    option.value = member.userId;
    option.textContent = member.displayName;
    assigneeFilter.appendChild(option);
  });

  // הצגת הדרופדאון רק בפרויקטים צוותיים
  if (currentProjectData && currentProjectData.type === 'team') {
    assigneeFilter.classList.remove('hidden');
  } else {
    assigneeFilter.classList.add('hidden');
  }

  // עדכון הדרופדאון של בחירת אחראי בעריכת משימה
  const taskAssignee = document.getElementById('task-assignee');
  if (taskAssignee) {
    taskAssignee.innerHTML = '<option value="">לא משויך</option>';

    currentProjectMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member.userId;
      option.textContent = member.displayName;
      taskAssignee.appendChild(option);
    });
  }

  // עדכון הדרופדאון של שינוי מרוכז
  const bulkAssignee = document.getElementById('bulk-assignee-change');
  if (bulkAssignee) {
    bulkAssignee.innerHTML = '<option value="">שייך ל...</option>';
    bulkAssignee.innerHTML += '<option value="none">ללא אחראי</option>';

    currentProjectMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member.userId;
      option.textContent = member.displayName;
      bulkAssignee.appendChild(option);
    });
  }
}

function showAddMemberModal() {
  document.getElementById('member-email').value = '';
  document.getElementById('member-search-results').innerHTML = '';
  document.getElementById('add-member-confirm-btn').disabled = true;
  document.getElementById('team-member-modal').style.display = 'block';
}

function hideTeamMemberModal() {
  document.getElementById('team-member-modal').style.display = 'none';
}

function handleUserSearch() {
  const searchTerm = document.getElementById('member-email').value.trim();
  const resultsDiv = document.getElementById('member-search-results');

  // רק אם יש לפחות 3 תווים, בצע חיפוש
  if (searchTerm.length < 3) {
    resultsDiv.innerHTML = '<div>הזן לפחות 3 תווים לחיפוש</div>';
    document.getElementById('add-member-confirm-btn').disabled = true;
    return;
  }

  resultsDiv.innerHTML = '<div class="text-center">מחפש משתמש...</div>';

  // חיפוש לפי אימייל מדויק
  const emailQuery = db.collection('users')
    .where('email', '==', searchTerm.toLowerCase())
    .where('status', '==', 'approved')  // רק משתמשים מאושרים
    .limit(5);

  // חיפוש לפי שם משתמש
  const nameQuery = db.collection('users')
    .where('displayName', '>=', searchTerm)
    .where('displayName', '<=', searchTerm + '\uf8ff') // טריק לחיפוש prefix
    .where('status', '==', 'approved')  // רק משתמשים מאושרים
    .limit(5);

  // ביצוע שני החיפושים במקביל
  Promise.all([emailQuery.get(), nameQuery.get()])
    .then(([emailResults, nameResults]) => {
      const uniqueUsers = new Map(); // למניעת כפילויות

      // הוספת תוצאות חיפוש לפי אימייל
      emailResults.forEach(doc => {
        uniqueUsers.set(doc.id, doc.data());
      });

      // הוספת תוצאות חיפוש לפי שם
      nameResults.forEach(doc => {
        uniqueUsers.set(doc.id, doc.data());
      });

      if (uniqueUsers.size === 0) {
        resultsDiv.innerHTML = '<div style="color: var(--danger); padding: 10px; background-color: #f8d7da; border-radius: 4px; margin-top: 10px;">משתמש לא נמצא. הזמן אותו להירשם למערכת.</div>';
        document.getElementById('add-member-confirm-btn').disabled = true;
        return;
      }

      let resultsHTML = '';
      let foundUsers = [];

      // עיבוד התוצאות
      uniqueUsers.forEach((userData, userId) => {
        // בדיקה אם המשתמש כבר בפרויקט
        const isMember = currentProjectMembers.some(member => member.userId === userId);

        foundUsers.push({
          userId: userId,
          email: userData.email,
          displayName: userData.displayName || userData.email.split('@')[0],
          isMember: isMember
        });
      });

      // הצגת התוצאות
      if (foundUsers.length > 0) {
        resultsHTML = '<div style="margin-top: 15px;">';

        foundUsers.forEach(user => {
          resultsHTML += `
            <div class="user-search-result ${user.isMember ? 'already-member' : ''}"
                 data-id="${user.userId}"
                 data-email="${user.email}"
                 data-name="${user.displayName}"
                 style="background-color: #f0f0f0; padding: 15px; border-radius: var(--radius); margin-bottom: 10px; cursor: pointer; ${user.isMember ? 'opacity: 0.7;' : ''}">
              <div style="font-weight: 500; font-size: 16px;">${user.displayName}</div>
              <div style="color: #666;">${user.email}</div>
              ${user.isMember ? '<div style="color: var(--warning); margin-top: 5px;">משתמש זה כבר חבר בפרויקט</div>' : ''}
            </div>
          `;
        });

        resultsHTML += '</div>';
        resultsDiv.innerHTML = resultsHTML;

        // הוספת אירוע בחירת משתמש
        document.querySelectorAll('.user-search-result').forEach(result => {
          result.addEventListener('click', function() {
            if (this.classList.contains('already-member')) {
              return; // אם כבר חבר אז לא עושים כלום
            }

            // סימון כל התוצאות כלא נבחרות
            document.querySelectorAll('.user-search-result').forEach(el => {
              el.classList.remove('selected');
              el.style.border = 'none';
            });

            // סימון הנבחר
            this.classList.add('selected');
            this.style.border = '2px solid var(--primary)';

            // הפעלת כפתור ההוספה
            const addButton = document.getElementById('add-member-confirm-btn');
            addButton.disabled = false;

            // שמירת פרטי המשתמש הנבחר בכפתור
            addButton.dataset.id = this.dataset.id;
            addButton.dataset.email = this.dataset.email;
            addButton.dataset.name = this.dataset.name;
          });
        });
      }
    })
    .catch(error => {
      console.error("Error searching for user:", error);
      resultsDiv.innerHTML = '<div style="color: var(--danger);">שגיאה בחיפוש משתמש</div>';
    });
}

function addMemberToProject() {
  const addButton = document.getElementById('add-member-confirm-btn');

  // בדיקה אם נבחר משתמש
  if (addButton.disabled || !addButton.dataset.id) {
    alert('אנא בחר משתמש להוספה');
    return;
  }

  const userId = addButton.dataset.id;
  const userEmail = addButton.dataset.email;
  const userName = addButton.dataset.name;

  showLoader();

  // בדיקה אם המשתמש כבר קיים בפרויקט
  if (currentProjectMembers.some(member => member.userId === userId)) {
    hideLoader();
    alert('משתמש זה כבר קיים בפרויקט');
    return;
  }

  // הוספת המשתמש לרשימת החברים של הפרויקט
  db.collection('project_members').add({
    projectId: currentProjectId,
    userId: userId,
    email: userEmail,
    displayName: userName,
    role: 'member',
    addedBy: currentUser.uid,
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    hideLoader();
    hideTeamMemberModal();

    // רישום פעילות
    logActivity('הוסיף חבר צוות', currentProjectId, `הוסיף את ${userName} לפרויקט`);

    showNotification('חבר צוות נוסף', 'חבר הצוות נוסף בהצלחה לפרויקט', 'success');

    loadProjectMembers(currentProjectId);
  })
  .catch(error => {
    hideLoader();
    console.error("Error adding team member:", error);
    alert('שגיאה בהוספת חבר צוות');
  });
}

function removeTeamMember(membershipId, memberName) {
  showLoader();

  db.collection('project_members').doc(membershipId).delete()
    .then(() => {
      hideLoader();

      // רישום פעילות
      logActivity('הסיר חבר צוות', currentProjectId, `הסיר את ${memberName} מהפרויקט`);

      showNotification('חבר צוות הוסר', 'חבר הצוות הוסר בהצלחה מהפרויקט', 'success');

      loadProjectMembers(currentProjectId);
    })
    .catch(error => {
      hideLoader();
      console.error("Error removing team member:", error);
      showNotification('שגיאה', 'שגיאה בהסרת חבר צוות: ' + error.message, 'danger');
    });
}

// === ניהול משימות ===
function loadTasks(projectId, taskIdToShow = null) {
  console.log('Starting loadTasks with id:', projectId);

  const tasksList = document.getElementById('tasks-list');
  if (!tasksList) {
    console.error('Error: tasks-list element not found!');
    hideLoader();
    return;
  }

  tasksList.innerHTML = '<div>טוען משימות...</div>';

  try {
    // קבלת פרמטרים של סינון ומיון
    const sortByElement = document.getElementById('task-sort-by');
    const filterTagElement = document.getElementById('task-filter-tag');
    const filterStatusElement = document.getElementById('task-filter-status');
    const filterAssigneeElement = document.getElementById('task-filter-assignee');

    if (!sortByElement || !filterTagElement || !filterStatusElement) {
      console.error('Error: Sort or filter elements not found!');
      hideLoader();
      return;
    }

    const sortValue = sortByElement.value;
    const [sortField, sortDirection] = sortValue.split('-');
    const filterTag = filterTagElement.value;
    const filterStatus = filterStatusElement.value;
    const filterAssignee = filterAssigneeElement ? filterAssigneeElement.value : 'all';

    console.log('Query parameters:', {sortField, sortDirection, filterTag, filterStatus, filterAssignee});

    let query = db.collection('tasks')
      .where('projectId', '==', projectId);

    // הוספת מיון לשאילתא אם אפשר
    if (sortField === 'createdAt') {
      query = query.orderBy(sortField, sortDirection);
    }

    console.log('Fetching tasks from database');
    query.get()
      .then(snapshot => {
        console.log('Tasks data received, count:', snapshot.size);

        if (snapshot.empty) {
          tasksList.innerHTML = '<div style="text-align: center; padding: 15px;">אין משימות בפרויקט זה. לחץ על "הוסף משימה" להוספת משימה חדשה.</div>';

          // עדכון תצוגת המשימות לפי אחראי
          if (currentTaskView === "assignee") {
            document.getElementById('unassigned-tasks-list').innerHTML = '<div>אין משימות ללא אחראי.</div>';
            document.getElementById('tasks-by-assignee').innerHTML = '';
          }

          // עדכון תצוגת קנבן
          if (currentTaskView === "kanban") {
            updateKanbanTaskCounts();
          }

          hideLoader();
          return;
        }

        // איסוף ועיבוד המשימות
        let tasks = snapshot.docs.map(doc => {
          return {
            id: doc.id,
            data: doc.data()
          };
        });

        console.log('Processing and sorting tasks');

        // סינון לפי תגית אם נבחר
        if (filterTag !== 'all') {
          tasks = tasks.filter(task => {
            const tags = task.data.tags || [];
            return tags.includes(filterTag);
          });
        }

        // סינון לפי סטטוס אם נבחר
        if (filterStatus !== 'all') {
          tasks = tasks.filter(task => task.data.status === filterStatus);
        }

        // סינון לפי אחראי אם נבחר
        if (filterAssignee !== 'all' && currentTaskView === 'list') {
          if (filterAssignee === 'none') {
            tasks = tasks.filter(task => !task.data.assigneeId);
          } else {
            tasks = tasks.filter(task => task.data.assigneeId === filterAssignee);
          }
        }

        // מיון במידת הצורך (אם השדה אינו createdAt שכבר מתויג בשאילתא)
        if (sortField !== 'createdAt') {
          tasks.sort((a, b) => {
            let valA = a.data[sortField] || '';
            let valB = b.data[sortField] || '';

            // מיון מיוחד לתאריכים
            if (sortField === 'deadline') {
              valA = valA ? new Date(valA) : new Date(9999, 11, 31);
              valB = valB ? new Date(valB) : new Date(9999, 11, 31);
            }

            // מיון מיוחד לסטטוס
            if (sortField === 'status') {
              const statusOrder = {
                'blocked': 0,
                'waiting': 1,
                'not-started': 2,
                'in-progress': 3,
                'completed': 4
              };
              valA = statusOrder[a.data.status || 'not-started'] || 999;
              valB = statusOrder[b.data.status || 'not-started'] || 999;
            }

            if (sortDirection === 'asc') {
              return valA > valB ? 1 : -1;
            } else {
              return valA < valB ? 1 : -1;
            }
          });
        }

        console.log('Rendering tasks to UI');

        // שמירת המשימות במשתנה זמני לשימוש בתצוגות שונות
        const allTasks = [...tasks];

        // טיפול בכל התצוגות השונות
        if (currentTaskView === "list") {
          // עדכון תצוגת רשימה
          tasksList.innerHTML = '';
          tasks.forEach(task => {
            try {
              const taskElement = createTaskElement(task);
              tasksList.appendChild(taskElement);
            } catch (err) {
              console.error('Error creating task element:', err, task);
            }
          });
        } else if (currentTaskView === "kanban") {
          // עדכון תצוגת קנבן
          updateKanbanView(allTasks);
        } else if (currentTaskView === "assignee") {
          // עדכון תצוגה לפי אחראי
          displayTasksByAssignee(allTasks);
        }

        // אם יש משימה ספציפית להציג
        if (taskIdToShow) {
          console.log('Showing specific task:', taskIdToShow);
          const taskToShow = tasks.find(t => t.id === taskIdToShow);
          if (taskToShow) {
            showEditTaskModal(taskIdToShow, taskToShow.data);
          }
        }

        hideLoader();
        console.log('Tasks loaded successfully');
      })
      .catch(error => {
        console.error("Error loading tasks:", error);
        hideLoader();
        tasksList.innerHTML = '<div>שגיאה בטעינת משימות.</div>';
        showNotification('שגיאה', 'שגיאה בטעינת משימות: ' + error.message, 'danger');
      });
  } catch (e) {
    console.error('Unexpected error in loadTasks:', e);
    hideLoader();
    tasksList.innerHTML = '<div>שגיאה בלתי צפויה בטעינת משימות.</div>';
    showNotification('שגיאה', 'שגיאה בלתי צפויה בטעינת משימות: ' + e.message, 'danger');
  }
}

function updateKanbanView(tasks) {
  // ניקוי כל העמודות הקיימות
  const columns = document.querySelectorAll('.kanban-column-content');
  columns.forEach(column => {
    column.innerHTML = '';
  });

  // מיון משימות לפי עמודות
  const tasksByStatus = {
    'not-started': [],
    'in-progress': [],
    'waiting': [],
    'blocked': [],
    'completed': []
  };

  // סינון לפי אחראי אם יש
  const filterAssignee = document.getElementById('task-filter-assignee').value;
  let filteredTasks = [...tasks];

  if (filterAssignee !== 'all') {
    if (filterAssignee === 'none') {
      filteredTasks = tasks.filter(task => !task.data.assigneeId);
    } else {
      filteredTasks = tasks.filter(task => task.data.assigneeId === filterAssignee);
    }
  }

  // חלוקת המשימות לעמודות
  filteredTasks.forEach(task => {
    const status = task.data.status || 'not-started';
    if (tasksByStatus[status]) {
      tasksByStatus[status].push(task);
    }
  });

  // הוספת המשימות לכל עמודה
  for (const status in tasksByStatus) {
    const columnId = `project-kanban-${status}`;
    const columnElement = document.getElementById(columnId);

    if (columnElement) {
      tasksByStatus[status].forEach(task => {
        const taskCard = createKanbanTaskCard(task);
        columnElement.appendChild(taskCard);
      });

      // יצירת Sortable לכל עמודה אם עוד לא קיים
      if (!sortableKanban[status]) {
        sortableKanban[status] = Sortable.create(columnElement, {
          group: 'tasks',
          animation: 150,
          ghostClass: 'kanban-card-ghost',
          chosenClass: 'kanban-card-chosen',
          dragClass: 'kanban-card-drag',
          onEnd: function(evt) {
            const taskId = evt.item.getAttribute('data-id');
            const newStatus = evt.to.closest('.kanban-column').getAttribute('data-status');

            // עדכון סטטוס המשימה בדאטאבייס
            if (taskId && newStatus) {
              quickUpdateTaskStatus(taskId, newStatus);
            }
          }
        });
      }
    }
  }

  // עדכון ספירת משימות בכל עמודה
  updateKanbanTaskCounts();
}

function updateKanbanTaskCounts() {
  document.querySelectorAll('.kanban-column').forEach(column => {
    const status = column.getAttribute('data-status');
    const tasksCount = column.querySelector('.kanban-column-content').children.length;
    const countElement = column.querySelector('.task-count');

    if (countElement) {
      countElement.textContent = tasksCount;
    }
  });
}

function createKanbanTaskCard(task) {
  const { id, data } = task;

  // יצירת כרטיס משימה לתצוגת קנבן
  const taskCard = document.createElement('div');
  taskCard.className = 'task-item';
  taskCard.setAttribute('data-id', id);

  // בדיקת תאריך יעד
  let deadlineHtml = '';
  if (data.deadline) {
    const date = new Date(data.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = date < today && data.status !== 'completed';
    deadlineHtml = `
      <div class="task-meta">
        <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
          <i class="fas fa-calendar-alt"></i> ${date.toLocaleDateString('he-IL')}
        </span>
      </div>
    `;
  }

  // אחראי למשימה (אם יש)
  let assigneeHtml = '';
  if (data.assigneeId && currentProjectData.type === 'team') {
    const assignee = currentProjectMembers.find(m => m.userId === data.assigneeId);
    if (assignee) {
      assigneeHtml = `
        <div class="assignee-avatar" title="${assignee.displayName}">
          ${assignee.displayName.charAt(0).toUpperCase()}
        </div>
      `;
    }
  }

  // תגיות
  let tagsHtml = '';
  if (data.tags && data.tags.length > 0) {
    tagsHtml = '<div class="tags-container">';
    data.tags.slice(0, 2).forEach(tag => { // מציג רק 2 תגיות לכל היותר בתצוגת קנבן
      const tagClass = getTagColorClass(tag);
      tagsHtml += `<span class="tag ${tagClass}">${tag}</span>`;
    });
    if (data.tags.length > 2) {
      tagsHtml += `<span class="tag">+${data.tags.length - 2}</span>`;
    }
    tagsHtml += '</div>';
  }

  // בניית התוכן
  taskCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <h4 class="task-title">${data.name}</h4>
      ${assigneeHtml}
    </div>
    <div class="task-description">${data.description ? (data.description.length > 60 ? data.description.substring(0, 60) + '...' : data.description) : 'אין תיאור'}</div>
    ${deadlineHtml}
    ${tagsHtml}
    <div class="task-actions">
      <button class="btn btn-sm edit-task" data-id="${id}">
        <i class="fas fa-edit"></i>
      </button>
    </div>
  `;

  // הוספת אירוע עריכה
  taskCard.querySelector('.edit-task').addEventListener('click', function(e) {
    e.stopPropagation();
    db.collection('tasks').doc(id).get()
      .then(doc => {
        if (doc.exists) {
          showEditTaskModal(id, doc.data());
        }
      })
      .catch(error => {
        console.error("Error fetching task:", error);
      });
  });

  return taskCard;
}

function displayTasksByAssignee(tasks = null) {
  if (!tasks) {
    // אם לא התקבלו משימות, טען מחדש
    loadTasks(currentProjectId);
    return;
  }

  const unassignedContainer = document.getElementById('unassigned-tasks-list');
  const assigneeContainer = document.getElementById('tasks-by-assignee');

  unassignedContainer.innerHTML = '';
  assigneeContainer.innerHTML = '';

  // בדיקת הפילטר של האחראי
  const assigneeFilter = document.getElementById('task-filter-assignee').value;

  // קבוצות משימות לפי אחראי
  const tasksByAssignee = new Map();

  // משימות ללא אחראי
  const unassignedTasks = tasks.filter(task => !task.data.assigneeId);

  // סינון לפי סטטוס אם נבחר
  const statusFilter = document.getElementById('task-filter-status').value;

  let filteredUnassigned = unassignedTasks;
  if (statusFilter !== 'all') {
    filteredUnassigned = unassignedTasks.filter(task => task.data.status === statusFilter);
  }

  // משימות עם אחראי
  tasks.forEach(task => {
    if (task.data.assigneeId) {
      // סינון לפי סטטוס אם נבחר
      if (statusFilter !== 'all' && task.data.status !== statusFilter) {
        return;
      }

      // סינון לפי אחראי ספציפי אם נבחר
      if (assigneeFilter !== 'all' && assigneeFilter !== 'none' && task.data.assigneeId !== assigneeFilter) {
        return;
      }

      if (!tasksByAssignee.has(task.data.assigneeId)) {
        tasksByAssignee.set(task.data.assigneeId, []);
      }

      tasksByAssignee.get(task.data.assigneeId).push(task);
    }
  });

  // הצגת משימות ללא אחראי
  if (assigneeFilter === 'all' || assigneeFilter === 'none') {
    if (filteredUnassigned.length === 0) {
      unassignedContainer.innerHTML = '<div>אין משימות ללא אחראי.</div>';
    } else {
      filteredUnassigned.forEach(task => {
        unassignedContainer.appendChild(createTaskElement(task));
      });
    }
  } else {
    unassignedContainer.innerHTML = '<div>מוצגות רק משימות של האחראי שנבחר.</div>';
  }

  // הצגת משימות לפי אחראי
  if (tasksByAssignee.size === 0 && (assigneeFilter === 'all' || assigneeFilter !== 'none')) {
    assigneeContainer.innerHTML = '<div>אין משימות עם אחראים.</div>';
  } else {
    // יצירת קונטיינר לכל אחראי
    tasksByAssignee.forEach((tasks, assigneeId) => {
      // מציאת פרטי האחראי
      let assigneeName = 'לא ידוע';
      let assigneeInitial = '?';

      const assignee = currentProjectMembers.find(member => member.userId === assigneeId);
      if (assignee) {
        assigneeName = assignee.displayName;
        assigneeInitial = assigneeName.charAt(0).toUpperCase();
      } else if (assigneeId === currentUser.uid) {
        assigneeName = currentUser.displayName || currentUser.email.split('@')[0];
        assigneeInitial = assigneeName.charAt(0).toUpperCase();
      }

      // יצירת קונטיינר לאחראי
      const assigneeSection = document.createElement('div');
      assigneeSection.className = 'assignee-tasks-container';

      // כותרת עם פרטי האחראי
      const assigneeHeader = document.createElement('div');
      assigneeHeader.className = 'assignee-header';
      assigneeHeader.innerHTML = `
        <div class="assignee-avatar">${assigneeInitial}</div>
        <h3>${assigneeName}</h3>
      `;
      assigneeSection.appendChild(assigneeHeader);

      // רשימת המשימות של האחראי
      const tasksList = document.createElement('div');
      tasksList.className = 'task-list';

      tasks.forEach(task => {
        tasksList.appendChild(createTaskElement(task));
      });

      assigneeSection.appendChild(tasksList);
      assigneeContainer.appendChild(assigneeSection);
    });
  }
}

function createTaskElement(task) {
  const { id, data } = task;

  // הצגת תאריך בפורמט מקומי
  let deadlineText = 'אין תאריך יעד';
  let isOverdue = false;

  if (data.deadline) {
    const date = new Date(data.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    deadlineText = date.toLocaleDateString('he-IL');

    if (date < today && data.status !== 'completed') {
      isOverdue = true;
    }
  }

  // יצירת אלמנט משימה
  const taskItem = document.createElement('div');
  taskItem.className = `task-item ${data.status === 'completed' ? 'completed' : ''} ${data.isHelpRequest ? 'help-request' : ''}`;
  taskItem.dataset.id = id;

  // תיבת סימון לבחירה מרובה
  let checkboxHtml = '';
  if (document.getElementById('task-bulk-select').checked) {
    checkboxHtml = `
      <input type="checkbox" class="task-checkbox" data-id="${id}">
    `;
  }

  // קבלת מידע על הסטטוס
  const statusClass = `status-${data.status || 'not-started'}`;
  const statusText = statusLabels[data.status || 'not-started'];

  // מידע על האחראי למשימה
  let assigneeInfo = '';
  if (currentProjectData && currentProjectData.type === 'team' && data.assigneeId) {
    const assignee = currentProjectMembers.find(m => m.userId === data.assigneeId);
    if (assignee) {
      assigneeInfo = `
        <div class="task-assignee">
          <span class="assignee-avatar">${assignee.displayName.charAt(0).toUpperCase()}</span>
          <span>${assignee.displayName}</span>
        </div>
      `;
    }
  }

  // יצירת תגיות
  let tagsHtml = '';
  if (data.tags && data.tags.length > 0) {
    tagsHtml = '<div class="tags-container">';
    data.tags.forEach(tag => {
      const tagClass = getTagColorClass(tag);
      tagsHtml += `<span class="tag ${tagClass}">${tag}</span>`;
    });
    tagsHtml += '</div>';
  }

  // מידע נוסף על סטטוס (סיבת עיכוב או ממתין ל...)
  let statusExtraInfo = '';
  if (data.status === 'blocked' && data.blockedReason) {
    statusExtraInfo = `<div style="margin-top: 5px; color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> סיבת העיכוב: ${data.blockedReason}</div>`;
  } else if (data.status === 'waiting' && data.waitingFor) {
    statusExtraInfo = `<div style="margin-top: 5px; color: var(--warning);"><i class="fas fa-hourglass-half"></i> ממתינה ל: ${data.waitingFor}</div>`;
  }

  // תת-משימות
  let subtasksInfo = '';
  if (data.subtasks && data.subtasks.length > 0) {
    const completedSubtasks = data.subtasks.filter(subtask => subtask.completed).length;
    subtasksInfo = `<div style="margin-top: 5px;"><i class="fas fa-tasks"></i> ${completedSubtasks}/${data.subtasks.length} תת-משימות הושלמו</div>`;
  }

  // בדיקה האם יש קבצים
  let filesInfo = '';
  if (data.files && data.files.length > 0) {
    filesInfo = `<div style="margin-top: 5px; color: var(--primary);"><i class="fas fa-paperclip"></i> ${data.files.length} קבצים מצורפים</div>`;
  }

  // בדיקה אם יש תזכורות
  let remindersInfo = '';
  if (data.reminders && data.reminders.length > 0) {
    remindersInfo = `<div style="margin-top: 5px; color: var(--info);"><i class="fas fa-bell"></i> ${data.reminders.length} תזכורות מוגדרות</div>`;
  }

  // תלויות
  let dependenciesInfo = '';
  if ((data.precedingTasks && data.precedingTasks.length > 0) || (data.followingTasks && data.followingTasks.length > 0)) {
    const precedingCount = data.precedingTasks ? data.precedingTasks.length : 0;
    const followingCount = data.followingTasks ? data.followingTasks.length : 0;
    dependenciesInfo = `<div style="margin-top: 5px; color: var(--secondary);"><i class="fas fa-link"></i> ${precedingCount} משימות קודמות, ${followingCount} משימות המשך</div>`;
  }

  // יצירת התוכן ה-HTML
  taskItem.innerHTML = `
    <div style="display: flex; align-items: flex-start;">
      ${checkboxHtml}
      <div class="task-content">
        <h4 class="task-title">${data.name}</h4>
        <div class="task-description">${data.description || 'אין תיאור'}</div>
        <div class="task-meta">
          <span class="task-due-date ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar-alt"></i> ${deadlineText}</span>
          <span class="task-status ${statusClass}">${statusText}</span>
          ${data.isHelpRequest ? '<span class="badge" style="background-color: var(--warning); color: white;"><i class="fas fa-hands-helping"></i> בקשת עזרה</span>' : ''}
          ${assigneeInfo}
        </div>
        ${statusExtraInfo}
        ${subtasksInfo}
        ${filesInfo}
        ${remindersInfo}
        ${dependenciesInfo}
        ${tagsHtml}

        <!-- כפתורי סטטוס מהיר -->
        <div class="quick-status-buttons">
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm chat-task" data-id="${id}" data-name="${data.name}" title="צ'אט משימה">
          <i class="fas fa-comments"></i>
        </button>
        <button class="btn btn-sm edit-task" data-id="${id}" title="ערוך משימה">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-task" data-id="${id}" title="מחק משימה">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;

  // הוספת כפתורי שינוי סטטוס מהיר
  const quickStatusButtons = taskItem.querySelector('.quick-status-buttons');
  if (quickStatusButtons) {
    // מסדר הסטטוסים לפי הגיון העבודה
    const statuses = [
      { value: 'not-started', label: 'טרם התחילה', color: '#e9ecef', textColor: '#212529' },
      { value: 'in-progress', label: 'בתהליך', color: '#4895ef', textColor: '#ffffff' },
      { value: 'waiting', label: 'ממתינה', color: '#ffc107', textColor: '#212529' },
      { value: 'blocked', label: 'תקועה', color: '#dc3545', textColor: '#ffffff' },
      { value: 'completed', label: 'הושלמה', color: '#28a745', textColor: '#ffffff' }
    ];

    // הוספת כפתור לכל סטטוס, למעט הנוכחי
    statuses.forEach(status => {
      // לא מציגים כפתור לסטטוס הנוכחי
      if (status.value === data.status) {
        return;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm status-btn';
      button.textContent = status.label;
      button.style.backgroundColor = status.color;
      button.style.color = status.textColor;
      button.dataset.status = status.value;
      button.dataset.taskId = id;

      // הוספת הכפתור לדיב
      quickStatusButtons.appendChild(button);
    });
  }

  // הוספת אירועים
  const chatButton = taskItem.querySelector('.chat-task');
  if (chatButton) {
    chatButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const taskId = this.getAttribute('data-id');
      const taskName = this.getAttribute('data-name');
      showTaskChat(taskId, taskName);
    });
  }

  const editButton = taskItem.querySelector('.edit-task');
  if (editButton) {
    editButton.addEventListener('click', function(e) {
      e.stopPropagation();
      db.collection('tasks').doc(id).get()
        .then(doc => {
          if (doc.exists) {
            showEditTaskModal(id, doc.data());
          }
        })
        .catch(error => {
          console.error("Error fetching task:", error);
        });
    });
  }

  const deleteButton = taskItem.querySelector('.delete-task');
  if (deleteButton) {
    deleteButton.addEventListener('click', function(e) {
      e.stopPropagation();
      if (window.confirm("האם למחוק את המשימה?")) {
        deleteTask(id);
      }
    });
  }

  // הוספת אירועי לחיצה לכפתורי הסטטוס המהיר
  const statusButtons = taskItem.querySelectorAll('.status-btn');
  statusButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation(); // למנוע פתיחת מודל עריכה
      const newStatus = this.dataset.status;
      const taskId = this.dataset.taskId;
      const statusLabel = this.textContent;

      if (confirm(`האם לשנות את סטטוס המשימה ל-${statusLabel}?`)) {
        quickUpdateTaskStatus(taskId, newStatus);
      }
    });
  });

  // אם יש תיבת סימון לבחירה מרובה, הוספת אירוע שינוי
  const checkbox = taskItem.querySelector('.task-checkbox');
  if (checkbox) {
    checkbox.addEventListener('change', function() {
      updateBulkSelectionCount();
    });
  }

  return taskItem;
}

function showTaskChat(taskId, taskName) {
  document.getElementById('chat-task-name').textContent = taskName;
  document.getElementById('chat-task-id').value = taskId;
  document.getElementById('chat-message').value = '';

  // טעינת הודעות צ'אט קודמות
  const chatContainer = document.getElementById('task-chat-messages');
  chatContainer.innerHTML = '<div class="chat-message"><div class="chat-message-content">טוען הודעות...</div></div>';

  db.collection('task_messages')
    .where('taskId', '==', taskId)
    .orderBy('timestamp', 'asc')
    .get()
    .then(snapshot => {
      chatContainer.innerHTML = '';

      if (snapshot.empty) {
        chatContainer.innerHTML = `
          <div class="chat-message">
            <div class="chat-message-sender">מערכת</div>
            <div class="chat-message-time">עכשיו</div>
            <div class="chat-message-content">ברוכים הבאים לצ'אט המשימה!</div>
          </div>
        `;
        return;
      }

      snapshot.forEach(doc => {
        const message = doc.data();
        addChatMessageToUI(message, currentUser.uid);
      });

      // גלילה לתחתית
      chatContainer.scrollTop = chatContainer.scrollHeight;
    })
    .catch(error => {
      console.error("Error loading chat messages:", error);
      chatContainer.innerHTML = '<div class="chat-message"><div class="chat-message-content">שגיאה בטעינת הודעות</div></div>';
    });

  document.getElementById('task-chat-modal').style.display = 'block';
}

function sendChatMessage() {
  const message = document.getElementById('chat-message').value.trim();
  const taskId = document.getElementById('chat-task-id').value;

  if (!message || !taskId) return;

  // שליחת ההודעה לפיירסטור
  const messageData = {
    taskId: taskId,
    userId: currentUser.uid,
    displayName: currentUser.displayName || currentUser.email.split('@')[0],
    message: message,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('task_messages').add(messageData)
    .then(() => {
      // ניקוי שדה ההזנה
      document.getElementById('chat-message').value = '';

      // הוספת ההודעה ל-UI
      addChatMessageToUI({
        ...messageData,
        timestamp: new Date()
      }, currentUser.uid);

      // גלילה לתחתית
      const chatContainer = document.getElementById('task-chat-messages');
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // עדכון זמן העדכון האחרון של המשימה
      db.collection('tasks').doc(taskId).update({
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      // רישום פעילות
      logActivity('שלח הודעה בצאט', taskId, 'שלח הודעה בצאט המשימה');
    })
    .catch(error => {
      console.error("Error sending message:", error);
      showNotification('שגיאה', 'אירעה שגיאה בשליחת ההודעה', 'danger');
    });
}

function addChatMessageToUI(message, currentUserId) {
  const chatContainer = document.getElementById('task-chat-messages');
  const isCurrentUser = message.userId === currentUserId;

  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${isCurrentUser ? 'outgoing' : ''}`;

  // פורמט תאריך
  const timestamp = message.timestamp instanceof Date ? message.timestamp :
                    message.timestamp ? new Date(message.timestamp.toDate()) : new Date();
  const timeStr = timestamp.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageElement.innerHTML = `
    ${!isCurrentUser ? `<div class="chat-message-sender">${message.displayName}</div>` : ''}
    <div class="chat-message-time">${timeStr}</div>
    <div class="chat-message-content">${message.message}</div>
  `;

  chatContainer.appendChild(messageElement);
}

// === מודל משימה ===
function showAddTaskModal(isHelpRequest = false) {
  // איפוס הטאבים והצגת טאב פרטי משימה
  document.querySelectorAll('.task-modal-tabs .tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector('.task-modal-tabs .tab[data-tab="task-details"]').classList.add('active');

  document.querySelectorAll('.task-tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById('task-details').style.display = 'block';

  // איפוס שדות המשימה
  document.getElementById('task-modal-title').textContent = isHelpRequest ? 'בקשת עזרה חדשה' : 'משימה חדשה';
  document.getElementById('task-name').value = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-deadline').value = '';
  document.getElementById('task-id').value = '';
  document.getElementById('task-project-id').value = currentProjectId;
  document.getElementById('task-tags-hidden').value = '[]';
  document.getElementById('task-status').value = 'not-started';
  document.getElementById('task-blocked-reason').value = '';
  document.getElementById('task-waiting-for').value = '';

  // הסתרת שדות מותנים בסטטוס
  document.getElementById('task-blocked-reason-container').style.display = 'none';
  document.getElementById('task-waiting-for-container').style.display = 'none';

  // איפוס תגיות
  document.getElementById('task-tags-items').innerHTML = '';
  document.getElementById('task-tag-input').value = '';

  // איפוס קבצים
  uploadedFiles = [];
  document.getElementById('file-preview').innerHTML = '';

  // איפוס תת-משימות
  document.getElementById('subtasks-list').innerHTML = '';
  document.getElementById('new-subtask-input').value = '';

  // איפוס תלויות
  document.getElementById('preceding-tasks').innerHTML = '';
  document.getElementById('following-tasks').innerHTML = '';

  // איפוס תזכורות
  document.getElementById('task-reminders-list').innerHTML = '<div class="no-reminders">אין תזכורות מוגדרות</div>';
  document.getElementById('reminder-type').value = 'before-deadline';
  document.getElementById('reminder-time-before').style.display = 'block';
  document.getElementById('reminder-date').style.display = 'none';
  document.getElementById('reminder-time').value = '';

  // מילוי תאריך היעד של הפרויקט כברירת מחדל אם קיים
  if (currentProjectData && currentProjectData.deadline) {
    document.getElementById('task-deadline').value = currentProjectData.deadline;
  }

  // הצגת בחירת אחראי רק בפרויקטים צוותיים
  const assigneeSection = document.getElementById('task-assignee-section');
  const assigneeSelect = document.getElementById('task-assignee');

  if (currentProjectData && currentProjectData.type === 'team') {
    // מילוי רשימת חברי הצוות
    assigneeSelect.innerHTML = '<option value="">לא משויך</option>';

    currentProjectMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member.userId;
      option.textContent = member.displayName;
      assigneeSelect.appendChild(option);
    });

    assigneeSection.classList.remove('hidden');
  } else {
    assigneeSection.classList.add('hidden');
  }

  // חלק בקשת העזרה
  document.getElementById('task-help-section').classList.toggle('hidden', !(currentProjectData && currentProjectData.type === 'team'));
  document.getElementById('task-help-request').checked = isHelpRequest;

  // עדכון אפשרויות התלויות
  updateDependencyOptions();

  document.getElementById('task-modal').style.display = 'block';
}

function showEditTaskModal(taskId, task) {
  // איפוס הטאבים והצגת טאב פרטי משימה
  document.querySelectorAll('.task-modal-tabs .tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector('.task-modal-tabs .tab[data-tab="task-details"]').classList.add('active');

  document.querySelectorAll('.task-tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById('task-details').style.display = 'block';

  // מילוי שדות המשימה
  document.getElementById('task-modal-title').textContent = task.isHelpRequest ? 'עריכת בקשת עזרה' : 'עריכת משימה';
  document.getElementById('task-name').value = task.name || '';
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-deadline').value = task.deadline || '';
  document.getElementById('task-id').value = taskId;
  document.getElementById('task-project-id').value = task.projectId;
  document.getElementById('task-status').value = task.status || 'not-started';
  document.getElementById('task-blocked-reason').value = task.blockedReason || '';
  document.getElementById('task-waiting-for').value = task.waitingFor || '';

  // הצגת/הסתרת שדות מותנים בסטטוס
  document.getElementById('task-blocked-reason-container').style.display = (task.status === 'blocked') ? 'block' : 'none';
  document.getElementById('task-waiting-for-container').style.display = (task.status === 'waiting') ? 'block' : 'none';

  // טעינת תגיות
  loadTagsToInput(task.tags || []);

  // טעינת קבצים
  loadTaskFiles(taskId);

  // טעינת תת-משימות
  loadSubtasks(task.subtasks || []);

  // טעינת תלויות
  loadTaskDependencies(taskId, task);

  // טעינת תזכורות
  loadTaskReminders(task.reminders || []);

  // הצגת בחירת אחראי רק בפרויקטים צוותיים
  const assigneeSection = document.getElementById('task-assignee-section');
  const assigneeSelect = document.getElementById('task-assignee');

  if (currentProjectData && currentProjectData.type === 'team') {
    // מילוי רשימת חברי הצוות
    assigneeSelect.innerHTML = '<option value="">לא משויך</option>';

    currentProjectMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member.userId;
      option.textContent = member.displayName;

      // בחירת האחראי הנוכחי
      if (task.assigneeId && task.assigneeId === member.userId) {
        option.selected = true;
      }

      assigneeSelect.appendChild(option);
    });

    assigneeSection.classList.remove('hidden');
  } else {
    assigneeSection.classList.add('hidden');
  }

  // חלק בקשת העזרה
  document.getElementById('task-help-section').classList.toggle('hidden', !(currentProjectData && currentProjectData.type === 'team'));
  document.getElementById('task-help-request').checked = task.isHelpRequest || false;

  // עדכון אפשרויות התלויות
  updateDependencyOptions(taskId);

  document.getElementById('task-modal').style.display = 'block';
}

function hideTaskModal() {
  document.getElementById('task-modal').style.display = 'none';
}

function setupTaskModalTabs() {
  // הוספת אירועי לחיצה לטאבים
  document.querySelectorAll('.task-modal-tabs .tab').forEach(tab => {
    tab.addEventListener('click', function() {
      // הסרת האקטיב מכל הטאבים
      document.querySelectorAll('.task-modal-tabs .tab').forEach(t => {
        t.classList.remove('active');
      });

      // הוספת אקטיב לטאב הנוכחי
      this.classList.add('active');

      // הסתרת כל התוכן
      document.querySelectorAll('.task-tab-content').forEach(content => {
        content.style.display = 'none';
      });

      // הצגת התוכן המתאים לטאב
      const tabId = this.getAttribute('data-tab');
      document.getElementById(tabId).style.display = 'block';
    });
  });

  // אירוע שינוי סוג תזכורת
  document.getElementById('reminder-type').addEventListener('change', function() {
    const type = this.value;

    if (type === 'before-deadline') {
      document.getElementById('reminder-time-before').style.display = 'block';
      document.getElementById('reminder-date').style.display = 'none';
    } else {
      document.getElementById('reminder-time-before').style.display = 'none';
      document.getElementById('reminder-date').style.display = 'block';
    }
  });
}

// === תת-משימות ===
function loadSubtasks(subtasks) {
  const subtasksList = document.getElementById('subtasks-list');
  subtasksList.innerHTML = '';

  if (!subtasks || subtasks.length === 0) {
    return;
  }

  subtasks.forEach((subtask, index) => {
    const subtaskItem = document.createElement('div');
    subtaskItem.className = 'subtask-item';
    subtaskItem.innerHTML = `
      <input type="checkbox" class="subtask-checkbox" data-index="${index}" ${subtask.completed ? 'checked' : ''}>
      <span class="subtask-name ${subtask.completed ? 'subtask-completed' : ''}">${subtask.name}</span>
      <span class="remove-subtask" data-index="${index}"><i class="fas fa-times"></i></span>
    `;

    // אירוע שינוי מצב תת-משימה
    subtaskItem.querySelector('.subtask-checkbox').addEventListener('change', function() {
      const subtaskName = subtaskItem.querySelector('.subtask-name');
      if (this.checked) {
        subtaskName.classList.add('subtask-completed');
      } else {
        subtaskName.classList.remove('subtask-completed');
      }
    });

    // אירוע מחיקת תת-משימה
    subtaskItem.querySelector('.remove-subtask').addEventListener('click', function() {
      subtaskItem.remove();
    });

    subtasksList.appendChild(subtaskItem);
  });
}

function addSubtask() {
  const subtaskInput = document.getElementById('new-subtask-input');
  const subtaskName = subtaskInput.value.trim();

  if (!subtaskName) {
    return;
  }

  const subtasksList = document.getElementById('subtasks-list');
  const subtaskItem = document.createElement('div');
  subtaskItem.className = 'subtask-item';

  // קביעת אינדקס חדש
  const lastIndex = subtasksList.children.length;

  subtaskItem.innerHTML = `
    <input type="checkbox" class="subtask-checkbox" data-index="${lastIndex}">
    <span class="subtask-name">${subtaskName}</span>
    <span class="remove-subtask" data-index="${lastIndex}"><i class="fas fa-times"></i></span>
  `;

  // אירוע שינוי מצב תת-משימה
  subtaskItem.querySelector('.subtask-checkbox').addEventListener('change', function() {
    const subtaskName = subtaskItem.querySelector('.subtask-name');
    if (this.checked) {
    subtaskName.classList.add('subtask-completed');
    } else {
      subtaskName.classList.remove('subtask-completed');
    }
  });

  // אירוע מחיקת תת-משימה
  subtaskItem.querySelector('.remove-subtask').addEventListener('click', function() {
    subtaskItem.remove();
  });

  subtasksList.appendChild(subtaskItem);
  subtaskInput.value = '';
}

// === תלויות משימה ===
function updateDependencyOptions(currentTaskId = null) {
  // טעינת כל המשימות בפרויקט הנוכחי למעט המשימה הנוכחית
  db.collection('tasks')
    .where('projectId', '==', currentProjectId)
    .get()
    .then(snapshot => {
      // רשימת המשימות
      const precedingSelect = document.getElementById('add-preceding-task');
      const followingSelect = document.getElementById('add-following-task');

      precedingSelect.innerHTML = '<option value="">בחר משימה...</option>';
      followingSelect.innerHTML = '<option value="">בחר משימה...</option>';

      snapshot.forEach(doc => {
        // לא מציגים את המשימה הנוכחית ברשימה
        if (currentTaskId && doc.id === currentTaskId) {
          return;
        }

        const task = doc.data();

        const option1 = document.createElement('option');
        option1.value = doc.id;
        option1.textContent = task.name;
        precedingSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = doc.id;
        option2.textContent = task.name;
        followingSelect.appendChild(option2);
      });
    })
    .catch(error => {
      console.error("Error loading dependencies options:", error);
    });
}

function loadTaskDependencies(taskId, task) {
  const precedingList = document.getElementById('preceding-tasks');
  const followingList = document.getElementById('following-tasks');

  precedingList.innerHTML = '';
  followingList.innerHTML = '';

  // טעינת משימות קודמות
  if (task.precedingTasks && task.precedingTasks.length > 0) {
    task.precedingTasks.forEach(precedingId => {
      db.collection('tasks').doc(precedingId).get()
        .then(doc => {
          if (doc.exists) {
            const precedingTask = doc.data();

            const dependencyItem = document.createElement('div');
            dependencyItem.className = 'dependency-item';
            dependencyItem.innerHTML = `
              <span class="dependency-name">${precedingTask.name}</span>
              <span class="remove-dependency" data-id="${doc.id}"><i class="fas fa-times"></i></span>
            `;

            // אירוע מחיקת תלות
            dependencyItem.querySelector('.remove-dependency').addEventListener('click', function() {
              removePrecedingTask(taskId, doc.id);
              dependencyItem.remove();
            });

            precedingList.appendChild(dependencyItem);
          }
        })
        .catch(error => {
          console.error("Error loading preceding task:", error);
        });
    });
  } else {
    precedingList.innerHTML = '<div>אין משימות קודמות מוגדרות</div>';
  }

  // טעינת משימות המשך
  if (task.followingTasks && task.followingTasks.length > 0) {
    task.followingTasks.forEach(followingId => {
      db.collection('tasks').doc(followingId).get()
        .then(doc => {
          if (doc.exists) {
            const followingTask = doc.data();

            const dependencyItem = document.createElement('div');
            dependencyItem.className = 'dependency-item';
            dependencyItem.innerHTML = `
              <span class="dependency-name">${followingTask.name}</span>
              <span class="remove-dependency" data-id="${doc.id}"><i class="fas fa-times"></i></span>
            `;

            // אירוע מחיקת תלות
            dependencyItem.querySelector('.remove-dependency').addEventListener('click', function() {
              removeFollowingTask(taskId, doc.id);
              dependencyItem.remove();
            });

            followingList.appendChild(dependencyItem);
          }
        })
        .catch(error => {
          console.error("Error loading following task:", error);
        });
    });
  } else {
    followingList.innerHTML = '<div>אין משימות המשך מוגדרות</div>';
  }
}

function addPrecedingTask() {
  const taskId = document.getElementById('task-id').value;
  const precedingId = document.getElementById('add-preceding-task').value;

  if (!precedingId) {
    return;
  }

  // לא ניתן להוסיף תלות כפולה
  const precedingList = document.getElementById('preceding-tasks');
  const existingDependency = precedingList.querySelector(`.remove-dependency[data-id="${precedingId}"]`);

  if (existingDependency) {
    alert('משימה זו כבר מוגדרת כמשימה קודמת');
    return;
  }

  // טעינת פרטי המשימה
  db.collection('tasks').doc(precedingId).get()
    .then(doc => {
      if (!doc.exists) {
        alert('המשימה לא נמצאה');
        return;
      }

      const precedingTask = doc.data();

      // אם זו משימה חדשה, אין עדיין taskId
      if (!taskId) {
        // יצירת אלמנט זמני
        if (precedingList.innerHTML === '<div>אין משימות קודמות מוגדרות</div>') {
          precedingList.innerHTML = '';
        }

        const dependencyItem = document.createElement('div');
        dependencyItem.className = 'dependency-item';
        dependencyItem.dataset.id = precedingId;
        dependencyItem.innerHTML = `
          <span class="dependency-name">${precedingTask.name}</span>
          <span class="remove-dependency" data-id="${precedingId}"><i class="fas fa-times"></i></span>
        `;

        // אירוע מחיקת תלות
        dependencyItem.querySelector('.remove-dependency').addEventListener('click', function() {
          dependencyItem.remove();

          if (precedingList.children.length === 0) {
            precedingList.innerHTML = '<div>אין משימות קודמות מוגדרות</div>';
          }
        });

        precedingList.appendChild(dependencyItem);
        document.getElementById('add-preceding-task').value = '';
        return;
      }

      // עדכון תלויות בדאטאבייס
      return db.runTransaction(transaction => {
        return transaction.get(db.collection('tasks').doc(taskId))
          .then(taskDoc => {
            if (!taskDoc.exists) {
              throw new Error('המשימה לא נמצאה');
            }

            const taskData = taskDoc.data();
            const precedingTasks = taskData.precedingTasks || [];

            // הוספת התלות
            if (!precedingTasks.includes(precedingId)) {
              precedingTasks.push(precedingId);
              transaction.update(db.collection('tasks').doc(taskId), { precedingTasks });
            }

            // עדכון המשימה המקושרת
            return transaction.get(db.collection('tasks').doc(precedingId))
              .then(precedingDoc => {
                if (!precedingDoc.exists) {
                  throw new Error('המשימה המקושרת לא נמצאה');
                }

                const precedingData = precedingDoc.data();
                const followingTasks = precedingData.followingTasks || [];

                if (!followingTasks.includes(taskId)) {
                  followingTasks.push(taskId);
                  transaction.update(db.collection('tasks').doc(precedingId), { followingTasks });
                }
              });
          });
      })
      .then(() => {
        // עדכון ה-UI
        if (precedingList.innerHTML === '<div>אין משימות קודמות מוגדרות</div>') {
          precedingList.innerHTML = '';
        }

        const dependencyItem = document.createElement('div');
        dependencyItem.className = 'dependency-item';
        dependencyItem.innerHTML = `
          <span class="dependency-name">${precedingTask.name}</span>
          <span class="remove-dependency" data-id="${precedingId}"><i class="fas fa-times"></i></span>
        `;

        // אירוע מחיקת תלות
        dependencyItem.querySelector('.remove-dependency').addEventListener('click', function() {
          removePrecedingTask(taskId, precedingId);
          dependencyItem.remove();

          if (precedingList.children.length === 0) {
            precedingList.innerHTML = '<div>אין משימות קודמות מוגדרות</div>';
          }
        });

        precedingList.appendChild(dependencyItem);
        document.getElementById('add-preceding-task').value = '';
      })
      .catch(error => {
        console.error("Error adding preceding task:", error);
        alert('שגיאה בהוספת משימה קודמת: ' + error.message);
      });
    })
    .catch(error => {
      console.error("Error loading preceding task:", error);
      alert('שגיאה בטעינת פרטי המשימה: ' + error.message);
    });
}

function addFollowingTask() {
  const taskId = document.getElementById('task-id').value;
  const followingId = document.getElementById('add-following-task').value;

  if (!followingId) {
    return;
  }

  // לא ניתן להוסיף תלות כפולה
  const followingList = document.getElementById('following-tasks');
  const existingDependency = followingList.querySelector(`.remove-dependency[data-id="${followingId}"]`);

  if (existingDependency) {
    alert('משימה זו כבר מוגדרת כמשימת המשך');
    return;
  }

  // טעינת פרטי המשימה
  db.collection('tasks').doc(followingId).get()
    .then(doc => {
      if (!doc.exists) {
        alert('המשימה לא נמצאה');
        return;
      }

      const followingTask = doc.data();

      // אם זו משימה חדשה, אין עדיין taskId
      if (!taskId) {
        // יצירת אלמנט זמני
        if (followingList.innerHTML === '<div>אין משימות המשך מוגדרות</div>') {
          followingList.innerHTML = '';
        }

        const dependencyItem = document.createElement('div');
        dependencyItem.className = 'dependency-item';
        dependencyItem.dataset.id = followingId;
        dependencyItem.innerHTML = `
          <span class="dependency-name">${followingTask.name}</span>
          <span class="remove-dependency" data-id="${followingId}"><i class="fas fa-times"></i></span>
        `;

        // אירוע מחיקת תלות
        dependencyItem.querySelector('.remove-dependency').addEventListener('click', function() {
          dependencyItem.remove();

          if (followingList.children.length === 0) {
            followingList.innerHTML = '<div>אין משימות המשך מוגדרות</div>';
          }
        });

        followingList.appendChild(dependencyItem);
        document.getElementById('add-following-task').value = '';
        return;
      }

      // עדכון תלויות בדאטאבייס
      return db.runTransaction(transaction => {
        return transaction.get(db.collection('tasks').doc(taskId))
          .then(taskDoc => {
            if (!taskDoc.exists) {
              throw new Error('המשימה לא נמצאה');
            }

            const taskData = taskDoc.data();
            const followingTasks = taskData.followingTasks || [];

            // הוספת התלות
            if (!followingTasks.includes(followingId)) {
              followingTasks.push(followingId);
              transaction.update(db.collection('tasks').doc(taskId), { followingTasks });
            }

            // עדכון המשימה המקושרת
            return transaction.get(db.collection('tasks').doc(followingId))
              .then(followingDoc => {
                if (!followingDoc.exists) {
                  throw new Error('המשימה המקושרת לא נמצאה');
                }

                const followingData = followingDoc.data();
                const precedingTasks = followingData.precedingTasks || [];

                if (!precedingTasks.includes(taskId)) {
                  precedingTasks.push(taskId);
                  transaction.update(db.collection('tasks').doc(followingId), { precedingTasks });
                }
              });
          });
      })
      .then(() => {
        // עדכון ה-UI
        if (followingList.innerHTML === '<div>אין משימות המשך מוגדרות</div>') {
          followingList.innerHTML = '';
        }

        const dependencyItem = document.createElement('div');
        dependencyItem.className = 'dependency-item';
        dependencyItem.innerHTML = `
          <span class="dependency-name">${followingTask.name}</span>
          <span class="remove-dependency" data-id="${followingId}"><i class="fas fa-times"></i></span>
        `;

        // אירוע מחיקת תלות
        dependencyItem.querySelector('.remove-dependency').addEventListener('click', function() {
          removeFollowingTask(taskId, followingId);
          dependencyItem.remove();

          if (followingList.children.length === 0) {
            followingList.innerHTML = '<div>אין משימות המשך מוגדרות</div>';
          }
        });

        followingList.appendChild(dependencyItem);
        document.getElementById('add-following-task').value = '';
      })
      .catch(error => {
        console.error("Error adding following task:", error);
        alert('שגיאה בהוספת משימת המשך: ' + error.message);
      });
    })
    .catch(error => {
      console.error("Error loading following task:", error);
      alert('שגיאה בטעינת פרטי המשימה: ' + error.message);
    });
}

function removePrecedingTask(taskId, precedingId) {
  if (!taskId || !precedingId) {
    return;
  }

  db.runTransaction(transaction => {
    return transaction.get(db.collection('tasks').doc(taskId))
      .then(taskDoc => {
        if (!taskDoc.exists) {
          throw new Error('המשימה לא נמצאה');
        }

        const taskData = taskDoc.data();
        const precedingTasks = taskData.precedingTasks || [];

        // הסרת התלות
        const updatedPreceding = precedingTasks.filter(id => id !== precedingId);
        transaction.update(db.collection('tasks').doc(taskId), { precedingTasks: updatedPreceding });

        // עדכון המשימה המקושרת
        return transaction.get(db.collection('tasks').doc(precedingId))
          .then(precedingDoc => {
            if (!precedingDoc.exists) {
              return; // אם המשימה נמחקה, אין צורך בעדכון
            }

            const precedingData = precedingDoc.data();
            const followingTasks = precedingData.followingTasks || [];

            const updatedFollowing = followingTasks.filter(id => id !== taskId);
            transaction.update(db.collection('tasks').doc(precedingId), { followingTasks: updatedFollowing });
          });
      });
  })
  .catch(error => {
    console.error("Error removing preceding task:", error);
    alert('שגיאה בהסרת המשימה הקודמת: ' + error.message);
  });
}

function removeFollowingTask(taskId, followingId) {
  if (!taskId || !followingId) {
    return;
  }

  db.runTransaction(transaction => {
    return transaction.get(db.collection('tasks').doc(taskId))
      .then(taskDoc => {
        if (!taskDoc.exists) {
          throw new Error('המשימה לא נמצאה');
        }

        const taskData = taskDoc.data();
        const followingTasks = taskData.followingTasks || [];

        // הסרת התלות
        const updatedFollowing = followingTasks.filter(id => id !== followingId);
        transaction.update(db.collection('tasks').doc(taskId), { followingTasks: updatedFollowing });

        // עדכון המשימה המקושרת
        return transaction.get(db.collection('tasks').doc(followingId))
          .then(followingDoc => {
            if (!followingDoc.exists) {
              return; // אם המשימה נמחקה, אין צורך בעדכון
            }

            const followingData = followingDoc.data();
            const precedingTasks = followingData.precedingTasks || [];

            const updatedPreceding = precedingTasks.filter(id => id !== taskId);
            transaction.update(db.collection('tasks').doc(followingId), { precedingTasks: updatedPreceding });
          });
      });
  })
  .catch(error => {
    console.error("Error removing following task:", error);
    alert('שגיאה בהסרת משימת ההמשך: ' + error.message);
  });
}

// === תזכורות ===
function loadTaskReminders(reminders) {
  const remindersList = document.getElementById('task-reminders-list');

  if (!reminders || reminders.length === 0) {
    remindersList.innerHTML = '<div class="no-reminders">אין תזכורות מוגדרות</div>';
    return;
  }

  remindersList.innerHTML = '';

  reminders.forEach((reminder, index) => {
    const reminderItem = document.createElement('div');
    reminderItem.className = 'reminder-item';

    // פורמט מידע על התזכורת
    let timeInfo = '';
    if (reminder.type === 'before-deadline') {
      timeInfo = `${getTimePeriodText(reminder.timeBefore)} לפני תאריך היעד`;
    } else {
      timeInfo = `בתאריך ${new Date(reminder.date).toLocaleDateString('he-IL')}`;
    }

    if (reminder.time) {
      timeInfo += ` בשעה ${reminder.time}`;
    }

    reminderItem.innerHTML = `
      <div class="reminder-item-header">
        <span class="reminder-item-title">${reminder.title || 'תזכורת'}</span>
        <button class="btn btn-sm btn-danger remove-reminder" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="reminder-item-time">${timeInfo}</div>
      ${reminder.note ? `<div class="reminder-item-desc">${reminder.note}</div>` : ''}
    `;

    reminderItem.querySelector('.remove-reminder').addEventListener('click', function() {
      reminderItem.remove();

      if (remindersList.children.length === 0) {
        remindersList.innerHTML = '<div class="no-reminders">אין תזכורות מוגדרות</div>';
      }
    });

    remindersList.appendChild(reminderItem);
  });
}

function addReminderToTask() {
  const remindersList = document.getElementById('task-reminders-list');
  const reminderType = document.getElementById('reminder-type').value;
  const reminderTime = document.getElementById('reminder-time').value;

  // בדיקת תקינות ערכים
  if (!reminderTime) {
    alert('אנא הזן שעה לתזכורת');
    return;
  }

  let reminderDate, timeBefore;

  if (reminderType === 'before-deadline') {
    timeBefore = document.getElementById('reminder-time-before').value;
    if (!timeBefore) {
      alert('אנא בחר זמן לפני תאריך היעד');
      return;
    }
  } else {
    reminderDate = document.getElementById('reminder-date').value;
    if (!reminderDate) {
      alert('אנא בחר תאריך לתזכורת');
      return;
    }
  }

  // הסרת הודעת "אין תזכורות"
  if (remindersList.querySelector('.no-reminders')) {
    remindersList.innerHTML = '';
  }

  // יצירת אובייקט התזכורת
  const reminder = {
    id: Date.now().toString(),
    type: reminderType,
    time: reminderTime
  };

  // הוספת נתונים בהתאם לסוג התזכורת
  if (reminderType === 'before-deadline') {
    reminder.timeBefore = timeBefore;

    // פורמט הצגה
    const timeBeforeText = getTimePeriodText(timeBefore);
    reminder.title = `תזכורת ${timeBeforeText} לפני תאריך היעד`;
  } else {
    reminder.date = reminderDate;
    reminder.title = 'תזכורת ביום מסוים';
  }

  // יצירת אלמנט התזכורת ב-UI
  const reminderItem = document.createElement('div');
  reminderItem.className = 'reminder-item';

  // פורמט מידע על התזכורת
  let timeInfo = '';
  if (reminderType === 'before-deadline') {
    timeInfo = `${getTimePeriodText(timeBefore)} לפני תאריך היעד`;
  } else {
    timeInfo = `בתאריך ${new Date(reminderDate).toLocaleDateString('he-IL')}`;
  }

  if (reminderTime) {
    timeInfo += ` בשעה ${reminderTime}`;
  }

  const index = remindersList.children.length;

  reminderItem.innerHTML = `
    <div class="reminder-item-header">
      <span class="reminder-item-title">${reminder.title}</span>
      <button class="btn btn-sm btn-danger remove-reminder" data-index="${index}">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="reminder-item-time">${timeInfo}</div>
  `;

  reminderItem.querySelector('.remove-reminder').addEventListener('click', function() {
    reminderItem.remove();

    if (remindersList.children.length === 0) {
      remindersList.innerHTML = '<div class="no-reminders">אין תזכורות מוגדרות</div>';
    }
  });

  remindersList.appendChild(reminderItem);

  // איפוס השדות
  document.getElementById('reminder-time').value = '';
  if (reminderType === 'specific-date') {
    document.getElementById('reminder-date').value = '';
  }
}

function getTimePeriodText(timeBefore) {
  // המרת ערך התזכורת לטקסט בעברית
  const [amount, unit] = timeBefore.split('-');

  switch (unit) {
    case 'hour':
      return `שעה ${amount === '1' ? 'אחת' : amount}`;
    case 'day':
      return `יום ${amount === '1' ? 'אחד' : amount}`;
    case 'days':
      return `${amount} ימים`;
    case 'week':
      return `שבוע ${amount === '1' ? 'אחד' : amount}`;
    case 'weeks':
      return `${amount} שבועות`;
    default:
      return timeBefore;
  }
}

function showAddReminderModal() {
  // איפוס שדות המודל
  document.getElementById('reminder-title').value = '';
  document.getElementById('reminder-description').value = '';
  document.getElementById('reminder-task').value = '';
  document.getElementById('reminder-modal-date').value = '';
  document.getElementById('reminder-modal-time').value = '';
  document.getElementById('reminder-repeat').value = 'never';

  // טעינת רשימת המשימות
  updateReminderTasksDropdown();

  // הצגת המודל
  document.getElementById('reminder-modal').style.display = 'block';
}

function hideReminderModal() {
  document.getElementById('reminder-modal').style.display = 'none';
}

function updateReminderTasksDropdown() {
  const taskSelect = document.getElementById('reminder-task');
  taskSelect.innerHTML = '<option value="">ללא משימה מקושרת</option>';

  // טעינת משימות מכל הפרויקטים של המשתמש
  Promise.all([
    // משימות שהמשתמש אחראי עליהן
    db.collection('tasks')
      .where('assigneeId', '==', currentUser.uid)
      .get(),

    // משימות בפרויקטים אישיים
    db.collection('projects')
      .where('userId', '==', currentUser.uid)
      .where('type', '==', 'personal')
      .get()
      .then(projectsSnapshot => {
        const projectIds = projectsSnapshot.docs.map(doc => doc.id);
        if (projectIds.length === 0) return { docs: [] };

        return db.collection('tasks')
          .where('projectId', 'in', projectIds)
          .get();
      })
  ])
  .then(([assignedTasks, personalTasks]) => {
    // איחוד המשימות ללא כפילויות
    const uniqueTasks = new Map();

    function addTasksToMap(snapshot) {
      snapshot.forEach(doc => {
        if (!uniqueTasks.has(doc.id)) {
          uniqueTasks.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        }
      });
    }

    addTasksToMap(assignedTasks);
    addTasksToMap(personalTasks);

    // הוספת המשימות לדרופדאון
    uniqueTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = task.name;
      taskSelect.appendChild(option);
    });
  })
  .catch(error => {
    console.error("Error updating reminder tasks dropdown:", error);
  });
}

function saveReminder() {
  const title = document.getElementById('reminder-title').value.trim();
  const description = document.getElementById('reminder-description').value.trim();
  const taskId = document.getElementById('reminder-task').value;
  const date = document.getElementById('reminder-modal-date').value;
  const time = document.getElementById('reminder-modal-time').value;
  const repeat = document.getElementById('reminder-repeat').value;

  if (!title) {
    alert('אנא הזן כותרת לתזכורת');
    return;
  }

  if (!date) {
    alert('אנא בחר תאריך לתזכורת');
    return;
  }

  if (!time) {
    alert('אנא בחר שעה לתזכורת');
    return;
  }

  showLoader();

  // יצירת אובייקט התזכורת
  const reminderData = {
    title,
    description,
    userId: currentUser.uid,
    date,
    time,
    repeat,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // אם נבחרה משימה, קישור אליה
  if (taskId) {
    reminderData.taskId = taskId;

    // קבלת פרטי המשימה
    db.collection('tasks').doc(taskId).get()
      .then(doc => {
        if (doc.exists) {
          const taskData = doc.data();
          reminderData.taskName = taskData.name;
          reminderData.projectId = taskData.projectId;

          // הוספת התזכורת למשימה
          const taskReminders = taskData.reminders || [];
          taskReminders.push({
            id: Date.now().toString(),
            title,
            note: description,
            date,
            time,
            type: 'specific-date'
          });

          // עדכון המשימה ושמירת התזכורת העצמאית
          return Promise.all([
            db.collection('tasks').doc(taskId).update({ reminders: taskReminders }),
            db.collection('reminders').add(reminderData)
          ]);
        } else {
          // המשימה לא נמצאה, שמירת תזכורת בלבד
          return db.collection('reminders').add(reminderData);
        }
      })
      .then(() => {
        hideLoader();
        hideReminderModal();
        showNotification('תזכורת נוספה', 'התזכורת נוספה בהצלחה', 'success');

        if (document.getElementById('reminders-view').classList.contains('hidden') === false) {
          loadReminders();
        }
      })
      .catch(error => {
        hideLoader();
        console.error("Error saving reminder:", error);
        alert('שגיאה בשמירת התזכורת: ' + error.message);
      });
  } else {
  // שמירת תזכורת ללא קישור למשימה
  db.collection('reminders').add(reminderData)
    .then(() => {
      hideLoader();
      hideReminderModal();
      showNotification('תזכורת נוספה', 'התזכורת נוספה בהצלחה', 'success');

      if (document.getElementById('reminders-view').classList.contains('hidden') === false) {
        loadReminders();
      }
    })
    .catch(error => {
      hideLoader();
      console.error("Error saving reminder:", error);
      alert('שגיאה בשמירת התזכורת: ' + error.message);
    });
}
}

function loadReminders() {
const activeList = document.getElementById('active-reminders-list');
const pastList = document.getElementById('past-reminders-list');

activeList.innerHTML = '<div>טוען תזכורות...</div>';
pastList.innerHTML = '<div>טוען תזכורות קודמות...</div>';

// קבלת התאריך הנוכחי בפורמט המתאים לפיירסטור
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString().split('T')[0];

// טעינת תזכורות פעילות
db.collection('reminders')
  .where('userId', '==', currentUser.uid)
  .where('date', '>=', todayStr)
  .orderBy('date')
  .get()
  .then(snapshot => {
    if (snapshot.empty) {
      activeList.innerHTML = '<div>אין תזכורות פעילות</div>';
    } else {
      activeList.innerHTML = '';

      snapshot.forEach(doc => {
        const reminder = doc.data();
        const reminderItem = createReminderItem(doc.id, reminder, false);
        activeList.appendChild(reminderItem);
      });
    }
  })
  .catch(error => {
    console.error("Error loading active reminders:", error);
    activeList.innerHTML = '<div>שגיאה בטעינת תזכורות</div>';
  });

// טעינת תזכורות עבר
db.collection('reminders')
  .where('userId', '==', currentUser.uid)
  .where('date', '<', todayStr)
  .orderBy('date', 'desc')
  .limit(20) // מגביל את כמות התזכורות הישנות
  .get()
  .then(snapshot => {
    if (snapshot.empty) {
      pastList.innerHTML = '<div>אין תזכורות קודמות</div>';
    } else {
      pastList.innerHTML = '';

      snapshot.forEach(doc => {
        const reminder = doc.data();
        const reminderItem = createReminderItem(doc.id, reminder, true);
        pastList.appendChild(reminderItem);
      });
    }
  })
  .catch(error => {
    console.error("Error loading past reminders:", error);
    pastList.innerHTML = '<div>שגיאה בטעינת תזכורות קודמות</div>';
  });
}

function createReminderItem(id, reminder, isPast) {
const reminderItem = document.createElement('div');
reminderItem.className = 'reminder-item';

if (isPast) {
  reminderItem.style.opacity = '0.7';
}

// תאריך ושעה מפורמטים
const date = new Date(`${reminder.date}T00:00:00`);
const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const timeStr = reminder.time || '00:00';

// תצוגת חזרה
let repeatText = '';
if (reminder.repeat && reminder.repeat !== 'never') {
  const repeatMap = {
    'daily': 'יומי',
    'weekly': 'שבועי',
    'monthly': 'חודשי'
  };
  repeatText = `<div><i class="fas fa-redo"></i> חוזר ${repeatMap[reminder.repeat] || reminder.repeat}</div>`;
}

// תצוגת משימה מקושרת
let taskText = '';
if (reminder.taskId && reminder.taskName) {
  taskText = `<div><i class="fas fa-tasks"></i> משימה: ${reminder.taskName}</div>`;
}

reminderItem.innerHTML = `
  <div class="reminder-item-header">
    <span class="reminder-item-title">${reminder.title}</span>
    <div>
      ${!isPast ? `
        <button class="btn btn-sm mark-complete-reminder" data-id="${id}" title="סמן כהושלם">
          <i class="fas fa-check"></i>
        </button>` : ''}
      <button class="btn btn-sm btn-danger delete-reminder" data-id="${id}" title="מחק">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>
  <div class="reminder-item-time">
    <i class="fas fa-calendar-alt"></i> ${dateStr} <i class="fas fa-clock"></i> ${timeStr}
  </div>
  ${reminder.description ? `<div class="reminder-item-desc">${reminder.description}</div>` : ''}
  ${taskText}
  ${repeatText}
`;

// אירועי לחיצה
const deleteButton = reminderItem.querySelector('.delete-reminder');
if (deleteButton) {
  deleteButton.addEventListener('click', function() {
    if (confirm('האם למחוק את התזכורת?')) {
      deleteReminder(id);
    }
  });
}

const markCompleteButton = reminderItem.querySelector('.mark-complete-reminder');
if (markCompleteButton) {
  markCompleteButton.addEventListener('click', function() {
    markReminderComplete(id);
  });
}

// אם יש משימה מקושרת, הוספת אירוע לחיצה לפתיחת המשימה
if (reminder.taskId && reminder.projectId) {
  const taskElement = reminderItem.querySelector('.reminder-item-desc + div');
  if (taskElement) {
    taskElement.style.cursor = 'pointer';
    taskElement.title = 'לחץ לפתיחת המשימה';
    taskElement.addEventListener('click', function() {
      openProject(reminder.projectId, null, reminder.taskId);
    });
  }
}

return reminderItem;
}

function deleteReminder(id) {
showLoader();

db.collection('reminders').doc(id).get()
  .then(doc => {
    if (doc.exists) {
      const reminder = doc.data();

      // אם יש משימה מקושרת, צריך גם להסיר את התזכורת מהמשימה
      if (reminder.taskId) {
        return db.collection('tasks').doc(reminder.taskId).get()
          .then(taskDoc => {
            if (taskDoc.exists) {
              const taskData = taskDoc.data();
              const taskReminders = taskData.reminders || [];

              // מחיקת התזכורת מהמשימה
              const updatedReminders = taskReminders.filter(r => {
                // זיהוי התזכורת לפי תאריך ושעה (או מזהה אם קיים)
                if (r.id) return r.id !== reminder.id;
                return !(r.date === reminder.date && r.time === reminder.time && r.title === reminder.title);
              });

              // עדכון המשימה ומחיקת התזכורת עצמה
              return Promise.all([
                db.collection('tasks').doc(reminder.taskId).update({ reminders: updatedReminders }),
                db.collection('reminders').doc(id).delete()
              ]);
            }

            // אם המשימה לא נמצאה, מחיקת התזכורת בלבד
            return db.collection('reminders').doc(id).delete();
          });
      }

      // אם אין משימה מקושרת, מחיקת התזכורת בלבד
      return db.collection('reminders').doc(id).delete();
    }
  })
  .then(() => {
    hideLoader();
    showNotification('התזכורת נמחקה', 'התזכורת נמחקה בהצלחה', 'success');
    loadReminders();
  })
  .catch(error => {
    hideLoader();
    console.error("Error deleting reminder:", error);
    showNotification('שגיאה', 'שגיאה במחיקת התזכורת', 'danger');
  });
}

function markReminderComplete(id) {
showLoader();

// קבלת פרטי התזכורת
db.collection('reminders').doc(id).get()
  .then(doc => {
    if (!doc.exists) {
      throw new Error('התזכורת לא נמצאה');
    }

    const reminder = doc.data();

    // טיפול בתזכורות חוזרות
    if (reminder.repeat && reminder.repeat !== 'never') {
      // חישוב התאריך הבא
      let nextDate = new Date(reminder.date);

      switch (reminder.repeat) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }

      // עדכון התזכורת לתאריך הבא
      const nextDateStr = nextDate.toISOString().split('T')[0];
      return db.collection('reminders').doc(id).update({
        date: nextDateStr,
        completed: firebase.firestore.FieldValue.arrayUnion({
          date: reminder.date,
          completedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
      });
    }

    // אם זו לא תזכורת חוזרת, העברה לארכיון
    return db.collection('reminders').doc(id).update({
      completed: true,
      completedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  })
  .then(() => {
    hideLoader();
    showNotification('התזכורת סומנה כהושלמה', 'התזכורת סומנה כהושלמה בהצלחה', 'success');
    loadReminders();
  })
  .catch(error => {
    hideLoader();
    console.error("Error marking reminder as complete:", error);
    showNotification('שגיאה', 'שגיאה בסימון התזכורת כהושלמה', 'danger');
  });
}

// === שמירת משימה ===
async function saveTask() {
const name = document.getElementById('task-name').value.trim();
const description = document.getElementById('task-description').value.trim();
const deadline = document.getElementById('task-deadline').value;
const taskId = document.getElementById('task-id').value;
const projectId = document.getElementById('task-project-id').value;
const tagsJson = document.getElementById('task-tags-hidden').value;
const tags = tagsJson ? JSON.parse(tagsJson) : [];
const status = document.getElementById('task-status').value;
const blockedReason = document.getElementById('task-blocked-reason').value.trim();
const waitingFor = document.getElementById('task-waiting-for').value.trim();

// מידע על בקשת העזרה
const isHelpRequest = document.getElementById('task-help-request').checked;

// מידע על האחראי (רק בפרויקטים צוותיים)
let assigneeId = null;
if (currentProjectData && currentProjectData.type === 'team') {
  assigneeId = document.getElementById('task-assignee').value;

  // אם זו בקשת עזרה ללא אחראי, לאפס את האחראי
  if (isHelpRequest && !assigneeId) {
    assigneeId = null;
  }
}

// איסוף תת-משימות
const subtasks = [];
document.querySelectorAll('.subtask-item').forEach(item => {
  const checkbox = item.querySelector('.subtask-checkbox');
  const name = item.querySelector('.subtask-name').textContent;

  subtasks.push({
    name,
    completed: checkbox.checked
  });
});

// איסוף תלויות
const precedingTasks = [];
document.querySelectorAll('#preceding-tasks .dependency-item .remove-dependency').forEach(item => {
  precedingTasks.push(item.getAttribute('data-id'));
});

const followingTasks = [];
document.querySelectorAll('#following-tasks .dependency-item .remove-dependency').forEach(item => {
  followingTasks.push(item.getAttribute('data-id'));
});

// איסוף תזכורות
const reminders = [];
document.querySelectorAll('#task-reminders-list .reminder-item').forEach(item => {
  const title = item.querySelector('.reminder-item-title').textContent;
  const timeInfo = item.querySelector('.reminder-item-time').textContent;

  // הפרדת המידע על התזכורת
  let type, date, time, timeBefore;

  if (timeInfo.includes('לפני תאריך היעד')) {
    type = 'before-deadline';
    timeBefore = extractTimeBefore(timeInfo);
  } else {
    type = 'specific-date';
    const dateMatch = timeInfo.match(/בתאריך (\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) {
      const dateParts = dateMatch[1].split('/');
      date = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
    }
  }

  const timeMatch = timeInfo.match(/בשעה (\d{1,2}:\d{1,2})/);
  if (timeMatch) {
    time = timeMatch[1];
  }

  reminders.push({
    id: Date.now().toString() + reminders.length,
    title,
    type,
    date,
    time,
    timeBefore
  });
});

if (!name) {
  showNotification('שדה חובה', 'אנא הזן שם למשימה', 'warning');
  return;
}

if (!projectId) {
  showNotification('שגיאה', 'לא נבחר פרויקט', 'danger');
  return;
}

showLoader();

const taskData = {
  name,
  description,
  deadline,
  projectId,
  tags,
  isHelpRequest,
  status,
  subtasks,
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

// הוספת מידע על מצב המשימה בהתאם לסטטוס
if (status === 'blocked' && blockedReason) {
  taskData.blockedReason = blockedReason;
} else if (taskId) {
  // מחיקת השדה אם המשימה לא תקועה - רק בעדכון משימה קיימת
  taskData.blockedReason = firebase.firestore.FieldValue.delete();
}

if (status === 'waiting' && waitingFor) {
  taskData.waitingFor = waitingFor;
} else if (taskId) {
  // מחיקת השדה אם המשימה לא ממתינה - רק בעדכון משימה קיימת
  taskData.waitingFor = firebase.firestore.FieldValue.delete();
}

// הגדרת תלויות
if (precedingTasks.length > 0) {
  taskData.precedingTasks = precedingTasks;
}

if (followingTasks.length > 0) {
  taskData.followingTasks = followingTasks;
}

// הגדרת תזכורות
if (reminders.length > 0) {
  taskData.reminders = reminders;
}

// הוספת שדה האחראי רק בפרויקט צוותי
if (currentProjectData && currentProjectData.type === 'team') {
  taskData.assigneeId = assigneeId || null;
}

try {
  // העלאת קבצים ל-Storage, אם יש
  let filesMetadata = [];
  if (uploadedFiles.length > 0) {
    // המשימה חייבת להיות קיימת כדי להעלות אליה קבצים
    let actualTaskId = taskId;

    if (!actualTaskId) {
      // אם זו משימה חדשה, יצירה מראש של ה-ID שלה
      const newTaskRef = db.collection('tasks').doc();
      actualTaskId = newTaskRef.id;
    }

    // העלאת הקבצים
    filesMetadata = await uploadTaskFiles(actualTaskId);

    // הוספת מידע הקבצים לנתוני המשימה
    if (taskId) {
      // אם זו משימה קיימת, שמירת הקבצים הקיימים ואז הוספת החדשים
      const existingTask = await db.collection('tasks').doc(taskId).get();
      if (existingTask.exists) {
        const existingFiles = existingTask.data().files || [];
        taskData.files = [...existingFiles, ...filesMetadata];
      } else {
        taskData.files = filesMetadata;
      }
    } else {
      // אם זו משימה חדשה
      taskData.files = filesMetadata;
    }
  }

  let savePromise;
  let actionType;

  if (taskId) {
    // עדכון משימה קיימת
    savePromise = db.collection('tasks').doc(taskId).update(taskData);
    actionType = 'ערך משימה';
  } else {
    // יצירת משימה חדשה - צריך להסיר את פעולות המחיקה
    // במקרה של משימה חדשה, פשוט לא כוללים את השדות שלא רלוונטיים
    if (taskData.blockedReason === firebase.firestore.FieldValue.delete()) {
      delete taskData.blockedReason;
    }

    if (taskData.waitingFor === firebase.firestore.FieldValue.delete()) {
      delete taskData.waitingFor;
    }

    taskData.createdBy = currentUser.uid;
    taskData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    // אם יצרנו מראש ID (למקרה של העלאת קבצים), נשתמש בו
   if (filesMetadata.length > 0) {
     const preCreatedTaskId = filesMetadata[0].path.split('/')[1];
     savePromise = db.collection('tasks').doc(preCreatedTaskId).set(taskData);
   } else {
     savePromise = db.collection('tasks').add(taskData);
   }

   actionType = 'יצר משימה';
 }

 savePromise
   .then((result) => {
     hideLoader();
     hideTaskModal();

     // רישום פעילות
     const idToLog = taskId || (result && result.id ? result.id : null);
     if (idToLog) {
       logActivity(actionType, idToLog, `${actionType} "${name}"`);
     }

     showNotification('המשימה נשמרה', 'המשימה נשמרה בהצלחה', 'success');

     // עדכון הסינון לפי תגיות
     updateProjectTaskTagsDropdown(projectId);

     // טעינה מחדש של המשימות
     if (currentTaskView === "list") {
       loadTasks(projectId);
     } else if (currentTaskView === "kanban") {
       loadTasks(projectId);
     } else {
       displayTasksByAssignee();
     }

     // רענון גרף התקדמות הפרויקט
     loadProjectProgressChart(projectId);
   })
   .catch(error => {
     hideLoader();
     console.error("Error saving task:", error);
     showNotification('שגיאה', 'שגיאה בשמירת משימה: ' + error.message, 'danger');
   });
} catch (error) {
 hideLoader();
 console.error("Error processing task save:", error);
 showNotification('שגיאה', 'שגיאה בעיבוד המשימה: ' + error.message, 'danger');
}
}

function extractTimeBefore(timeInfo) {
// המרת הטקסט בעברית לערך המתאים
if (timeInfo.includes('שעה אחת')) {
  return '1-hour';
} else if (timeInfo.includes('יום אחד')) {
  return '1-day';
} else if (timeInfo.includes('2 ימים')) {
  return '2-days';
} else if (timeInfo.includes('3 ימים')) {
  return '3-days';
} else if (timeInfo.includes('שבוע אחד')) {
  return '1-week';
} else if (timeInfo.includes('שבועיים') || timeInfo.includes('2 שבועות')) {
  return '2-weeks';
}

return '1-day'; // ברירת מחדל
}

function deleteTask(taskId) {
showLoader();

// קבלת נתוני המשימה לרישום פעילות
db.collection('tasks').doc(taskId).get()
  .then(doc => {
    if (doc.exists) {
      const taskData = doc.data();

      // הסרת תלויות
      const promises = [];

      // משימות קודמות
      if (taskData.precedingTasks && taskData.precedingTasks.length > 0) {
        taskData.precedingTasks.forEach(precedingId => {
          promises.push(
            db.collection('tasks').doc(precedingId).get()
              .then(precedingDoc => {
                if (precedingDoc.exists) {
                  const precedingData = precedingDoc.data();
                  const followingTasks = precedingData.followingTasks || [];

                  // הסרת המשימה מרשימת הההמשך
                  const updatedFollowing = followingTasks.filter(id => id !== taskId);
                  return db.collection('tasks').doc(precedingId).update({
                    followingTasks: updatedFollowing
                  });
                }
              })
              .catch(error => {
                console.error("Error updating preceding task:", error);
                return null;
              })
          );
        });
      }

      // משימות המשך
      if (taskData.followingTasks && taskData.followingTasks.length > 0) {
        taskData.followingTasks.forEach(followingId => {
          promises.push(
            db.collection('tasks').doc(followingId).get()
              .then(followingDoc => {
                if (followingDoc.exists) {
                  const followingData = followingDoc.data();
                  const precedingTasks = followingData.precedingTasks || [];

                  // הסרת המשימה מרשימת הקודמות
                  const updatedPreceding = precedingTasks.filter(id => id !== taskId);
                  return db.collection('tasks').doc(followingId).update({
                    precedingTasks: updatedPreceding
                  });
                }
              })
              .catch(error => {
                console.error("Error updating following task:", error);
                return null;
              })
          );
        });
      }

      // מחיקת קבצים אם קיימים
      const files = taskData.files || [];
      files.forEach(file => {
        promises.push(
          storage.ref(file.path).delete()
            .catch(error => {
              console.error("Error deleting file:", error);
              return null;
            })
        );
      });

      // מחיקת הודעות צ'אט אם קיימות
      promises.push(
        db.collection('task_messages')
          .where('taskId', '==', taskId)
          .get()
          .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => {
              batch.delete(doc.ref);
            });
            return batch.commit();
          })
          .catch(error => {
            console.error("Error deleting chat messages:", error);
            return null;
          })
      );

      // מחיקת תזכורות אם קיימות
      promises.push(
        db.collection('reminders')
          .where('taskId', '==', taskId)
          .get()
          .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => {
              batch.delete(doc.ref);
            });
            return batch.commit();
          })
          .catch(error => {
            console.error("Error deleting reminders:", error);
            return null;
          })
      );

      // מחיקת המשימה עצמה לאחר כל הפעולות הקודמות
      return Promise.all(promises)
        .then(() => {
          return db.collection('tasks').doc(taskId).delete()
            .then(() => {
              // רישום פעילות
              logActivity('מחק משימה', taskId, `מחק את המשימה "${taskData.name}"`);

              hideLoader();
              showNotification('המשימה נמחקה', 'המשימה נמחקה בהצלחה', 'success');

              // רענון תצוגת המשימות
              if (currentTaskView === "list") {
                loadTasks(currentProjectId);
              } else if (currentTaskView === "kanban") {
                loadTasks(currentProjectId);
              } else {
                displayTasksByAssignee();
              }

              // רענון גרף התקדמות הפרויקט
              loadProjectProgressChart(currentProjectId);
            });
        });
    } else {
      // המשימה לא נמצאה
      return db.collection('tasks').doc(taskId).delete();
    }
  })
  .catch(error => {
    hideLoader();
    console.error("Error deleting task:", error);
    showNotification('שגיאה', 'שגיאה במחיקת משימה: ' + error.message, 'danger');
  });
}

function quickUpdateTaskStatus(taskId, newStatus) {
showLoader();

// עדכון התאריך גם
const updates = {
  status: newStatus,
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

// הוספת שדות תלויי סטטוס
if (newStatus === 'completed') {
  updates.completedAt = firebase.firestore.FieldValue.serverTimestamp();
  updates.completedBy = currentUser.uid;
}

// מחיקת שדות לא רלוונטיים כשמשנים סטטוס
if (newStatus !== 'blocked') {
  updates.blockedReason = firebase.firestore.FieldValue.delete();
}

if (newStatus !== 'waiting') {
  updates.waitingFor = firebase.firestore.FieldValue.delete();
}

db.collection('tasks').doc(taskId).update(updates)
  .then(() => {
    hideLoader();
    showNotification('סטטוס עודכן', 'סטטוס המשימה עודכן בהצלחה', 'success');

    // רישום פעילות
    logActivity('עדכן סטטוס משימה', taskId, `שינה את סטטוס המשימה ל-${statusLabels[newStatus]}`);

    // טעינה מחדש של המשימות
    if (currentTaskView === "list") {
      loadTasks(currentProjectId);
    } else if (currentTaskView === "kanban") {
      loadTasks(currentProjectId);
    } else {
      displayTasksByAssignee();
    }

    // רענון גרף התקדמות הפרויקט
    loadProjectProgressChart(currentProjectId);

    // רענון הדשבורד אם פתוח
    if (!document.getElementById('dashboard-view').classList.contains('hidden')) {
      loadDashboard();
    }
  })
  .catch(error => {
    hideLoader();
    console.error("Error updating task status:", error);
    showNotification('שגיאה', 'שגיאה בעדכון סטטוס המשימה', 'danger');
  });
}

// === העלאת קבצים ===
function setupFileUpload() {
const fileUploadArea = document.getElementById('file-upload-area');
const fileInput = document.getElementById('task-files');

fileUploadArea.addEventListener('click', () => {
  fileInput.click();
});

fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--primary)';
});

fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.style.borderColor = '#ddd';
});

fileUploadArea.addEventListener('drop', (e) => {
e.preventDefault();
    fileUploadArea.style.borderColor = '#ddd';

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
    }
  });

  // סידור דומה לייבוא CSV
  const csvUploadArea = document.getElementById('csv-upload-area');
  const csvFileInput = document.getElementById('import-csv-file');

  if (csvUploadArea && csvFileInput) {
    csvUploadArea.addEventListener('click', () => {
      csvFileInput.click();
    });

    csvUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      csvUploadArea.style.borderColor = 'var(--primary)';
    });

    csvUploadArea.addEventListener('dragleave', () => {
      csvUploadArea.style.borderColor = '#ddd';
    });

    csvUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      csvUploadArea.style.borderColor = '#ddd';

      if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].name.endsWith('.csv')) {
        handleCsvFile(e.dataTransfer.files[0]);
      } else {
        showNotification('שגיאה', 'יש להעלות קובץ CSV בלבד', 'danger');
      }
    });

    csvFileInput.addEventListener('change', () => {
      if (csvFileInput.files.length > 0) {
        handleCsvFile(csvFileInput.files[0]);
      }
    });
  }
}

function handleFiles(files) {
  const filePreview = document.getElementById('file-preview');

  Array.from(files).forEach(file => {
    // בדיקת גודל הקובץ (מקסימום 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('שגיאה', `הקובץ ${file.name} גדול מדי. מקסימום 10MB.`, 'danger');
      return;
    }

    // הוספה למערך הקבצים
    uploadedFiles.push(file);

    // תצוגה מקדימה
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';

    // קביעת אייקון לפי סוג הקובץ
    let icon = 'fa-file';
    if (file.type.startsWith('image/')) icon = 'fa-file-image';
    else if (file.type.startsWith('video/')) icon = 'fa-file-video';
    else if (file.type.startsWith('audio/')) icon = 'fa-file-audio';
    else if (file.type.includes('pdf')) icon = 'fa-file-pdf';
    else if (file.type.includes('word')) icon = 'fa-file-word';
    else if (file.type.includes('excel') || file.type.includes('sheet')) icon = 'fa-file-excel';

    fileItem.innerHTML = `
      <i class="fas ${icon}" style="margin-left: 5px;"></i>
      <span>${file.name}</span>
      <i class="fas fa-times file-delete" data-name="${file.name}"></i>
    `;

    filePreview.appendChild(fileItem);
  });

  // הוספת אירוע מחיקה
  document.querySelectorAll('.file-delete').forEach(deleteBtn => {
    deleteBtn.addEventListener('click', function() {
      const fileName = this.getAttribute('data-name');

      // הסרה מהמערך
      uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);

      // הסרה מהתצוגה
      this.closest('.file-item').remove();
    });
  });
}

function handleCsvFile(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    const csvContent = e.target.result;

    // תצוגת שם הקובץ
    document.getElementById('csv-file-name').textContent = file.name;

    // תצוגה מקדימה של הנתונים
    const csvPreview = document.getElementById('csv-preview');

    // פרסור בסיסי של ה-CSV
    const rows = csvContent.split('\n');
    if (rows.length > 0) {
      const headers = rows[0].split(',');

      // בדיקה שיש את השדות הנדרשים
      const requiredFields = ['name', 'description', 'deadline', 'status', 'tags'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));

      if (missingFields.length > 0) {
        csvPreview.innerHTML = `
          <div style="color: var(--danger);">
            שגיאה: חסרים שדות חובה בקובץ: ${missingFields.join(', ')}
          </div>
        `;
        document.getElementById('import-tasks-btn').disabled = true;
        return;
      }

      // יצירת טבלת תצוגה מקדימה
      let tableHtml = '<table><thead><tr>';
      headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      // הוספת עד 5 שורות לתצוגה מקדימה
      const previewRows = rows.slice(1, 6);
      previewRows.forEach(row => {
        if (row.trim() === '') return;

        const cells = row.split(',');
        tableHtml += '<tr>';

        for (let i = 0; i < headers.length; i++) {
          const cellValue = cells[i] ? cells[i].replace(/"/g, '') : '';
          tableHtml += `<td>${cellValue}</td>`;
        }

        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table>';
      csvPreview.innerHTML = tableHtml;

      // הפעלת כפתור הייבוא
      document.getElementById('import-tasks-btn').disabled = false;

      // שמירת הקובץ לשימוש בייבוא
      window.csvFileToImport = {
        content: csvContent,
        headers: headers
      };
    } else {
      csvPreview.innerHTML = '<div style="color: var(--danger);">הקובץ ריק או לא בפורמט תקין</div>';
      document.getElementById('import-tasks-btn').disabled = true;
    }
  };

  reader.onerror = function() {
    document.getElementById('csv-preview').innerHTML = '<div style="color: var(--danger);">שגיאה בקריאת הקובץ</div>';
    document.getElementById('import-tasks-btn').disabled = true;
  };

  reader.readAsText(file);
}

async function uploadTaskFiles(taskId) {
  if (!uploadedFiles.length) return [];

  const filesMetadata = [];

  for (const file of uploadedFiles) {
    try {
      // יצירת הפניה ייחודית בסטורג'
      const fileRef = storage.ref(`tasks/${taskId}/${Date.now()}_${file.name}`);

      // העלאת הקובץ
      const snapshot = await fileRef.put(file);

      // קבלת הURL של הקובץ
      const downloadURL = await snapshot.ref.getDownloadURL();

      filesMetadata.push({
        name: file.name,
        path: snapshot.ref.fullPath,
        type: file.type,
        size: file.size,
        url: downloadURL,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
    }
  }

  // ניקוי מערך הקבצים המוחזקים זמנית
  uploadedFiles = [];
  document.getElementById('file-preview').innerHTML = '';

  return filesMetadata;
}

function loadTaskFiles(taskId) {
  const filePreview = document.getElementById('file-preview');
  filePreview.innerHTML = '';

  db.collection('tasks').doc(taskId).get()
    .then(doc => {
      if (doc.exists) {
        const task = doc.data();

        if (task.files && task.files.length > 0) {
          task.files.forEach(file => {
            // קביעת אייקון לפי סוג הקובץ
            let icon = 'fa-file';
            if (file.type.startsWith('image/')) icon = 'fa-file-image';
            else if (file.type.startsWith('video/')) icon = 'fa-file-video';
            else if (file.type.startsWith('audio/')) icon = 'fa-file-audio';
            else if (file.type.includes('pdf')) icon = 'fa-file-pdf';
            else if (file.type.includes('word')) icon = 'fa-file-word';
            else if (file.type.includes('excel') || file.type.includes('sheet')) icon = 'fa-file-excel';

            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
              <a href="${file.url}" target="_blank" style="display:flex; align-items:center; text-decoration:none; color:inherit;">
                <i class="fas ${icon}" style="margin-left: 5px;"></i>
                <span>${file.name}</span>
              </a>
              <i class="fas fa-times file-delete" data-id="${taskId}" data-path="${file.path}"></i>
            `;

            filePreview.appendChild(fileItem);
          });

          // הוספת אירוע מחיקה
          document.querySelectorAll('.file-delete').forEach(deleteBtn => {
            deleteBtn.addEventListener('click', function() {
              const taskId = this.getAttribute('data-id');
              const filePath = this.getAttribute('data-path');

              if (confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) {
                deleteTaskFile(taskId, filePath, this.closest('.file-item'));
              }
            });
          });
        } else {
          filePreview.innerHTML = '<div style="color:#888;">אין קבצים מצורפים</div>';
        }
      }
    })
    .catch(error => {
      console.error("Error loading task files:", error);
    });
}

function deleteTaskFile(taskId, filePath, fileElement) {
  showLoader();

  // מחיקת הקובץ מהסטורג'
  storage.ref(filePath).delete()
    .then(() => {
      // עדכון המשימה בפיירסטור
      return db.collection('tasks').doc(taskId).get()
        .then(doc => {
          if (doc.exists) {
            const task = doc.data();
            const updatedFiles = task.files.filter(file => file.path !== filePath);

            return db.collection('tasks').doc(taskId).update({
              files: updatedFiles
            });
          }
        });
    })
    .then(() => {
      // הסרת האלמנט מהתצוגה
      if (fileElement) {
        fileElement.remove();
      }

      hideLoader();
      showNotification('הקובץ נמחק', 'הקובץ נמחק בהצלחה', 'success');

      // אם אין קבצים נוספים, הוסף הודעה
      const filePreview = document.getElementById('file-preview');
      if (filePreview.children.length === 0) {
        filePreview.innerHTML = '<div style="color:#888;">אין קבצים מצורפים</div>';
      }

      // רענון היסטוריית פעילות
      logActivity(`מחק קובץ מהמשימה`, taskId);
    })
    .catch(error => {
      hideLoader();
      console.error("Error deleting file:", error);
      showNotification('שגיאה', 'אירעה שגיאה במחיקת הקובץ', 'danger');
    });
}

// === תגיות ===
function handleTagInput(e) {
  if (e.key === 'Enter' && this.value.trim() !== '') {
    e.preventDefault();
    addTag(this.value.trim());
    this.value = '';
  }
}

function addTag(tagName) {
  const tagsContainer = document.getElementById('task-tags-items');
  const existingTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(tag =>
    tag.textContent.replace('×', '').trim()
  );

  if (existingTags.includes(tagName)) {
    return; // מניעת כפילויות
  }

  const tagElement = document.createElement('div');
  tagElement.className = 'tag-item';
  tagElement.innerHTML = `
    ${tagName}
    <span class="tag-close">×</span>
  `;

  tagElement.querySelector('.tag-close').addEventListener('click', function() {
    tagElement.remove();
    updateTagsHiddenField();
  });

  tagsContainer.appendChild(tagElement);
  updateTagsHiddenField();

  // עדכון תגיות גלובליות
  allTags.add(tagName);
}

function updateTagsHiddenField() {
  const tagsContainer = document.getElementById('task-tags-items');
  const tags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(tag =>
    tag.textContent.replace('×', '').trim()
  );

  document.getElementById('task-tags-hidden').value = JSON.stringify(tags);
}

function loadTagsToInput(tags) {
  const tagsContainer = document.getElementById('task-tags-items');
  tagsContainer.innerHTML = '';

  if (tags && tags.length > 0) {
    tags.forEach(tag => addTag(tag));
  }
}

function getTagColorClass(tag) {
  // מתן צבע לתגית לפי השם
  const tagLower = tag.toLowerCase();

  if (tagLower.includes('דחוף') || tagLower.includes('חשוב')) {
    return 'tag-red';
  } else if (tagLower.includes('בינוני')) {
    return 'tag-yellow';
  } else if (tagLower.includes('נמוך')) {
    return 'tag-green';
  } else if (tagLower.includes('באג') || tagLower.includes('תקלה')) {
    return 'tag-red';
  } else if (tagLower.includes('פיתוח')) {
    return 'tag-blue';
  } else if (tagLower.includes('עיצוב')) {
    return 'tag-purple';
  } else if (tagLower.includes('תוכן')) {
    return 'tag-cyan';
  }

  // אם אין התאמה ספציפית, להחזיר צבע לפי hash של השם
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;

  const colors = ['tag-blue', 'tag-green', 'tag-red', 'tag-yellow', 'tag-purple', 'tag-cyan'];
  return colors[hash];
}

// === ייבוא/ייצוא ===
function showImportTasksModal() {
  // איפוס המודל
  document.getElementById('csv-file-name').textContent = '';
  document.getElementById('csv-preview').innerHTML = '';
  document.getElementById('import-tasks-btn').disabled = true;

  // עדכון רשימת הפרויקטים
  const projectSelect = document.getElementById('import-project');
  projectSelect.innerHTML = '';

  allProjects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.data.name;
    projectSelect.appendChild(option);
  });

  // אם יש פרויקט נוכחי, בחר אותו כברירת מחדל
  if (currentProjectId) {
    projectSelect.value = currentProjectId;
  }

  document.getElementById('import-tasks-modal').style.display = 'block';
}

function hideImportTasksModal() {
  document.getElementById('import-tasks-modal').style.display = 'none';
}

function downloadCsvTemplate() {
  const csvContent = 'name,description,deadline,status,tags\nמשימה לדוגמה,תיאור המשימה,2023-12-31,not-started,"תג1,תג2"';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'template_tasks.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importTasks() {
  if (!window.csvFileToImport) {
    showNotification('שגיאה', 'לא נבחר קובץ CSV לייבוא', 'danger');
    return;
  }

  const projectId = document.getElementById('import-project').value;
  if (!projectId) {
    showNotification('שגיאה', 'לא נבחר פרויקט', 'danger');
    return;
  }

  showLoader();

  const { content, headers } = window.csvFileToImport;
  const rows = content.split('\n');

  // קבלת אינדקסים של השדות
  const nameIndex = headers.indexOf('name');
  const descIndex = headers.indexOf('description');
  const deadlineIndex = headers.indexOf('deadline');
  const statusIndex = headers.indexOf('status');
  const tagsIndex = headers.indexOf('tags');

  // מערך למשימות תקינות
  const validTasks = [];

  // עיבוד שורות ה-CSV (דילוג על כותרת)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim();
    if (row === '') continue;

    // פיצול השורה לתאים, טיפול בתאים עם פסיקים
    const cells = [];
    let inQuotes = false;
    let currentCell = '';

    for (let j = 0; j < row.length; j++) {
      const char = row[j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell);
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    cells.push(currentCell); // הוספת התא האחרון

    // ניקוי גרשיים מהתאים
    for (let j = 0; j < cells.length; j++) {
      cells[j] = cells[j].replace(/"/g, '');
    }

    // וידוא שיש שם משימה
    const name = nameIndex >= 0 ? cells[nameIndex] : null;
    if (!name) continue;

    // בניית אובייקט המשימה
    const taskData = {
      name: name,
      description: descIndex >= 0 ? cells[descIndex] : '',
      deadline: deadlineIndex >= 0 ? cells[deadlineIndex] : null,
      status: statusIndex >= 0 && ['not-started', 'in-progress', 'waiting', 'blocked', 'completed'].includes(cells[statusIndex])
        ? cells[statusIndex] : 'not-started',
      projectId: projectId,
      createdBy: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // עיבוד תגיות אם יש
    if (tagsIndex >= 0 && cells[tagsIndex]) {
      // פיצול התגיות (יכולות להיות בפורמט של מחרוזת מופרדת בפסיקים)
      const tagsStr = cells[tagsIndex];
      const tags = tagsStr.split(/,\s*/);

      if (tags.length > 0) {
        taskData.tags = tags;
      }
    }

    validTasks.push(taskData);
  }

  // שמירת המשימות בפיירסטור
  if (validTasks.length === 0) {
    hideLoader();
    showNotification('שגיאה', 'לא נמצאו משימות תקינות לייבוא', 'warning');
    return;
  }

  // שמירה באצווה
  const batch = db.batch();

  validTasks.forEach(task => {
    const taskRef = db.collection('tasks').doc();
    batch.set(taskRef, task);
  });

  batch.commit()
    .then(() => {
      hideLoader();
      hideImportTasksModal();

      showNotification('ייבוא הושלם', `${validTasks.length} משימות יובאו בהצלחה`, 'success');

      // רענון המשימות אם מדובר בפרויקט הנוכחי
      if (projectId === currentProjectId) {
        loadTasks(currentProjectId);
      }

      // רישום פעילות
      logActivity('ייבא משימות', projectId, `ייבא ${validTasks.length} משימות מקובץ CSV`);
    })
    .catch(error => {
      hideLoader();
      console.error("Error importing tasks:", error);
      showNotification('שגיאה', 'שגיאה בייבוא המשימות: ' + error.message, 'danger');
    });
}

function exportTasks() {
  if (!userDashboardTasks || userDashboardTasks.length === 0) {
    showNotification('אין משימות לייצוא', 'לא נמצאו משימות לייצא', 'warning');
    return;
  }

  // בניית CSV
  let csvContent = 'שם משימה,פרויקט,תיאור,תאריך יעד,סטטוס,תגיות,אחראי\n';

  userDashboardTasks.forEach(task => {
    const project = allProjects.find(p => p.id === task.data.projectId);
    const projectName = project ? project.data.name : '';
    const description = task.data.description ? task.data.description.replace(/,/g, ' ').replace(/\n/g, ' ') : '';
    const deadline = task.data.deadline || '';
    const status = statusLabels[task.data.status] || '';
    const tags = task.data.tags ? task.data.tags.join(';') : '';

    // קבלת שם האחראי
    let assigneeName = '';
    if (task.data.assigneeId) {
      const assignee = currentProjectMembers.find(m => m.userId === task.data.assigneeId);
      if (assignee) {
        assigneeName = assignee.displayName || assignee.email;
      } else if (task.data.assigneeId === currentUser.uid) {
        assigneeName = currentUser.displayName || currentUser.email;
      }
    }

    csvContent += `"${task.data.name}","${projectName}","${description}","${deadline}","${status}","${tags}","${assigneeName}"\n`;
  });

  // יצירת קובץ להורדה
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `משימות_${new Date().toLocaleDateString('he-IL')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('הייצוא הושלם', 'המשימות יוצאו בהצלחה לקובץ CSV', 'success');

  // רישום פעילות
  logActivity('ייצא משימות', currentUser.uid, `ייצא ${userDashboardTasks.length} משימות`);
}

// === בחירה מרובה ===
function toggleBulkSelect() {
  const isChecked = document.getElementById('task-bulk-select').checked;

  if (isChecked) {
    // הוספת תיבות סימון לכל המשימות
    document.getElementById('bulk-actions').classList.remove('hidden');

    // טעינה מחדש של המשימות עם תיבות סימון
    if (currentTaskView === "list") {
      loadTasks(currentProjectId);
    } else if (currentTaskView === "kanban") {
      loadTasks(currentProjectId);
    } else {
      displayTasksByAssignee();
    }
  } else {
    // הסתרת אזור פעולות מרובות
    document.getElementById('bulk-actions').classList.add('hidden');

    // טעינה מחדש של המשימות ללא תיבות סימון
    if (currentTaskView === "list") {
      loadTasks(currentProjectId);
    } else if (currentTaskView === "kanban") {
      loadTasks(currentProjectId);
    } else {
      displayTasksByAssignee();
    }
  }
}

function updateBulkSelectionCount() {
  const selectedCount = document.querySelectorAll('.task-checkbox:checked').length;
  document.getElementById('selected-count').textContent = `${selectedCount} נבחרו`;

  // הפעלת/נטרול כפתורי הפעולות
  document.getElementById('bulk-status-change').disabled = selectedCount === 0;
  document.getElementById('bulk-assignee-change').disabled = selectedCount === 0;
  document.getElementById('bulk-delete').disabled = selectedCount === 0;
}

function getSelectedTaskIds() {
  return Array.from(document.querySelectorAll('.task-checkbox:checked')).map(checkbox =>
    checkbox.closest('.task-item').dataset.id
  );
}

function changeBulkStatus() {
  const newStatus = this.value;
  if (!newStatus) return;

  const selectedIds = getSelectedTaskIds();
  if (selectedIds.length === 0) return;

  if (confirm(`האם לשנות סטטוס של ${selectedIds.length} משימות ל-${statusLabels[newStatus]}?`)) {
    showLoader();

    // ביצוע העדכון בבאטץ'
    const batch = db.batch();

    selectedIds.forEach(taskId => {
      const taskRef = db.collection('tasks').doc(taskId);

      const updates = {
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (newStatus === 'completed') {
        updates.completedAt = firebase.firestore.FieldValue.serverTimestamp();
        updates.completedBy = currentUser.uid;
      }

      batch.update(taskRef, updates);
    });

    batch.commit()
      .then(() => {
        hideLoader();
        showNotification('עדכון מרוכז', `${selectedIds.length} משימות עודכנו בהצלחה`, 'success');

        // איפוס הדרופדאון
        document.getElementById('bulk-status-change').value = '';

        // רענון תצוגת המשימות
        if (currentTaskView === "list") {
          loadTasks(currentProjectId);
        } else if (currentTaskView === "kanban") {
          loadTasks(currentProjectId);
        } else {
          displayTasksByAssignee();
        }
      })
      .catch(error => {
        hideLoader();
        console.error("Error updating tasks status:", error);
        showNotification('שגיאה', 'שגיאה בעדכון סטטוס המשימות: ' + error.message, 'danger');
      });
  }
}

function changeBulkAssignee() {
  const newAssigneeId = this.value;
  if (!newAssigneeId && newAssigneeId !== 'none') return;

  const selectedIds = getSelectedTaskIds();
  if (selectedIds.length === 0) return;

  // קבלת שם האחראי להצגה בהודעת האישור
  let assigneeName = 'ללא אחראי';
  if (newAssigneeId !== 'none') {
    const assignee = currentProjectMembers.find(m => m.userId === newAssigneeId);
    if (assignee) {
      assigneeName = assignee.displayName;
    }
  }

  if (confirm(`האם לשייך ${selectedIds.length} משימות ל-${assigneeName}?`)) {
    showLoader();

    // ביצוע העדכון בבאטץ'
    const batch = db.batch();

    selectedIds.forEach(taskId => {
      const taskRef = db.collection('tasks').doc(taskId);

      const updates = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (newAssigneeId === 'none') {
        updates.assigneeId = null;
      } else {
        updates.assigneeId = newAssigneeId;
      }

      batch.update(taskRef, updates);
    });

    batch.commit()
        .then(() => {
          hideLoader();
          showNotification('עדכון מרוכז', `${selectedIds.length} משימות עודכנו בהצלחה`, 'success');

          // איפוס הדרופדאון
          document.getElementById('bulk-assignee-change').value = '';

          // רענון תצוגת המשימות
          if (currentTaskView === "list") {
            loadTasks(currentProjectId);
          } else if (currentTaskView === "kanban") {
            loadTasks(currentProjectId);
          } else {
            displayTasksByAssignee();
          }
        })
        .catch(error => {
          hideLoader();
          console.error("Error updating tasks assignee:", error);
          showNotification('שגיאה', 'שגיאה בעדכון אחראי המשימות: ' + error.message, 'danger');
        });
    }
  }

  function deleteBulkTasks() {
    const selectedIds = getSelectedTaskIds();
    if (selectedIds.length === 0) return;

    if (confirm(`האם למחוק ${selectedIds.length} משימות? פעולה זו אינה ניתנת לביטול!`)) {
      showLoader();

      // ביצוע המחיקה בבאטץ'
      const batch = db.batch();

      selectedIds.forEach(taskId => {
        batch.delete(db.collection('tasks').doc(taskId));
      });

      batch.commit()
        .then(() => {
          hideLoader();
          showNotification('מחיקה מרוכזת', `${selectedIds.length} משימות נמחקו בהצלחה`, 'success');

          // רענון תצוגת המשימות
          if (currentTaskView === "list") {
            loadTasks(currentProjectId);
          } else if (currentTaskView === "kanban") {
            loadTasks(currentProjectId);
          } else {
            displayTasksByAssignee();
          }

          // רישום פעילות
          logActivity('מחק משימות', currentProjectId, `מחק ${selectedIds.length} משימות`);
        })
        .catch(error => {
          hideLoader();
          console.error("Error deleting tasks:", error);
          showNotification('שגיאה', 'שגיאה במחיקת המשימות: ' + error.message, 'danger');
        });
    }
  }

  // === מצב חשיכה ===
  function toggleDarkMode() {
    const isDarkMode = document.getElementById('dark-mode-switch').checked;

    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }

    // רענון גרפים אם קיימים
    if (document.getElementById('stats-view').classList.contains('hidden') === false) {
      loadStats();
    }

    if (currentProjectId) {
      loadProjectProgressChart(currentProjectId);
    }
  }

  // === דשבורד ===
  function loadDashboard() {
    showLoader();

    // ראשית טען את כל הפרויקטים עבור הסינון
    updateProjectsDropdown();

    // טעינת המשימות של המשתמש
    Promise.all([
      // משימות שהמשתמש אחראי עליהן
      db.collection('tasks')
        .where('assigneeId', '==', currentUser.uid)
        .get(),

      // משימות בפרויקטים אישיים של המשתמש
      db.collection('projects')
        .where('userId', '==', currentUser.uid)
        .where('type', '==', 'personal')
        .get()
        .then(projectsSnapshot => {
          const projectIds = projectsSnapshot.docs.map(doc => doc.id);
          if (projectIds.length === 0) return { docs: [] };

          return db.collection('tasks')
            .where('projectId', 'in', projectIds)
            .get();
        }),

      // משימות שהן בקשות עזרה בפרויקטים של המשתמש
      db.collection('projects')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(projectsSnapshot => {
          const projectIds = projectsSnapshot.docs.map(doc => doc.id);
          if (projectIds.length === 0) return { docs: [] };

          return db.collection('tasks')
            .where('projectId', 'in', projectIds)
            .where('isHelpRequest', '==', true)
            .get();
        }),

      // בקשות עזרה בפרויקטים שהמשתמש חבר בהם
      db.collection('project_members')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(membershipsSnapshot => {
          const projectIds = membershipsSnapshot.docs.map(doc => doc.data().projectId);
          if (projectIds.length === 0) return { docs: [] };

          // Firebase מגביל queries ל-10 ערכים ב-in לכל היותר
          const projectBatches = [];
          for (let i = 0; i < projectIds.length; i += 10) {
            const batch = projectIds.slice(i, i + 10);
            projectBatches.push(batch);
          }

          const queries = projectBatches.map(batch =>
            db.collection('tasks')
              .where('projectId', 'in', batch)
              .where('isHelpRequest', '==', true)
              .get()
          );

          return Promise.all(queries).then(results => {
            // מיזוג התוצאות מכל ה-queries
            const mergedDocs = [];
            results.forEach(result => {
              result.docs.forEach(doc => mergedDocs.push(doc));
            });
            return { docs: mergedDocs };
          });
        })
    ])
    .then(([assignedTasks, personalTasks, ownedHelpTasks, memberHelpTasks]) => {
      // איחוד כל המשימות ומניעת כפילויות
      const uniqueTasks = new Map();

      function addToMap(snapshot, source) {
        snapshot.docs.forEach(doc => {
          if (!uniqueTasks.has(doc.id)) {
            const taskData = doc.data();
            uniqueTasks.set(doc.id, {
              id: doc.id,
              data: taskData,
              source: source
            });

            // שמירת תגיות לסינון
            if (taskData.tags && taskData.tags.length > 0) {
              taskData.tags.forEach(tag => allTags.add(tag));
            }
          }
        });
      }

      addToMap(assignedTasks, 'assigned');
      addToMap(personalTasks, 'personal');
      addToMap(ownedHelpTasks, 'ownedHelp');
      addToMap(memberHelpTasks, 'memberHelp');

      // שמירת המשימות במשתנה גלובלי
      userDashboardTasks = Array.from(uniqueTasks.values());

      // עדכון הסינון של תגיות
      updateTagsDropdown();

      // בדיקת תאריכי יעד
      checkDeadlines();

      // הצגת המשימות בדשבורד
      filterDashboardTasks();

      // עדכון תצוגה לפי המצב הנוכחי
      const viewButtons = document.querySelectorAll('#dashboard-view .view-toggle-btn');
      viewButtons.forEach(btn => {
        btn.classList.remove('active');
      });

      if (currentDashboardView === 'list') {
        document.querySelector('#dashboard-view .view-toggle-btn[data-view="list"]').classList.add('active');
        document.getElementById('dashboard-list-view').classList.remove('hidden');
        document.getElementById('dashboard-kanban-view').classList.add('hidden');
      } else {
        document.querySelector('#dashboard-view .view-toggle-btn[data-view="kanban"]').classList.add('active');
        document.getElementById('dashboard-list-view').classList.add('hidden');
        document.getElementById('dashboard-kanban-view').classList.remove('hidden');

        // עדכון תצוגת הקנבן
        updateKanbanView(userDashboardTasks.filter(task => {
          return task.data.status !== 'completed';
        }));
      }

      hideLoader();
    })
    .catch(error => {
      console.error("Error loading dashboard:", error);
      hideLoader();
      showNotification('שגיאה בטעינת משימות', error.message, 'danger');
    });
  }

  function updateProjectsDropdown() {
    const projectSelect = document.getElementById('dashboard-filter-project');
    projectSelect.innerHTML = '<option value="all">כל הפרויקטים</option>';

    allProjects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.data.name;
      projectSelect.appendChild(option);
    });
  }

  function updateTagsDropdown() {
    const tagSelect = document.getElementById('dashboard-filter-tag');
    tagSelect.innerHTML = '<option value="all">כל התגיות</option>';

    allTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagSelect.appendChild(option);
    });
  }

  function filterDashboardTasks(searchTerm = '') {
    const projectFilter = document.getElementById('dashboard-filter-project').value;
    const sortBy = document.getElementById('dashboard-sort-by').value;
    const tagFilter = document.getElementById('dashboard-filter-tag').value;
    const statusFilter = document.getElementById('dashboard-filter-status').value;

    // סינון המשימות
    let filteredTasks = userDashboardTasks.filter(task => {
      // סינון לפי פרויקט
      if (projectFilter !== 'all' && task.data.projectId !== projectFilter) {
        return false;
      }

      // סינון לפי תגית
      if (tagFilter !== 'all') {
        const taskTags = task.data.tags || [];
        if (!taskTags.includes(tagFilter)) {
          return false;
        }
      }

      // סינון לפי סטטוס
      if (statusFilter !== 'all' && task.data.status !== statusFilter) {
        return false;
      }

      // סינון לפי טקסט חיפוש
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = task.data.name && task.data.name.toLowerCase().includes(searchLower);
        const descMatch = task.data.description && task.data.description.toLowerCase().includes(searchLower);
        const tagsMatch = task.data.tags && task.data.tags.some(tag => tag.toLowerCase().includes(searchLower));

        return nameMatch || descMatch || tagsMatch;
      }

      return true;
    });

    // מיון המשימות
    filteredTasks.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          // אם אין תאריך, לשים בסוף
          if (!a.data.deadline) return 1;
          if (!b.data.deadline) return -1;
          return new Date(a.data.deadline) - new Date(b.data.deadline);
        case 'name':
          return a.data.name.localeCompare(b.data.name);
        case 'project':
          const projectA = allProjects.find(p => p.id === a.data.projectId);
          const projectB = allProjects.find(p => p.id === b.data.projectId);
          return (projectA?.data.name || '').localeCompare(projectB?.data.name || '');
        case 'status':
          const statusOrder = {
            'blocked': 0,
            'waiting': 1,
            'not-started': 2,
            'in-progress': 3,
            'completed': 4
          };
          const statusA = statusOrder[a.data.status] || 999;
          const statusB = statusOrder[b.data.status] || 999;
          return statusA - statusB;
        default:
          return 0;
      }
    });

    // הצגת המשימות
    if (currentDashboardView === 'list') {
      displayDashboardTasks(filteredTasks);
    } else {
      // עדכון תצוגת קנבן
      const nonCompletedTasks = filteredTasks.filter(task => task.data.status !== 'completed');
      const completedTasks = filteredTasks.filter(task => task.data.status === 'completed');

      updateKanbanView(nonCompletedTasks);

      // תצוגת משימות שהסתיימו בעמודה נפרדת
      const completedColumn = document.getElementById('kanban-completed');
      completedColumn.innerHTML = '';

      completedTasks.forEach(task => {
        const taskCard = createKanbanTaskCard(task);
        completedColumn.appendChild(taskCard);
      });

      updateKanbanTaskCounts();
    }
  }

  function displayDashboardTasks(tasks) {
    const pendingTasksContainer = document.getElementById('dashboard-tasks');
    const completedTasksContainer = document.getElementById('dashboard-completed-tasks');
    const helpTasksContainer = document.getElementById('dashboard-help-tasks');

    pendingTasksContainer.innerHTML = '';
    completedTasksContainer.innerHTML = '';
    helpTasksContainer.innerHTML = '';

    // בדיקה אם יש משימות
    if (tasks.length === 0) {
      pendingTasksContainer.innerHTML = '<div>אין משימות לתצוגה.</div>';
      completedTasksContainer.innerHTML = '<div>אין משימות שהושלמו.</div>';
      helpTasksContainer.innerHTML = '<div>אין בקשות עזרה.</div>';
      return;
    }

    // סינון המשימות לפי סוג
    const completedTasks = tasks.filter(task => task.data.status === 'completed');
    const helpTasks = tasks.filter(task => task.data.isHelpRequest && task.data.status !== 'completed');
    const pendingTasks = tasks.filter(task => task.data.status !== 'completed' && !task.data.isHelpRequest);

    // הצגת המשימות הפתוחות
    if (pendingTasks.length === 0) {
      pendingTasksContainer.innerHTML = '<div>אין משימות לביצוע.</div>';
    } else {
      pendingTasks.forEach(task => {
        pendingTasksContainer.appendChild(createDashboardTaskElement(task));
      });
    }

    // הצגת המשימות שהושלמו
    if (completedTasks.length === 0) {
      completedTasksContainer.innerHTML = '<div>אין משימות שהושלמו.</div>';
    } else {
      completedTasks.forEach(task => {
        completedTasksContainer.appendChild(createDashboardTaskElement(task));
      });
    }

    // הצגת בקשות העזרה
    if (helpTasks.length === 0) {
      helpTasksContainer.innerHTML = '<div>אין בקשות עזרה כרגע.</div>';
    } else {
      helpTasks.forEach(task => {
        helpTasksContainer.appendChild(createDashboardTaskElement(task));
      });
    }
  }

  function createDashboardTaskElement(task) {
    // מצא את הפרויקט המשויך
    const project = allProjects.find(p => p.id === task.data.projectId) || { data: { name: 'פרויקט לא ידוע' } };

    // יצירת אלמנט המשימה
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.data.status === 'completed' ? 'completed' : ''} ${task.data.isHelpRequest ? 'help-request' : ''}`;
    taskElement.dataset.id = task.id;

    // בדיקת תאריך יעד חלף
    let dueDateClass = '';
    let dueDateText = 'אין תאריך יעד';

    if (task.data.deadline) {
      const dueDate = new Date(task.data.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today && task.data.status !== 'completed') {
        dueDateClass = 'overdue';
      }

      dueDateText = dueDate.toLocaleDateString('he-IL');
    }

    // יצירת תגיות
    let tagsHtml = '';

    if (task.data.tags && task.data.tags.length > 0) {
      tagsHtml = '<div class="tags-container">';

      task.data.tags.forEach(tag => {
        const tagClass = getTagColorClass(tag);
        tagsHtml += '<span class="tag ' + tagClass + '">' + tag + '</span>';
      });

      tagsHtml += '</div>';
    }

    // קבלת תיאור סטטוס משימה
    const statusClass = `status-${task.data.status || 'not-started'}`;
    const statusText = statusLabels[task.data.status || 'not-started'];
    const statusHtml = `<span class="task-status ${statusClass}">${statusText}</span>`;

    // בניית תוכן ה-HTML
    let innerHtml = '';

    // חלק ראשון - תוכן המשימה
    innerHtml += '<div style="display: flex; align-items: flex-start;">';
    innerHtml += '<div class="task-content">';
    innerHtml += '<h4 class="task-title">' + task.data.name + '</h4>';
    innerHtml += '<div class="task-description">' + (task.data.description || 'אין תיאור') + '</div>';
    innerHtml += '<div class="task-meta">';
    innerHtml += '<span><i class="fas fa-briefcase"></i> ' + (project.data ? project.data.name : 'פרויקט לא ידוע') + '</span>';
    innerHtml += '<span class="task-due-date ' + dueDateClass + '"><i class="fas fa-calendar-alt"></i> ' + dueDateText + '</span>';
    innerHtml += statusHtml;

    if (task.data.isHelpRequest) {
      innerHtml += '<span class="badge" style="background-color: var(--warning); color: white;"><i class="fas fa-hands-helping"></i> בקשת עזרה</span>';
    }

    // מידע על האחראי למשימה (רק בפרויקטים צוותיים)
    if (task.data.assigneeId && project.data.type === 'team') {
      // חיפוש אחראי ברשימת חברי הצוות של הפרויקט
      let assigneeName = 'לא ידוע';
      let assigneeInitial = '?';

      // חיפוש בכל חברי הצוות של כל הפרויקטים
      const projectMembers = currentProjectMembers.filter(member => member.userId === task.data.assigneeId);

      if (projectMembers.length > 0) {
        assigneeName = projectMembers[0].displayName || projectMembers[0].email || 'משתמש';
        assigneeInitial = (assigneeName.charAt(0) || '?').toUpperCase();
      } else if (task.data.assigneeId === currentUser.uid) {
        assigneeName = currentUser.displayName || currentUser.email || 'משתמש';
        assigneeInitial = (assigneeName.charAt(0) || '?').toUpperCase();
      }

      innerHtml += '<span class="task-assignee">';
      innerHtml += `<span class="assignee-avatar">${assigneeInitial}</span>`;
      innerHtml += `<span>${assigneeName}</span>`;
      innerHtml += '</span>';
    }

    innerHtml += '</div>'; // סגירת task-meta
    innerHtml += tagsHtml;
    innerHtml += '</div>'; // סגירת task-content
    innerHtml += '</div>'; // סגירת div עליון

    // חלק שני - כפתורי פעולה
    innerHtml += '<div class="task-actions">';
    innerHtml += '<button class="btn btn-sm chat-task" data-id="' + task.id + '" data-name="' + task.data.name + '">';
    innerHtml += '<i class="fas fa-comments"></i>';
    innerHtml += '</button>';
    innerHtml += '<button class="btn btn-sm view-task" data-project-id="' + task.data.projectId + '" data-task-id="' + task.id + '">';
    innerHtml += '<i class="fas fa-eye"></i>';
    innerHtml += '</button>';

    if (task.data.isHelpRequest && !task.data.assigneeId) {
      innerHtml += '<button class="btn btn-sm btn-warning take-help-task" data-id="' + task.id + '">';
      innerHtml += '<i class="fas fa-hand-holding-heart"></i> קח משימה';
      innerHtml += '</button>';
    }

    innerHtml += '</div>'; // סגירת task-actions

    // הוספת ה-HTML לאלמנט
    taskElement.innerHTML = innerHtml;

    // הוספת אירועים
    const chatButton = taskElement.querySelector('.chat-task');
    if (chatButton) {
      chatButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const taskId = this.getAttribute('data-id');
        const taskName = this.getAttribute('data-name');
        showTaskChat(taskId, taskName);
      });
    }

    const viewButton = taskElement.querySelector('.view-task');
    if (viewButton) {
      viewButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const projectId = this.getAttribute('data-project-id');
        const taskId = this.getAttribute('data-task-id');
        openProject(projectId, null, taskId);
      });
    }

    const takeHelpButton = taskElement.querySelector('.take-help-task');
    if (takeHelpButton) {
      takeHelpButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const taskId = this.getAttribute('data-id');
        takeHelpTask(taskId);
      });
    }

    return taskElement;
  }

  function takeHelpTask(taskId) {
    if (!confirm('האם אתה בטוח שברצונך לקחת את המשימה?')) {
      return;
    }

    showLoader();

    db.collection('tasks').doc(taskId).update({
      assigneeId: currentUser.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      hideLoader();
      loadDashboard(); // רענון הדשבורד
      showNotification('המשימה נוספה', 'המשימה נוספה למשימות שלך', 'success');

      // רישום פעילות
      logActivity('לקח משימת עזרה', taskId);
    })
    .catch(error => {
      hideLoader();
      console.error("Error taking help task:", error);
      showNotification('שגיאה', 'שגיאה בלקיחת המשימה: ' + error.message, 'danger');
    });
  }

  // === סטטיסטיקות ===
  function loadStats() {
    showLoader();

    // מחיקת גרפים קיימים
    for (const chartId in charts) {
      if (charts[chartId]) {
        charts[chartId].destroy();
      }
    }

    Promise.all([
      loadProjectsProgressChart(),
      loadTasksByStatusChart(),
      loadWeeklyTasksChart(),
      loadTasksByTagChart()
    ])
      .then(() => {
        hideLoader();
      })
      .catch(error => {
        console.error("Error loading statistics:", error);
        hideLoader();
        showNotification('שגיאה', 'אירעה שגיאה בטעינת הסטטיסטיקות', 'danger');
      });
  }

  function loadProjectsProgressChart() {
    return db.collection('projects')
      .where('userId', '==', currentUser.uid)
      .get()
      .then(projectsSnapshot => {
        const projectIds = projectsSnapshot.docs.map(doc => doc.id);

        if (projectIds.length === 0) {
          return [];
        }

        // קבלת משימות לכל פרויקט
        const projectPromises = projectIds.map(projectId => {
          return db.collection('tasks')
            .where('projectId', '==', projectId)
            .get()
            .then(tasksSnapshot => {
              const totalTasks = tasksSnapshot.size;
              const completedTasks = tasksSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
              const project = projectsSnapshot.docs.find(doc => doc.id === projectId).data();

              return {
                name: project.name,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                totalTasks
              };
            });
        });

        return Promise.all(projectPromises);
      })
      .then(projectProgress => {
        // מיון פרויקטים לפי כמות משימות (הגדולים ביותר קודם)
        projectProgress.sort((a, b) => b.totalTasks - a.totalTasks);

        // הגבלה ל-10 הפרויקטים הגדולים
        const topProjects = projectProgress.slice(0, 10);

        const ctx = document.getElementById('projects-progress-chart').getContext('2d');

        charts.projectsProgress = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: topProjects.map(p => p.name),
            datasets: [{
              label: 'התקדמות באחוזים',
              data: topProjects.map(p => p.progress),
              backgroundColor: topProjects.map(p => {
                // צבע לפי אחוז התקדמות
                if (p.progress >= 75) return 'rgba(40, 167, 69, 0.7)';
                if (p.progress >= 50) return 'rgba(23, 162, 184, 0.7)';
                if (p.progress >= 25) return 'rgba(255, 193, 7, 0.7)';
                return 'rgba(220, 53, 69, 0.7)';
              }),
              borderColor: 'rgba(0, 0, 0, 0.1)',
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: 'אחוז התקדמות'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'שם פרויקט'
                }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      });
  }

  function loadTasksByStatusChart() {
    return Promise.all([
      // משימות שהמשתמש אחראי עליהן
      db.collection('tasks')
        .where('assigneeId', '==', currentUser.uid)
        .get(),

      // משימות בפרויקטים אישיים
      db.collection('projects')
        .where('userId', '==', currentUser.uid)
        .where('type', '==', 'personal')
        .get()
        .then(projectsSnapshot => {
          const projectIds = projectsSnapshot.docs.map(doc => doc.id);
          if (projectIds.length === 0) return { docs: [] };

          return db.collection('tasks')
            .where('projectId', 'in', projectIds)
            .get();
        })
    ])
      .then(([assignedTasks, personalTasks]) => {
        // איחוד המשימות למערך אחד
        const allTasks = [...assignedTasks.docs, ...personalTasks.docs];

        // ספירת משימות לפי סטטוס
        const statusCounts = {
          'not-started': 0,
          'in-progress': 0,
          'waiting': 0,
          'blocked': 0,
          'completed': 0
        };

        allTasks.forEach(doc => {
          const status = doc.data().status || 'not-started';
          if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
          }
        });

        const ctx = document.getElementById('tasks-by-status-chart').getContext('2d');

        charts.tasksByStatus = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: [
              'טרם התחילה',
              'בתהליך',
              'ממתינה',
              'תקועה',
              'הושלמה'
            ],
            datasets: [{
              data: [
                statusCounts['not-started'],
                statusCounts['in-progress'],
                statusCounts['waiting'],
                statusCounts['blocked'],
                statusCounts['completed']
              ],
              backgroundColor: [
                '#e9ecef',
                '#4895ef',
                '#ffc107',
                '#dc3545',
                '#28a745'
              ]
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
              }
            }
          }
        });
      });
  }

  function loadWeeklyTasksChart() {
    // יצירת תאריכים לשבוע
    const dates = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dates.push(date);
    }

    // פורמט התאריכים בעברית
    const dateLabels = dates.map(date => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month}`;
    });

    // ספירת משימות לפי תאריך יעד
    return Promise.all([
      // משימות שהמשתמש אחראי עליהן
      db.collection('tasks')
        .where('assigneeId', '==', currentUser.uid)
        .get(),

      // משימות בפרויקטים אישיים
      db.collection('projects')
        .where('userId', '==', currentUser.uid)
        .where('type', '==', 'personal')
        .get()
        .then(projectsSnapshot => {
          const projectIds = projectsSnapshot.docs.map(doc => doc.id);
          if (projectIds.length === 0) return { docs: [] };

          return db.collection('tasks')
            .where('projectId', 'in', projectIds)
            .get();
        })
    ])
      .then(([assignedTasks, personalTasks]) => {
        // איחוד המשימות למערך אחד
        const allTasks = [...assignedTasks.docs, ...personalTasks.docs];

        // ספירת משימות לפי תאריך יצירה
        const taskCounts = Array(7).fill(0);
        const completedCounts = Array(7).fill(0);

        allTasks.forEach(doc => {
          const task = doc.data();

          if (task.createdAt) {
            const createdDate = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);

            for (let i = 0; i < 7; i++) {
              const checkDate = dates[i];

              if (createdDate.getDate() === checkDate.getDate() &&
                  createdDate.getMonth() === checkDate.getMonth() &&
                  createdDate.getFullYear() === checkDate.getFullYear()) {
                taskCounts[i]++;

                if (task.status === 'completed') {
                  completedCounts[i]++;
                }

                break;
              }
            }
          }
        });

        const ctx = document.getElementById('weekly-tasks-chart').getContext('2d');

        charts.weeklyTasks = new Chart(ctx, {
          type: 'line',
          data: {
            labels: dateLabels,
            datasets: [
              {
                label: 'משימות שנוצרו',
                data: taskCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.3
              },
              {
                label: 'משימות שהושלמו',
                data: completedCounts,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.3
              }
            ]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'מספר משימות'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'תאריך'
                }
              }
            },
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      });
  }

  function loadTasksByTagChart() {
    return Promise.all([
      // משימות שהמשתמש אחראי עליהן
      db.collection('tasks')
        .where('assigneeId', '==', currentUser.uid)
        .get(),

      // משימות בפרויקטים אישיים
      db.collection('projects')
        .where('userId', '==', currentUser.uid)
        .where('type', '==', 'personal')
        .get()
        .then(projectsSnapshot => {
          const projectIds = projectsSnapshot.docs.map(doc => doc.id);
          if (projectIds.length === 0) return { docs: [] };

          return db.collection('tasks')
            .where('projectId', 'in', projectIds)
            .get();
        })
    ])
      .then(([assignedTasks, personalTasks]) => {
        // איחוד המשימות למערך אחד
        const allTasks = [...assignedTasks.docs, ...personalTasks.docs];

        // ספירת משימות לפי תגיות
        const tagCounts = {};

        allTasks.forEach(doc => {
          const task = doc.data();
          const tags = task.tags || [];

          tags.forEach(tag => {
            if (!tagCounts[tag]) {
              tagCounts[tag] = 0;
            }
            tagCounts[tag]++;
          });
        });

        // מיון התגיות לפי כמות המשימות
        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

        // לקיחת 10 התגיות המובילות
        const topTags = sortedTags.slice(0, 10);
        const topTagCounts = topTags.map(tag => tagCounts[tag]);

        // צבעים לתגיות
        const tagColors = topTags.map(tag => {
          const tagClass = getTagColorClass(tag);

          // המרת שמות הצבעים לצבעי RGBA
          switch (tagClass) {
            case 'tag-red': return 'rgba(220, 53, 69, 0.7)';
            case 'tag-green': return 'rgba(40, 167, 69, 0.7)';
            case 'tag-blue': return 'rgba(0, 123, 255, 0.7)';
            case 'tag-yellow': return 'rgba(255, 193, 7, 0.7)';
            case 'tag-purple': return 'rgba(111, 66, 193, 0.7)';
            case 'tag-cyan': return 'rgba(23, 162, 184, 0.7)';
            default: return `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.7)`;
          }
        });

        const ctx = document.getElementById('tasks-by-tag-chart').getContext('2d');

        charts.tasksByTag = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: topTags,
            datasets: [{
              data: topTagCounts,
              backgroundColor: tagColors,
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12
                }
              }
            }
          }
        });
      });
  }

  function loadProjectProgressChart(projectId) {
    if (!projectId) return Promise.resolve();

    return db.collection('tasks')
      .where('projectId', '==', projectId)
      .get()
      .then(snapshot => {
        const tasks = snapshot.docs.map(doc => doc.data());

        // ספירת משימות לפי סטטוס
        const statusCounts = {
          'not-started': 0,
          'in-progress': 0,
          'waiting': 0,
          'blocked': 0,
          'completed': 0
        };

        tasks.forEach(task => {
          const status = task.status || 'not-started';
          if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
          }
        });

        // חישוב אחוז התקדמות כולל
        const totalTasks = tasks.length;
        const completedTasks = statusCounts['completed'];
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const ctx = document.getElementById('project-progress-chart').getContext('2d');

        // ניקוי גרף קיים אם יש
        if (charts.projectProgress) {
          charts.projectProgress.destroy();
        }

        // יצירת גרף עוגה
        charts.projectProgress = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: [
              'טרם התחילה',
              'בתהליך',
              'ממתינה',
              'תקועה',
              'הושלמה'
            ],
            datasets: [{
              data: [
                statusCounts['not-started'],
                statusCounts['in-progress'],
                statusCounts['waiting'],
                statusCounts['blocked'],
                statusCounts['completed']
              ],
              backgroundColor: [
                '#e9ecef',
                '#4895ef',
                '#ffc107',
                '#dc3545',
                '#28a745'
              ]
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom'
              },
              title: {
                display: true,
                text: `התקדמות: ${progressPercentage}%`
              }
            }
          }
        });
      });
  }

  function updateProjectTaskTagsDropdown(projectId) {
    if (!projectId) return;

    const tagFilterElement = document.getElementById('task-filter-tag');

    // איפוס הדרופדאון
    tagFilterElement.innerHTML = '<option value="all">כל התגיות</option>';

    // קבלת כל התגיות מהמשימות של הפרויקט
    db.collection('tasks')
      .where('projectId', '==', projectId)
      .get()
      .then(snapshot => {
        const projectTags = new Set();

        snapshot.forEach(doc => {
          const task = doc.data();
          const tags = task.tags || [];

          tags.forEach(tag => {
            projectTags.add(tag);
            allTags.add(tag); // עדכון המשתנה הגלובלי
          });
        });

        // מיון התגיות
        const sortedTags = Array.from(projectTags).sort();

        // הוספת האפשרויות לדרופדאון
        sortedTags.forEach(tag => {
          const option = document.createElement('option');
          option.value = tag;
          option.textContent = tag;
          tagFilterElement.appendChild(option);
        });
      })
      .catch(error => {
        console.error("Error updating task tags dropdown:", error);
      });
  }

  function checkDeadlines() {
    // בדיקת תאריכי יעד של משימות
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // משימות עם תאריך יעד היום
    db.collection('tasks')
      .where('assigneeId', '==', currentUser.uid)
      .where('deadline', '==', todayStr)
      .where('status', '!=', 'completed')
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const count = snapshot.size;
          showNotification('תזכורת', `יש לך ${count} משימות שמועד היעד שלהן הוא היום!`, 'warning');
        }
      })
      .catch(error => {
        console.error("Error checking deadlines:", error);
      });

    // משימות עם תאריך יעד מחר
    db.collection('tasks')
      .where('assigneeId', '==', currentUser.uid)
      .where('deadline', '==', tomorrowStr)
      .where('status', '!=', 'completed')
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const count = snapshot.size;
          showNotification('תזכורת', `יש לך ${count} משימות שמועד היעד שלהן הוא מחר!`, 'info');
        }
      })
      .catch(error => {
        console.error("Error checking tomorrow's deadlines:", error);
      });

    // משימות שתאריך היעד שלהן עבר
    db.collection('tasks')
      .where('assigneeId', '==', currentUser.uid)
      .where('deadline', '<', todayStr)
      .where('status', '!=', 'completed')
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const count = snapshot.size;
          showNotification('אזהרה', `יש לך ${count} משימות שפג תוקפן!`, 'danger');
        }
      })
      .catch(error => {
        console.error("Error checking overdue deadlines:", error);
      });
  }

  function handleStatusChange() {
    const status = document.getElementById('task-status').value;

    // הצגה/הסתרה של שדות נוספים בהתאם לסטטוס
    const blockedReasonContainer = document.getElementById('task-blocked-reason-container');
    const waitingForContainer = document.getElementById('task-waiting-for-container');

    blockedReasonContainer.style.display = (status === 'blocked') ? 'block' : 'none';
    waitingForContainer.style.display = (status === 'waiting') ? 'block' : 'none';
  }

  function toggleView(e) {
    const viewType = this.getAttribute('data-view');

    // עדכון כפתורי התצוגה
    const viewButtons = this.closest('.view-toggle-container').querySelectorAll('.view-toggle-btn');
    viewButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    this.classList.add('active');

    // בדיקה אם זו תצוגת דשבורד או תצוגת פרויקט
    if (this.closest('#dashboard-view')) {
      // עדכון תצוגת דשבורד
      currentDashboardView = viewType;

      if (viewType === 'list') {
        document.getElementById('dashboard-list-view').classList.remove('hidden');
        document.getElementById('dashboard-kanban-view').classList.add('hidden');
      } else if (viewType === 'kanban') {
        document.getElementById('dashboard-list-view').classList.add('hidden');
        document.getElementById('dashboard-kanban-view').classList.remove('hidden');

        // עדכון תצוגת הקנבן
        updateKanbanView(userDashboardTasks.filter(task => {
          return task.data.status !== 'completed';
        }));
      }
    } else {
      // עדכון תצוגת פרויקט
      currentTaskView = viewType;

      if (viewType === 'list') {
        document.getElementById('tasks-list-view').classList.remove('hidden');
        document.getElementById('tasks-kanban-view').classList.add('hidden');
        document.getElementById('tasks-by-assignee-view').classList.add('hidden');

        loadTasks(currentProjectId);
      } else if (viewType === 'kanban') {
        document.getElementById('tasks-list-view').classList.add('hidden');
        document.getElementById('tasks-kanban-view').classList.remove('hidden');
        document.getElementById('tasks-by-assignee-view').classList.add('hidden');

        loadTasks(currentProjectId);
      } else if (viewType === 'assignee') {
        document.getElementById('tasks-list-view').classList.add('hidden');
        document.getElementById('tasks-kanban-view').classList.add('hidden');
        document.getElementById('tasks-by-assignee-view').classList.remove('hidden');

        displayTasksByAssignee();
      }
    }
  }

  function setupTabsListeners() {
    // אירועי לחיצה על טאבים לסינון פרויקטים
    document.querySelectorAll('.tabs .tab').forEach(tab => {
      tab.addEventListener('click', function() {
        // הסרת האקטיב מכל הטאבים
        document.querySelectorAll('.tabs .tab').forEach(t => {
          t.classList.remove('active');
        });

        // הוספת אקטיב לטאב הנוכחי
        this.classList.add('active');

        // עדכון הסינון הנוכחי
        currentFilter = this.getAttribute('data-filter');

        // טעינה מחדש של הפרויקטים
        loadProjects();
      });
    });
  }

  function setupModalClickOutside() {
    // סגירת מודלים בלחיצה מחוץ לתוכן
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
      modal.addEventListener('click', function(event) {
        if (event.target === this) {
          this.style.display = 'none';
        }
      });
    });

    // טיפול בתפריט המשתמש
    const userMenu = document.querySelector('.user-menu-toggle');
    const userDropdown = document.querySelector('.user-menu-dropdown');

    if (userMenu && userDropdown) {
      userMenu.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      document.addEventListener('click', function() {
        userDropdown.classList.remove('show');
      });
    }

    // טיפול בתפריט המשתמש במובייל
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navbarNav = document.getElementById('navbar-nav');

    if (hamburgerMenu && navbarNav) {
      hamburgerMenu.addEventListener('click', function() {
        navbarNav.classList.toggle('active');

        // שינוי מראה כפתור ההמבורגר
        const spans = this.querySelectorAll('span');
        spans.forEach(span => {
          span.classList.toggle('active');
        });
      });
    }
  }

  function showLoader() {
    document.getElementById('loader').style.display = 'flex';
  }

  function hideLoader() {
    document.getElementById('loader').style.display = 'none';
  }

  function showNotification(title, message, type = 'info') {
    const notificationsPanel = document.getElementById('notifications-panel');

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.borderRightColor = type === 'success' ? 'var(--success)' :
                                       type === 'danger' ? 'var(--danger)' :
                                       type === 'warning' ? 'var(--warning)' : 'var(--info)';

    notification.innerHTML = `
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    `;

    notificationsPanel.appendChild(notification);

    // הסרה אוטומטית אחרי 5 שניות
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  function updateUserMenuForAdmin() {
    // עדכון תפריט המשתמש למנהל
    if (currentUser && currentUser.isAdmin) {
      const userMenuDropdown = document.querySelector('.user-menu-dropdown');

      // הוספת כפתורים למנהל
      const manageUsersOption = document.createElement('a');
      manageUsersOption.href = '#';
      manageUsersOption.className = 'user-menu-item';
      manageUsersOption.innerHTML = '<i class="fas fa-users-cog"></i> ניהול משתמשים';
      manageUsersOption.addEventListener('click', showUserManagementModal);

      const pendingRegistrationsOption = document.createElement('a');
      pendingRegistrationsOption.href = '#';
      pendingRegistrationsOption.className = 'user-menu-item';
      pendingRegistrationsOption.innerHTML = '<i class="fas fa-user-clock"></i> בקשות הרשמה';
      pendingRegistrationsOption.addEventListener('click', showPendingRegistrationsModal);

      // הוספת האפשרויות לתפריט לפני "התנתק"
      const logoutOption = userMenuDropdown.querySelector('#logout-btn');
      userMenuDropdown.insertBefore(manageUsersOption, logoutOption);
      userMenuDropdown.insertBefore(pendingRegistrationsOption, logoutOption);
    }
  }

  function logActivity(action, targetId, details = '') {
    if (!currentUser) return;

    const activityData = {
      action: action,
      targetId: targetId,
      details: details,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName || currentUser.email.split('@')[0],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('activity_log').add(activityData)
      .catch(error => {
        console.error("Error logging activity:", error);
      });
  }

  function loadActivityLog() {
    const activityLog = document.getElementById('activity-log');
    activityLog.innerHTML = '<li class="activity-item"><span class="activity-time">טוען היסטוריה...</span></li>';

    // קבלת 50 הפעולות האחרונות
    db.collection('activity_log')
      .where('userId', '==', currentUser.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          activityLog.innerHTML = '<li class="activity-item">אין פעילות להצגה</li>';
          return;
        }

        activityLog.innerHTML = '';

        snapshot.forEach(doc => {
          const activity = doc.data();

          // פורמט התאריך
          let timeStr = 'לא ידוע';
          if (activity.timestamp) {
            const timestamp = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
            timeStr = timestamp.toLocaleDateString('he-IL') + ' ' + timestamp.toLocaleTimeString('he-IL');
          }

          // בחירת אייקון לפעולה
          let iconClass = 'fa-info-circle';

          if (activity.action.includes('יצר')) {
            iconClass = 'fa-plus-circle';
          } else if (activity.action.includes('ערך')) {
            iconClass = 'fa-edit';
          } else if (activity.action.includes('מחק')) {
            iconClass = 'fa-trash';
          } else if (activity.action.includes('הוסיף')) {
            iconClass = 'fa-user-plus';
          } else if (activity.action.includes('הסיר')) {
            iconClass = 'fa-user-minus';
          } else if (activity.action.includes('שינה')) {
            iconClass = 'fa-exchange-alt';
          } else if (activity.action.includes('סיים')) {
            iconClass = 'fa-check-circle';
          } else if (activity.action.includes('ייבא') || activity.action.includes('ייצא')) {
            iconClass = 'fa-file-export';
          }

          const activityItem = document.createElement('li');
          activityItem.className = 'activity-item';

          activityItem.innerHTML = `
            <span class="activity-icon"><i class="fas ${iconClass}"></i></span>
            <div>
              ${activity.details || activity.action}
              <span class="activity-time">${timeStr}</span>
            </div>
          `;

          activityLog.appendChild(activityItem);
        });
      })
      .catch(error => {
        console.error("Error loading activity log:", error);
        activityLog.innerHTML = '<li class="activity-item">שגיאה בטעינת היסטוריית פעילות</li>';
      });
  }

  // בדיקה למצב חשוך שמור
  document.addEventListener('DOMContentLoaded', function() {
    // בדיקה למצב חשוך
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedDarkMode === 'true') {
      document.getElementById('dark-mode-switch').checked = true;
      document.body.classList.add('dark-mode');
    }
  });
