CREATE TABLE IF NOT EXISTS access_codes (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'report' CHECK (purpose IN ('report', 'transcript', 'certificate')),
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_student_id ON access_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_school_id ON access_codes(school_id);
