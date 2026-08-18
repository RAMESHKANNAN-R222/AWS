/**
 * TaskVault Cloud Pro - Main Application Controller
 * Handles UI events, REST interactions with AWS API Gateway (Lambda/DynamoDB/S3),
 * modal dialog inspections, and local demo state management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initial State & Mock Data
    const defaultMockTasks = [
        {
            taskId: "task-101",
            title: "Provision DynamoDB & S3 via AWS SAM",
            category: "DevOps",
            priority: "High",
            status: "COMPLETED",
            description: "Deploy taskvault-table and taskvault-assets-bucket with PAY_PER_REQUEST billing and CORS support.",
            s3FileUrl: "https://s3.amazonaws.com/demo-bucket/architecture-diagram.png",
            s3FileName: "architecture-diagram.png",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
            taskId: "task-102",
            title: "Configure AWS API Gateway REST Endpoints",
            category: "DevOps",
            priority: "High",
            status: "PENDING",
            description: "Setup CORS headers and Lambda Proxy Integration for GET, POST, PUT, DELETE operations.",
            s3FileUrl: "",
            s3FileName: "",
            createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            taskId: "task-103",
            title: "Automate GitHub Actions CI/CD Pipeline",
            category: "Work",
            priority: "Medium",
            status: "PENDING",
            description: "Deploy static web app to GitHub Pages and trigger SAM deployment on AWS account secrets update.",
            s3FileUrl: "https://s3.amazonaws.com/demo-bucket/workflow-spec.json",
            s3FileName: "workflow-spec.json",
            createdAt: new Date().toISOString()
        }
    ];

    let tasksState = [];
    let currentCategory = 'all';
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedFile = null;
    let inspectingTaskId = null;

    // DOM Element References
    const tasksGrid = document.getElementById('tasks-grid');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    
    // Status elements
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    const statusEndpoint = document.getElementById('status-endpoint');

    // Counts & Badges
    const countAll = document.getElementById('count-all');
    const countWork = document.getElementById('count-work');
    const countDevops = document.getElementById('count-devops');
    const countPersonal = document.getElementById('count-personal');
    const recordCountBadge = document.getElementById('record-count-badge');

    const statTotal = document.getElementById('stat-total-count');
    const statPending = document.getElementById('stat-pending-count');
    const statCompleted = document.getElementById('stat-completed-count');
    const statS3 = document.getElementById('stat-s3-count');

    // Modals
    const taskModal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    const modalIconBadge = document.getElementById('modal-icon-badge');
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    const emptyCreateBtn = document.getElementById('empty-create-btn');
    const closeTaskModalBtn = document.getElementById('close-task-modal-btn');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');

    // File Upload elements
    const fileInput = document.getElementById('file-input');
    const fileDropZone = document.getElementById('file-drop-zone');
    const fileUploadText = document.getElementById('file-upload-text');
    const s3FileUrlInput = document.getElementById('s3-file-url');
    const filePreview = document.getElementById('file-preview');

    // Detail Inspector Modal
    const detailModal = document.getElementById('detail-modal');
    const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');
    const closeDetailBtn = document.getElementById('close-detail-btn');
    const editFromDetailBtn = document.getElementById('edit-from-detail-btn');

    // Architecture Modal
    const archModal = document.getElementById('arch-modal');
    const openArchBtn = document.getElementById('open-arch-modal-btn');
    const closeArchModalBtn = document.getElementById('close-arch-modal-btn');
    const closeArchBtn = document.getElementById('close-arch-btn');

    // Config Modal
    const configModal = document.getElementById('config-modal');
    const toggleConfigBtn = document.getElementById('toggle-config-modal-btn');
    const closeConfigBtn = document.getElementById('close-config-modal-btn');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const resetMockBtn = document.getElementById('reset-mock-btn');
    const apiUrlInput = document.getElementById('api-url-input');
    const testPingBtn = document.getElementById('test-ping-btn');
    const btnTestConnection = document.getElementById('btn-test-connection');
    const testResultText = document.getElementById('test-result-text');

    // Initialize App
    init();

    function init() {
        updateApiStatusUI();
        bindEvents();
        fetchTasks();
    }

    function updateApiStatusUI() {
        if (CONFIG.isLiveAWS()) {
            statusDot.classList.add('live');
            statusLabel.textContent = "AWS API Gateway Live";
            statusEndpoint.textContent = CONFIG.API_GATEWAY_URL;
        } else {
            statusDot.classList.remove('live');
            statusLabel.textContent = "Local Demo Mode";
            statusEndpoint.textContent = "Mocking AWS API & DynamoDB";
        }
        apiUrlInput.value = CONFIG.API_GATEWAY_URL;
    }

    function bindEvents() {
        // Search & Refresh
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            if (searchQuery) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
            renderTasks();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.classList.add('hidden');
            renderTasks();
        });

        refreshBtn.addEventListener('click', () => {
            fetchTasks();
            showToast("Refreshed from " + (CONFIG.isLiveAWS() ? "AWS DynamoDB" : "Local Mock Storage"), "success");
        });

        // Navigation Categories
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.category;
                document.getElementById('current-category-title').textContent = 
                    currentCategory === 'all' ? 'All Tasks' : `${currentCategory} Tasks`;
                renderTasks();
            });
        });

        // Filter Pills
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderTasks();
            });
        });

        // Priority Radio Buttons
        document.querySelectorAll('input[name="priority-radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('task-priority').value = e.target.value;
            });
        });

        // Task Modal Triggers
        openCreateBtn.addEventListener('click', () => openTaskModal());
        emptyCreateBtn.addEventListener('click', () => openTaskModal());
        closeTaskModalBtn.addEventListener('click', () => closeTaskModal());
        cancelTaskBtn.addEventListener('click', () => closeTaskModal());

        // Detail Modal
        closeDetailModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
        closeDetailBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
        editFromDetailBtn.addEventListener('click', () => {
            detailModal.classList.add('hidden');
            if (inspectingTaskId) openTaskModal(inspectingTaskId);
        });

        // Architecture Modal
        openArchBtn.addEventListener('click', () => archModal.classList.remove('hidden'));
        closeArchModalBtn.addEventListener('click', () => archModal.classList.add('hidden'));
        closeArchBtn.addEventListener('click', () => archModal.classList.add('hidden'));

        // File Upload Dropzone
        fileDropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);

        // Form Submit
        taskForm.addEventListener('submit', handleTaskFormSubmit);

        // Config Modal Triggers
        toggleConfigBtn.addEventListener('click', () => configModal.classList.remove('hidden'));
        closeConfigBtn.addEventListener('click', () => configModal.classList.add('hidden'));

        saveConfigBtn.addEventListener('click', () => {
            const url = apiUrlInput.value.trim();
            CONFIG.setApiGatewayUrl(url);
            updateApiStatusUI();
            configModal.classList.add('hidden');
            fetchTasks();
            showToast(url ? "AWS Gateway URL Saved!" : "Switched to Local Demo Mode", "success");
        });

        resetMockBtn.addEventListener('click', () => {
            CONFIG.setApiGatewayUrl("");
            updateApiStatusUI();
            configModal.classList.add('hidden');
            fetchTasks();
            showToast("Switched to Local Demo Mode", "success");
        });

        testPingBtn.addEventListener('click', runPingTest);
        btnTestConnection.addEventListener('click', () => {
            configModal.classList.remove('hidden');
            runPingTest();
        });
    }

    async function runPingTest() {
        testResultText.textContent = "Pinging...";
        testResultText.style.color = "var(--text-muted)";

        if (!CONFIG.isLiveAWS()) {
            setTimeout(() => {
                testResultText.textContent = "Local Mock Mode Active (100% Ready)";
                testResultText.style.color = "var(--aws-orange)";
            }, 300);
            return;
        }

        try {
            const start = Date.now();
            const res = await fetch(`${CONFIG.API_GATEWAY_URL}/tasks`);
            const latency = Date.now() - start;
            if (res.ok) {
                testResultText.textContent = `Connected! HTTP ${res.status} (${latency}ms)`;
                testResultText.style.color = "var(--accent-emerald)";
            } else {
                testResultText.textContent = `Error HTTP ${res.status}`;
                testResultText.style.color = "var(--accent-rose)";
            }
        } catch (err) {
            testResultText.textContent = `Connection Failed: ${err.message}`;
            testResultText.style.color = "var(--accent-rose)";
        }
    }

    // API Interactions
    async function fetchTasks() {
        showLoading(true);

        if (!CONFIG.isLiveAWS()) {
            const saved = localStorage.getItem('TASKVAULT_MOCK_TASKS');
            if (saved) {
                tasksState = JSON.parse(saved);
            } else {
                tasksState = [...defaultMockTasks];
                saveMockTasks();
            }
            setTimeout(() => {
                showLoading(false);
                renderTasks();
            }, 300);
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_GATEWAY_URL}/tasks`);
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch tasks`);
            const data = await response.json();
            tasksState = Array.isArray(data) ? data : (data.tasks || []);
            renderTasks();
        } catch (err) {
            console.error("API Error:", err);
            showToast(`AWS API Error: ${err.message}. Falling back to cached data.`, "error");
        } finally {
            showLoading(false);
        }
    }

    async function handleTaskFormSubmit(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value.trim();
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;
        const description = document.getElementById('task-description').value.trim();
        let s3FileUrl = s3FileUrlInput.value;
        let s3FileName = selectedFile ? selectedFile.name : "";

        if (!title) return;

        if (selectedFile && CONFIG.isLiveAWS()) {
            try {
                showToast("Generating S3 Presigned Upload URL...", "info");
                const presignRes = await fetch(`${CONFIG.API_GATEWAY_URL}/upload-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: selectedFile.name, fileType: selectedFile.type })
                });
                
                if (presignRes.ok) {
                    const { uploadUrl, fileUrl } = await presignRes.json();
                    await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': selectedFile.type },
                        body: selectedFile
                    });
                    s3FileUrl = fileUrl;
                    showToast("Uploaded attachment directly to AWS S3!", "success");
                }
            } catch (fileErr) {
                console.warn("S3 Upload fallback:", fileErr);
            }
        } else if (selectedFile && !CONFIG.isLiveAWS()) {
            s3FileUrl = `https://${selectedFile.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.s3.amazonaws.com`;
            s3FileName = selectedFile.name;
        }

        const taskData = {
            taskId: taskId || `task-${Date.now()}`,
            title,
            category,
            priority,
            description,
            status: taskId ? (tasksState.find(t => t.taskId === taskId)?.status || 'PENDING') : 'PENDING',
            s3FileUrl,
            s3FileName,
            createdAt: taskId ? (tasksState.find(t => t.taskId === taskId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
        };

        if (!CONFIG.isLiveAWS()) {
            if (taskId) {
                const idx = tasksState.findIndex(t => t.taskId === taskId);
                if (idx !== -1) tasksState[idx] = taskData;
            } else {
                tasksState.unshift(taskData);
            }
            saveMockTasks();
            renderTasks();
            closeTaskModal();
            showToast(taskId ? "Task updated in DynamoDB mock!" : "New task added to DynamoDB mock!", "success");
            return;
        }

        try {
            const url = taskId ? `${CONFIG.API_GATEWAY_URL}/tasks/${taskId}` : `${CONFIG.API_GATEWAY_URL}/tasks`;
            const method = taskId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (!res.ok) throw new Error("Failed to save task to AWS");
            showToast(taskId ? "Updated in DynamoDB!" : "Saved to AWS DynamoDB!", "success");
            closeTaskModal();
            fetchTasks();
        } catch (err) {
            console.error("Save error:", err);
            showToast(`Error: ${err.message}`, "error");
        }
    }

    async function toggleTaskStatus(taskId, e) {
        if (e) e.stopPropagation();
        const task = tasksState.find(t => t.taskId === taskId);
        if (!task) return;

        const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        task.status = newStatus;

        if (!CONFIG.isLiveAWS()) {
            saveMockTasks();
            renderTasks();
            showToast(`Task status changed to ${newStatus}`, "success");
            return;
        }

        try {
            await fetch(`${CONFIG.API_GATEWAY_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            renderTasks();
            showToast(`Updated status in DynamoDB`, "success");
        } catch (err) {
            showToast(`Failed to update status: ${err.message}`, "error");
        }
    }

    async function deleteTask(taskId, e) {
        if (e) e.stopPropagation();
        if (!confirm("Are you sure you want to delete this cloud record?")) return;

        if (!CONFIG.isLiveAWS()) {
            tasksState = tasksState.filter(t => t.taskId !== taskId);
            saveMockTasks();
            renderTasks();
            showToast("Record deleted from mock DynamoDB", "success");
            return;
        }

        try {
            const res = await fetch(`${CONFIG.API_GATEWAY_URL}/tasks/${taskId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            tasksState = tasksState.filter(t => t.taskId !== taskId);
            renderTasks();
            showToast("Deleted from AWS DynamoDB & S3!", "success");
        } catch (err) {
            showToast(`Delete Error: ${err.message}`, "error");
        }
    }

    function inspectTask(taskId) {
        const task = tasksState.find(t => t.taskId === taskId);
        if (!task) return;

        inspectingTaskId = taskId;
        document.getElementById('detail-task-title').textContent = task.title;
        document.getElementById('detail-task-id').textContent = `ID: ${task.taskId}`;
        document.getElementById('detail-category-badge').textContent = task.category;
        document.getElementById('detail-category-badge').className = `badge badge-cat-${task.category.toLowerCase()}`;
        
        document.getElementById('detail-priority-badge').textContent = `${task.priority} Priority`;
        document.getElementById('detail-priority-badge').className = `badge badge-priority-${task.priority.toLowerCase()}`;
        
        document.getElementById('detail-status-badge').textContent = task.status;

        document.getElementById('detail-description-text').textContent = task.description || "No detailed description provided.";

        const attachmentContainer = document.getElementById('detail-attachment-container');
        if (task.s3FileUrl) {
            attachmentContainer.classList.remove('hidden');
            const s3Link = document.getElementById('detail-s3-link');
            s3Link.href = task.s3FileUrl;
            document.getElementById('detail-s3-filename').textContent = `S3 File: ${task.s3FileName || 'Attachment'}`;
        } else {
            attachmentContainer.classList.add('hidden');
        }

        document.getElementById('detail-json-code').textContent = JSON.stringify(task, null, 2);
        detailModal.classList.remove('hidden');
    }

    // UI Render Helpers
    function renderTasks() {
        const filtered = tasksState.filter(task => {
            const matchesCategory = currentCategory === 'all' || task.category === currentCategory;
            const matchesFilter = currentFilter === 'all' || task.status === currentFilter;
            const matchesSearch = !searchQuery || 
                task.title.toLowerCase().includes(searchQuery) || 
                (task.description && task.description.toLowerCase().includes(searchQuery));
            return matchesCategory && matchesFilter && matchesSearch;
        });

        updateCounts();
        recordCountBadge.textContent = `${filtered.length} Items`;

        if (filtered.length === 0) {
            tasksGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tasksGrid.classList.remove('hidden');

        tasksGrid.innerHTML = filtered.map(task => `
            <article class="task-card ${task.status === 'COMPLETED' ? 'completed' : ''}" onclick="app.inspectTask('${task.taskId}')">
                <div class="task-card-header">
                    <div class="task-badges">
                        <span class="badge badge-cat-${task.category.toLowerCase()}">${task.category}</span>
                        <span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority}</span>
                    </div>
                </div>

                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}

                ${task.s3FileUrl ? `
                    <a href="${task.s3FileUrl}" target="_blank" rel="noopener" class="task-attachment" onclick="event.stopPropagation()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        <span>S3 Asset: ${escapeHtml(task.s3FileName || 'Attached File')}</span>
                    </a>
                ` : ''}

                <div class="task-card-footer">
                    <button class="task-status-btn" onclick="app.toggleTaskStatus('${task.taskId}', event)">
                        ${task.status === 'COMPLETED' ? `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>Done</span>
                        ` : `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                            <span>Mark Complete</span>
                        `}
                    </button>

                    <div class="task-actions">
                        <button class="icon-btn" title="Edit" onclick="event.stopPropagation(); app.editTask('${task.taskId}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="icon-btn delete" title="Delete from DynamoDB" onclick="app.deleteTask('${task.taskId}', event)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            </article>
        `).join('');
    }

    function updateCounts() {
        const total = tasksState.length;
        const work = tasksState.filter(t => t.category === 'Work').length;
        const devops = tasksState.filter(t => t.category === 'DevOps').length;
        const personal = tasksState.filter(t => t.category === 'Personal').length;
        const pending = tasksState.filter(t => t.status === 'PENDING').length;
        const completed = tasksState.filter(t => t.status === 'COMPLETED').length;
        const s3 = tasksState.filter(t => Boolean(t.s3FileUrl)).length;

        countAll.textContent = total;
        countWork.textContent = work;
        countDevops.textContent = devops;
        countPersonal.textContent = personal;

        statTotal.textContent = total;
        statPending.textContent = pending;
        statCompleted.textContent = completed;
        statS3.textContent = s3;
    }

    function openTaskModal(taskId = null) {
        taskForm.reset();
        selectedFile = null;
        fileUploadText.textContent = "Drag & drop or click to upload file";
        filePreview.classList.add('hidden');
        s3FileUrlInput.value = "";

        if (taskId) {
            const task = tasksState.find(t => t.taskId === taskId);
            if (task) {
                modalTitle.textContent = "Edit Cloud Task";
                modalIconBadge.textContent = "✏️";
                document.getElementById('task-id').value = task.taskId;
                document.getElementById('task-title').value = task.title;
                document.getElementById('task-category').value = task.category;

                const priorityRadio = document.querySelector(`input[name="priority-radio"][value="${task.priority}"]`);
                if (priorityRadio) priorityRadio.checked = true;
                document.getElementById('task-priority').value = task.priority;

                document.getElementById('task-description').value = task.description || "";
                s3FileUrlInput.value = task.s3FileUrl || "";
                if (task.s3FileName) {
                    fileUploadText.textContent = `Attached: ${task.s3FileName}`;
                }
            }
        } else {
            modalTitle.textContent = "Create New Cloud Task";
            modalIconBadge.textContent = "✨";
            document.getElementById('task-id').value = "";
            document.querySelector('input[name="priority-radio"][value="Medium"]').checked = true;
            document.getElementById('task-priority').value = "Medium";
        }
        taskModal.classList.remove('hidden');
    }

    function closeTaskModal() {
        taskModal.classList.add('hidden');
    }

    function handleFileSelect(e) {
        if (e.target.files && e.target.files[0]) {
            selectedFile = e.target.files[0];
            fileUploadText.textContent = `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`;
        }
    }

    function saveMockTasks() {
        localStorage.setItem('TASKVAULT_MOCK_TASKS', JSON.stringify(tasksState));
    }

    function showLoading(show) {
        if (show) {
            loadingState.classList.remove('hidden');
            tasksGrid.classList.add('hidden');
            emptyState.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
        }
    }

    function showToast(msg, type = "info") {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    // Global App Interface for Inline Handlers
    window.app = {
        toggleTaskStatus,
        deleteTask,
        inspectTask,
        editTask: (id) => openTaskModal(id)
    };
});
