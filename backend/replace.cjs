const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/amorb/NourERP/backend/controllers';

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'studentController.js') continue; // Will handle manually due to complexity
    if (file === 'parentController.js') continue; // Will handle manually due to complexity

    replaceInFile(fullPath, [
        [
            "(SELECT sg.name FROM student_guardians sg WHERE sg.student_id = s.id AND sg.is_primary = 1 ORDER BY sg.id LIMIT 1)",
            "(SELECT g.name FROM guardians g JOIN student_guardian_mapping sgm ON g.id = sgm.guardian_id WHERE sgm.student_id = s.id AND sgm.is_primary = 1 ORDER BY g.id LIMIT 1)"
        ],
        [
            "(SELECT sg.phone FROM student_guardians sg WHERE sg.student_id = s.id AND sg.is_primary = 1 ORDER BY sg.id LIMIT 1)",
            "(SELECT g.phone FROM guardians g JOIN student_guardian_mapping sgm ON g.id = sgm.guardian_id WHERE sgm.student_id = s.id AND sgm.is_primary = 1 ORDER BY g.id LIMIT 1)"
        ]
    ]);
}
