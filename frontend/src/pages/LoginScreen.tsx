import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Group, Anchor, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { api } from '../api/client';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setToken, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      // 1. Get Token
      const response = await api.post('/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const { access_token } = response.data;
      setToken(access_token);

      // 2. Get User Profile
      const userRes = await api.get('/users/me');
      setUser(userRes.data);

      notifications.show({
        title: 'Welcome back!',
        message: 'You have successfully logged in.',
        color: 'green',
      });
      
      navigate('/');
      
    } catch (error) {
      notifications.show({
        title: 'Login failed',
        message: 'Invalid email or password',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" className="font-bold">
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component="button" onClick={() => navigate('/register')}>
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
            <TextInput 
                label="Email" 
                placeholder="you@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput 
                label="Password" 
                placeholder="Your password" 
                required 
                mt="md" 
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Group justify="space-between" mt="lg">
            <Anchor component="button" size="sm">
                Forgot password?
            </Anchor>
            </Group>
            <Button fullWidth mt="xl" onClick={handleLogin} loading={loading}>
            Sign in
            </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

// Missing imports needed to be added back since I deleted them but used Text component
import { Text } from '@mantine/core';