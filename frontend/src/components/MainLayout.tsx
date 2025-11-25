import { AppShell, Burger, Group, NavLink, Text, ThemeIcon, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconDashboard, 
  IconPhoto, 
  IconFolder, 
  IconBrain, 
  IconUpload, 
  IconSettings,
  IconLogout,
  IconInfoCircle
} from '@tabler/icons-react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const MainLayout = () => {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const data = [
    { icon: IconDashboard, label: 'Dashboard', to: '/' },
    { icon: IconPhoto, label: 'Gallery', to: '/gallery' },
    { icon: IconFolder, label: 'Albums', to: '/albums' },
    { icon: IconBrain, label: 'AI Review', to: '/review' },
    { icon: IconUpload, label: 'Import', to: '/import' },
    { icon: IconSettings, label: 'Settings', to: '/settings' },
    { icon: IconInfoCircle, label: 'About', to: '/about' },
  ];

  const items = data.map((item) => (
    <NavLink
      key={item.label}
      active={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))}
      label={item.label}
      leftSection={<item.icon size="1.2rem" stroke={1.5} />}
      onClick={() => {
        navigate(item.to);
        if (opened) toggle(); // Close drawer on mobile after click
      }}
      variant="light"
      color="blue"
      style={{ borderRadius: '8px', marginBottom: '4px' }}
    />
  ));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Group justify="space-between" style={{ flex: 1 }}>
            <Group gap="xs">
                <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    <IconPhoto size={20} />
                </ThemeIcon>
                <Text fw={700} size="lg">AI Gallery</Text>
            </Group>
            {/* Header actions can go here (e.g. User Profile) */}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
            {items}
        </AppShell.Section>
        
        <AppShell.Section>
            <NavLink 
                label="Logout" 
                leftSection={<IconLogout size="1.2rem" stroke={1.5} />}
                onClick={logout}
                color="red"
                variant="subtle"
                style={{ borderRadius: '8px' }}
            />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default MainLayout;