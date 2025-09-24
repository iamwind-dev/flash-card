// ===== Quiz Manager =====

class QuizManager {
  constructor() {
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    this.timer = null;
    this.timeLimit = 30; // seconds per question
    this.settings = {};
    
    this.init();
  }

  init() {
    this.loadSettings();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Quiz setup
    document.getElementById('start-quiz')?.addEventListener('click', () => this.startQuiz());
    
    // Quiz controls
    document.getElementById('quiz-next')?.addEventListener('click', () => this.nextQuestion());
    document.getElementById('quiz-hint')?.addEventListener('click', () => this.showHint());
    
    // Results actions
    document.getElementById('retry-quiz')?.addEventListener('click', () => this.resetQuiz());
    document.getElementById('review-answers')?.addEventListener('click', () => this.reviewAnswers());
    document.getElementById('back-to-home')?.addEventListener('click', () => {
      if (window.app) {
        window.app.navigateToView('home');
      }
    });

    // Settings
    document.getElementById('quiz-count')?.addEventListener('change', (e) => {
      this.settings.questionCount = parseInt(e.target.value);
      this.saveSettings();
    });

    document.getElementById('quiz-type')?.addEventListener('change', (e) => {
      this.settings.quizType = e.target.value;
      this.saveSettings();
    });

    document.getElementById('timed-quiz')?.addEventListener('change', (e) => {
      this.settings.timedQuiz = e.target.checked;
      this.saveSettings();
    });
  }

  // ===== Settings Management =====
  loadSettings() {
    try {
      const settings = localStorage.getItem('flashcards-quiz-settings');
      this.settings = settings ? JSON.parse(settings) : {
        questionCount: 10,
        quizType: 'mixed', // 'meaning', 'word', 'mixed'
        timedQuiz: false,
        showHints: true,
        randomizeOptions: true
      };
    } catch (error) {
      console.error('Error loading quiz settings:', error);
      this.settings = {};
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('flashcards-quiz-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving quiz settings:', error);
    }
  }

  // ===== Quiz Setup =====
  resetQuiz() {
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    this.clearTimer();
    
    this.showSetup();
    this.updateSettings();
  }

  showSetup() {
    document.getElementById('quiz-setup')?.classList.remove('hidden');
    document.getElementById('quiz-question')?.classList.add('hidden');
    document.getElementById('quiz-results')?.classList.add('hidden');
  }

  updateSettings() {
    document.getElementById('quiz-count').value = this.settings.questionCount;
    document.getElementById('quiz-type').value = this.settings.quizType;
    document.getElementById('timed-quiz').checked = this.settings.timedQuiz;
  }

  startQuiz() {
    const cards = this.loadCards();
    
    if (cards.length === 0) {
      if (window.app) {
        window.app.showToast('Không có thẻ nào để làm quiz!', 'error');
      }
      return;
    }

    // Generate questions
    this.generateQuestions(cards);
    
    if (this.questions.length === 0) {
      if (window.app) {
        window.app.showToast('Không thể tạo câu hỏi. Cần ít nhất 4 thẻ để làm quiz.', 'error');
      }
      return;
    }

    // Start quiz
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.score = 0;
    this.startTime = new Date();
    
    document.getElementById('quiz-setup')?.classList.add('hidden');
    document.getElementById('quiz-question')?.classList.remove('hidden');
    document.getElementById('quiz-results')?.classList.add('hidden');
    
    this.displayQuestion();
    
    if (window.app) {
      window.app.showToast('Quiz bắt đầu! Chúc bạn may mắn! 🍀', 'success');
    }
  }

  loadCards() {
    try {
      const cards = localStorage.getItem('flashcards');
      return cards ? JSON.parse(cards) : [];
    } catch (error) {
      console.error('Error loading cards:', error);
      return [];
    }
  }

  // ===== Question Generation =====
  generateQuestions(cards) {
    if (cards.length < 4) {
      this.questions = [];
      return;
    }

    const availableCards = [...cards];
    const questionCount = Math.min(this.settings.questionCount, cards.length);
    this.questions = [];

    // Shuffle cards
    this.shuffleArray(availableCards);

    for (let i = 0; i < questionCount; i++) {
      const correctCard = availableCards[i];
      const questionType = this.getQuestionType();
      
      const question = this.createQuestion(correctCard, availableCards, questionType);
      if (question) {
        this.questions.push(question);
      }
    }
  }

  getQuestionType() {
    switch (this.settings.quizType) {
      case 'meaning':
        return 'meaning';
      case 'word':
        return 'word';
      case 'mixed':
      default:
        return Math.random() < 0.5 ? 'meaning' : 'word';
    }
  }

  createQuestion(correctCard, allCards, type) {
    const question = {
      id: this.generateId(),
      type: type,
      correctAnswer: correctCard,
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0,
      hintUsed: false
    };

    // Generate question text and options
    if (type === 'meaning') {
      question.text = `Từ "${correctCard.word}" có nghĩa là gì?`;
      question.correctOption = correctCard.meaning;
      question.options = this.generateOptions(correctCard.meaning, allCards, 'meaning');
    } else {
      question.text = `Từ nào có nghĩa là "${correctCard.meaning}"?`;
      question.correctOption = correctCard.word;
      question.options = this.generateOptions(correctCard.word, allCards, 'word');
    }

    // Add example as hint if available
    if (correctCard.example) {
      question.hint = `Ví dụ: ${correctCard.example}`;
    } else {
      question.hint = `Loại từ: ${this.getTypeLabel(correctCard.type)}`;
    }

    return question;
  }

  generateOptions(correctAnswer, allCards, field) {
    const options = [correctAnswer];
    const usedAnswers = new Set([correctAnswer.toLowerCase()]);

    // Generate 3 wrong options
    while (options.length < 4 && allCards.length > options.length) {
      const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
      const optionValue = randomCard[field];
      
      if (optionValue && !usedAnswers.has(optionValue.toLowerCase())) {
        options.push(optionValue);
        usedAnswers.add(optionValue.toLowerCase());
      }
    }

    // Shuffle options
    return this.shuffleArray(options);
  }

  // ===== Question Display =====
  displayQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.endQuiz();
      return;
    }

    const question = this.questions[this.currentQuestionIndex];
    
    // Update question counter
    document.getElementById('question-counter').textContent = 
      `Câu ${this.currentQuestionIndex + 1} / ${this.questions.length}`;
    
    // Update progress
    this.updateQuizProgress();
    
    // Display question
    document.getElementById('question-text').textContent = question.text;
    
    // Generate options HTML
    const optionsContainer = document.getElementById('question-options');
    optionsContainer.innerHTML = question.options.map((option, index) => `
      <button class="option-btn" data-option="${this.escapeHtml(option)}">
        ${String.fromCharCode(65 + index)}. ${this.escapeHtml(option)}
      </button>
    `).join('');

    // Add option event listeners
    optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectOption(e.target.dataset.option);
      });
    });

    // Reset controls
    document.getElementById('quiz-next').disabled = true;
    document.getElementById('quiz-hint').style.display = 
      question.hint ? 'inline-flex' : 'none';

    // Start timer if enabled
    if (this.settings.timedQuiz) {
      this.startQuestionTimer();
    } else {
      this.updateTimer('');
    }

    // Record question start time
    question.startTime = new Date();
  }

  selectOption(selectedOption) {
    const question = this.questions[this.currentQuestionIndex];
    const optionsContainer = document.getElementById('question-options');
    
    // Clear previous selections
    optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.remove('selected', 'correct', 'wrong');
    });

    // Mark selected option
    const selectedBtn = optionsContainer.querySelector(`[data-option="${selectedOption}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('selected');
    }

    // Record answer
    question.userAnswer = selectedOption;
    question.isCorrect = selectedOption === question.correctOption;
    question.timeSpent = new Date() - question.startTime;

    // Update score
    if (question.isCorrect) {
      this.score++;
      selectedBtn?.classList.add('correct');
      this.showFeedback('Chính xác! 🎉', 'success');
    } else {
      selectedBtn?.classList.add('wrong');
      // Show correct answer
      const correctBtn = optionsContainer.querySelector(`[data-option="${question.correctOption}"]`);
      correctBtn?.classList.add('correct');
      this.showFeedback('Sai rồi! 😞', 'error');
    }

    // Enable next button
    document.getElementById('quiz-next').disabled = false;

    // Clear timer
    this.clearTimer();

    // Auto advance after delay
    setTimeout(() => {
      this.nextQuestion();
    }, 2000);
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.displayQuestion();
  }

  // ===== Timer Management =====
  startQuestionTimer() {
    this.clearTimer();
    let timeLeft = this.timeLimit;
    
    this.updateTimer(timeLeft);
    
    this.timer = setInterval(() => {
      timeLeft--;
      this.updateTimer(timeLeft);
      
      if (timeLeft <= 0) {
        this.clearTimer();
        this.timeUp();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateTimer(time) {
    const timerElement = document.getElementById('quiz-timer');
    if (timerElement) {
      if (typeof time === 'number') {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Warning color for last 10 seconds
        if (time <= 10) {
          timerElement.style.color = 'var(--error-color)';
        } else {
          timerElement.style.color = '';
        }
      } else {
        timerElement.textContent = time;
      }
    }
  }

  timeUp() {
    const question = this.questions[this.currentQuestionIndex];
    question.userAnswer = null;
    question.isCorrect = false;
    question.timeSpent = this.timeLimit * 1000;

    this.showFeedback('Hết giờ! ⏰', 'warning');
    
    // Show correct answer
    const optionsContainer = document.getElementById('question-options');
    const correctBtn = optionsContainer.querySelector(`[data-option="${question.correctOption}"]`);
    correctBtn?.classList.add('correct');
    
    // Disable all options
    optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
    });

    document.getElementById('quiz-next').disabled = false;
    
    setTimeout(() => {
      this.nextQuestion();
    }, 2000);
  }

  // ===== Progress Updates =====
  updateQuizProgress() {
    const progressFill = document.getElementById('quiz-progress-fill');
    const scoreDisplay = document.getElementById('quiz-score-display');
    
    if (progressFill) {
      const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
      progressFill.style.width = `${progress}%`;
    }
    
    if (scoreDisplay) {
      scoreDisplay.textContent = `Điểm: ${this.score}`;
    }
  }

  // ===== Hints =====
  showHint() {
    const question = this.questions[this.currentQuestionIndex];
    if (question.hint) {
      question.hintUsed = true;
      if (window.app) {
        window.app.showToast(question.hint, 'info', 4000);
      }
      
      // Hide hint button after use
      document.getElementById('quiz-hint').style.display = 'none';
    }
  }

  // ===== Quiz End =====
  endQuiz() {
    this.endTime = new Date();
    this.clearTimer();
    
    document.getElementById('quiz-question')?.classList.add('hidden');
    document.getElementById('quiz-results')?.classList.remove('hidden');
    
    this.displayResults();
    this.saveQuizResult();
  }

  displayResults() {
    const totalQuestions = this.questions.length;
    const correctAnswers = this.score;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const totalTime = this.endTime - this.startTime;
    
    // Update result displays
    document.getElementById('final-percentage').textContent = `${percentage}%`;
    document.getElementById('correct-count').textContent = correctAnswers;
    document.getElementById('wrong-count').textContent = totalQuestions - correctAnswers;
    document.getElementById('total-time').textContent = this.formatTime(totalTime);
    
    // Update final message based on score
    const finalMessage = document.getElementById('final-message');
    if (percentage >= 90) {
      finalMessage.textContent = 'Xuất sắc! 🌟';
      finalMessage.style.color = 'var(--success-color)';
    } else if (percentage >= 70) {
      finalMessage.textContent = 'Tốt lắm! 👍';
      finalMessage.style.color = 'var(--primary-color)';
    } else if (percentage >= 50) {
      finalMessage.textContent = 'Khá tốt! 📚';
      finalMessage.style.color = 'var(--warning-color)';
    } else {
      finalMessage.textContent = 'Cần cố gắng thêm! 💪';
      finalMessage.style.color = 'var(--error-color)';
    }

    // Animate score circle
    this.animateScoreCircle(percentage);
  }

  animateScoreCircle(percentage) {
    const circle = document.querySelector('.score-circle');
    const percentageElement = document.getElementById('final-percentage');
    
    if (circle && percentageElement) {
      let currentPercentage = 0;
      const increment = percentage / 50; // 50 steps animation
      
      const animation = setInterval(() => {
        currentPercentage += increment;
        if (currentPercentage >= percentage) {
          currentPercentage = percentage;
          clearInterval(animation);
        }
        
        percentageElement.textContent = `${Math.round(currentPercentage)}%`;
        
        // Update circle border color based on score
        if (currentPercentage >= 70) {
          circle.style.borderColor = 'var(--success-color)';
        } else if (currentPercentage >= 50) {
          circle.style.borderColor = 'var(--warning-color)';
        } else {
          circle.style.borderColor = 'var(--error-color)';
        }
      }, 20);
    }
  }

  // ===== Answer Review =====
  reviewAnswers() {
    const reviewWindow = window.open('', 'Quiz Review', 'width=600,height=800,scrollbars=yes');
    
    const reviewHTML = this.generateReviewHTML();
    reviewWindow.document.write(reviewHTML);
    reviewWindow.document.close();
  }

  generateReviewHTML() {
    const correctAnswers = this.questions.filter(q => q.isCorrect).length;
    const totalQuestions = this.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xem lại đáp án - Flashcards Quiz</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .question-item {
            background: white;
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid ${this.questions.some(q => q.isCorrect) ? '#4CAF50' : '#f44336'};
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .question-number {
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
          }
          .question-text {
            font-size: 1.1em;
            margin-bottom: 15px;
          }
          .answer {
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
          }
          .correct { background: #E8F5E8; color: #2E7D32; }
          .wrong { background: #FFEBEE; color: #C62828; }
          .your-answer { background: #E3F2FD; color: #1565C0; }
          .no-answer { background: #F5F5F5; color: #757575; }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #2196F3;
          }
          @media print {
            body { background: white; }
            .header { background: #333 !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 Xem lại đáp án Quiz</h1>
          <p>Kết quả: ${correctAnswers}/${totalQuestions} câu đúng (${percentage}%)</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${totalQuestions}</div>
            <div>Tổng câu hỏi</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${correctAnswers}</div>
            <div>Câu trả lời đúng</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${percentage}%</div>
            <div>Tỷ lệ chính xác</div>
          </div>
        </div>
        
        ${this.questions.map((question, index) => `
          <div class="question-item">
            <div class="question-number">Câu ${index + 1}:</div>
            <div class="question-text">${question.text}</div>
            
            <div class="answer correct">
              ✅ <strong>Đáp án đúng:</strong> ${question.correctOption}
            </div>
            
            ${question.userAnswer ? `
              <div class="answer ${question.isCorrect ? 'correct' : 'wrong'}">
                ${question.isCorrect ? '✅' : '❌'} <strong>Câu trả lời của bạn:</strong> ${question.userAnswer}
              </div>
            ` : `
              <div class="answer no-answer">
                ⏰ <strong>Không trả lời</strong> (Hết thời gian)
              </div>
            `}
            
            ${question.hintUsed ? `
              <div class="answer your-answer">
                💡 <strong>Đã sử dụng gợi ý:</strong> ${question.hint}
              </div>
            ` : ''}
            
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
              ⏱️ Thời gian: ${this.formatTime(question.timeSpent)}
            </div>
          </div>
        `).join('')}
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
          <p>📚 Flashcards App - Học từ vựng hiệu quả</p>
        </div>
      </body>
      </html>
    `;
  }

  // ===== Data Persistence =====
  saveQuizResult() {
    try {
      const result = {
        id: this.generateId(),
        date: new Date().toISOString(),
        score: this.score,
        totalQuestions: this.questions.length,
        percentage: Math.round((this.score / this.questions.length) * 100),
        timeSpent: this.endTime - this.startTime,
        settings: { ...this.settings },
        questions: this.questions.map(q => ({
          type: q.type,
          isCorrect: q.isCorrect,
          timeSpent: q.timeSpent,
          hintUsed: q.hintUsed
        }))
      };

      const results = JSON.parse(localStorage.getItem('flashcards-quiz-results') || '[]');
      results.push(result);
      
      // Keep only last 50 results
      if (results.length > 50) {
        results.splice(0, results.length - 50);
      }
      
      localStorage.setItem('flashcards-quiz-results', JSON.stringify(results));
      
      // Update card statistics
      this.updateCardStatistics();
      
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  }

  updateCardStatistics() {
    try {
      const cards = JSON.parse(localStorage.getItem('flashcards') || '[]');
      
      this.questions.forEach(question => {
        const card = cards.find(c => c.id === question.correctAnswer.id);
        if (card) {
          card.studyCount = (card.studyCount || 0) + 1;
          if (question.isCorrect) {
            card.correctCount = (card.correctCount || 0) + 1;
          }
          card.lastStudied = new Date().toISOString();
        }
      });
      
      localStorage.setItem('flashcards', JSON.stringify(cards));
    } catch (error) {
      console.error('Error updating card statistics:', error);
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

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  showFeedback(message, type) {
    if (window.app) {
      window.app.showToast(message, type, 1500);
    }
  }

  // ===== Quiz Statistics =====
  getQuizStatistics() {
    try {
      const results = JSON.parse(localStorage.getItem('flashcards-quiz-results') || '[]');
      
      if (results.length === 0) {
        return {
          totalQuizzes: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0
        };
      }

      const totalQuizzes = results.length;
      const averageScore = results.reduce((sum, result) => sum + result.percentage, 0) / totalQuizzes;
      const bestScore = Math.max(...results.map(result => result.percentage));
      const totalTimeSpent = results.reduce((sum, result) => sum + result.timeSpent, 0);

      return {
        totalQuizzes,
        averageScore: Math.round(averageScore),
        bestScore,
        totalTimeSpent
      };
    } catch (error) {
      console.error('Error getting quiz statistics:', error);
      return {
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSpent: 0
      };
    }
  }
}

// ===== Initialize Quiz Manager =====
document.addEventListener('DOMContentLoaded', () => {
  window.quizManager = new QuizManager();
});