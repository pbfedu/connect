document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const endGameScreen = document.getElementById('end-game-screen');

    const startGameBtn = document.getElementById('start-game-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');
    
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');

    const gridContainer = document.getElementById('grid-container');
    const targetNumberDisplay = document.getElementById('target-number');
    const currentSumDisplay = document.getElementById('sum-text');
    const feedbackText = document.getElementById('feedback-text');
    const linesSvg = document.getElementById('lines-svg');
    const scoreDisplay = document.getElementById('score-display');
    const timerDisplay = document.getElementById('timer');
    const finalScoreDisplay = document.getElementById('final-score');
    const extraTimeDisplay = document.getElementById('extra-time-display');
    const goldConfettiContainer = document.getElementById('gold-confetti-container');
    
    const correctAudio = new Audio('correct.mp3');
    const gameOverAudio = new Audio('game-over.mp3');

    let targetNumber;
    let selectedCircles = [];
    let currentSum = 0;
    let score = 0;
    let timer;
    let timeLeft;
    let isGameOver = false;
    let difficulty = 'facil';
    let feedbackTimeout;
    let goldCircleInterval;
    let extraTimeWon = 0;

    const ROWS = 4;
    const COLS = 4;

    // --- Screen Management ---
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    startGameBtn.addEventListener('click', () => {
        showScreen('game-screen');
        initGame();
    });

    restartGameBtn.addEventListener('click', () => {
        showScreen('start-screen');
    });

    // --- Difficulty Buttons Logic ---
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            difficulty = button.dataset.difficulty;
            updateDifficultyStyles();
        });
    });

    function updateDifficultyStyles() {
        let color = 'var(--duo-green)';
        let btnColor = 'var(--duo-dark-green)';
        let hoverColor = '#d1d1d1';
        
        if (difficulty === 'normal') {
            color = 'var(--duo-blue)';
            btnColor = '#1a8ac7';
            hoverColor = 'var(--duo-blue)';
        } else if (difficulty === 'dificil') {
            color = 'var(--duo-purple)';
            btnColor = '#7730b9';
            hoverColor = 'var(--duo-purple)';
        }
        
        startGameBtn.style.backgroundColor = color;
        startGameBtn.style.boxShadow = `0 4px 0 ${btnColor}`;
        
        document.documentElement.style.setProperty('--line-color', color);
        document.documentElement.style.setProperty('--hover-shadow', btnColor);
        document.documentElement.style.setProperty('--hover-color', hoverColor);
        
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.style.setProperty('--hover-color', '#e0e0e0');
        });
        document.querySelector(`.difficulty-btn[data-difficulty="${difficulty}"]`).style.setProperty('--hover-color', color);
    }
    
    // --- Main Game Logic ---
    function initGame() {
        isGameOver = false;
        score = 0;
        extraTimeWon = 0;
        scoreDisplay.textContent = score;
        
        clearInterval(timer);
        clearInterval(goldCircleInterval);

        if (difficulty === 'facil') {
            timeLeft = 120;
        } else if (difficulty === 'normal' || difficulty === 'dificil') {
            timeLeft = 90;
        }
        
        timerDisplay.textContent = formatTime(timeLeft);
        
        setTargetNumber(true); // Generar al inicio
        currentSumDisplay.innerHTML = '???';
        
        selectedCircles = [];
        currentSum = 0;
        linesSvg.innerHTML = '';
        
        gridContainer.innerHTML = '';
        generateGrid();
        startTimer();
        
        if (difficulty === 'dificil') {
            startGoldCircleGeneration();
        }
    }

    function setTargetNumber(initial) {
        if (initial || difficulty === 'dificil') {
            let min, max;
            if (difficulty === 'facil') {
                min = 10;
                max = 15;
            } else if (difficulty === 'normal') {
                min = 12;
                max = 20;
            } else if (difficulty === 'dificil') {
                min = 15;
                max = 25;
            }
            targetNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        targetNumberDisplay.textContent = targetNumber;
    }

    function generateGrid() {
        for (let i = 0; i < ROWS * COLS; i++) {
            const circleContainer = document.createElement('div');
            circleContainer.classList.add('circle-container');
            const circle = document.createElement('div');
            circle.classList.add('circle');
            circle.dataset.row = Math.floor(i / COLS);
            circle.dataset.col = i % COLS;
            
            const randomNumber = Math.floor(Math.random() * 9) + 1;
            circle.textContent = randomNumber;
            
            circle.addEventListener('click', () => handleCircleClick(circle));
            circleContainer.appendChild(circle);
            gridContainer.appendChild(circleContainer);
        }
    }

    function startGoldCircleGeneration() {
        goldCircleInterval = setInterval(() => {
            const circles = document.querySelectorAll('.circle');
            if (circles.length === 0) return;
            
            const activeGoldCircles = document.querySelectorAll('.circle.gold');
            if (activeGoldCircles.length >= 3) {
                return;
            }

            const randomIndex = Math.floor(Math.random() * circles.length);
            const circle = circles[randomIndex];

            if (!circle.classList.contains('gold')) {
                circle.classList.add('gold');
                setTimeout(() => {
                    circle.classList.remove('gold');
                }, 10000);
            }
        }, 5000);
    }
    
    function isAdjacent(newCircle) {
        if (selectedCircles.length === 0) return true;

        const lastSelected = selectedCircles[selectedCircles.length - 1];
        const lastRow = parseInt(lastSelected.element.dataset.row);
        const lastCol = parseInt(lastSelected.element.dataset.col);
        const newRow = parseInt(newCircle.dataset.row);
        const newCol = parseInt(newCircle.dataset.col);
        
        const rowDiff = Math.abs(lastRow - newRow);
        const colDiff = Math.abs(lastCol - newCol);

        return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    }
    
    function handleCircleClick(circle) {
        if (isGameOver) return;

        const isGold = circle.classList.contains('gold');

        if (circle.classList.contains('selected')) {
            if (selectedCircles[selectedCircles.length - 1].element === circle) {
                circle.classList.remove('selected');
                selectedCircles.pop();
            } else {
                resetSelection();
                return;
            }
        } else {
            if (isAdjacent(circle)) {
                circle.classList.add('selected');
                selectedCircles.push({
                    element: circle,
                    value: parseInt(circle.textContent),
                    isGold: isGold
                });
            } else {
                resetSelection();
                return;
            }
        }
        
        updateSum();
        drawLines();
    }

    function updateSum() {
        let sumValue = selectedCircles.reduce((sum, num) => sum + num.value, 0);
        currentSum = sumValue;
        
        if (selectedCircles.length > 0) {
            const sumString = selectedCircles.map(num => num.value).join('<span class="op"> + </span>');
            currentSumDisplay.innerHTML = `${sumString}`;

            if (currentSum === targetNumber) {
                let hasGold = false;
                selectedCircles.forEach(c => {
                    c.element.classList.add('correct');
                    if (c.isGold) {
                        hasGold = true;
                    }
                });

                playAudio(correctAudio);
                showFeedback('¡Correcto!', 'correct');
                addPoint(hasGold);

                setTimeout(() => {
                    regenerateNumbers();
                }, 700);
            } else if (currentSum > targetNumber) {
                selectedCircles.forEach(c => c.element.classList.add('error'));
                showFeedback('¡Demasiado alto!', 'error');
                setTimeout(() => {
                    resetSelection();
                }, 500);
            } else {
                hideFeedback();
            }
        } else {
            currentSumDisplay.innerHTML = '???';
            hideFeedback();
        }
    }

    function showFeedback(text, type) {
        clearTimeout(feedbackTimeout);
        feedbackText.textContent = text;
        feedbackText.classList.remove('feedback-correct', 'feedback-error', 'show');
        feedbackText.classList.add('show', `feedback-${type}`);
        feedbackTimeout = setTimeout(() => {
            hideFeedback();
        }, 1500);
    }

    function hideFeedback() {
        feedbackText.classList.remove('show');
    }

    function resetSelection() {
        selectedCircles.forEach(c => c.element.classList.remove('selected', 'correct', 'error', 'gold'));
        selectedCircles = [];
        currentSum = 0;
        currentSumDisplay.innerHTML = '???';
        linesSvg.innerHTML = '';
        hideFeedback();
    }

    function regenerateNumbers() {
        selectedCircles.forEach(c => {
            const newNumber = Math.floor(Math.random() * 9) + 1;
            c.element.textContent = newNumber;
            c.element.classList.remove('selected', 'correct', 'error', 'gold');
        });
        
        selectedCircles = [];
        currentSum = 0;
        currentSumDisplay.innerHTML = '???';
        linesSvg.innerHTML = '';
        hideFeedback();
        setTargetNumber(false); // No cambiar en Facil/Normal
    }

    function drawLines() {
        linesSvg.innerHTML = '';
        if (selectedCircles.length > 1) {
            const svgRect = linesSvg.getBoundingClientRect();
            for (let i = 0; i < selectedCircles.length - 1; i++) {
                const startCircle = selectedCircles[i].element;
                const endCircle = selectedCircles[i+1].element;
                
                const startRect = startCircle.getBoundingClientRect();
                const endRect = endCircle.getBoundingClientRect();

                const x1 = (startRect.left + startRect.right) / 2 - svgRect.left;
                const y1 = (startRect.top + startRect.bottom) / 2 - svgRect.top;
                const x2 = (endRect.left + endRect.right) / 2 - svgRect.left;
                const y2 = (endRect.top + endRect.bottom) / 2 - svgRect.top;

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                line.style.strokeDasharray = length;
                line.style.strokeDashoffset = length;

                linesSvg.appendChild(line);
            }
        }
    }
    
    function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            if (timeLeft <= 0) {
                endGame();
            } else {
                timeLeft--;
                timerDisplay.textContent = formatTime(timeLeft);
            }
        }, 1000);
    }
    
    function addTime(seconds) {
        timeLeft += seconds;
        extraTimeWon += seconds;
        timerDisplay.textContent = formatTime(timeLeft);
        timerDisplay.classList.add('animate-add');
        setTimeout(() => {
            timerDisplay.classList.remove('animate-add');
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    function addPoint(hasGold) {
        if (hasGold) {
            score += 2;
            addTime(10);
            triggerGoldConfetti();
        } else {
            score++;
        }
        scoreDisplay.textContent = score;
        scoreDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreDisplay.style.transform = 'scale(1)';
        }, 300);
    }

    function triggerGoldConfetti() {
        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('gold-confetti');
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
            goldConfettiContainer.appendChild(confetti);
        }
        setTimeout(() => goldConfettiContainer.innerHTML = '', 3000);
    }

    function endGame() {
        clearInterval(timer);
        clearInterval(goldCircleInterval);
        isGameOver = true;
        playAudio(gameOverAudio);
        gridContainer.classList.add('game-over');
        showScreen('end-game-screen');
        animateFinalScore();
        if (difficulty === 'dificil') {
            extraTimeDisplay.textContent = `Tiempo extra ganado: ${extraTimeWon}s`;
            extraTimeDisplay.style.display = 'block';
        } else {
            extraTimeDisplay.style.display = 'none';
        }
        createFireworks();
    }
    
    function animateFinalScore() {
        let currentScore = 0;
        const interval = setInterval(() => {
            if (currentScore >= score) {
                clearInterval(interval);
            } else {
                currentScore++;
                finalScoreDisplay.textContent = currentScore;
            }
        }, 50);
    }

    function createFireworks() {
        for (let i = 0; i < 10; i++) {
            const firework = document.createElement('div');
            firework.classList.add('firework');
            firework.style.top = `${Math.random() * 100}%`;
            firework.style.left = `${Math.random() * 100}%`;
            endGameScreen.appendChild(firework);
        }
    }

    function playAudio(audioElement) {
        if (audioElement) {
            audioElement.currentTime = 0;
            audioElement.play();
        }
    }

    // Initialize with start screen visible and easy difficulty selected
    showScreen('start-screen');
    updateDifficultyStyles();
});