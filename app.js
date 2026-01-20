// Application state
let allQuestions = [];
let userAnswers = {};
let isSubmitted = false;
let folderTree = null;
let expandedFolders = new Set();
let doneFiles = new Set(); // Track files marked as done

// DOM elements
const setsContainer = document.getElementById('setsContainer');
const treeContainer = document.getElementById('treeContainer');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const loadSelectedBtn = document.getElementById('loadSelectedBtn');
const backToSetsBtn = document.getElementById('backToSetsBtn');
const folderInput = document.getElementById('folderInput');
const questionsSection = document.getElementById('questionsSection');
const questionsContainer = document.getElementById('questionsContainer');
const controlPanel = document.getElementById('controlPanel');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreDisplay = document.getElementById('scoreDisplay');

// Event listeners
selectAllBtn.addEventListener('click', selectAllFiles);
deselectAllBtn.addEventListener('click', deselectAllFiles);
expandAllBtn.addEventListener('click', expandAll);
collapseAllBtn.addEventListener('click', collapseAll);
loadSelectedBtn.addEventListener('click', loadSelectedSets);
backToSetsBtn.addEventListener('click', backToSets);
folderInput.addEventListener('change', handleFolderSelection);
submitBtn.addEventListener('click', handleSubmit);
resetBtn.addEventListener('click', handleReset);
searchInput.addEventListener('input', handleSearch);
clearSearchBtn.addEventListener('click', clearSearch);

// Auto-load available files on page load
window.addEventListener('DOMContentLoaded', async () => {
    await loadDoneState();
    loadAvailableFiles();
});

/**
 * Escape HTML special characters to prevent rendering issues
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Load available question files from backend
 */
async function loadAvailableFiles() {
    try {
        const response = await fetch('/api/files');
        if (!response.ok) {
            throw new Error('Failed to load files list');
        }
        
        folderTree = await response.json();
        
        if (!folderTree || !folderTree.children || folderTree.children.length === 0) {
            treeContainer.innerHTML = `
                <div class="empty-state">
                    <p>No question files found in the data folder</p>
                    <p style="font-size: 14px; margin-top: 10px; color: #666;">Add JSON files to the data folder and refresh</p>
                </div>
            `;
            return;
        }
        
        renderTree();
        
    } catch (error) {
        console.error('Error loading files:', error);
        treeContainer.innerHTML = `
            <div class="empty-state">
                <p>⚠️ Could not connect to server</p>
                <p style="font-size: 14px; margin-top: 10px; color: #666;">Run: <code>python server.py</code></p>
                <p style="font-size: 14px; margin-top: 5px; color: #666;">Or select a folder manually below</p>
            </div>
        `;
    }
}

/**
 * Render the folder tree structure
 */
function renderTree(searchTerm = '') {
    treeContainer.innerHTML = '';
    
    if (!folderTree || !folderTree.children) return;
    
    const treeElement = document.createElement('div');
    treeElement.className = 'tree';
    
    // Render children (skip the root 'data' folder itself)
    folderTree.children.forEach(item => {
        const itemElement = renderTreeItem(item, 0, searchTerm);
        if (itemElement) {
            treeElement.appendChild(itemElement);
        }
    });
    
    treeContainer.appendChild(treeElement);
}

/**
 * Recursively render tree items
 */
function renderTreeItem(item, level, searchTerm = '') {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'tree-item';
    itemDiv.style.marginLeft = `${level * 20}px`;
    
    if (item.type === 'folder') {
        // Check if folder or any children match search
        const matches = searchTerm ? itemMatchesSearch(item, searchTerm) : true;
        if (!matches) return null;
        
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        
        const isExpanded = expandedFolders.has(item.path) || searchTerm !== '';
        
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.textContent = isExpanded ? '▼' : '▶';
        
        const folderIcon = document.createElement('span');
        folderIcon.className = 'folder-icon';
        folderIcon.textContent = '📁';
        
        const folderName = document.createElement('span');
        folderName.className = 'folder-name';
        folderName.textContent = item.name;
        
        // Count total files in this folder
        const fileCount = countFiles(item);
        const fileCountSpan = document.createElement('span');
        fileCountSpan.className = 'file-count';
        fileCountSpan.textContent = `(${fileCount} file${fileCount !== 1 ? 's' : ''})`;
        
        folderHeader.appendChild(expandIcon);
        folderHeader.appendChild(folderIcon);
        folderHeader.appendChild(folderName);
        folderHeader.appendChild(fileCountSpan);
        
        // Toggle expand/collapse on click
        folderHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFolder(item.path);
        });
        
        itemDiv.appendChild(folderHeader);
        
        // Render children if expanded
        if (isExpanded && item.children && item.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'folder-children';
            
            // Separate files and folders
            const folders = item.children.filter(child => child.type === 'folder');
            const files = item.children.filter(child => child.type === 'file');
            
            // Render folders first
            folders.forEach(child => {
                const childElement = renderTreeItem(child, level + 1, searchTerm);
                if (childElement) {
                    childrenContainer.appendChild(childElement);
                }
            });
            
            // Render files in grid
            if (files.length > 0) {
                const filesGrid = document.createElement('div');
                filesGrid.className = 'files-grid';
                filesGrid.style.marginLeft = `${(level + 1) * 20}px`;
                
                files.forEach(child => {
                    const childElement = renderTreeItem(child, 0, searchTerm);
                    if (childElement) {
                        filesGrid.appendChild(childElement);
                    }
                });
                
                childrenContainer.appendChild(filesGrid);
            }
            
            itemDiv.appendChild(childrenContainer);
        }
        
    } else if (item.type === 'file') {
        // Check if file matches search
        const matches = searchTerm ? 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.filename.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        
        if (!matches) return null;
        
        const fileHeader = document.createElement('div');
        fileHeader.className = 'file-header';
        const isDone = doneFiles.has(item.relative_path);
        if (isDone) {
            fileHeader.classList.add('done');
        }
        
        // Top section with checkbox and done toggle
        const topSection = document.createElement('div');
        topSection.className = 'file-header-top';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'file-checkbox';
        checkbox.dataset.path = item.relative_path;
        checkbox.addEventListener('change', updateLoadButton);
        
        topSection.appendChild(checkbox);
        
        // Done toggle button
        const doneToggle = document.createElement('button');
        doneToggle.className = 'done-toggle';
        doneToggle.textContent = isDone ? '✓' : '○';
        if (isDone) {
            doneToggle.classList.add('marked-done');
        }
        doneToggle.title = isDone ? 'Mark as not done' : 'Mark as done';
        doneToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDoneStatus(item.relative_path);
        });
        
        topSection.appendChild(doneToggle);
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = '📄';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="file-name">${escapeHtml(item.filename)}</div>
            <div class="file-meta">${item.question_count} question${item.question_count !== 1 ? 's' : ''}</div>
        `;
        
        fileHeader.appendChild(topSection);
        fileHeader.appendChild(fileIcon);
        fileHeader.appendChild(fileInfo);
        
        // Click on file header also toggles checkbox (but not on button click)
        fileHeader.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== doneToggle) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        itemDiv.appendChild(fileHeader);
    }
    
    return itemDiv;
}

/**
 * Check if item or its children match search term
 */
function itemMatchesSearch(item, searchTerm) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    // Check if item name matches
    if (item.name.toLowerCase().includes(term)) return true;
    if (item.filename && item.filename.toLowerCase().includes(term)) return true;
    
    // Check if any children match
    if (item.children) {
        return item.children.some(child => itemMatchesSearch(child, term));
    }
    
    return false;
}

/**
 * Count total files in a folder
 */
function countFiles(folder) {
    let count = 0;
    if (folder.children) {
        folder.children.forEach(child => {
            if (child.type === 'file') {
                count++;
            } else if (child.type === 'folder') {
                count += countFiles(child);
            }
        });
    }
    return count;
}

/**
 * Toggle folder expand/collapse
 */
function toggleFolder(path) {
    if (expandedFolders.has(path)) {
        expandedFolders.delete(path);
    } else {
        expandedFolders.add(path);
    }
    renderTree(searchInput.value);
}

/**
 * Expand all folders
 */
function expandAll() {
    expandAllFolders(folderTree);
    renderTree(searchInput.value);
}

function expandAllFolders(item) {
    if (item.type === 'folder') {
        expandedFolders.add(item.path);
        if (item.children) {
            item.children.forEach(child => expandAllFolders(child));
        }
    }
}

/**
 * Collapse all folders
 */
function collapseAll() {
    expandedFolders.clear();
    renderTree(searchInput.value);
}

/**
 * Handle search input
 */
function handleSearch(e) {
    const searchTerm = e.target.value;
    
    // Show/hide clear button
    clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    
    // Auto-expand all when searching
    if (searchTerm) {
        expandAllFolders(folderTree);
    }
    
    renderTree(searchTerm);
}

/**
 * Clear search
 */
function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderTree('');
}

/**
 * Update load button state based on selection
 */
function updateLoadButton() {
    const checkboxes = treeContainer.querySelectorAll('input[type="checkbox"]');
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    loadSelectedBtn.disabled = !anyChecked;
    
    // Update visual state
    checkboxes.forEach(cb => {
        const fileHeader = cb.closest('.file-header');
        if (fileHeader) {
            if (cb.checked) {
                fileHeader.classList.add('selected');
            } else {
                fileHeader.classList.remove('selected');
            }
        }
    });
}

/**
 * Select all files
 */
function selectAllFiles() {
    const checkboxes = treeContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
    });
    updateLoadButton();
}

/**
 * Deselect all files
 */
function deselectAllFiles() {
    const checkboxes = treeContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    updateLoadButton();
}

/**
 * Load selected question sets
 */
async function loadSelectedSets() {
    const checkboxes = treeContainer.querySelectorAll('input[type="checkbox"]:checked');
    const selectedFiles = Array.from(checkboxes).map(cb => cb.dataset.path);
    
    if (selectedFiles.length === 0) return;
    
    try {
        const response = await fetch(`/api/questions?files=${selectedFiles.join(',')}`);
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        
        const result = await response.json();
        allQuestions = result.questions || [];
        
        if (allQuestions.length === 0) {
            alert('No questions found in selected files');
            return;
        }
        
        // Switch to questions view
        setsContainer.style.display = 'none';
        questionsSection.style.display = 'block';
        
        renderQuestions();
        isSubmitted = false;
        userAnswers = {};
        scoreDisplay.style.display = 'none';
        submitBtn.style.display = 'inline-block';
        resetBtn.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please try again.');
    }
}

/**
 * Go back to sets selection
 */
function backToSets() {
    questionsSection.style.display = 'none';
    setsContainer.style.display = 'block';
    allQuestions = [];
    userAnswers = {};
    isSubmitted = false;
}

/**
 * Handle folder selection and load JSON files
 */
async function handleFolderSelection(event) {
    const files = Array.from(event.target.files);
    const jsonFiles = files.filter(file => file.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
        alert('No JSON files found in the selected folder.');
        return;
    }
    
    allQuestions = [];
    
    try {
        // Read and parse all JSON files
        for (const file of jsonFiles) {
            const content = await readFileContent(file);
            const data = JSON.parse(content);
            
            // Handle both array of questions and single question object
            if (Array.isArray(data)) {
                allQuestions.push(...data);
            } else if (data.questions && Array.isArray(data.questions)) {
                allQuestions.push(...data.questions);
            } else if (data.question) {
                allQuestions.push(data);
            }
        }

        if (allQuestions.length === 0) {
            alert('No valid questions found in the JSON files.');
            return;
        }

        // Switch to questions view
        setsContainer.style.display = 'none';
        questionsSection.style.display = 'block';
        
        renderQuestions();
        isSubmitted = false;
        userAnswers = {};
        scoreDisplay.style.display = 'none';
        submitBtn.style.display = 'inline-block';
        resetBtn.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please check the JSON format.');
    }
}

/**
 * Read file content as text
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

/**
 * Render all questions to the page
 */
function renderQuestions() {
    questionsContainer.innerHTML = '';
    
    allQuestions.forEach((question, index) => {
        const questionBlock = createQuestionElement(question, index);
        questionsContainer.appendChild(questionBlock);
    });
}

/**
 * Create a question element
 */
function createQuestionElement(question, index) {
    const div = document.createElement('div');
    div.className = 'question-block';
    div.setAttribute('data-question-index', index);

    const type = question.type || 'single';
    const typeLabel = type === 'multi' ? 'Multi-Select' : 'Single Choice';
    const inputType = type === 'multi' ? 'checkbox' : 'radio';
    
    const questionState = userAnswers[index] || null;
    const isQuestionSubmitted = questionState && questionState.submitted;

    let html = `
        <div class="question-header">
            <span class="question-number">Question ${index + 1}</span>
            <span class="question-type">${typeLabel}</span>
        </div>
        <div class="question-text">${escapeHtml(question.question)}</div>
        <ul class="options-list">
    `;

    question.options.forEach((option, optionIndex) => {
        const inputId = `q${index}_opt${optionIndex}`;
        const inputName = `question_${index}`;
        
        html += `
            <li class="option-item" data-option-index="${optionIndex}">
                <label for="${inputId}">
                    <input 
                        type="${inputType}" 
                        id="${inputId}" 
                        name="${inputName}" 
                        value="${optionIndex}"
                        ${isQuestionSubmitted || isSubmitted ? 'disabled' : ''}
                    >
                    <span>${escapeHtml(option)}</span>
                </label>
            </li>
        `;
    });

    html += `
        </ul>
        <div class="question-actions">
            <button class="btn-check-answer" data-question-index="${index}" ${isQuestionSubmitted || isSubmitted ? 'style="display:none;"' : ''}>Check Answer</button>
            <div class="question-feedback" style="display:none;"></div>
        </div>
        <div class="question-explanation" style="display:none;"></div>
    `;
    
    div.innerHTML = html;

    // Add event listeners to track answers
    if (!isQuestionSubmitted && !isSubmitted) {
        const inputs = div.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => updateUserAnswers(index, type));
        });
        
        // Add check answer button listener
        const checkBtn = div.querySelector('.btn-check-answer');
        checkBtn.addEventListener('click', () => checkSingleQuestion(index));
    }
    
    // If already submitted, show feedback
    if (isQuestionSubmitted) {
        highlightSingleQuestion(index);
    }

    return div;
}

/**
 * Update user answers when selection changes
 */
function updateUserAnswers(questionIndex, type) {
    const inputs = document.querySelectorAll(`input[name="question_${questionIndex}"]:checked`);
    
    const answers = type === 'multi' 
        ? Array.from(inputs).map(input => parseInt(input.value))
        : inputs.length > 0 ? [parseInt(inputs[0].value)] : [];
    
    // Store answers with submitted state
    if (!userAnswers[questionIndex]) {
        userAnswers[questionIndex] = { answers: answers, submitted: false };
    } else {
        userAnswers[questionIndex].answers = answers;
    }
}

/**
 * Check a single question
 */
function checkSingleQuestion(questionIndex) {
    const question = allQuestions[questionIndex];
    const userAnswerData = userAnswers[questionIndex];
    
    if (!userAnswerData || !userAnswerData.answers || userAnswerData.answers.length === 0) {
        alert('Please select an answer first');
        return;
    }
    
    const userAnswer = userAnswerData.answers;
    const correctAnswer = question.answer || question.correct || [];
    
    // Mark as submitted
    userAnswers[questionIndex].submitted = true;
    
    // Check if answer is correct
    const isCorrect = arraysEqual(userAnswer.sort(), correctAnswer.sort());
    
    // Highlight the answer
    highlightSingleQuestion(questionIndex);
    
    // Show feedback
    const questionBlock = document.querySelector(`[data-question-index="${questionIndex}"]`);
    const checkBtn = questionBlock.querySelector('.btn-check-answer');
    const feedback = questionBlock.querySelector('.question-feedback');
    
    checkBtn.style.display = 'none';
    feedback.style.display = 'block';
    feedback.className = `question-feedback ${isCorrect ? 'correct-feedback' : 'incorrect-feedback'}`;
    feedback.innerHTML = isCorrect ? '✓ Correct!' : '✗ Incorrect';
    
    // Show explanation if available
    if (question.explanation) {
        const explanationDiv = questionBlock.querySelector('.question-explanation');
        if (explanationDiv) {
            explanationDiv.innerHTML = `<strong>Explanation:</strong> ${escapeHtml(question.explanation)}`;
            explanationDiv.style.display = 'block';
        }
    }
    
    // Disable inputs for this question
    const inputs = questionBlock.querySelectorAll('input');
    inputs.forEach(input => input.disabled = true);
}

/**
 * Highlight answers for a single question
 */
function highlightSingleQuestion(questionIndex) {
    const question = allQuestions[questionIndex];
    const userAnswerData = userAnswers[questionIndex];
    const userAnswer = userAnswerData ? userAnswerData.answers : [];
    const correctAnswer = question.answer || question.correct || [];
    
    const questionBlock = document.querySelector(`[data-question-index="${questionIndex}"]`);
    const optionItems = questionBlock.querySelectorAll('.option-item');

    optionItems.forEach((item, optionIndex) => {
        const isCorrect = correctAnswer.includes(optionIndex);
        const isSelected = userAnswer.includes(optionIndex);

        if (isCorrect) {
            item.classList.add('correct');
        }
        
        if (isSelected && !isCorrect) {
            item.classList.add('incorrect');
        }

        if (isSelected) {
            item.classList.add('user-selected');
        }
    });
    
    // Show explanation if available
    if (question.explanation) {
        const explanationDiv = questionBlock.querySelector('.question-explanation');
        if (explanationDiv) {
            explanationDiv.innerHTML = `<strong>Explanation:</strong> ${escapeHtml(question.explanation)}`;
            explanationDiv.style.display = 'block';
        }
    }
}

/**
 * Handle answer submission
 */
function handleSubmit() {
    if (isSubmitted) return;

    // Collect all current answers
    allQuestions.forEach((question, index) => {
        if (!userAnswers[index]) {
            updateUserAnswers(index, question.type || 'single');
        }
        // Mark all as submitted
        if (userAnswers[index]) {
            userAnswers[index].submitted = true;
        }
    });

    isSubmitted = true;
    
    // Calculate score
    let correctCount = 0;
    let totalQuestions = allQuestions.length;

    allQuestions.forEach((question, index) => {
        const userAnswerData = userAnswers[index];
        const userAnswer = userAnswerData ? userAnswerData.answers || [] : [];
        const correctAnswer = question.answer || question.correct || [];
        
        // Check if answer is correct
        const isCorrect = arraysEqual(userAnswer.sort(), correctAnswer.sort());
        if (isCorrect) {
            correctCount++;
        }

        // Highlight answers (skip if already highlighted)
        const questionBlock = document.querySelector(`[data-question-index="${index}"]`);
        const optionItems = questionBlock.querySelectorAll('.option-item');
        const alreadyHighlighted = Array.from(optionItems).some(item => 
            item.classList.contains('correct') || item.classList.contains('incorrect')
        );
        
        if (!alreadyHighlighted) {
            highlightSingleQuestion(index);
        }
        
        // Hide check button if visible
        const checkBtn = questionBlock.querySelector('.btn-check-answer');
        if (checkBtn) checkBtn.style.display = 'none';
    });

    // Display score
    const percentage = ((correctCount / totalQuestions) * 100).toFixed(1);
    scoreDisplay.innerHTML = `
        <div class="score-text">Score: ${correctCount} / ${totalQuestions}</div>
        <div class="score-percentage">${percentage}%</div>
    `;
    scoreDisplay.style.display = 'block';
    
    // Show reset button, hide submit button
    submitBtn.style.display = 'none';
    resetBtn.style.display = 'inline-block';

    // Disable all inputs
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.disabled = true;
    });
}

/**
 * Reset the quiz
 */
function handleReset() {
    isSubmitted = false;
    userAnswers = {};
    
    // Re-render questions
    renderQuestions();
    
    // Reset UI
    scoreDisplay.style.display = 'none';
    submitBtn.style.display = 'inline-block';
    resetBtn.style.display = 'none';
}

/**
 * Check if two arrays are equal
 */
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
}

/**
 * Load done state from server cache
 */
async function loadDoneState() {
    try {
        const response = await fetch('/api/done');
        if (!response.ok) {
            throw new Error('Failed to load done state');
        }
        const data = await response.json();
        doneFiles = new Set(data.done_files || []);
    } catch (error) {
        console.error('Error loading done state:', error);
        doneFiles = new Set();
    }
}

/**
 * Save done state to server cache
 */
async function saveDoneState() {
    try {
        const response = await fetch('/api/done', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                done_files: [...doneFiles]
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save done state');
        }
    } catch (error) {
        console.error('Error saving done state:', error);
    }
}

/**
 * Toggle done status for a file
 */
async function toggleDoneStatus(filePath) {
    try {
        const response = await fetch('/api/done/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_path: filePath
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle done status');
        }
        
        const data = await response.json();
        doneFiles = new Set(data.done_files || []);
        renderTree(searchInput.value);
    } catch (error) {
        console.error('Error toggling done status:', error);
    }
}
