
const supabaseUrl = "https://npbwwbxggvlqhvslxzex.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wYnd3YnhnZ3ZscWh2c2x4emV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODk1ODEsImV4cCI6MjA5MDg2NTU4MX0.gaBsE7SBIT_kipbGW2to9SjGBxGm7kAATN7xa1j6zoI";

console.log("Initializing Supabase Client...");

// Create Supabase client (renamed to supabaseClient to avoid global namespace collision)
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Connection helper function
async function checkSupabaseConnection() {
    const statusDiv = document.getElementById('connection-status');

    // Check if key is still placeholder
    if (supabaseKey === "PASTE_YOUR_REAL_ANON_KEY_HERE") {
        statusDiv.textContent = "❌ Error: Please paste your real Supabase anon key in app.js";
        statusDiv.style.color = "red";
        return;
    }

    try {
        // Simple test query (optional but good)
        const { data, error } = await supabaseClient.from('department').select('*').limit(1);

        if (error) {
            throw error;
        }

        statusDiv.textContent = "✅ Supabase Connected Successfully!";
        statusDiv.style.color = "green";
        console.log("Supabase connected successfully:", data);

    } catch (err) {
        statusDiv.textContent = "❌ Connection failed. Check URL or Key.";
        statusDiv.style.color = "red";
        console.error("Connection error:", err.message);
    }
}

// --- Step 2: Form Logic ---

// Helper function to fetch and populate dropdowns with specific schema maps and optional filter
async function fetchAndPopulateDropdown(tableName, dropdownId, idCol, textFunc, filterObj = null) {
    const dropdown = document.getElementById(dropdownId);

    if (!dropdown) {
        console.error(`Dropdown element '${dropdownId}' not found in DOM.`);
        return;
    }

    // 1. Strict execution guards
    if (dropdown.options && dropdown.options.length > 1) {
        console.log(`[Guard] Dropdown ${dropdownId} already has options. Skipping fetch.`);
        return;
    }
    if (dropdown.dataset.loaded === "true") {
        console.log(`[Guard] Dropdown ${dropdownId} is already marked as loaded. Skipping fetch.`);
        return;
    }

    dropdown.dataset.loaded = "true"; // Mark as loaded safely

    try {
        console.log(`Dropdown called: ${tableName}`);

        // 2. HARD RESET before populating
        dropdown.innerHTML = '';
        dropdown.options.length = 0;
        dropdown.appendChild(new Option("Select...", ""));

        let query = supabaseClient.from(tableName).select('*');
        if (filterObj) {
            query = query.eq(filterObj.col, filterObj.val);
        }

        // Fetch rows from the table
        const { data, error } = await query;

        console.log(`${tableName} data received:`, data);
        if (error) {
            console.error(`Supabase error for ${tableName}:`, error);
            dropdown.dataset.loaded = "false"; // Reset if error
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`No data found in table: ${tableName}`);
            dropdown.innerHTML = '';
            dropdown.options.length = 0;
            dropdown.appendChild(new Option(`No data in ${tableName}`, ""));
            return;
        }

        // Safeguard to prevent appending exact duplicate option values
        const existingValues = new Set();

        // Populate options
        data.forEach(item => {
            const val = String(item[idCol]);
            if (!existingValues.has(val)) {
                existingValues.add(val);
                const option = document.createElement('option');
                option.value = val;
                option.textContent = textFunc(item);
                dropdown.appendChild(option);
            }
        });

        console.log(`Successfully populated ${tableName} dropdown.`);

    } catch (err) {
        console.error(`Error in fetchAndPopulateDropdown for ${tableName}:`, err.message);
        dropdown.innerHTML = `<option value="">Failed to load ${tableName}</option>`;
    }
}

// ==========================================
// SINGLE CENTRALIZED EVENT LISTENER FOR DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    // 1. Run Connection Check
    checkSupabaseConnection();

    // 2. Fetch Initial Dropdowns ONLY ONCE
    console.log("Initiating ONE-TIME dropdown fetches...");
    fetchAndPopulateDropdown('department', 'department', 'dept_id', (row) => row.dept_name);

    const batchDropdown = document.getElementById('batch');
    const subjectDropdown = document.getElementById('subject');
    const facultyDropdown = document.getElementById('faculty');

    if (batchDropdown) batchDropdown.innerHTML = '<option value="">Select a department first...</option>';
    if (subjectDropdown) subjectDropdown.innerHTML = '<option value="">Select a department first...</option>';
    if (facultyDropdown) facultyDropdown.innerHTML = '<option value="">Select a department first...</option>';

    fetchAndPopulateDropdown('classroom', 'classroom', 'room_id', (row) => row.room_no);
    fetchAndPopulateDropdown('timeslot', 'timeslot', 'slot_id', (row) => `${row.day} - ${row.start_time}`);

    // 3. Initial Display of Timetable
    console.log("Initiating timetable display fetch...");
    fetchAndDisplayTimetable();

    // 4. Setup Dynamic Filtering based on Department
    const departmentDropdown = document.getElementById('department');
    if (departmentDropdown) {
        departmentDropdown.addEventListener('change', (e) => {
            const selectedDeptId = e.target.value;
            const batchDropdown = document.getElementById('batch');
            const subjectDropdown = document.getElementById('subject');

            // Hard reset states on change
            facultyDropdown.innerHTML = '';
            facultyDropdown.options.length = 0;
            facultyDropdown.dataset.loaded = "false";

            if (batchDropdown) {
                batchDropdown.innerHTML = '';
                batchDropdown.options.length = 0;
                batchDropdown.dataset.loaded = "false";
            }
            if (subjectDropdown) {
                subjectDropdown.innerHTML = '';
                subjectDropdown.options.length = 0;
                subjectDropdown.dataset.loaded = "false";
            }

            if (selectedDeptId) {
                facultyDropdown.appendChild(new Option("Loading faculty...", ""));
                fetchAndPopulateDropdown('faculty', 'faculty', 'faculty_id', (row) => `${row.fname} ${row.lname}`, { col: 'dept_id', val: selectedDeptId });

                if (batchDropdown) {
                    batchDropdown.appendChild(new Option("Loading batches...", ""));
                    fetchAndPopulateDropdown('batch', 'batch', 'batch_id', (row) => row.batch_name, { col: 'dept_id', val: selectedDeptId });
                }

                if (subjectDropdown) {
                    subjectDropdown.appendChild(new Option("Loading subjects...", ""));
                    fetchAndPopulateDropdown('subject', 'subject', 'subject_id', (row) => row.subject_name, { col: 'dept_id', val: selectedDeptId });
                }
            } else {
                facultyDropdown.appendChild(new Option("Select a department first...", ""));
                if (batchDropdown) batchDropdown.appendChild(new Option("Select a department first...", ""));
                if (subjectDropdown) subjectDropdown.appendChild(new Option("Select a department first...", ""));
            }
        });
    }

    // 5. Setup Form Submission Logic
    const form = document.getElementById('timetable-form');
    const formMessage = document.getElementById('form-message');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page reload

            const batch_id = document.getElementById('batch').value;
            const subject_id = document.getElementById('subject').value;
            const faculty_id = document.getElementById('faculty').value;
            const classroom_id = document.getElementById('classroom').value;
            const timeslot_id = document.getElementById('timeslot').value;

            try {
                formMessage.textContent = 'Inserting record...';
                formMessage.style.color = 'blue';

                const { data, error } = await supabaseClient.from('timetable').insert([
                    { batch_id, subject_id, faculty_id, room_id: classroom_id, slot_id: timeslot_id }
                ]);

                if (error) throw error;

                formMessage.textContent = '✅ Timetable entry added successfully!';
                formMessage.style.color = 'green';

                form.reset();
                fetchAndDisplayTimetable(); // Refresh the table

            } catch (err) {
                console.error("Insert error:", err.message);
                formMessage.style.color = 'red';

                const msg = err.message || '';
                if (msg.includes('unique_faculty_slot') || msg.includes('timetable_faculty_id_slot_id_key')) {
                    formMessage.textContent = '❌ Faculty already assigned at this time!';
                } else if (msg.includes('unique_room_slot') || msg.includes('timetable_room_id_slot_id_key')) {
                    formMessage.textContent = '❌ Classroom already occupied at this time!';
                } else if (msg.includes('unique_batch_slot') || msg.includes('timetable_batch_id_slot_id_key')) {
                    formMessage.textContent = '❌ Batch already has a class at this time!';
                } else if (msg.includes('Subject does not belong')) {
                    formMessage.textContent = '❌ Subject does not belong to this department!';
                } else if (msg.includes('Faculty does not belong')) {
                    formMessage.textContent = '❌ Faculty does not belong to this department!';
                } else {
                    formMessage.textContent = '❌ Error adding entry: ' + msg;
                }
            }
        });
    }
});

// --- Step 3: Display Timetable ---

async function fetchAndDisplayTimetable() {
    const tbody = document.getElementById('timetable-body');
    if (!tbody) return;

    try {
        console.log("Fetching timetable data...");
        // Fetch timetable using view directly
        const { data, error } = await supabaseClient.from('timetable_full_view').select('*');

        if (error) {
            console.error("Timetable fetch error:", error);
            throw error;
        }

        console.log("Timetable data received:", data);

        // Clear existing rows
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No timetable entries found. Add your first entry above!</td></tr>`;
            return;
        }

        // Render each row
        data.forEach(entry => {
            const tr = document.createElement('tr');

            // View returns flat structure natively mapped from joins
            const deptName = entry.dept_name || '<span style="color:gray;">N/A</span>';
            const batchName = entry.batch_name || '<span style="color:gray;">N/A</span>';
            const subjectName = entry.subject_name || '<span style="color:gray;">N/A</span>';
            const facultyName = entry.faculty_name || '<span style="color:gray;">N/A</span>';
            const roomNo = entry.room_no || '<span style="color:gray;">N/A</span>';
            const timeStr = (entry.day && entry.start_time) ? `${entry.day} (${entry.start_time})` : '<span style="color:gray;">N/A</span>';

            tr.innerHTML = `
                <td>${deptName}</td>
                <td>${batchName}</td>
                <td>${subjectName}</td>
                <td>${facultyName}</td>
                <td>${roomNo}</td>
                <td>${timeStr}</td>
                <td><button onclick="deleteTimetableEntry(${entry.tt_id})" style="background-color:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to fetch and render timetable:", err.message);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error loading timetable: ${err.message}. Make sure the view exists in Supabase!</td></tr>`;
    }
}

// --- Step 4: Delete Timetable Entry ---
async function deleteTimetableEntry(id) {
    if (!confirm('Are you sure you want to delete this scheduled class?')) return;
    try {
        const { error } = await supabaseClient.from('timetable').delete().eq('tt_id', id);
        if (error) throw error;

        // Refresh timetable without reloading page
        fetchAndDisplayTimetable();
    } catch (err) {
        console.error('Delete error:', err.message);
        alert('Failed to delete: ' + err.message);
    }
}
window.deleteTimetableEntry = deleteTimetableEntry;