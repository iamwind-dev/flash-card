// ===== App Main JavaScript =====

class FlashcardsApp {
  constructor() {
    this.currentView = 'home';
    this.deferredPrompt = null;
    this.isOffline = !navigator.onLine;
    
    this.init();
  }

  init() {
    this.forceWhiteTheme();
    this.setupEventListeners();
    this.setupServiceWorker();
    this.setupPWAInstallation();
    this.checkOnlineStatus();
    this.loadInitialData();
    this.hideLoadingScreen();
  }

  // ===== Force White Theme =====
  forceWhiteTheme() {
    // Force light theme
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.add('light-theme');
    document.body.setAttribute('data-theme', 'light');
    
    // Force white background
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    document.body.style.color = '#212121';
    
    // Override any system preferences
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        background-color: #FFFFFF !important;
        color: #212121 !important;
      }
      * {
        color-scheme: light !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log('Forced white theme applied');
  }

  // ===== Event Listeners Setup =====
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn, .bottom-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.navigateToView(view);
      });
    });

    // Quick actions from home
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // Modal controls
    const modal = document.getElementById('card-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-card');
    
    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => this.closeModal());
      }
    });

    // Close modal on backdrop click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    // Form submission
    document.getElementById('card-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCardSubmit();
    });

    // Search and filter
    document.getElementById('search-cards')?.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.handleFilter('category', e.target.value);
    });

    document.getElementById('filter-difficulty')?.addEventListener('change', (e) => {
      this.handleFilter('difficulty', e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.showToast('Đã kết nối internet', 'success');
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
      this.showToast('Bạn đang offline', 'warning');
    });
  }

  // ===== Service Worker Setup =====
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully:', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  this.showToast('Có cập nhật mới. Tải lại trang để áp dụng.', 'info');
                }
              });
            });
          })
          .catch((error) => {
            console.log('Service Worker registration failed:', error);
          });
      });
    }
  }

  // ===== PWA Installation =====
  setupPWAInstallation() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Show install button
      this.showInstallButton();
    });

    // Install button click handler
    document.getElementById('install-btn')?.addEventListener('click', () => {
      this.promptInstall();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.hideInstallButton();
      this.showToast('Ứng dụng đã được cài đặt thành công!', 'success');
    });
  }

  showInstallButton() {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.classList.add('hidden');
    }
  }

  promptInstall() {
    if (this.deferredPrompt) {
      // Show the prompt
      this.deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        this.deferredPrompt = null;
      });
    }
  }

  // ===== Navigation =====
  navigateToView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
      this.currentView = viewName;
    }

    // Update navigation states
    document.querySelectorAll('.nav-btn, .bottom-nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.view === viewName) {
        btn.classList.add('active');
      }
    });

    // View-specific initialization
    switch (viewName) {
      case 'home':
        this.refreshHomeStats();
        this.loadRecentActivity();
        break;
      case 'study':
        if (window.flashcardsManager) {
          window.flashcardsManager.initializeStudyMode();
        }
        break;
      case 'quiz':
        if (window.quizManager) {
          window.quizManager.resetQuiz();
        }
        break;
      case 'manage':
        this.loadCardsForManagement();
        break;
    }

    // Update URL hash for deep linking
    history.pushState({view: viewName}, '', `#${viewName}`);
  }

  // ===== Quick Actions =====
  handleQuickAction(action) {
    switch (action) {
      case 'start-study':
        this.navigateToView('study');
        break;
      case 'take-quiz':
        this.navigateToView('quiz');
        break;
      case 'add-card':
        this.openAddCardModal();
        break;
    }
  }

  // ===== Modal Management =====
  openAddCardModal() {
    const modal = document.getElementById('card-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('card-form');
    
    if (modal && modalTitle && form) {
      modalTitle.textContent = 'Thêm thẻ mới';
      form.reset();
      form.dataset.mode = 'add';
      delete form.dataset.cardId;
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      
      // Focus first input
      const firstInput = form.querySelector('input');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }

  openEditCardModal(cardId) {
    const cards = this.getStoredCards();
    const card = cards.find(c => c.id === cardId);
    
    if (!card) return;

    const modal = document.getElementById('card-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('card-form');
    
    if (modal && modalTitle && form) {
      modalTitle.textContent = 'Chỉnh sửa thẻ';
      form.dataset.mode = 'edit';
      form.dataset.cardId = cardId;
      
      // Populate form
      document.getElementById('card-word-input').value = card.word;
      document.getElementById('card-meaning-input').value = card.meaning;
      document.getElementById('card-example-input').value = card.example || '';
      document.getElementById('card-type-input').value = card.type;
      document.getElementById('card-difficulty-input').value = card.difficulty;
      
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    const modal = document.getElementById('card-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // ===== Card Management =====
  handleCardSubmit() {
    const form = document.getElementById('card-form');
    const formData = new FormData(form);
    
    const cardData = {
      word: document.getElementById('card-word-input').value.trim(),
      meaning: document.getElementById('card-meaning-input').value.trim(),
      example: document.getElementById('card-example-input').value.trim(),
      type: document.getElementById('card-type-input').value,
      difficulty: document.getElementById('card-difficulty-input').value,
      createdAt: new Date().toISOString(),
      lastStudied: null,
      studyCount: 0,
      correctCount: 0
    };

    // Validation
    if (!cardData.word || !cardData.meaning) {
      this.showToast('Vui lòng nhập đầy đủ từ vựng và nghĩa', 'error');
      return;
    }

    const mode = form.dataset.mode;
    const cardId = form.dataset.cardId;

    try {
      if (mode === 'edit' && cardId) {
        this.updateCard(cardId, cardData);
        this.showToast('Đã cập nhật thẻ thành công', 'success');
      } else {
        cardData.id = this.generateId();
        this.addCard(cardData);
        this.showToast('Đã thêm thẻ mới thành công', 'success');
      }
      
      this.closeModal();
      
      // Refresh current view if needed
      if (this.currentView === 'manage') {
        this.loadCardsForManagement();
      }
      if (this.currentView === 'home') {
        this.refreshHomeStats();
      }
      
    } catch (error) {
      console.error('Error saving card:', error);
      this.showToast('Có lỗi xảy ra khi lưu thẻ', 'error');
    }
  }

  addCard(cardData) {
    const cards = this.getStoredCards();
    cards.push(cardData);
    this.saveCards(cards);
  }

  updateCard(cardId, cardData) {
    const cards = this.getStoredCards();
    const index = cards.findIndex(c => c.id === cardId);
    if (index !== -1) {
      cards[index] = { ...cards[index], ...cardData };
      this.saveCards(cards);
    }
  }

  deleteCard(cardId) {
    if (confirm('Bạn có chắc chắn muốn xóa thẻ này?')) {
      const cards = this.getStoredCards();
      const filteredCards = cards.filter(c => c.id !== cardId);
      this.saveCards(filteredCards);
      
      this.showToast('Đã xóa thẻ thành công', 'success');
      
      // Refresh views
      if (this.currentView === 'manage') {
        this.loadCardsForManagement();
      }
      if (this.currentView === 'home') {
        this.refreshHomeStats();
      }
    }
  }

  // ===== Local Storage Management =====
  getStoredCards() {
    try {
      const cards = localStorage.getItem('flashcards');
      return cards ? JSON.parse(cards) : [];
    } catch (error) {
      console.error('Error loading cards from localStorage:', error);
      return [];
    }
  }

  saveCards(cards) {
    try {
      localStorage.setItem('flashcards', JSON.stringify(cards));
    } catch (error) {
      console.error('Error saving cards to localStorage:', error);
      this.showToast('Không thể lưu dữ liệu', 'error');
    }
  }

  getSettings() {
    try {
      const settings = localStorage.getItem('flashcards-settings');
      return settings ? JSON.parse(settings) : {
        studyMode: 'sequential',
        autoFlip: false,
        showHints: true,
        timedQuiz: false,
        questionsPerQuiz: 10
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem('flashcards-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // ===== Search and Filter =====
  handleSearch(query) {
    this.currentSearch = query.toLowerCase();
    this.filterAndDisplayCards();
  }

  handleFilter(type, value) {
    if (type === 'category') {
      this.currentCategoryFilter = value;
    } else if (type === 'difficulty') {
      this.currentDifficultyFilter = value;
    }
    this.filterAndDisplayCards();
  }

  filterAndDisplayCards() {
    const cards = this.getStoredCards();
    let filteredCards = cards;

    // Apply search filter
    if (this.currentSearch) {
      filteredCards = filteredCards.filter(card =>
        card.word.toLowerCase().includes(this.currentSearch) ||
        card.meaning.toLowerCase().includes(this.currentSearch)
      );
    }

    // Apply category filter
    if (this.currentCategoryFilter && this.currentCategoryFilter !== 'all') {
      filteredCards = filteredCards.filter(card =>
        card.type === this.currentCategoryFilter
      );
    }

    // Apply difficulty filter
    if (this.currentDifficultyFilter && this.currentDifficultyFilter !== 'all') {
      filteredCards = filteredCards.filter(card =>
        card.difficulty === this.currentDifficultyFilter
      );
    }

    this.displayCards(filteredCards);
  }

  // ===== Card Display =====
  displayCards(cards) {
    const container = document.getElementById('cards-list');
    if (!container) return;

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="no-cards-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
          <h3>Không tìm thấy thẻ nào</h3>
          <p>Thử thay đổi bộ lọc hoặc thêm thẻ mới.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = cards.map(card => this.createCardHTML(card)).join('');

    // Add event listeners for card actions
    container.querySelectorAll('.card-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cardId = e.target.closest('.card-item').dataset.cardId;
        this.openEditCardModal(cardId);
      });
    });

    container.querySelectorAll('.card-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cardId = e.target.closest('.card-item').dataset.cardId;
        this.deleteCard(cardId);
      });
    });
  }

  createCardHTML(card) {
    return `
      <div class="card-item" data-card-id="${card.id}">
        <div class="card-header">
          <div class="card-word-display">${this.escapeHtml(card.word)}</div>
          <div class="card-meaning-display">${this.escapeHtml(card.meaning)}</div>
        </div>
        <div class="card-body">
          ${card.example ? `<div class="card-example-display">"${this.escapeHtml(card.example)}"</div>` : ''}
          <div class="card-meta">
            <span class="card-type-display">${this.getTypeLabel(card.type)}</span>
            <span class="card-difficulty-display ${card.difficulty}">${this.getDifficultyLabel(card.difficulty)}</span>
          </div>
          <div class="card-actions">
            <button class="card-action-btn edit" title="Chỉnh sửa">
              ✏️ Sửa
            </button>
            <button class="card-action-btn delete" title="Xóa">
              🗑️ Xóa
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Home Stats =====
  refreshHomeStats() {
    const cards = this.getStoredCards();
    const learnedCards = cards.filter(card => card.studyCount > 0);
    
    // Calculate quiz score
    const totalAnswers = cards.reduce((sum, card) => sum + card.studyCount, 0);
    const correctAnswers = cards.reduce((sum, card) => sum + card.correctCount, 0);
    const quizScore = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    // Update display
    document.getElementById('total-cards').textContent = cards.length;
    document.getElementById('learned-cards').textContent = learnedCards.length;
    document.getElementById('quiz-score').textContent = `${quizScore}%`;
  }

  loadRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;

    const cards = this.getStoredCards();
    const recentCards = cards
      .filter(card => card.lastStudied)
      .sort((a, b) => new Date(b.lastStudied) - new Date(a.lastStudied))
      .slice(0, 5);

    if (recentCards.length === 0) {
      container.innerHTML = `
        <div class="no-activity">
          <p>Chưa có hoạt động gần đây. Bắt đầu học để xem lịch sử!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recentCards.map(card => `
      <div class="activity-item">
        <span class="activity-word">${this.escapeHtml(card.word)}</span>
        <span class="activity-time">${this.formatTimeAgo(card.lastStudied)}</span>
      </div>
    `).join('');
  }

  loadCardsForManagement() {
    // Initialize filters
    this.currentSearch = '';
    this.currentCategoryFilter = 'all';
    this.currentDifficultyFilter = 'all';
    
    // Reset filter controls
    document.getElementById('search-cards').value = '';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-difficulty').value = 'all';
    
    // Load and display cards
    const cards = this.getStoredCards();
    this.displayCards(cards);
  }

  // ===== Utility Functions =====
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getTypeLabel(type) {
    const labels = {
      noun: 'Danh từ',
      verb: 'Động từ',
      adjective: 'Tính từ',
      adverb: 'Trạng từ'
    };
    return labels[type] || type;
  }

  getDifficultyLabel(difficulty) {
    const labels = {
      easy: 'Dễ',
      medium: 'Trung bình',
      hard: 'Khó'
    };
    return labels[difficulty] || difficulty;
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  }

  // ===== Toast Notifications =====
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${this.escapeHtml(message)}</span>
      </div>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
          toast.remove();
        }, 300);
      }
    }, duration);
  }

  // ===== Keyboard Shortcuts =====
  handleKeyboardShortcuts(e) {
    // Only handle shortcuts when no input is focused
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case '1':
        this.navigateToView('home');
        break;
      case '2':
        this.navigateToView('study');
        break;
      case '3':
        this.navigateToView('quiz');
        break;
      case '4':
        this.navigateToView('manage');
        break;
      case 'n':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.openAddCardModal();
        }
        break;
      case 'Escape':
        this.closeModal();
        break;
    }
  }

  // ===== Online Status =====
  checkOnlineStatus() {
    const statusIndicator = this.createOnlineStatusIndicator();
    if (this.isOffline) {
      this.showToast('Bạn đang offline. Một số tính năng có thể bị hạn chế.', 'warning', 5000);
    }
  }

  createOnlineStatusIndicator() {
    // This could be implemented to show a persistent online/offline indicator
    return null;
  }

  // ===== Initial Data Load =====
  loadInitialData() {
    // Load sample data if no cards exist
    const cards = this.getStoredCards();
    if (cards.length === 0) {
      this.loadSampleData();
    }

    // Handle deep linking
    const hash = window.location.hash.slice(1);
    if (hash && ['home', 'study', 'quiz', 'manage'].includes(hash)) {
      this.navigateToView(hash);
    } else {
      this.navigateToView('home');
    }
  }

  loadSampleData() {
    const sampleCards = [
      {
        id: this.generateId(),
        word: "Hello",
        meaning: "Xin chào",
        example: "Hello, how are you today?",
        type: "noun",
        difficulty: "easy",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Beautiful",
        meaning: "Đẹp, xinh đẹp",
        example: "She has a beautiful smile.",
        type: "adjective",
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Learn",
        meaning: "Học, học tập",
        example: "I want to learn English.",
        type: "verb",
        difficulty: "easy",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Important",
        meaning: "Quan trọng",
        example: "Education is very important.",
        type: "adjective",
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Quickly",
        meaning: "Nhanh chóng, một cách nhanh chóng",
        example: "Please finish your work quickly.",
        type: "adverb",
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Knowledge",
        meaning: "Kiến thức",
        example: "Knowledge is power.",
        type: "noun",
        difficulty: "hard",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Understand",
        meaning: "Hiểu, thấu hiểu",
        example: "Do you understand this lesson?",
        type: "verb",
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Difficult",
        meaning: "Khó, khó khăn",
        example: "This exercise is very difficult.",
        type: "adjective",
        difficulty: "easy",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Success",
        meaning: "Thành công",
        example: "Hard work leads to success.",
        type: "noun",
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      },
      {
        id: this.generateId(),
        word: "Carefully",
        meaning: "Cẩn thận, một cách cẩn thận",
        example: "Drive carefully on the road.",
        type: "adverb",
        difficulty: "hard",
        createdAt: new Date().toISOString(),
        lastStudied: null,
        studyCount: 0,
        correctCount: 0
      }
    ];

    this.saveCards(sampleCards);
    console.log('Sample data loaded with', sampleCards.length, 'cards');
  }

  // ===== Loading Screen =====
  hideLoadingScreen() {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }, 1500); // Show loading for 1.5 seconds
  }
}

// ===== Force White Theme Immediately =====
// Apply white theme as soon as possible
(function() {
  document.documentElement.style.backgroundColor = '#FFFFFF';
  document.documentElement.style.color = '#212121';
  if (document.body) {
    document.body.style.backgroundColor = '#FFFFFF';
    document.body.style.color = '#212121';
    document.body.classList.add('light-theme');
    document.body.setAttribute('data-theme', 'light');
  }
})();

// ===== App Initialization =====
let app;

document.addEventListener('DOMContentLoaded', () => {
  // Force white theme again on DOM ready
  document.body.style.backgroundColor = '#FFFFFF';
  document.body.style.color = '#212121';
  document.body.classList.add('light-theme');
  document.body.setAttribute('data-theme', 'light');
  
  app = new FlashcardsApp();
});

// Export for use by other modules
window.FlashcardsApp = FlashcardsApp;