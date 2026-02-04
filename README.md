# MCQ Review Application

A simple HTML application for reviewing Multiple Choice Questions (MCQ) and Multi-Select questions with instant feedback.

## Features

- **Automatic Folder Loading**: Select a folder containing JSON files, and all questions will be loaded automatically
- **Question Types**: 
  - Single Choice (MCQ) - Select one correct answer
  - Multi-Select - Select all correct answers (strict grading: points awarded only when all correct answers are selected)
- **Instant Feedback**: After submission, correct answers are highlighted in green, incorrect selections in red
- **Score Display**: Shows total score and percentage
- **Reset Functionality**: Reset and retry the quiz anytime

## Usage

1. Open `index.html` in a web browser (Chrome or Edge recommended)
2. Click "📁 Select Question Folder" and choose a folder containing JSON question files
3. Answer all questions on the scrollable page
4. Click "Submit Answers" to see results
5. Click "Reset Quiz" to try again

## JSON Format

Each JSON file should contain an array of question objects:

```json
[
    {
        "type": "single",
        "question": "What is the capital of France?",
        "options": ["London", "Berlin", "Paris", "Madrid"],
        "answer": [2],
        "explanation": "Paris is the capital and largest city of France."
    },
    {
        "type": "multi",
        "question": "Select all programming languages that are object-oriented:",
        "options": ["C", "Java", "Python", "Assembly"],
        "answer": [1, 2],
        "explanation": "Java and Python are object-oriented languages. C is procedural, and Assembly is a low-level language."
    }
]
```

### Field Descriptions

- **type**: `"single"` for MCQ, `"multi"` for multi-select
- **question**: The question text
- **options**: Array of answer options (strings)
- **answer**: Array of correct answer indices (0-based)
- **explanation**: (Optional) Explanation text shown after answering

## Sample Data

Two sample question files are provided in the `data/` folder to help you get started.

## Python Command to Generate 10-char Random IDs
```bash
python -c "import random, string; print(''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(10)))"
```