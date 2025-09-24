// ===== Flashcards Study Manager =====

class FlashcardsManager {
  constructor() {
    this.cards = [];
    this.currentCardIndex = 0;
    this.studyCards = [];
    this.isFlipped = false;
    this.settings = {};
    
    this.init();
  }

  init() {
    this.loadSettings();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Flashcard click to flip
    const flashcard = document.getElementById('flashcard');
    flashcard?.addEventListener('click', () => this.flipCard());

    // Study controls
    document.getElementById('prev-card')?.addEventListener('click', () => this.previousCard());
    document.getElementById('next-card')?.addEventListener('click', () => this.nextCard());

    // Difficulty buttons
    document.getElementById('easy-btn')?.addEventListener('click', () => this.markDifficulty('easy'));
    document.getElementById('medium-btn')?.addEventListener('click', () => this.markDifficulty('medium'));
    document.getElementById('hard-btn')?.addEventListener('click', () => this.markDifficulty('hard'));

    // Study options
    document.getElementById('shuffle-cards')?.addEventListener('change', (e) => {
      this.settings.shuffleCards = e.target.checked;
      this.saveSettings();
      if (this.studyCards.length > 0) {
        this.initializeStudyMode();
      }
    });

    document.getElementById('auto-flip')?.addEventListener('change', (e) => {
      this.settings.autoFlip = e.target.checked;
      this.saveSettings();
      if (this.settings.autoFlip && !this.isFlipped) {
        this.startAutoFlipTimer();
      } else {
        this.clearAutoFlipTimer();
      }
    });

    // Keyboard controls for study mode
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('study-view').classList.contains('active')) {
        this.handleStudyKeyboard(e);
      }
    });
  }

  // ===== Settings Management =====
  loadSettings() {
    try {
      const settings = localStorage.getItem('flashcards-study-settings');
      this.settings = settings ? JSON.parse(settings) : {
        shuffleCards: true,
        autoFlip: false,
        autoFlipDelay: 3000,
        showProgress: true,
        studyMode: 'all' // 'all', 'new', 'review'
      };
    } catch (error) {
      console.error('Error loading study settings:', error);
      this.settings = {};
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('flashcards-study-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving study settings:', error);
    }
  }

  // ===== Study Mode Initialization =====
  initializeStudyMode() {
    this.loadCards();
    this.prepareStudyCards();
    this.resetStudyState();
    
    if (this.studyCards.length === 0) {
      this.showNoCardsMessage();
      return;
    }

    this.updateStudyOptions();
    this.displayCurrentCard();
    this.updateProgress();
    this.updateNavigationButtons();
  }

  loadCards() {
    try {
      const cards = localStorage.getItem('flashcards');
      this.cards = cards ? JSON.parse(cards) : [];
    } catch (error) {
      console.error('Error loading cards:', error);
      this.cards = [];
    }
  }

  prepareStudyCards() {
    // Filter cards based on study mode
    let filteredCards = [...this.cards];

    switch (this.settings.studyMode) {
      case 'new':
        filteredCards = this.cards.filter(card => card.studyCount === 0);
        break;
      case 'review':
        filteredCards = this.cards.filter(card => card.studyCount > 0);
        break;
      default:
        filteredCards = [...this.cards];
    }

    // Shuffle if enabled
    if (this.settings.shuffleCards) {
      filteredCards = this.shuffleArray(filteredCards);
    }

    this.studyCards = filteredCards;
  }

  resetStudyState() {
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.clearAutoFlipTimer();
  }

  // ===== Card Navigation =====
  displayCurrentCard() {
    if (this.studyCards.length === 0) return;

    const card = this.studyCards[this.currentCardIndex];
    const flashcard = document.getElementById('flashcard');
    
    // Reset flip state
    this.isFlipped = false;
    flashcard?.classList.remove('flipped');

    // Update card content
    document.getElementById('card-word').textContent = card.word;
    document.getElementById('card-meaning').textContent = card.meaning;
    document.getElementById('card-example').textContent = card.example || '';
    document.getElementById('card-type').textContent = this.getTypeLabel(card.type);

    // Start auto-flip timer if enabled
    if (this.settings.autoFlip) {
      this.startAutoFlipTimer();
    }

    // Update card hint
    const hint = document.querySelector('.card-hint');
    if (hint) {
      hint.textContent = 'Nhấn để xem nghĩa';
    }
  }

  flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (!flashcard) return;

    this.isFlipped = !this.isFlipped;
    
    if (this.isFlipped) {
      flashcard.classList.add('flipped');
      this.clearAutoFlipTimer();
      
      // Mark as studied
      this.markCardAsStudied();
    } else {
      flashcard.classList.remove('flipped');
      if (this.settings.autoFlip) {
        this.startAutoFlipTimer();
      }
    }

    // Update hint text
    const hint = document.querySelector('.card-hint');
    if (hint) {
      hint.textContent = this.isFlipped ? 'Nhấn để xem từ vựng' : 'Nhấn để xem nghĩa';
    }
  }

  nextCard() {
    if (this.currentCardIndex < this.studyCards.length - 1) {
      this.currentCardIndex++;
      this.displayCurrentCard();
      this.updateProgress();
      this.updateNavigationButtons();
    } else {
      // End of study session
      this.showStudyComplete();
    }
  }

  previousCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.displayCurrentCard();
      this.updateProgress();
      this.updateNavigationButtons();
    }
  }

  // ===== Progress Management =====
  updateProgress() {
    const progressFill = document.getElementById('study-progress-fill');
    const counter = document.getElementById('study-counter');
    
    if (this.studyCards.length === 0) return;

    const progress = ((this.currentCardIndex + 1) / this.studyCards.length) * 100;
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    if (counter) {
      counter.textContent = `${this.currentCardIndex + 1} / ${this.studyCards.length}`;
    }
  }

  updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-card');
    const nextBtn = document.getElementById('next-card');

    if (prevBtn) {
      prevBtn.disabled = this.currentCardIndex === 0;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentCardIndex >= this.studyCards.length - 1;
    }
  }

  // ===== Study Options =====
  updateStudyOptions() {
    const shuffleCheckbox = document.getElementById('shuffle-cards');
    const autoFlipCheckbox = document.getElementById('auto-flip');

    if (shuffleCheckbox) {
      shuffleCheckbox.checked = this.settings.shuffleCards;
    }
    
    if (autoFlipCheckbox) {
      autoFlipCheckbox.checked = this.settings.autoFlip;
    }
  }

  // ===== Auto Flip Timer =====
  startAutoFlipTimer() {
    this.clearAutoFlipTimer();
    if (this.settings.autoFlip && !this.isFlipped) {
      this.autoFlipTimer = setTimeout(() => {
        if (!this.isFlipped) {
          this.flipCard();
        }
      }, this.settings.autoFlipDelay);
    }
  }

  clearAutoFlipTimer() {
    if (this.autoFlipTimer) {
      clearTimeout(this.autoFlipTimer);
      this.autoFlipTimer = null;
    }
  }

  // ===== Difficulty Marking =====
  markDifficulty(difficulty) {
    if (this.studyCards.length === 0) return;

    const currentCard = this.studyCards[this.currentCardIndex];
    
    // Update card difficulty and study stats
    currentCard.difficulty = difficulty;
    currentCard.lastStudied = new Date().toISOString();
    
    // Save updated card
    this.updateCardInStorage(currentCard);

    // Show feedback
    this.showDifficultyFeedback(difficulty);

    // Auto advance after marking difficulty
    setTimeout(() => {
      this.nextCard();
    }, 1000);
  }

  markCardAsStudied() {
    if (this.studyCards.length === 0) return;

    const currentCard = this.studyCards[this.currentCardIndex];
    currentCard.studyCount = (currentCard.studyCount || 0) + 1;
    currentCard.lastStudied = new Date().toISOString();
    
    this.updateCardInStorage(currentCard);
  }

  updateCardInStorage(updatedCard) {
    try {
      const cards = JSON.parse(localStorage.getItem('flashcards') || '[]');
      const index = cards.findIndex(card => card.id === updatedCard.id);
      
      if (index !== -1) {
        cards[index] = updatedCard;
        localStorage.setItem('flashcards', JSON.stringify(cards));
      }
    } catch (error) {
      console.error('Error updating card in storage:', error);
    }
  }

  // ===== Feedback =====
  showDifficultyFeedback(difficulty) {
    const messages = {
      easy: 'Tuyệt vời! 😊',
      medium: 'Khá tốt! 😐',
      hard: 'Cần ôn luyện thêm! 😰'
    };

    const colors = {
      easy: 'var(--success-color)',
      medium: 'var(--warning-color)',
      hard: 'var(--error-color)'
    };

    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${colors[difficulty]};
      color: white;
      padding: 1rem 2rem;
      border-radius: 10px;
      font-size: 1.2rem;
      font-weight: bold;
      z-index: 10000;
      animation: feedbackPulse 0.8s ease;
    `;
    feedback.textContent = messages[difficulty];
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 1000);
  }

  showStudyComplete() {
    const completionStats = this.calculateStudyStats();
    
    const message = `
      🎉 Hoàn thành buổi học!
      
      📊 Thống kê:
      • Tổng thẻ: ${completionStats.total}
      • Dễ: ${completionStats.easy}
      • Trung bình: ${completionStats.medium}
      • Khó: ${completionStats.hard}
      
      Bạn có muốn học lại không?
    `;

    if (confirm(message)) {
      this.initializeStudyMode();
    } else {
      // Navigate to home
      if (window.app) {
        window.app.navigateToView('home');
      }
    }
  }

  calculateStudyStats() {
    const stats = {
      total: this.studyCards.length,
      easy: 0,
      medium: 0,
      hard: 0
    };

    this.studyCards.forEach(card => {
      if (card.difficulty) {
        stats[card.difficulty]++;
      }
    });

    return stats;
  }

  showNoCardsMessage() {
    const container = document.querySelector('#study-view .flashcard-container');
    if (container) {
      container.innerHTML = `
        <div class="no-cards-study" style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
          <h3>Chưa có thẻ để học</h3>
          <p>Thêm một số thẻ từ vựng để bắt đầu học tập!</p>
          <button class="action-btn primary" onclick="window.app?.navigateToView('manage')">
            Thêm thẻ mới
          </button>
        </div>
      `;
    }
  }

  // ===== Keyboard Controls =====
  handleStudyKeyboard(e) {
    // Don't handle if typing in an input
    if (document.activeElement.tagName === 'INPUT') return;

    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        this.flipCard();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.previousCard();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.nextCard();
        break;
      case '1':
        e.preventDefault();
        this.markDifficulty('easy');
        break;
      case '2':
        e.preventDefault();
        this.markDifficulty('medium');
        break;
      case '3':
        e.preventDefault();
        this.markDifficulty('hard');
        break;
    }
  }

  // ===== Utility Functions =====
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

  // ===== Study Mode Selection =====
  setStudyMode(mode) {
    this.settings.studyMode = mode;
    this.saveSettings();
    this.initializeStudyMode();
  }

  // ===== Statistics =====
  getStudyStatistics() {
    const stats = {
      totalCards: this.cards.length,
      studiedCards: this.cards.filter(card => card.studyCount > 0).length,
      averageStudyCount: 0,
      difficultyDistribution: {
        easy: 0,
        medium: 0,
        hard: 0
      }
    };

    if (stats.totalCards > 0) {
      stats.averageStudyCount = this.cards.reduce((sum, card) => sum + (card.studyCount || 0), 0) / stats.totalCards;
    }

    this.cards.forEach(card => {
      if (card.difficulty && stats.difficultyDistribution[card.difficulty] !== undefined) {
        stats.difficultyDistribution[card.difficulty]++;
      }
    });

    return stats;
  }

  // ===== Spaced Repetition Support =====
  getCardsForReview() {
    const now = new Date();
    return this.cards.filter(card => {
      if (!card.lastStudied) return true; // New cards
      
      const lastStudied = new Date(card.lastStudied);
      const daysSinceStudy = Math.floor((now - lastStudied) / (1000 * 60 * 60 * 24));
      
      // Simple spaced repetition intervals based on difficulty
      const intervals = {
        easy: 7,    // Review after 7 days
        medium: 3,  // Review after 3 days
        hard: 1     // Review after 1 day
      };
      
      const interval = intervals[card.difficulty] || 3;
      return daysSinceStudy >= interval;
    });
  }

  startSpacedRepetitionSession() {
    this.studyCards = this.getCardsForReview();
    
    if (this.studyCards.length === 0) {
      if (window.app) {
        window.app.showToast('Không có thẻ nào cần ôn tập hôm nay!', 'success');
      }
      return;
    }

    if (this.settings.shuffleCards) {
      this.studyCards = this.shuffleArray(this.studyCards);
    }

    this.resetStudyState();
    this.displayCurrentCard();
    this.updateProgress();
    this.updateNavigationButtons();
  }
}

// ===== Initialize Flashcards Manager =====
document.addEventListener('DOMContentLoaded', () => {
  window.flashcardsManager = new FlashcardsManager();
});

// Add CSS for feedback animation
const style = document.createElement('style');
style.textContent = `
  @keyframes feedbackPulse {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
`;
document.head.appendChild(style);