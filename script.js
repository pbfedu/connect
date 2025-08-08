document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const endGameScreen = document.getElementById('end-game-screen');

    const startGameBtn = document.getElementById('start-game-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');
    
    const modeButtons = document.querySelectorAll('.mode-btn');
    const difficultyMenu = document.getElementById('difficulty-menu');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const powerupButtons = document.querySelectorAll('.powerup-btn');

    const gridContainer = document.getElementById('grid-container');
    const targetNumberDisplay = document.getElementById('target-number');
    const currentSumDisplay = document.getElementById('sum-text');
    const feedbackText = document.getElementById('feedback-text');
    const linesSvg = document.getElementById('lines-svg');
    const scoreDisplay = document.getElementById('score-display');
    const timerDisplay = document.getElementById('timer');
    const finalScoreDisplay = document.getElementById('final-score');
    const extraTimeDisplay = document.getElementById('extra-time-display');
    const comboAnimationContainer = document.getElementById('combo-animation-container');
    const comboText = document.getElementById('combo-text');
    const powerupsContainer = document.getElementById('powerups-container');

    const correctAudio = new Audio('correct.wav');
    const gameOverAudio = new Audio('end.wav');

    let targetNumber;
    let selectedCircles = [];
    let currentSum = 0;
    let score = 0;
    let timer;
    let timeLeft;
    let isTimerFrozen = false;
    let isGameOver = false;
    let difficulty = 'facil';
    let gameMode = 'normal';
    let feedbackTimeout;
    let goldCircleInterval;
    let extraTimeWon = 0;
    let activePowerup = null;

    const ROWS = 4;
    const COLS = 4;

    const cooldowns = {
        bomb: 20,
        freeze: 45,
        clearline: 35
    };
    
    const comboMultipliers = {
        2: 1, 
        3: 2,
        4: 3,
        5: 4,
        6: 5,
    };

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

    // --- Menu Buttons Logic ---
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            gameMode = button.dataset.mode;
            
            if (gameMode === 'normal') {
                difficultyMenu.classList.remove('hidden');
            } else {
                difficultyMenu.classList.add('hidden');
            }
            updateStartButtonColor();
        });
    });

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            difficulty = button.dataset.difficulty;
            updateStartButtonColor();
        });
    });

    function updateStartButtonColor() {
        let color, btnColor;
        
        switch(gameMode) {
            case 'normal':
                if (difficulty === 'facil') { color = 'var(--duo-green)'; btnColor = 'var(--duo-dark-green)'; }
                else if (difficulty === 'normal') { color = 'var(--duo-blue)'; btnColor = '#1a8ac7'; }
                else if (difficulty === 'dificil') { color = 'var(--duo-purple)'; btnColor = '#7730b9'; }
                break;
            case 'supervivencia':
                color = 'var(--duo-blue)'; btnColor = '#1a8ac7';
                break;
            case 'combo':
                color = 'var(--duo-purple)'; btnColor = '#7730b9';
                break;
            case 'powerups':
                color = 'var(--duo-orange)'; btnColor = '#f39c12';
                break;
            case 'desafio-verano':
                color = '#f1c40f'; btnColor = '#e67e22';
                break;
        }
        
        startGameBtn.style.backgroundColor = color;
        startGameBtn.style.boxShadow = `0 4px 0 ${btnColor}`;
    }
    
    // --- Main Game Logic ---
    function initGame() {
        isGameOver = false;
        score = 0;
        extraTimeWon = 0;
        scoreDisplay.textContent = score;
        isTimerFrozen = false;
        
        clearInterval(timer);
        clearInterval(goldCircleInterval);

        gridContainer.classList.remove('game-over');
        
        // Ocultar elementos de otros modos
        comboAnimationContainer.classList.add('hidden');
        powerupsContainer.classList.add('hidden');
        
        // Configuración según el modo
        switch(gameMode) {
            case 'normal':
                if (difficulty === 'facil') timeLeft = 120;
                else if (difficulty === 'normal') timeLeft = 90;
                else if (difficulty === 'dificil') timeLeft = 90;
                break;
            case 'supervivencia':
                timeLeft = 30;
                break;
            case 'combo':
                timeLeft = 90;
                comboAnimationContainer.classList.remove('hidden');
                break;
            case 'powerups':
                timeLeft = 120;
                powerupsContainer.classList.remove('hidden');
                resetPowerups();
                break;
            case 'desafio-verano':
                timeLeft = 120;
                break;
        }
        
        timerDisplay.textContent = formatTime(timeLeft);
        timerDisplay.classList.remove('animate-freeze');
        
        selectedCircles = [];
        currentSum = 0;
        linesSvg.innerHTML = '';
        gridContainer.innerHTML = '';
        
        generateGrid();
        setTargetNumber();
        currentSumDisplay.innerHTML = '???';
        
        startTimer();
        
        if (difficulty === 'dificil' && gameMode === 'normal') {
            startGoldCircleGeneration();
        }
        hideComboAnimation();
    }

    function setTargetNumber() {
        let min, max;
        if (gameMode === 'supervivencia' || gameMode === 'desafio-verano') {
            min = 10;
            max = 15;
        } else if (difficulty === 'facil') {
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
            
            let randomNumber = Math.floor(Math.random() * 9) + 1;
            circle.textContent = randomNumber;
            
            circle.addEventListener('click', () => handleCircleClick(circle));
            circleContainer.appendChild(circle);
            gridContainer.appendChild(circleContainer);
        }
    }

    function startGoldCircleGeneration() {
        goldCircleInterval = setInterval(() => {
            const circles = document.querySelectorAll('.circle:not(.beach-ball)');
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
        
        if (activePowerup) {
            usePowerup(activePowerup, circle);
            activePowerup = null;
            powerupButtons.forEach(btn => btn.classList.remove('active-powerup'));
            return;
        }
        
        const isGold = circle.classList.contains('gold');
        const isBeachBall = circle.classList.contains('beach-ball');

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
                    value: isBeachBall ? 0 : parseInt(circle.textContent), // La pelota no suma
                    isGold: isGold,
                    isBeachBall: isBeachBall
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
        
        if (gameMode === 'combo' && selectedCircles.length > 1) {
            comboAnimationContainer.classList.remove('hidden');
            showComboAnimation(selectedCircles.length);
        } else {
            hideComboAnimation();
        }

        if (selectedCircles.length > 0) {
            const sumString = selectedCircles.map(item => item.isBeachBall ? '🏖️' : item.value).join('<span class="op"> + </span>');
            currentSumDisplay.innerHTML = `${sumString}`;

            let isCorrect = currentSum === targetNumber;

            if (isCorrect) {
                let hasGold = false;
                let hasBeachBall = false;
                selectedCircles.forEach(c => {
                    c.element.classList.add('correct');
                    if (c.isGold) {
                        hasGold = true;
                    }
                    if (c.isBeachBall) {
                        hasBeachBall = true;
                    }
                });

                playAudio(correctAudio);
                showFeedback('¡Correcto!', 'correct');
                addPoint(hasGold, selectedCircles.length, hasBeachBall);
                
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
            hideComboAnimation();
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
        hideComboAnimation();
    }
    
    function regenerateNumbers() {
        selectedCircles.forEach(c => {
            c.element.classList.remove('selected', 'correct', 'error', 'gold', 'beach-ball');

            if (gameMode === 'desafio-verano') {
                const isBeachBall = Math.random() < 0.12; 
                if (isBeachBall) {
                    c.element.classList.add('beach-ball');
                } else {
                    const newNumber = Math.floor(Math.random() * 9) + 1;
                    c.element.textContent = newNumber;
                }
            } else {
                const newNumber = Math.floor(Math.random() * 9) + 1;
                c.element.textContent = newNumber;
            }
        });
        
        selectedCircles = [];
        currentSum = 0;
        currentSumDisplay.innerHTML = '???';
        linesSvg.innerHTML = '';
        hideFeedback();
        setTargetNumber();
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
            if (!isTimerFrozen) {
                if (timeLeft <= 0) {
                    endGame();
                } else {
                    timeLeft--;
                    timerDisplay.textContent = formatTime(timeLeft);
                }
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

    function freezeTimer(seconds) {
        isTimerFrozen = true;
        timerDisplay.classList.add('animate-freeze');
        setTimeout(() => {
            isTimerFrozen = false;
            timerDisplay.classList.remove('animate-freeze');
        }, seconds * 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    function addPoint(hasGold, chainLength, hasBeachBall) {
        let scoreToAdd = 1;

        if (gameMode === 'combo') {
            let multiplier = 1;
            if (comboMultipliers[chainLength]) {
                multiplier = comboMultipliers[chainLength];
            } else if (chainLength >= 6) {
                multiplier = 5;
            }
            scoreToAdd = chainLength * multiplier;
        } else if (hasGold) {
            scoreToAdd = 2;
            addTime(10);
        }
        
        if (gameMode === 'desafio-verano' && hasBeachBall) {
            scoreToAdd += 1;
        }

        score += scoreToAdd;
        scoreDisplay.textContent = score;
        scoreDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreDisplay.style.transform = 'scale(1)';
        }, 300);

        if (gameMode === 'supervivencia') {
            addTime(5);
        }
    }
    
    function showComboAnimation(chainLength) {
        if (chainLength < 2) {
            hideComboAnimation();
            return;
        }

        comboAnimationContainer.classList.add('active');
        const multiplier = comboMultipliers[chainLength] || (chainLength >= 6 ? 5 : 1);
        
        comboText.textContent = `x${multiplier}`;
        comboText.classList.add('combo-text-active');
    }

    function hideComboAnimation() {
        comboAnimationContainer.classList.remove('active');
        comboText.classList.remove('combo-text-active');
    }

    function endGame() {
        clearInterval(timer);
        clearInterval(goldCircleInterval);
        isGameOver = true;
        playAudio(gameOverAudio);
        gridContainer.classList.add('game-over');
        
        showScreen('end-game-screen');
        animateFinalScore();
        if (difficulty === 'dificil' && gameMode === 'normal') {
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
        // Implementación de fuegos artificiales
    }

    function playAudio(audioElement) {
        if (audioElement) {
            audioElement.currentTime = 0;
            audioElement.play();
        }
    }
    
    // --- PowerUps Logic ---
    powerupButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!button.disabled) {
                activePowerup = button.dataset.powerup;
                powerupButtons.forEach(btn => btn.classList.remove('active-powerup'));
                button.classList.add('active-powerup');
            }
        });
    });

    function usePowerup(powerup, circle) {
        const button = document.querySelector(`.powerup-btn[data-powerup="${powerup}"]`);
        
        if (powerup === 'bomb') {
            const row = parseInt(circle.dataset.row);
            const col = parseInt(circle.dataset.col);
            
            const circlesToClear = [];
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const adjRow = row + i;
                    const adjCol = col + j;
                    const adjCircle = document.querySelector(`.circle[data-row="${adjRow}"][data-col="${adjCol}"]`);
                    if (adjCircle) {
                        circlesToClear.push(adjCircle);
                    }
                }
            }
            
            circlesToClear.forEach(c => c.classList.add('explode-circle'));
            setTimeout(() => {
                 circlesToClear.forEach(c => {
                    const newNumber = Math.floor(Math.random() * 9) + 1;
                    c.textContent = newNumber;
                    c.classList.remove('gold', 'explode-circle', 'beach-ball');
                });
            }, 500);

        } else if (powerup === 'freeze') {
            freezeTimer(10);
            
        } else if (powerup === 'clearline') {
             const row = parseInt(circle.dataset.row);
             const col = parseInt(circle.dataset.col);
             const circlesToClear = document.querySelectorAll(`.circle[data-row="${row}"], .circle[data-col="${col}"]`);
             circlesToClear.forEach(c => c.classList.add('explode-circle'));
             setTimeout(() => {
                 circlesToClear.forEach(c => {
                    const newNumber = Math.floor(Math.random() * 9) + 1;
                    c.textContent = newNumber;
                    c.classList.remove('gold', 'explode-circle', 'beach-ball');
                });
            }, 500);
        }

        button.disabled = true;
        button.classList.remove('active-powerup');
        startCooldown(button, cooldowns[powerup]);
    }
    
    function startCooldown(button, cooldown) {
        const timerSpan = button.querySelector('.cooldown-timer');
        timerSpan.textContent = cooldown;
        timerSpan.style.opacity = 1;
        
        let timeLeft = cooldown;
        const interval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(interval);
                timerSpan.style.opacity = 0;
                button.disabled = false;
            }
        }, 1000);
    }
    
    function resetPowerups() {
        powerupButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('active-powerup');
            const timerSpan = btn.querySelector('.cooldown-timer');
            if (timerSpan) timerSpan.style.opacity = 0;
        });
        activePowerup = null;
    }

    // Inicializar la aplicación
    showScreen('start-screen');
    updateStartButtonColor();
});
