CREATE VIEW volunteer_stats AS
SELECT 
    p.id,
    p.full_name,
    COUNT(r.id) FILTER (WHERE r.attendance_status = 'attended') as total_events,
    SUM(r.hours_logged) as total_hours
FROM profiles p
LEFT JOIN registrations r ON p.id = r.user_id
GROUP BY p.id;