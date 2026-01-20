from flask import Flask, jsonify, send_from_directory, request
import os
import json

app = Flask(__name__)

# Path to cache directory for storing done state
CACHE_DIR = os.path.join('data', '.cache')
DONE_STATE_FILE = os.path.join(CACHE_DIR, 'done_files.json')

def ensure_cache_dir():
    """Ensure cache directory exists"""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)

def load_done_state():
    """Load done state from cache file"""
    ensure_cache_dir()
    if os.path.exists(DONE_STATE_FILE):
        try:
            with open(DONE_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading done state: {e}")
            return []
    return []

def save_done_state(done_files):
    """Save done state to cache file"""
    ensure_cache_dir()
    try:
        with open(DONE_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(done_files, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving done state: {e}")
        return False

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# API endpoint to list all available question files with folder structure
@app.route('/api/files')
def get_files():
    data_folder = 'data'
    
    try:
        if not os.path.exists(data_folder):
            return jsonify({'error': 'Data folder not found'}), 404
        
        folder_structure = build_folder_tree(data_folder)
        
        return jsonify(folder_structure)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def build_folder_tree(root_path):
    """Recursively build folder tree structure with file metadata"""
    tree = {
        'name': os.path.basename(root_path) or 'data',
        'path': root_path,
        'type': 'folder',
        'children': []
    }
    
    try:
        items = sorted(os.listdir(root_path))
        
        for item in items:
            item_path = os.path.join(root_path, item)
            
            # Skip hidden files and index.json
            if item.startswith('.') or item == 'index.json':
                continue
            
            if os.path.isdir(item_path):
                # Recursively process subdirectories
                subtree = build_folder_tree(item_path)
                tree['children'].append(subtree)
            elif item.endswith('.json'):
                # Process JSON files
                try:
                    with open(item_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                        # Count questions in the file
                        question_count = 0
                        if isinstance(data, list):
                            question_count = len(data)
                        elif isinstance(data, dict):
                            if 'questions' in data and isinstance(data['questions'], list):
                                question_count = len(data['questions'])
                            elif 'question' in data:
                                question_count = 1
                        
                        tree['children'].append({
                            'name': item.replace('.json', '').replace('-', ' ').replace('_', ' ').title(),
                            'filename': item,
                            'path': item_path,
                            'relative_path': os.path.relpath(item_path, 'data'),
                            'type': 'file',
                            'question_count': question_count
                        })
                except Exception as e:
                    print(f"Error reading {item}: {e}")
                    continue
    except Exception as e:
        print(f"Error reading directory {root_path}: {e}")
    
    return tree

# API endpoint to get questions from specific files
@app.route('/api/questions')
def get_questions():
    data_folder = 'data'
    all_questions = []
    
    # Get selected files from query parameter (now can include paths)
    selected_files = request.args.get('files', '')
    
    try:
        if not os.path.exists(data_folder):
            return jsonify({'error': 'Data folder not found'}), 404
        
        # If no files specified, return error
        if not selected_files:
            return jsonify({'error': 'No files specified'}), 400
        
        file_paths = selected_files.split(',')
        
        # Load all questions from each file
        for file_path in file_paths:
            # Handle both relative paths from data folder and just filenames
            if os.path.sep in file_path or '/' in file_path:
                # It's a relative path from data folder
                filepath = os.path.join(data_folder, file_path)
            else:
                # It's just a filename, check in data root
                filepath = os.path.join(data_folder, file_path)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Handle both array of questions and single question object
                    if isinstance(data, list):
                        all_questions.extend(data)
                    elif isinstance(data, dict):
                        if 'questions' in data and isinstance(data['questions'], list):
                            all_questions.extend(data['questions'])
                        elif 'question' in data:
                            all_questions.append(data)
            except Exception as e:
                print(f"Error loading {file_path}: {e}")
                continue
        
        return jsonify({
            'questions': all_questions,
            'total': len(all_questions),
            'files_loaded': len(file_paths)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API endpoint to get done state
@app.route('/api/done')
def get_done_state():
    try:
        done_files = load_done_state()
        return jsonify({'done_files': done_files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API endpoint to update done state
@app.route('/api/done', methods=['POST'])
def update_done_state():
    try:
        data = request.get_json()
        if not data or 'done_files' not in data:
            return jsonify({'error': 'Invalid data'}), 400
        
        done_files = data['done_files']
        if not isinstance(done_files, list):
            return jsonify({'error': 'done_files must be an array'}), 400
        
        success = save_done_state(done_files)
        if success:
            return jsonify({'success': True, 'done_files': done_files})
        else:
            return jsonify({'error': 'Failed to save done state'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API endpoint to toggle done status for a file
@app.route('/api/done/toggle', methods=['POST'])
def toggle_done_status():
    try:
        data = request.get_json()
        if not data or 'file_path' not in data:
            return jsonify({'error': 'file_path is required'}), 400
        
        file_path = data['file_path']
        done_files = load_done_state()
        
        if file_path in done_files:
            done_files.remove(file_path)
            is_done = False
        else:
            done_files.append(file_path)
            is_done = True
        
        success = save_done_state(done_files)
        if success:
            return jsonify({
                'success': True,
                'file_path': file_path,
                'is_done': is_done,
                'done_files': done_files
            })
        else:
            return jsonify({'error': 'Failed to save done state'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("MCQ Review Application Server")
    print("=" * 50)
    print("Server running at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
