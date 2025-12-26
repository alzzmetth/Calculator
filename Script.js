class MobileCalculator {
    constructor() {
        this.currentInput = '0';
        this.calculationHistory = '';
        this.result = null;
        this.operator = null;
        this.waitingForNewInput = false;
        this.history = JSON.parse(localStorage.getItem('calculatorHistory')) || [];
        
        // Settings
        this.settings = {
            vibration: true,
            sound: false,
            darkMode: false,
            numberFormat: 'indonesia'
        };
        
        this.loadSettings();
        this.initializeElements();
        this.initializeEventListeners();
        this.updateTime();
        this.updateDisplay();
        this.updateHistoryList();
        
        // Initialize haptic feedback if available
        this.hapticEnabled = 'vibrate' in navigator;
        
        // Set interval for updating time
        setInterval(() => this.updateTime(), 60000);
    }
    
    initializeElements() {
        // Display elements
        this.currentInputElement = document.getElementById('current-input');
        this.calculationHistoryElement = document.getElementById('calculation-history');
        
        // Buttons
        this.numberButtons = document.querySelectorAll('.btn-number');
        this.operatorButtons = document.querySelectorAll('.btn-operator');
        this.functionButtons = document.querySelectorAll('.btn-function');
        this.equalsButton = document.querySelector('.btn-equals');
        
        // Navigation
        this.navCalc = document.getElementById('nav-calc');
        this.navHistory = document.getElementById('nav-history');
        this.navSettings = document.getElementById('nav-settings');
        
        // Panels
        this.historyPanel = document.getElementById('history-panel');
        this.settingsPanel = document.getElementById('settings-panel');
        
        // Close buttons
        this.closeHistory = document.getElementById('close-history');
        this.closeSettings = document.getElementById('close-settings');
        
        // History
        this.historyList = document.getElementById('history-list');
        this.clearHistoryButton = document.getElementById('clear-history');
        
        // Settings toggles
        this.vibrationToggle = document.getElementById('vibration-toggle');
        this.soundToggle = document.getElementById('sound-toggle');
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.numberFormatSelect = document.getElementById('number-format');
        
        // Audio
        this.clickSound = document.getElementById('click-sound');
        
        // Toast
        this.toast = document.getElementById('toast');
        
        // Apply dark mode if enabled
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
            this.darkModeToggle.checked = true;
        }
        
        // Apply other settings
        this.vibrationToggle.checked = this.settings.vibration;
        this.soundToggle.checked = this.settings.sound;
        this.numberFormatSelect.value = this.settings.numberFormat;
    }
    
    initializeEventListeners() {
        // Number buttons
        this.numberButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleNumberInput(button.dataset.number);
                this.triggerFeedback();
            });
        });
        
        // Operator buttons
        this.operatorButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleOperator(button.dataset.action);
                this.triggerFeedback();
            });
        });
        
        // Function buttons
        this.functionButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleFunction(button.dataset.action);
                this.triggerFeedback();
            });
        });
        
        // Equals button
        this.equalsButton.addEventListener('click', () => {
            this.handleEquals();
            this.triggerFeedback();
        });
        
        // Navigation
        this.navCalc.addEventListener('click', () => this.showPanel('calculator'));
        this.navHistory.addEventListener('click', () => this.showPanel('history'));
        this.navSettings.addEventListener('click', () => this.showPanel('settings'));
        
        // Close panel buttons
        this.closeHistory.addEventListener('click', () => this.showPanel('calculator'));
        this.closeSettings.addEventListener('click', () => this.showPanel('calculator'));
        
        // Clear history
        this.clearHistoryButton.addEventListener('click', () => this.clearHistory());
        
        // Settings changes
        this.vibrationToggle.addEventListener('change', () => {
            this.settings.vibration = this.vibrationToggle.checked;
            this.saveSettings();
        });
        
        this.soundToggle.addEventListener('change', () => {
            this.settings.sound = this.soundToggle.checked;
            this.saveSettings();
        });
        
        this.darkModeToggle.addEventListener('change', () => {
            this.settings.darkMode = this.darkModeToggle.checked;
            document.body.classList.toggle('dark-mode', this.settings.darkMode);
            this.saveSettings();
        });
        
        this.numberFormatSelect.addEventListener('change', () => {
            this.settings.numberFormat = this.numberFormatSelect.value;
            this.saveSettings();
            this.updateDisplay();
        });
        
        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
        
        // Touch feedback for buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.classList.add('touch-active');
            }, {passive: true});
            
            button.addEventListener('touchend', () => {
                setTimeout(() => {
                    button.classList.remove('touch-active');
                }, 150);
            }, {passive: true});
        });
    }
    
    handleNumberInput(number) {
        if (this.waitingForNewInput) {
            this.currentInput = number;
            this.waitingForNewInput = false;
        } else {
            if (this.currentInput === '0' && number !== '.') {
                this.currentInput = number;
            } else if (number === '.' && this.currentInput.includes('.')) {
                // Prevent multiple decimal points
                return;
            } else {
                // Limit input length
                if (this.currentInput.length >= 15) {
                    this.showToast('Maksimum digit tercapai');
                    return;
                }
                this.currentInput += number;
            }
        }
        
        this.updateDisplay();
    }
    
    handleOperator(operator) {
        const inputValue = this.parseNumber(this.currentInput);
        
        if (this.result === null) {
            this.result = inputValue;
        } else if (this.operator && !this.waitingForNewInput) {
            this.result = this.calculate(this.result, inputValue, this.operator);
            this.currentInput = this.formatNumber(this.result);
            this.updateDisplay();
        }
        
        this.operator = operator;
        this.calculationHistory = `${this.formatNumber(this.result)} ${this.getOperatorSymbol(operator)}`;
        this.waitingForNewInput = true;
        this.updateDisplay();
    }
    
    handleFunction(action) {
        switch(action) {
            case 'clear':
                this.clear();
                break;
            case 'toggle-sign':
                this.toggleSign();
                break;
            case 'percentage':
                this.calculatePercentage();
                break;
        }
        this.updateDisplay();
    }
    
    handleEquals() {
        if (this.operator === null || this.waitingForNewInput) {
            return;
        }
        
        const inputValue = this.parseNumber(this.currentInput);
        const calculationResult = this.calculate(this.result, inputValue, this.operator);
        
        // Save to history
        const historyEntry = {
            expression: `${this.formatNumber(this.result)} ${this.getOperatorSymbol(this.operator)} ${this.formatNumber(inputValue)}`,
            result: calculationResult,
            timestamp: new Date().toLocaleString('id-ID')
        };
        
        this.history.unshift(historyEntry);
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        this.saveHistory();
        this.updateHistoryList();
        
        // Update display
        this.currentInput = this.formatNumber(calculationResult);
        this.calculationHistory = `${historyEntry.expression} =`;
        this.result = null;
        this.operator = null;
        this.waitingForNewInput = true;
        
        this.updateDisplay();
    }
    
    calculate(a, b, operator) {
        switch(operator) {
            case 'add':
                return a + b;
            case 'subtract':
                return a - b;
            case 'multiply':
                return a * b;
            case 'divide':
                if (b === 0) {
                    this.showToast('Tidak bisa dibagi dengan nol');
                    return 0;
                }
                return a / b;
            default:
                return b;
        }
    }
    
    clear() {
        this.currentInput = '0';
        this.calculationHistory = '';
        this.result = null;
        this.operator = null;
        this.waitingForNewInput = false;
    }
    
    toggleSign() {
        const number = this.parseNumber(this.currentInput);
        this.currentInput = this.formatNumber(-number);
    }
    
    calculatePercentage() {
        const number = this.parseNumber(this.currentInput);
        this.currentInput = this.formatNumber(number / 100);
    }
    
    parseNumber(str) {
        if (this.settings.numberFormat === 'indonesia') {
            // Indonesian format: 1.234,56
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // International format: 1,234.56
            str = str.replace(/,/g, '');
        }
        return parseFloat(str) || 0;
    }
    
    formatNumber(num) {
        if (typeof num === 'string') {
            num = this.parseNumber(num);
        }
        
        // Handle very large/small numbers
        if (Math.abs(num) > 999999999999999) {
            return num.toExponential(6);
        }
        
        if (this.settings.numberFormat === 'indonesia') {
            // Indonesian format: 1.234,56
            return num.toLocaleString('id-ID', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 10
            });
        } else {
            // International format: 1,234.56
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 10
            });
        }
    }
    
    getOperatorSymbol(operator) {
        const symbols = {
            'add': '+',
            'subtract': '-',
            'multiply': '×',
            'divide': '÷'
        };
        return symbols[operator] || operator;
    }
    
    updateDisplay() {
        this.currentInputElement.textContent = this.currentInput;
        this.calculationHistoryElement.textContent = this.calculationHistory;
    }
    
    updateTime() {
        const now = new Date();
        const timeElement = document.getElementById('current-time');
        const timeString = now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
        timeElement.textContent = timeString;
    }
    
    showPanel(panel) {
        // Update navigation
        this.navCalc.classList.toggle('active', panel === 'calculator');
        this.navHistory.classList.toggle('active', panel === 'history');
        this.navSettings.classList.toggle('active', panel === 'settings');
        
        // Show/hide panels
        if (panel === 'calculator') {
            this.historyPanel.classList.remove('active');
            this.settingsPanel.classList.remove('active');
        } else if (panel === 'history') {
            this.historyPanel.classList.add('active');
            this.settingsPanel.classList.remove('active');
            this.updateHistoryList();
        } else if (panel === 'settings') {
            this.historyPanel.classList.remove('active');
            this.settingsPanel.classList.add('active');
        }
    }
    
    updateHistoryList() {
        this.historyList.innerHTML = '';
        
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-item" style="color:#888; text-align:center;">Belum ada riwayat perhitungan</div>';
            return;
        }
        
        this.history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div>
                    <div class="history-expression">${entry.expression}</div>
                    <div style="font-size:12px; color:#aaa;">${entry.timestamp}</div>
                </div>
                <div class="history-result">= ${this.formatNumber(entry.result)}</div>
            `;
            this.historyList.appendChild(item);
        });
    }
    
    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.updateHistoryList();
        this.showToast('Riwayat telah dihapus');
    }
    
    saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(this.history));
    }
    
    loadSettings() {
        const savedSettings = localStorage.getItem('calculatorSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }
    
    saveSettings() {
        localStorage.setItem('calculatorSettings', JSON.stringify(this.settings));
    }
    
    triggerFeedback() {
        // Haptic feedback
        if (this.settings.vibration && this.hapticEnabled) {
            navigator.vibrate(10);
        }
        
        // Sound feedback
        if (this.settings.sound) {
            this.clickSound.currentTime = 0;
            this.clickSound.play().catch(e => console.log("Audio play failed:", e));
        }
    }
    
    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2000);
    }
    
    handleKeyboardInput(e) {
        const key = e.key;
        
        // Prevent default for calculator keys
        if (/[\d\.\+\-\*\/=]|Enter|Escape|Backspace|%/.test(key)) {
            e.preventDefault();
        }
        
        if (key >= '0' && key <= '9') {
            this.handleNumberInput(key);
            this.triggerFeedback();
        } else if (key === '.') {
            this.handleNumberInput('.');
            this.triggerFeedback();
        } else if (key === '+') {
            this.handleOperator('add');
            this.triggerFeedback();
        } else if (key === '-') {
            this.handleOperator('subtract');
            this.triggerFeedback();
        } else if (key === '*') {
            this.handleOperator('multiply');
            this.triggerFeedback();
        } else if (key === '/') {
            this.handleOperator('divide');
            this.triggerFeedback();
        } else if (key === 'Enter' || key === '=') {
            this.handleEquals();
            this.triggerFeedback();
        } else if (key === 'Escape' || key === 'Delete') {
            this.handleFunction('clear');
            this.triggerFeedback();
        } else if (key === '%') {
            this.handleFunction('percentage');
            this.triggerFeedback();
        } else if (key === 'Backspace') {
            this.handleBackspace();
            this.triggerFeedback();
        }
    }
    
    handleBackspace() {
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
        } else {
            this.currentInput = '0';
        }
        this.updateDisplay();
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new MobileCalculator();
    
    // Update time immediately
    calculator.updateTime();
    
    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('btn')) {
            e.preventDefault();
        }
    });
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
});
