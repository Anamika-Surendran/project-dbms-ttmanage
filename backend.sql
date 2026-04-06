-- =========================
-- 1. DEPARTMENT
-- =========================
CREATE TABLE department (
    dept_id SERIAL PRIMARY KEY,
    dept_name TEXT NOT NULL
);

INSERT INTO department (dept_name) VALUES
('CSE'),
('Mech'),
('Eee'),
('Civil');

-- =========================
-- 2. BATCH
-- =========================
CREATE TABLE batch (
    batch_id SERIAL PRIMARY KEY,
    batch_name TEXT NOT NULL,
    semester INT,
    dept_id INT REFERENCES department(dept_id)
);

INSERT INTO batch (batch_name, semester, dept_id) VALUES
('S3', 3, 1),
('S5', 5, 1),
('S3', 3, 2),
('S5', 5, 2),
('S3', 3, 3),
('S5', 5, 3),
('S3', 3, 4),
('S5', 5, 4);

-- =========================
-- 3. SUBJECT
-- =========================
CREATE TABLE subject (
    subject_id SERIAL PRIMARY KEY,
    subject_name TEXT NOT NULL,
    dept_id INT REFERENCES department(dept_id)
);

INSERT INTO subject (subject_name, dept_id) VALUES
-- CSE
('Dbms', 1),
('Os', 1),
('Software', 1),
('Coa', 1),

-- MECH
('Mechanical Solids', 2),
('Rotational Motion', 2),
('Thermodynamics', 2),
('Fluid', 2),

-- EEE
('Circuits', 3),
('Analog Design', 3),
('Power Electronics', 3),
('Electric Magnet', 3),

-- CIVIL
('Civil Motions', 4),
('Civil Basics', 4),
('Steel Design', 4),
('Concrete Design', 4);

-- =========================
-- 4. FACULTY
-- =========================
CREATE TABLE faculty (
    faculty_id SERIAL PRIMARY KEY,
    fname TEXT,
    lname TEXT,
    dept_id INT REFERENCES department(dept_id)
);

INSERT INTO faculty (fname, lname, dept_id) VALUES
-- CSE
('Raji', 'Pillai', 1),
('Praveen', 'Pillai', 1),
('Archana', 'M', 1),
('Alfred', 'C', 1),

-- MECH
('Anil', 'Kumar', 2),
('Veena', 'Roy', 2),
('Rajeev', 'S', 2),
('Keerthy', 'M', 2),

-- EEE
('Isaac', 'George', 3),
('Karthika', 'Nair', 3),
('David', 'S', 3),
('Ancy', 'R', 3),

-- CIVIL
('Rakesh', 'Hebbar', 4),
('Rukmini', 'Jose', 4),
('Deepthi', 'I', 4),
('Sooraj', 'V', 4);

-- =========================
-- 5. CLASSROOM
-- =========================
CREATE TABLE classroom (
    room_id SERIAL PRIMARY KEY,
    room_no TEXT,
    capacity INT,
    location TEXT
);

INSERT INTO classroom (room_no) VALUES
('A101'),
('A102'),
('B201'),
('B202'),
('C301');

-- =========================
-- 6. TIMESLOT
-- =========================
CREATE TABLE timeslot (
    slot_id SERIAL PRIMARY KEY,
    day TEXT,
    start_time TIME,
    end_time TIME
);

INSERT INTO timeslot (day, start_time, end_time) VALUES
('Monday', '09:00', '10:00'),
('Monday', '10:00', '11:00'),
('Tuesday', '09:00', '10:00'),
('Tuesday', '10:00', '11:00'),
('Wednesday', '09:00', '10:00'),
('Thursday', '09:00', '10:00'),
('Thursday', '10:00', '11:00'),
('Friday', '09:00', '10:00'),
('Friday', '10:00', '11:00');

-- =========================
-- 7. TIMETABLE
-- =========================
CREATE TABLE timetable (
    tt_id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES batch(batch_id),
    subject_id INT REFERENCES subject(subject_id),
    faculty_id INT REFERENCES faculty(faculty_id),
    room_id INT REFERENCES classroom(room_id),
    slot_id INT REFERENCES timeslot(slot_id)
);

-- =========================
-- 8. UNIQUE CONSTRAINTS
-- =========================
ALTER TABLE timetable
ADD CONSTRAINT unique_faculty_slot UNIQUE (faculty_id, slot_id);

ALTER TABLE timetable
ADD CONSTRAINT unique_room_slot UNIQUE (room_id, slot_id);

ALTER TABLE timetable
ADD CONSTRAINT unique_batch_slot UNIQUE (batch_id, slot_id);

-- =========================
-- 9. TRIGGER FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION check_department_constraints()
RETURNS TRIGGER AS $$
DECLARE
    batch_dept INT;
    subject_dept INT;
    faculty_dept INT;
BEGIN
    SELECT dept_id INTO batch_dept FROM batch WHERE batch_id = NEW.batch_id;
    SELECT dept_id INTO subject_dept FROM subject WHERE subject_id = NEW.subject_id;
    SELECT dept_id INTO faculty_dept FROM faculty WHERE faculty_id = NEW.faculty_id;

    IF batch_dept != subject_dept THEN
        RAISE EXCEPTION 'Subject does not belong to this department';
    END IF;

    IF batch_dept != faculty_dept THEN
        RAISE EXCEPTION 'Faculty does not belong to this department';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- 10. TRIGGER
-- =========================
CREATE TRIGGER dept_check_trigger
BEFORE INSERT ON timetable
FOR EACH ROW
EXECUTE FUNCTION check_department_constraints();

-- =========================
-- 11. FINAL VIEW
-- =========================
CREATE VIEW timetable_full_view AS
SELECT 
    timetable.tt_id,
    batch.batch_id,
    batch.batch_name,
    department.dept_name,
    subject.subject_name,
    faculty.faculty_id,
    faculty.fname || ' ' || faculty.lname AS faculty_name,
    classroom.room_no,
    timeslot.day,
    timeslot.start_time
FROM timetable
JOIN batch ON timetable.batch_id = batch.batch_id
JOIN department ON batch.dept_id = department.dept_id
JOIN subject ON timetable.subject_id = subject.subject_id
JOIN faculty ON timetable.faculty_id = faculty.faculty_id
JOIN classroom ON timetable.room_id = classroom.room_id
JOIN timeslot ON timetable.slot_id = timeslot.slot_id;