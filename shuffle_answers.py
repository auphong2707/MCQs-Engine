import json
import random
import sys
from pathlib import Path


def shuffle_question_options(question):
    """
    Shuffle the options of a question while updating the answer indices.
    
    Args:
        question: A dictionary containing the question data
    
    Returns:
        The question with shuffled options and updated answer indices
    """
    options = question["options"]
    answer_indices = question["answer"]
    
    # Create a mapping of old index to new index
    indices = list(range(len(options)))
    random.shuffle(indices)
    
    # Create the shuffled options
    shuffled_options = [options[i] for i in indices]
    
    # Update answer indices based on the shuffle
    # Find where each old correct answer moved to
    new_answer_indices = []
    for old_idx in answer_indices:
        new_idx = indices.index(old_idx)
        new_answer_indices.append(new_idx)
    
    # Update the question
    question["options"] = shuffled_options
    question["answer"] = sorted(new_answer_indices)
    
    return question


def shuffle_quiz_file(input_path, output_path=None, seed=None):
    """
    Shuffle all questions in a quiz file.
    
    Args:
        input_path: Path to the input JSON file
        output_path: Path to save the shuffled file (if None, overwrites input)
        seed: Random seed for reproducibility (optional)
    """
    if seed is not None:
        random.seed(seed)
    
    # Read the JSON file
    with open(input_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    # Shuffle each question's options
    for question in questions:
        shuffle_question_options(question)
    
    # Determine output path
    if output_path is None:
        output_path = input_path
    
    # Write the shuffled data
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=4, ensure_ascii=False)
    
    print(f"Shuffled {len(questions)} questions")
    print(f"Saved to: {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python shuffle_answers.py <input_file> [output_file] [seed]")
        print("\nExamples:")
        print("  python shuffle_answers.py data/WM/Veil/slide-6-3-w3vgp4ku5o.json")
        print("  python shuffle_answers.py input.json output.json")
        print("  python shuffle_answers.py input.json output.json 42")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    if not Path(input_file).exists():
        print(f"Error: File '{input_file}' not found")
        sys.exit(1)
    
    shuffle_quiz_file(input_file, output_file, seed)


if __name__ == "__main__":
    main()
