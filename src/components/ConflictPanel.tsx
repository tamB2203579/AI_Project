// Conflict Panel: displays residual constraint violations
import { useAppState } from '../data/store';
import { evaluateFitness } from '../ga/fitness';

export function ConflictPanel() {
    const { state } = useAppState();

    if (!state.timetable || state.timetable.length === 0) return null;

    const result = evaluateFitness(state.timetable, state.lecturers, state.courses, state.rooms);
    const { penalties } = result;
    const hasIssues = Object.values(penalties).some(v => v > 0);

    if (!hasIssues) {
        return (
            <div className="conflict-panel success">
                <div className="conflict-header">
                    <span className="conflict-icon">✅</span>
                    <h3>No Conflicts</h3>
                </div>
                <p>The generated timetable has no constraint violations. All hard constraints are satisfied.</p>
            </div>
        );
    }

    const items = [
        { label: 'Lecturer Time Clashes', value: penalties.lecturerClash, severity: 'high' as const, icon: '⚠️', desc: 'A lecturer is scheduled for multiple courses at the same time' },
        { label: 'Room Time Clashes', value: penalties.roomClash, severity: 'high' as const, icon: '🏫', desc: 'Multiple courses are assigned to the same room at the same time' },
        { label: 'Capacity Violations', value: penalties.capacityViolation, severity: 'high' as const, icon: '👥', desc: 'Course student count exceeds room capacity' },
        { label: 'Session Overflow', value: penalties.sessionOverflow, severity: 'high' as const, icon: '🚫', desc: 'Session crosses the morning/afternoon boundary or exceeds available periods' },
        { label: 'Lecturer Overload', value: penalties.lecturerOverload, severity: 'medium' as const, icon: '⏰', desc: 'Lecturer exceeds their maximum weekly hours' },
    ];

    return (
        <div className="conflict-panel">
            <div className="conflict-header">
                <span className="conflict-icon">⚡</span>
                <h3>Constraint Report</h3>
                <span className="fitness-badge">Fitness: {result.score.toFixed(1)}</span>
            </div>
            <div className="conflict-list">
                {items.filter(i => i.value > 0).map((item, idx) => (
                    <div key={idx} className={`conflict-item severity-${item.severity}`}>
                        <span className="conflict-item-icon">{item.icon}</span>
                        <div className="conflict-item-info">
                            <span className="conflict-item-label">{item.label}</span>
                            <span className="conflict-item-desc">{item.desc}</span>
                        </div>
                        <span className="conflict-count">{item.value}</span>
                    </div>
                ))}
            </div>
            <p className="conflict-tip">
                💡 Try increasing the population size or max generations for better results.
            </p>
        </div>
    );
}
