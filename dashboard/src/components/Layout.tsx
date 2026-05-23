import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Box, LineChart, Settings, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const Layout: React.FC = () => {
    return (
        <div style={styles.container}>
            <aside style={styles.sidebar}>
                <div style={styles.brand}>
                    <Activity color="#38bdf8" size={32} />
                    <div>
                        <h1 style={styles.brandText}>Sight.</h1>
                        <p style={styles.brandSubtitle}>Enterprise UI</p>
                    </div>
                </div>

                <nav style={styles.nav}>
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Overview" />
                    <NavItem to="/facilities" icon={<Box size={20} />} label="3D Facilities" />
                    <NavItem to="/analytics" icon={<LineChart size={20} />} label="Analytics" />
                    <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
                </nav>

                <div style={styles.sidebarFooter}>
                    <div className="glass" style={styles.userCard}>
                        <div style={styles.avatar}>A</div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 600 }}>Admin User</p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Sight Enterprise</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main style={styles.main}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <Outlet />
                </motion.div>
            </main>
        </div>
    );
};

const NavItem = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
    <NavLink
        to={to}
        style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#fff' : 'var(--color-text-muted)',
            background: isActive ? 'var(--color-surface-hover)' : 'transparent',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'all 0.2s',
            boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
        })}
        className={(isActive) => isActive ? 'nav-active' : ''}
    >
        {icon}
        <span>{label}</span>
    </NavLink>
);

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
    },
    sidebar: {
        width: 280,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(16px)',
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '32px 24px',
    },
    brandText: {
        fontSize: 24,
        color: '#fff',
        lineHeight: 1,
    },
    brandSubtitle: {
        fontSize: 12,
        color: 'var(--color-primary)',
        fontWeight: 500,
        marginTop: 4,
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '0 16px',
        flex: 1,
    },
    sidebarFooter: {
        padding: '24px 16px',
    },
    userCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px',
        borderRadius: 'var(--radius-md)',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000',
        fontWeight: 'bold',
    },
    main: {
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
    }
};

export default Layout;
